import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, TouchableOpacity, TextInput, Platform, Animated, ActivityIndicator, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NexusAlert from '../components/NexusAlert';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

import Config from '../constants/Config';
import { supabase } from '../lib/supabase';
import { isValidEmail, parseAuthError } from '../utils/authErrorHandler';

const BACKEND_URL = Config.BACKEND_URL;

const NeoPulseRing = ({ scale }) => {
    return (
        <Animated.View
            style={[
                styles.logoPulseRing,
                {
                    transform: [{ scale }],
                }
            ]}
        />
    );
};

let GoogleSignin = null;
let statusCodes = {};
try {
    if (NativeModules.RNGoogleSignin) {
        const GoogleModule = require('@react-native-google-signin/google-signin');
        GoogleSignin = GoogleModule.GoogleSignin;
        statusCodes = GoogleModule.statusCodes;
    }
} catch (e) {
    console.log('Error al cargar módulo nativo de Google:', e);
}

const InputField = memo(({ label, icon, value, onChangeText, editable, keyboardType, isPassword, placeholder, returnKeyType }) => {
    const [showText, setShowText] = useState(false);
    const toggleShow = useCallback(() => setShowText(v => !v), []);

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={styles.inputWrapper}>
                <Ionicons name={icon} size={18} color="#555" />
                <TextInput
                    placeholder={placeholder}
                    placeholderTextColor="#52525B"
                    value={value}
                    onChangeText={onChangeText}
                    style={styles.input}
                    editable={editable}
                    keyboardType={keyboardType}
                    secureTextEntry={isPassword && !showText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    spellCheck={false}
                    returnKeyType={returnKeyType}
                    underlineColorAndroid="transparent"
                    selectionColor="#63ff15"
                />
                {isPassword && (
                    <TouchableOpacity onPress={toggleShow} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={showText ? 'eye-outline' : 'eye-off-outline'} size={18} color="#555" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

export default function Login() {
    const navigation = useNavigation();
    const [usuario, setUsuario] = useState('');
    const [contraseña, setContraseña] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    const handleUsuarioChange = useCallback((text) => setUsuario(text), []);
    const handleContraseñaChange = useCallback((text) => setContraseña(text), []);

    const showAlert = (title, message, type = 'info', onConfirm = null) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setAlertConfig(prev => ({ ...prev, visible: false }));
            }
        });
    };

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;
    const pulseRingScale = useRef(new Animated.Value(0.8)).current;

    const syncWithBackend = async (supabaseAccessToken) => {
        try {
            console.log('🔄 Sincronizando sesión de Supabase con el backend de Nexus...');
            console.log('🔗 URL completa:', `${BACKEND_URL}/auth/supabase-sync`);

            const response = await fetch(`${BACKEND_URL}/auth/supabase-sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: supabaseAccessToken })
            });

            console.log('📊 Response status:', response.status);
            const text = await response.text();

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('❌ Respuesta no es JSON. Content-Type:', contentType);
                if (response.status === 404) {
                    showAlert(
                        'Error de Configuración',
                        'La ruta de sincronización no está disponible en el servidor. Por favor, verifica que el backend esté actualizado.',
                        'error'
                    );
                } else {
                    showAlert(
                        'Error del Servidor',
                        'El servidor no respondió correctamente. Por favor, intenta de nuevo.',
                        'error'
                    );
                }
                return;
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error('❌ Error parseando JSON:', e);
                showAlert(
                    'Error de Respuesta',
                    'El servidor devolvió datos inválidos. Por favor, intenta de nuevo.',
                    'error'
                );
                return;
            }

            if (!response.ok) {
                console.error('❌ Error HTTP:', response.status, data);
                showAlert(
                    'Error de Autenticación',
                    data.error || 'Error al sincronizar la sesión. Por favor, intenta de nuevo.',
                    'error'
                );
                return;
            }

            if (data.token) {
                console.log('✅ Sincronización exitosa, token de Nexus actualizado');
                const userData = {
                    ...data.user,
                    plan: data.user.plan || "Gratis"
                };
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                await AsyncStorage.setItem('token', data.token);

                if (data.isNewUser || !data.user.peso || !data.user.altura) {
                    navigation.navigate('WelcomePlans');
                } else {
                    navigation.replace('MainTabs');
                }
            } else {
                console.error('❌ Sincronización fallida (sin token):', data.error || 'Error desconocido');
                showAlert(
                    'Error de Sincronización',
                    data.error || 'No se pudo completar la autenticación. Por favor, intenta de nuevo.',
                    'error'
                );
            }
        } catch (error) {
            console.error('❌ Error de red sincronizando con el backend:', error);
            showAlert(
                'Error de Conexión',
                'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
                'error'
            );
        }
    };

    useEffect(() => {
        checkAutoLogin();

        try {
            if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
                GoogleSignin.configure({
                    webClientId: Config.GOOGLE_WEB_CLIENT_ID,
                    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
                    offlineAccess: true,
                });
            } else {
                console.warn('GoogleSignin no está disponible en este entorno');
            }
        } catch (e) {
            console.error('Error al configurar Google Sign-In:', e);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('📡 Auth event:', event, !!session ? 'con sesión' : 'sin sesión');

            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                const provider = session.user?.app_metadata?.provider || 'google';
                const providerToken = session.provider_token;
                const providerIdToken = session.provider_id_token;

                if (providerIdToken || providerToken) {
                    console.log(`🔄 Sincronizando con el backend (${provider}) usando token del proveedor...`);
                    handleSocialAuth(
                        provider,
                        providerIdToken || providerToken,
                        providerIdToken ? 'idToken' : 'accessToken'
                    );
                } else {
                    syncWithBackend(session.access_token);
                }
            }
        });

        // Animación inicial
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulse ring animation loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseRingScale, {
                    toValue: 1.1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseRingScale, {
                    toValue: 0.8,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        return () => {
            if (authListener && authListener.subscription) {
                authListener.subscription.unsubscribe();
            }
        };
    }, []);

    const checkAutoLogin = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const user = await AsyncStorage.getItem('user');
            if (token && user) {
                setTimeout(() => {
                    navigation.replace('MainTabs');
                }, 500);
            }
        } catch (e) { }
    };

    const handleSocialAuth = async (provider, token, tokenType = 'accessToken') => {
        try {
            setIsLoading(true);
            const body = { provider };
            if (tokenType === 'idToken') {
                body.idToken = token;
            } else {
                body.accessToken = token;
            }

            console.log(`📡 Enviando token de ${provider} al backend...`);
            const response = await fetch(`${BACKEND_URL}/auth/social`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            console.log(`📡 Respuesta del backend recibida (${response.status})`);

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('❌ Respuesta no es JSON. Content-Type:', contentType);
                const text = await response.text();
                console.error('📄 Respuesta recibida:', text.substring(0, 500));

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showAlert(
                    'Error de Servidor',
                    'El servidor no respondió correctamente. Por favor, intenta de nuevo.',
                    'error'
                );
                setIsLoading(false);
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ Error HTTP:', response.status, data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showAlert(
                    'Error de Autenticación',
                    data.error || 'Error al iniciar sesión con ' + provider,
                    'error'
                );
                setIsLoading(false);
                return;
            }

            if (data.requiresVerification) {
                setIsLoading(false);
                navigation.navigate('Verification', { email: data.user.email });
                return;
            }

            if (data.token) {
                const userData = {
                    ...data.user,
                    plan: data.user.plan || "Gratis"
                };
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                await AsyncStorage.setItem('token', data.token);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                if (data.isNewUser || !data.user.peso || !data.user.altura) {
                    navigation.navigate('WelcomePlans');
                } else {
                    navigation.replace('MainTabs');
                }
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showAlert(
                    'Error',
                    data.error || 'Error en autenticación. Por favor, intenta de nuevo.',
                    'error'
                );
                setIsLoading(false);
            }
        } catch (error) {
            console.error('❌ Error en handleSocialAuth:', error.message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showAlert(
                'Error de Conexión',
                'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
                'error'
            );
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!usuario || !contraseña) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showAlert("Campos Requeridos", "Por favor, introduce tu email y contraseña", "warning");
            return;
        }

        if (!isValidEmail(usuario)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showAlert("Email Inválido", "Por favor, introduce un email válido (ej: usuario@ejemplo.com)", "warning");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: usuario, password: contraseña })
            });

            console.log('📊 Login response status:', response.status);

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.error('❌ Respuesta no es JSON. Content-Type:', contentType);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const errorInfo = parseAuthError(null, response, {});
                showAlert(errorInfo.title, errorInfo.message, "error");
                setIsLoading(false);
                return;
            }

            const data = await response.json();

            if (data.requires2FA) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setIsLoading(false);
                console.log('✅ 2FA requerido');
                navigation.navigate('Verification', { email: data.email });
                return;
            }

            if (!response.ok || !data.token) {
                console.error('❌ Error HTTP:', response.status, data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const errorInfo = parseAuthError(null, response, data);
                showAlert(errorInfo.title, errorInfo.message || data.error, "error");
                setIsLoading(false);
                return;
            }

            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            await AsyncStorage.setItem('token', data.token);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            console.log('✅ Login exitoso');
            navigation.replace('MainTabs');

        } catch (error) {
            console.error('❌ Error en handleLogin:', error.message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errorInfo = parseAuthError(error);
            showAlert(errorInfo.title, errorInfo.message, "error");
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (platform) => {
        if (platform === 'Google') {
            try {
                setIsLoading(true);

                try {
                    if (!GoogleSignin) throw new Error('Native module missing');
                    await GoogleSignin.hasPlayServices();
                } catch (e) {
                    console.log('Utilizando fallback web para Google Auth...');

                    const redirectUri = AuthSession.makeRedirectUri({
                        useProxy: true,
                        projectNameForProxy: '@ayoubito04/nexus-fitness',
                    });
                    console.log('🔗 Redirect URI generada:', redirectUri);

                    const { data, error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: redirectUri,
                            skipBrowserRedirect: true,
                        }
                    });

                    if (error) {
                        console.error('❌ Error en signInWithOAuth:', error);
                        throw error;
                    }

                    if (data?.url) {
                        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

                        if (result.type === 'success' && result.url) {
                            const urlObj = new URL(result.url.replace('#', '?'));
                            const access_token = urlObj.searchParams.get('access_token');
                            const refresh_token = urlObj.searchParams.get('refresh_token');

                            if (access_token) {
                                console.log('✅ Token obtenido, registrando sesión...');
                                try {
                                    await supabase.auth.setSession({
                                        access_token,
                                        refresh_token: refresh_token || '',
                                    });
                                } catch (sessionError) {
                                    if (!sessionError.message?.includes('setAuth')) {
                                        throw sessionError;
                                    }
                                }
                            } else {
                                setIsLoading(false);
                            }
                        } else {
                            setIsLoading(false);
                        }
                    }
                    return;
                }

                const userInfo = await GoogleSignin.signIn();
                const idToken = userInfo.data?.idToken || userInfo.idToken;

                if (!idToken) {
                    throw new Error('No se pudo obtener el ID Token de Google');
                }

                try {
                    const { error: authError } = await supabase.auth.signInWithIdToken({
                        provider: 'google',
                        token: idToken,
                    });

                    if (authError) throw authError;
                } catch (internalError) {
                    if (!internalError.message?.includes('setAuth')) {
                        throw internalError;
                    }
                }

            } catch (error) {
                console.error('Google Sign-In Error:', error);
                if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                } else if (error.code === statusCodes.IN_PROGRESS) {
                } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                    showAlert("Servicios", "Google Play Services no está disponible", "error");
                } else {
                    showAlert("Error", "No se pudo iniciar sesión con Google nativo. Verifica tu configuración.", "error");
                }
                setIsLoading(false);
            }
        } else if (platform === 'Facebook') {
            try {
                setIsLoading(true);

                const redirectUri = AuthSession.makeRedirectUri({
                    useProxy: true,
                    projectNameForProxy: '@ayoubito04/nexus-fitness'
                });

                console.log('🔗 Facebook Redirect URI:', redirectUri);

                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'facebook',
                    options: {
                        redirectTo: redirectUri,
                        skipBrowserRedirect: true,
                    }
                });

                if (error) throw error;

                if (data?.url) {
                    console.log('🌐 Abriendo navegador para Facebook...');
                    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

                    if (result.type === 'success' && result.url) {
                        console.log('✅ Retorno exitoso de Facebook');
                        const urlObj = new URL(result.url.replace('#', '?'));
                        const access_token = urlObj.searchParams.get('access_token');
                        const refresh_token = urlObj.searchParams.get('refresh_token');

                        if (access_token) {
                            console.log('💎 Token de Facebook obtenido, registrando sesión...');
                            await supabase.auth.setSession({
                                access_token,
                                refresh_token: refresh_token || '',
                            });
                        }
                    } else {
                        console.log('⚠️ Login de Facebook cancelado o fallido:', result.type);
                        setIsLoading(false);
                    }
                }
            } catch (error) {
                console.error('Facebook Sign-In Error:', error);
                showAlert("Error", "No se pudo iniciar sesión con Facebook", "error");
                setIsLoading(false);
            }
        } else if (platform === 'Instagram') {
            try {
                setIsLoading(true);

                const redirectUri = AuthSession.makeRedirectUri({
                    scheme: 'nexus-fitness',
                });

                const instagramClientId = Config.INSTAGRAM_CLIENT_ID || Config.FACEBOOK_APP_ID;

                if (!instagramClientId || instagramClientId === 'tu_instagram_client_id') {
                    showAlert("Configuración", "Instagram no está configurado. Se requiere un Client ID válido.", "info");
                    setIsLoading(false);
                    return;
                }

                const authUrl = `https://api.instagram.com/oauth/authorize?` +
                    `client_id=${instagramClientId}` +
                    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                    `&scope=user_profile,user_media` +
                    `&response_type=code`;

                const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

                if (result.type === 'success' && result.url) {
                    const code = new URLSearchParams(result.url.split('?')[1]).get('code');
                    if (code) {
                        handleSocialAuth('instagram', code);
                    }
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Instagram Sign-In Error:', error);
                setIsLoading(false);
                showAlert("Error", "No se pudo iniciar sesión con Instagram", "error");
            }
        }
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <StatusBar style="light" />
                <ScrollView contentContainerStyle={styles.scrollWrapper} keyboardShouldPersistTaps="handled">

                    {/* Logo / Header */}
                    <Animated.View style={[
                        styles.headerSection,
                        {
                            opacity: fadeAnim,
                            transform: [
                                { translateY: slideAnim },
                                { scale: logoScale },
                            ]
                        }
                    ]}>
                        <View style={styles.logoContainer}>
                            <NeoPulseRing scale={pulseRingScale} />
                            <View style={styles.logoBox}>
                                <Text style={styles.logoText}>N</Text>
                            </View>
                        </View>
                        <Text style={styles.brandName}>NEXUS</Text>
                        <Text style={styles.brandTagline}>EL FUTURO DEL ENTRENAMIENTO</Text>
                    </Animated.View>

                    {/* Login Card */}
                    <Animated.View style={[styles.loginCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Text style={styles.cardTitle}>INICIAR SESIÓN</Text>

                        <InputField
                            label="Email"
                            icon="mail-outline"
                            value={usuario}
                            onChangeText={handleUsuarioChange}
                            editable={!isLoading}
                            keyboardType="email-address"
                            placeholder="tu@email.com"
                            returnKeyType="next"
                        />

                        <InputField
                            label="Contraseña"
                            icon="lock-closed-outline"
                            value={contraseña}
                            onChangeText={handleContraseñaChange}
                            editable={!isLoading}
                            isPassword={true}
                            placeholder="••••••••"
                            returnKeyType="done"
                        />

                        <TouchableOpacity
                            style={styles.mainBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                handleLogin();
                            }}
                            disabled={isLoading}
                            activeOpacity={0.8}
                            data-testid="login-btn"
                        >
                            <LinearGradient
                                colors={['#63ff15', '#4dd10e']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.mainBtnGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#000" size="small" />
                                ) : (
                                    <Text style={styles.btnText}>INICIAR SESIÓN</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.dividerBox}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>O CONTINÚA CON</Text>
                            <View style={styles.line} />
                        </View>

                        <View style={styles.socialGrid}>
                            <TouchableOpacity
                                style={[styles.socialBtn, { flex: 1 }]}
                                onPress={() => handleSocialLogin('Google')}
                                disabled={isLoading}
                                activeOpacity={0.7}
                                accessibilityLabel="Iniciar sesión con Google"
                                accessibilityRole="button"
                            >
                                <Ionicons name="logo-google" size={18} color="#fff" />
                                <Text style={styles.socialText}>Continuar con Google</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <Animated.View style={{ opacity: fadeAnim }}>
                        <TouchableOpacity
                            style={styles.footerLink}
                            onPress={() => navigation.navigate('Register')}
                            disabled={isLoading}
                            activeOpacity={0.7}
                            data-testid="register-link"
                        >
                            <Text style={styles.footerText}>¿No tienes cuenta? <Text style={styles.neonText}>Regístrate</Text></Text>
                        </TouchableOpacity>
                    </Animated.View>

                </ScrollView>
            </KeyboardAvoidingView>

            <NexusAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    scrollWrapper: {
        padding: 24,
        paddingTop: 20,
        alignItems: 'center',
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoPulseRing: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#63ff15',
        opacity: 0.4,
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#121212',
        borderWidth: 1.5,
        borderColor: '#63ff15',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 25,
    },
    logoText: {
        fontSize: 42,
        fontWeight: '900',
        color: '#63ff15',
        letterSpacing: 1,
    },
    brandName: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 8,
        marginTop: 6,
    },
    brandTagline: {
        fontSize: 11,
        color: '#63ff15',
        marginTop: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    loginCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.18)',
        marginBottom: 20,
        shadowColor: '#63ff15',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 28,
        textAlign: 'center',
        letterSpacing: 2,
    },
    inputContainer: {
        marginBottom: 20,
    },
    fieldLabel: {
        color: '#63ff15',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 2,
        letterSpacing: 1,
        opacity: 0.7,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
        borderRadius: 10,
        minHeight: 52,
    },
    inputFocused: {
        borderColor: '#63ff15',
        backgroundColor: 'rgba(99,255,21,0.08)',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        padding: 0,
        margin: 0,
    },
    mainBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 16,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 24,
        elevation: 15,
    },
    mainBtnGradient: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    dividerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 28,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(99,255,21,0.2)',
    },
    dividerText: {
        color: '#52525B',
        marginHorizontal: 14,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    socialGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    socialBtn: {
        flex: 1,
        height: 56,
        backgroundColor: 'rgba(30,30,30,0.8)',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
    },
    socialText: {
        color: '#E4E4E7',
        fontSize: 12,
        fontWeight: '600',
    },
    footerLink: {
        marginTop: 16,
        marginBottom: 20,
    },
    footerText: {
        color: '#71717A',
        fontSize: 14,
        textAlign: 'center',
    },
    neonText: {
        color: '#63ff15',
        fontWeight: '700',
    },
});
