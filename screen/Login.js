import React, { useState, useEffect, useRef } from 'react';
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
import { colors, typography, spacing, radius, shadows, rs } from '../theme';

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

export default function Login() {
    const navigation = useNavigation();
    const [focusedInput, setFocusedInput] = useState(null);
    const [usuario, setUsuario] = useState('');
    const [contraseña, setContraseña] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

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

                        <View style={styles.inputContainer}>
                            <Text style={styles.fieldLabel}>Email</Text>
                            <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
                                <Ionicons name="mail-outline" size={18} color="#555" />
                                <TextInput
                                    placeholder="tu@email.com"
                                    placeholderTextColor="#52525B"
                                    value={usuario}
                                    onChangeText={setUsuario}
                                    style={styles.input}
                                    onFocus={() => setFocusedInput('email')}
                                    onBlur={() => setFocusedInput(null)}
                                    editable={!isLoading}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    data-testid="email-input"
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.fieldLabel}>Contraseña</Text>
                            <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputFocused]}>
                                <Ionicons name="lock-closed-outline" size={18} color="#555" />
                                <TextInput
                                    placeholder="••••••••"
                                    placeholderTextColor="#52525B"
                                    secureTextEntry={!showPassword}
                                    value={contraseña}
                                    onChangeText={setContraseña}
                                    style={styles.input}
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                    editable={!isLoading}
                                    data-testid="password-input"
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#555" />
                                </TouchableOpacity>
                            </View>
                        </View>

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

                        <TouchableOpacity
                            style={styles.googleBtn}
                            onPress={() => handleSocialLogin('Google')}
                            disabled={isLoading}
                            activeOpacity={0.75}
                            accessibilityLabel="Iniciar sesión con Google"
                            accessibilityRole="button"
                        >
                            <Ionicons name="logo-google" size={20} color="#fff" />
                            <Text style={styles.googleBtnText}>Continuar con Google</Text>
                        </TouchableOpacity>
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
        backgroundColor: colors.background,
    },
    scrollWrapper: {
        padding: spacing.xl,
        paddingTop: spacing.lg,
        alignItems: 'center',
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoPulseRing: {
        position: 'absolute',
        width: rs(100),
        height: rs(100),
        borderRadius: rs(50),
        borderWidth: 2,
        borderColor: colors.primary,
        opacity: 0.4,
    },
    logoBox: {
        width: rs(80),
        height: rs(80),
        borderRadius: radius.xxl,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.logoGlow,
    },
    logoText: {
        fontSize: rs(42),
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 1,
    },
    brandName: {
        fontSize: rs(32),
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: 8,
        marginTop: spacing.xs,
    },
    brandTagline: {
        fontSize: rs(11),
        color: colors.primary,
        marginTop: spacing.sm,
        fontWeight: '700',
        letterSpacing: 2,
    },
    loginCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.surfaceHighlight,
        borderRadius: radius.xxl,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        marginBottom: spacing.lg,
        ...shadows.cardMd,
    },
    cardTitle: {
        color: colors.textPrimary,
        fontSize: rs(20),
        fontWeight: '800',
        marginBottom: spacing.xxl,
        textAlign: 'center',
        letterSpacing: 2,
    },
    inputContainer: {
        marginBottom: spacing.lg,
    },
    fieldLabel: {
        color: colors.primary,
        fontSize: rs(10),
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: spacing.sm,
        marginLeft: 2,
        letterSpacing: 1,
        opacity: 0.7,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderDim,
        paddingHorizontal: spacing.base,
        height: rs(52),
        gap: spacing.md,
        borderRadius: radius.md,
    },
    inputFocused: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryGlow,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
    },
    input: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: rs(16),
        fontWeight: '500',
    },
    mainBtn: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginTop: spacing.base,
        ...shadows.primaryGlowLg,
    },
    mainBtnGradient: {
        height: rs(56),
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#000',
        fontSize: rs(15),
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    dividerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xxl,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: colors.primaryDim,
    },
    dividerText: {
        color: colors.textMuted,
        marginHorizontal: 14,
        fontSize: rs(11),
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    googleBtn: {
        height: rs(56),
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
    },
    googleBtnText: {
        color: colors.textSecondary,
        fontSize: rs(14),
        fontWeight: '700',
    },
    footerLink: {
        marginTop: spacing.base,
        marginBottom: spacing.lg,
        minHeight: 44,
        justifyContent: 'center',
    },
    footerText: {
        color: colors.textTertiary,
        fontSize: rs(14),
        textAlign: 'center',
    },
    neonText: {
        color: colors.primary,
        fontWeight: '700',
    },
});
