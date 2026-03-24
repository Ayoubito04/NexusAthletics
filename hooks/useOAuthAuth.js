/**
 * useOAuthAuth - Hook personalizado para autenticacion OAuth
 * Maneja estados, errores y el flujo completo de autenticacion
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { NativeModules } from 'react-native';
import { supabase } from '../lib/supabase';
import Config from '../constants/Config';
import {
    oAuthService,
    OAuthErrorCodes,
    OAuthLoadingStates,
    OAuthLoadingMessages,
    mapNativeError,
    getErrorMessage,
} from '../services/OAuthService';

// Carga segura de GoogleSignin
let GoogleSignin = null;
let statusCodes = {};
try {
    if (NativeModules.RNGoogleSignin) {
        const GoogleModule = require('@react-native-google-signin/google-signin');
        GoogleSignin = GoogleModule.GoogleSignin;
        statusCodes = GoogleModule.statusCodes;
    }
} catch (e) {
    console.log('useOAuthAuth: Modulo nativo de Google no disponible');
}

WebBrowser.maybeCompleteAuthSession();

/**
 * Hook para manejar autenticacion OAuth
 * @param {object} options - Opciones de configuracion
 * @returns {object} Estado y funciones de autenticacion
 */
export const useOAuthAuth = (options = {}) => {
    const {
        onSuccess,
        onError,
        onVerificationRequired,
        autoSync = true,
    } = options;

    const navigation = useNavigation();

    // Estados
    const [isLoading, setIsLoading] = useState(false);
    const [loadingState, setLoadingState] = useState(OAuthLoadingStates.IDLE);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Ref para evitar multiples llamadas
    const isAuthenticating = useRef(false);

    // Helper para setear estados de loading
    const setLoading = useCallback((state, message) => {
        setLoadingState(state);
        setLoadingMessage(message || OAuthLoadingMessages[state] || '');
    }, []);

    // Manejar errores de forma unificada
    const handleError = useCallback((provider, err, fallbackMessage) => {
        const errorCode = err.code
            ? mapNativeError(provider, err)
            : err.errorCode || OAuthErrorCodes.GENERIC.UNKNOWN_ERROR;

        const errorMessage = getErrorMessage(provider, errorCode);

        setError({
            provider,
            code: errorCode,
            ...errorMessage,
            raw: err,
        });

        setLoading(OAuthLoadingStates.ERROR);

        if (onError) {
            onError(provider, {
                code: errorCode,
                ...errorMessage,
            });
        }

        console.error(`[useOAuthAuth] Error en ${provider}:`, err);
    }, [onError, setLoading]);

    // Sincronizar sesion con el backend de Nexus
    const syncWithBackend = useCallback(async (supabaseAccessToken, provider) => {
        try {
            setLoading(OAuthLoadingStates.SYNCING_WITH_BACKEND);

            const response = await fetch(Config.API_ENDPOINTS.AUTH_SOCIAL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    accessToken: supabaseAccessToken,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error sincronizando con el servidor');
            }

            if (data.requiresVerification) {
                if (onVerificationRequired) {
                    onVerificationRequired(data.user?.email);
                }
                return { success: false, requiresVerification: true };
            }

            if (data.token) {
                const userData = {
                    ...data.user,
                    plan: data.user.plan || 'Gratis',
                };

                await AsyncStorage.setItem('user', JSON.stringify(userData));
                await AsyncStorage.setItem('token', data.token);

                setCurrentUser(userData);

                setLoading(OAuthLoadingStates.SUCCESS);

                if (onSuccess) {
                    onSuccess(userData, data.isNewUser);
                }

                return { success: true, user: userData, isNewUser: data.isNewUser };
            }

            throw new Error(data.error || 'Error desconocido');

        } catch (err) {
            handleError('backend', err, 'Error al sincronizar con el servidor');
            return { success: false, error: err };
        }
    }, [setLoading, onSuccess, onVerificationRequired, handleError]);

    // Login con Google nativo
    const loginWithGoogleNative = useCallback(async () => {
        if (!GoogleSignin) {
            throw new Error('Native module missing');
        }

        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo.data?.idToken || userInfo.idToken;

            if (!idToken) {
                throw new Error('No se pudo obtener el ID Token de Google');
            }

            // Autenticar con Supabase usando el idToken
            const { error: authError } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            if (authError && !authError.message?.includes('setAuth')) {
                throw authError;
            }

            return { success: true, idToken };

        } catch (err) {
            // Mapear errores nativos de Google
            if (err.code === statusCodes.SIGN_IN_CANCELLED) {
                throw { code: OAuthErrorCodes.GOOGLE.SIGN_IN_CANCELLED };
            }
            if (err.code === statusCodes.IN_PROGRESS) {
                throw { code: OAuthErrorCodes.GOOGLE.IN_PROGRESS };
            }
            if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                throw { code: OAuthErrorCodes.GOOGLE.PLAY_SERVICES_NOT_AVAILABLE };
            }
            throw err;
        }
    }, []);

    // Login con OAuth via web (fallback para Expo Go)
    const loginWithOAuthWeb = useCallback(async (provider) => {
        const redirectUri = AuthSession.makeRedirectUri({
            useProxy: true,
            projectNameForProxy: '@ayoubito04/nexus-fitness',
        });

        console.log(`[useOAuthAuth] Redirect URI para ${provider}:`, redirectUri);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider.toLowerCase(),
            options: {
                redirectTo: redirectUri,
                skipBrowserRedirect: true,
            },
        });

        if (error) throw error;

        if (data?.url) {
            setLoading(OAuthLoadingStates.REQUESTING_PERMISSIONS);

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

            if (result.type === 'success' && result.url) {
                // Extraer tokens del hash de la URL
                const urlObj = new URL(result.url.replace('#', '?'));
                const access_token = urlObj.searchParams.get('access_token');
                const refresh_token = urlObj.searchParams.get('refresh_token');

                if (access_token) {
                    try {
                        await supabase.auth.setSession({
                            access_token,
                            refresh_token: refresh_token || '',
                        });
                    } catch (sessionError) {
                        // Ignorar error de realtime.setAuth
                        if (!sessionError.message?.includes('setAuth')) {
                            throw sessionError;
                        }
                    }
                    return { success: true, accessToken: access_token };
                }
            }

            if (result.type === 'cancel') {
                throw { code: OAuthErrorCodes[provider.toUpperCase()]?.CANCELLED };
            }

            throw new Error('No se obtuvo token del proveedor');
        }

        throw new Error('No se pudo iniciar la autenticacion web');
    }, [setLoading]);

    // Login con Google
    const loginWithGoogle = useCallback(async () => {
        if (isAuthenticating.current) {
            return { success: false, error: { code: OAuthErrorCodes.GOOGLE.IN_PROGRESS } };
        }

        isAuthenticating.current = true;
        setIsLoading(true);
        setError(null);
        setLoading(OAuthLoadingStates.INITIALIZING);

        try {
            // Intentar login nativo primero
            try {
                await loginWithGoogleNative();

                // El listener de Supabase manejara la sincronizacion
                return { success: true };
            } catch (nativeError) {
                console.log('[useOAuthAuth] Fallback a web auth para Google');
            }

            // Fallback a web auth
            const result = await loginWithOAuthWeb('google');

            if (result.success) {
                // El listener de Supabase manejara la sincronizacion
                return result;
            }

            throw new Error('Error en autenticacion web');

        } catch (err) {
            handleError('google', err, 'Error al iniciar sesion con Google');
            return { success: false, error: err };
        } finally {
            isAuthenticating.current = false;
            setIsLoading(false);
        }
    }, [loginWithGoogleNative, loginWithOAuthWeb, handleError, setLoading]);

    // Login con Facebook
    const loginWithFacebook = useCallback(async () => {
        if (isAuthenticating.current) {
            return { success: false, error: { code: OAuthErrorCodes.FACEBOOK.CANCELLED } };
        }

        isAuthenticating.current = true;
        setIsLoading(true);
        setError(null);
        setLoading(OAuthLoadingStates.INITIALIZING);

        try {
            const result = await loginWithOAuthWeb('facebook');

            if (result.success) {
                return result;
            }

            throw new Error('Error en autenticacion de Facebook');

        } catch (err) {
            handleError('facebook', err, 'Error al iniciar sesion con Facebook');
            return { success: false, error: err };
        } finally {
            isAuthenticating.current = false;
            setIsLoading(false);
        }
    }, [loginWithOAuthWeb, handleError, setLoading]);

    // Login con Instagram
    const loginWithInstagram = useCallback(async () => {
        if (isAuthenticating.current) {
            return { success: false, error: { code: OAuthErrorCodes.INSTAGRAM.CANCELLED } };
        }

        isAuthenticating.current = true;
        setIsLoading(true);
        setError(null);
        setLoading(OAuthLoadingStates.INITIALIZING);

        try {
            const redirectUri = AuthSession.makeRedirectUri({
                scheme: 'nexus-fitness',
            });

            const instagramClientId = Config.OAUTH.INSTAGRAM.CLIENT_ID || Config.INSTAGRAM_CLIENT_ID;

            if (!instagramClientId || instagramClientId === 'tu_instagram_client_id') {
                throw { code: OAuthErrorCodes.INSTAGRAM.INVALID_CLIENT_ID };
            }

            const authUrl = `https://api.instagram.com/oauth/authorize?` +
                `client_id=${instagramClientId}` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&scope=user_profile,user_media` +
                `&response_type=code`;

            setLoading(OAuthLoadingStates.REQUESTING_PERMISSIONS);

            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

            if (result.type === 'success' && result.url) {
                const code = new URLSearchParams(result.url.split('?')[1]).get('code');

                if (code) {
                    // Sincronizar con backend usando el codigo
                    setLoading(OAuthLoadingStates.SYNCING_WITH_BACKEND);

                    const response = await fetch(Config.API_ENDPOINTS.AUTH_SOCIAL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            provider: 'instagram',
                            accessToken: code,
                        }),
                    });

                    const data = await response.json();

                    if (data.token) {
                        const userData = {
                            ...data.user,
                            plan: data.user.plan || 'Gratis',
                        };

                        await AsyncStorage.setItem('user', JSON.stringify(userData));
                        await AsyncStorage.setItem('token', data.token);

                        setCurrentUser(userData);
                        setLoading(OAuthLoadingStates.SUCCESS);

                        if (onSuccess) {
                            onSuccess(userData, data.isNewUser);
                        }

                        return { success: true, user: userData };
                    }

                    throw new Error(data.error || 'Error en autenticacion');
                }
            }

            if (result.type === 'cancel') {
                throw { code: OAuthErrorCodes.INSTAGRAM.CANCELLED };
            }

            throw new Error('No se obtuvo codigo de Instagram');

        } catch (err) {
            handleError('instagram', err, 'Error al iniciar sesion con Instagram');
            return { success: false, error: err };
        } finally {
            isAuthenticating.current = false;
            setIsLoading(false);
        }
    }, [handleError, onSuccess, setLoading]);

    // Logout
    const logout = useCallback(async () => {
        try {
            setIsLoading(true);

            // Obtener tokens actuales
            const token = await AsyncStorage.getItem('token');
            const userStr = await AsyncStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            // Determinar el proveedor usado
            const provider = user?.googleId ? 'google' :
                user?.facebookId ? 'facebook' :
                    user?.instagramId ? 'instagram' : 'email';

            // Llamar al endpoint de logout
            if (token) {
                await fetch(Config.API_ENDPOINTS.AUTH_LOGOUT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ provider }),
                });
            }

            // Cerrar sesion de Supabase
            await supabase.auth.signOut();

            // Limpiar almacenamiento local
            await AsyncStorage.multiRemove(['user', 'token']);

            setCurrentUser(null);

            return { success: true };

        } catch (err) {
            console.error('[useOAuthAuth] Error en logout:', err);
            // Limpiar almacenamiento local de todas formas
            await AsyncStorage.multiRemove(['user', 'token']);
            return { success: false, error: err };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Vincular cuenta OAuth
    const linkAccount = useCallback(async (provider) => {
        try {
            setIsLoading(true);
            setError(null);
            setLoading(OAuthLoadingStates.INITIALIZING);

            const token = await AsyncStorage.getItem('token');

            if (!token) {
                throw new Error('No hay sesion activa');
            }

            // Obtener token OAuth segun el proveedor
            let oauthToken = null;
            let tokenType = 'accessToken';

            if (provider === 'google') {
                // Intentar login nativo
                if (GoogleSignin) {
                    await GoogleSignin.hasPlayServices();
                    const userInfo = await GoogleSignin.signIn();
                    oauthToken = userInfo.data?.idToken || userInfo.idToken;
                    tokenType = 'idToken';
                }
            }

            if (!oauthToken) {
                // Fallback a web auth
                const result = await loginWithOAuthWeb(provider);
                if (result.success) {
                    oauthToken = result.accessToken;
                }
            }

            if (!oauthToken) {
                throw new Error('No se pudo obtener token del proveedor');
            }

            // Enviar al backend
            setLoading(OAuthLoadingStates.SYNCING_WITH_BACKEND);

            const response = await fetch(Config.API_ENDPOINTS.AUTH_LINK_ACCOUNT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    provider,
                    [tokenType === 'idToken' ? 'idToken' : 'accessToken']: oauthToken,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al vincular cuenta');
            }

            setLoading(OAuthLoadingStates.SUCCESS);

            return { success: true, message: data.message };

        } catch (err) {
            handleError(provider, err, 'Error al vincular cuenta');
            return { success: false, error: err };
        } finally {
            setIsLoading(false);
        }
    }, [loginWithOAuthWeb, handleError, setLoading]);

    // Funcion generica de login por proveedor
    const login = useCallback(async (provider) => {
        switch (provider.toLowerCase()) {
            case 'google':
                return loginWithGoogle();
            case 'facebook':
                return loginWithFacebook();
            case 'instagram':
                return loginWithInstagram();
            default:
                return { success: false, error: { message: 'Proveedor no soportado' } };
        }
    }, [loginWithGoogle, loginWithFacebook, loginWithInstagram]);

    // Limpiar error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Reset loading state
    const resetLoading = useCallback(() => {
        setLoading(OAuthLoadingStates.IDLE, '');
        setIsLoading(false);
    }, [setLoading]);

    // Cargar usuario desde AsyncStorage al iniciar
    useEffect(() => {
        const loadUser = async () => {
            try {
                const userStr = await AsyncStorage.getItem('user');
                if (userStr) {
                    setCurrentUser(JSON.parse(userStr));
                }
            } catch (err) {
                console.error('[useOAuthAuth] Error cargando usuario:', err);
            }
        };

        loadUser();
    }, []);

    // Configurar listener de Supabase para sincronizacion automatica
    useEffect(() => {
        if (!autoSync) return;

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[useOAuthAuth] Auth event:', event);

            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                const provider = session.user?.app_metadata?.provider || 'google';
                const providerToken = session.provider_token;
                const providerIdToken = session.provider_id_token;

                if (providerIdToken || providerToken) {
                    const tokenType = providerIdToken ? 'idToken' : 'accessToken';
                    const token = providerIdToken || providerToken;

                    // Sincronizar con backend
                    await syncWithBackend(token, provider);
                } else if (session.access_token) {
                    // Usar el token de Supabase directamente
                    await syncWithBackend(session.access_token, provider);
                }
            }
        });

        return () => {
            if (authListener?.subscription) {
                authListener.subscription.unsubscribe();
            }
        };
    }, [autoSync, syncWithBackend]);

    return {
        // Estado
        isLoading,
        loadingState,
        loadingMessage,
        error,
        currentUser,
        isAuthenticated: !!currentUser,

        // Funciones de login
        login,
        loginWithGoogle,
        loginWithFacebook,
        loginWithInstagram,

        // Funciones de gestion
        logout,
        linkAccount,

        // Utilidades
        clearError,
        resetLoading,
        setLoading,
        syncWithBackend,
    };
};

export default useOAuthAuth;