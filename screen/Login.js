import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, TouchableOpacity, TextInput, Platform, Animated, ActivityIndicator, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NexusAlert from '../components/NexusAlert';

WebBrowser.maybeCompleteAuthSession();

import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

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

    useEffect(() => {
        checkAutoLogin();

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const checkAutoLogin = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const user = await AsyncStorage.getItem('user');
            if (token && user) {
                // Pequeño delay para dejar que la animación brille un poco
                setTimeout(() => {
                    navigation.replace('Home');
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

            const response = await fetch(`${BACKEND_URL}/auth/social`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.requiresVerification) {
                setIsLoading(false);
                navigation.navigate('Verification', { email: data.user.email });
                return;
            }

            if (data.token) {
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                await AsyncStorage.setItem('token', data.token);
                navigation.navigate('Home');
            } else {
                showAlert("Error", data.error || "Error en autenticación", "error");
                setIsLoading(false);
            }
        } catch (error) {
            showAlert("Error de Red", "No se pudo conectar al servidor", "error");
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!usuario || !contraseña) {
            showAlert("Atención", "Por favor, introduce tus credenciales", "warning");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: usuario, password: contraseña })
            });

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();

                if (data.requires2FA) {
                    setIsLoading(false);
                    navigation.navigate('Verification', { email: data.email });
                    return;
                }

                if (data.token) {
                    await AsyncStorage.setItem('user', JSON.stringify(data.user));
                    await AsyncStorage.setItem('token', data.token);
                    navigation.navigate('Home');
                } else {
                    showAlert("Error", data.error || "Credenciales incorrectas", "error");
                    setIsLoading(false);
                }
            } else {
                showAlert("Error", "Error en el servidor", "error");
                setIsLoading(false);
            }
        } catch (error) {
            showAlert("Error de Conexión", "Revisa que el backend esté corriendo.", "error");
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (platform) => {
        if (platform === 'Google') {
            try {
                setIsLoading(true);
                const redirectUri = "https://auth.expo.io/@ayoubito04/nexus-fitness";

                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                    `client_id=${Config.GOOGLE_WEB_CLIENT_ID}` +
                    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                    `&response_type=id_token` +
                    `&scope=${encodeURIComponent('openid email profile')}` +
                    `&nonce=${Math.random().toString(36)}`;

                const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

                if (result.type === 'success' && result.url) {
                    const hashParams = new URLSearchParams(result.url.split('#')[1] || '');
                    const idToken = hashParams.get('id_token');

                    if (idToken) {
                        handleSocialAuth('google', idToken, 'idToken');
                    } else {
                        setIsLoading(false);
                    }
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                showAlert("Error", "No se pudo iniciar sesión con Google", "error");
                setIsLoading(false);
            }
        } else if (platform === 'Facebook') {
            try {
                setIsLoading(true);
                const redirectUri = "https://auth.expo.io/@ayoubito04/nexus-fitness";
                const fbAppId = Config.FACEBOOK_APP_ID;

                if (!fbAppId || fbAppId === 'tu_facebook_app_id') {
                    showAlert("Configuración", "El Facebook App ID no está configurado en el archivo constants/Config.js", "warning");
                    setIsLoading(false);
                    return;
                }

                const authUrl = `https://www.facebook.com/v11.0/dialog/oauth?` +
                    `client_id=${fbAppId}` +
                    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                    `&response_type=token` +
                    `&scope=${encodeURIComponent('email,public_profile')}`;

                const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

                if (result.type === 'success' && result.url) {
                    const urlParts = result.url.split('#');
                    if (urlParts.length > 1) {
                        const params = new URLSearchParams(urlParts[1]);
                        const accessToken = params.get('access_token');
                        if (accessToken) {
                            handleSocialAuth('facebook', accessToken);
                        }
                    }
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                setIsLoading(false);
            }
        } else if (platform === 'Instagram') {
            try {
                setIsLoading(true);
                const redirectUri = "https://auth.expo.io/@ayoubito04/nexus-fitness";
                // Usamos el CLIENT_ID de Instagram o el de Facebook si están vinculados
                const instagramClientId = Config.INSTAGRAM_CLIENT_ID || Config.FACEBOOK_APP_ID;

                if (!instagramClientId || instagramClientId === 'tu_instagram_client_id') {
                    showAlert("Configuración", "Instagram no está configurado. Se intentará usar Facebook.", "info");
                    // Fallback a Facebook si no hay ID de Instagram específico
                    handleSocialLogin('Facebook');
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
                setIsLoading(false);
                showAlert("Error", "No se pudo iniciar sesión con Instagram", "error");
            }
        }
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <StatusBar style="light" />
                <ScrollView contentContainerStyle={styles.scrollWrapper} keyboardShouldPersistTaps="handled">

                    {/* Logo / Header */}
                    <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: logoScale }] }]}>
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={['rgba(99,255,21,0.2)', 'transparent']}
                                style={styles.logoGlow}
                            />
                            <View style={styles.logoBox}>
                                <Text style={styles.logoText}>N</Text>
                            </View>
                        </View>
                        <Text style={styles.brandName}>NEXUS</Text>
                        <Text style={styles.brandTagline}>Tu entrenador con IA</Text>
                    </Animated.View>

                    {/* Login Card */}
                    <Animated.View style={[styles.loginCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Text style={styles.cardTitle}>Iniciar Sesión</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.fieldLabel}>Email</Text>
                            <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
                                <Ionicons name="mail-outline" size={18} color={focusedInput === 'email' ? '#63ff15' : '#52525B'} />
                                <TextInput
                                    placeholder="tu@email.com"
                                    placeholderTextColor="#3F3F46"
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
                                <Ionicons name="lock-closed-outline" size={18} color={focusedInput === 'password' ? '#63ff15' : '#52525B'} />
                                <TextInput
                                    placeholder="••••••••"
                                    placeholderTextColor="#3F3F46"
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
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#52525B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.mainBtn}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                            data-testid="login-btn"
                        >
                            <LinearGradient
                                colors={['#63ff15', '#4dd10e']}
                                style={styles.mainBtnGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#000" size="small" />
                                ) : (
                                    <Text style={styles.btnText}>ENTRAR</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.dividerBox}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>O continúa con</Text>
                            <View style={styles.line} />
                        </View>

                        <View style={styles.socialGrid}>
                            <TouchableOpacity
                                style={styles.socialBtn}
                                onPress={() => handleSocialLogin('Google')}
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="logo-google" size={20} color="#EA4335" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.socialBtn}
                                onPress={() => handleSocialLogin('Facebook')}
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.socialBtn}
                                onPress={() => handleSocialLogin('Instagram')}
                                disabled={isLoading}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="logo-instagram" size={20} color="#E4405F" />
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
        paddingTop: 40,
        alignItems: 'center',
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logoContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    logoGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        top: -20,
        left: -20,
    },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: '#121212',
        borderWidth: 2,
        borderColor: '#63ff15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 40,
        fontWeight: '900',
        color: '#63ff15',
    },
    brandName: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 6,
    },
    brandTagline: {
        fontSize: 13,
        color: '#52525B',
        marginTop: 6,
        fontWeight: '500',
    },
    loginCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#121212',
        borderRadius: 24,
        padding: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    cardTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 24,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    inputContainer: {
        marginBottom: 18,
    },
    fieldLabel: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 52,
        gap: 10,
    },
    inputFocused: {
        borderColor: '#63ff15',
        backgroundColor: 'rgba(99,255,21,0.03)',
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
    },
    mainBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
    },
    mainBtnGradient: {
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    dividerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#27272A',
    },
    dividerText: {
        color: '#52525B',
        marginHorizontal: 14,
        fontSize: 12,
        fontWeight: '600',
    },
    socialGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    socialBtn: {
        flex: 1,
        height: 50,
        backgroundColor: '#18181B',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#27272A',
    },
    socialBtnText: {
        color: '#E4E4E7',
        fontSize: 14,
        fontWeight: '600',
    },
    footerLink: {
        marginTop: 28,
    },
    footerText: {
        color: '#71717A',
        fontSize: 14,
    },
    neonText: {
        color: '#63ff15',
        fontWeight: '700',
    },
});
