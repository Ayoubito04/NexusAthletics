import React, { useState, useRef, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Config from '../constants/Config';
import NexusAlert from '../components/NexusAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius, shadows } from '../theme';

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { NativeModules } from 'react-native';
import { supabase } from '../lib/supabase';
import { isValidEmail, isValidPassword, parseAuthError } from '../utils/authErrorHandler';

WebBrowser.maybeCompleteAuthSession();

let GoogleSignin = null;
try {
    if (NativeModules.RNGoogleSignin) {
        const GoogleModule = require('@react-native-google-signin/google-signin');
        GoogleSignin = GoogleModule.GoogleSignin;
    }
} catch (e) {
    console.log('Error al cargar módulo nativo de Google en Register:', e);
}

const BACKEND_URL = Config.BACKEND_URL;

export default function Register() {
    const navigation = useNavigation();
    const [focusedInput, setFocusedInput] = useState(null);
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [email, setEmail] = useState('');
    const [contraseña, setContraseña] = useState('');
    const [confirmarContraseña, setConfirmarContraseña] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [referralCode, setReferralCode] = useState('');
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;

    useEffect(() => {
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
        ]).start();
    }, []);

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

    const handleRegister = async () => {
        if (!nombre || !apellido || !email || !contraseña || !confirmarContraseña) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showAlert("Campos Requeridos", "Por favor, completa todos los campos", "warning");
            return;
        }

        if (!isValidEmail(email)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showAlert("Email Inválido", "Por favor, introduce un email válido (ej: usuario@ejemplo.com)", "warning");
            return;
        }

        if (!isValidPassword(contraseña)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showAlert("Contraseña Débil", "La contraseña debe tener al menos 6 caracteres", "warning");
            return;
        }

        if (contraseña !== confirmarContraseña) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showAlert("Contraseñas No Coinciden", "Las contraseñas ingresadas no coinciden", "error");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${BACKEND_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, apellido, email, password: contraseña, referralCode })
            });

            console.log('📊 Register response status:', response.status);

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('❌ Respuesta no es JSON. Content-Type:', contentType);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const errorInfo = parseAuthError(null, response, {});
                showAlert(errorInfo.title, errorInfo.message, "error");
                setIsLoading(false);
                return;
            }

            const data = await response.json();

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
            console.log('✅ Registro exitoso');
            showAlert(
                "Bienvenido",
                "✨ Tu cuenta ha sido creada exitosamente. ¡Vamos a personalizarla!",
                "success",
                () => navigation.navigate('WelcomePlans')
            );

        } catch (error) {
            console.error('❌ Error en handleRegister:', error.message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errorInfo = parseAuthError(error);
            showAlert(errorInfo.title, errorInfo.message, "error");
            setIsLoading(false);
        }
    }

    const handleSocialAuth = async (provider, token, tokenType = 'accessToken') => {
        try {
            setIsLoading(true);

            const body = { provider };
            if (tokenType === 'idToken') {
                body.idToken = token;
            } else {
                body.accessToken = token;
            }

            console.log('[REGISTER] Body a enviar:', body);

            const response = await fetch(`${BACKEND_URL}/auth/social`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            console.log(`📊 Social auth response status: ${response.status}`);

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error('❌ Respuesta no es JSON. Content-Type:', contentType);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showAlert(
                    "Error de Servidor",
                    "El servidor no respondió correctamente. Por favor, intenta de nuevo.",
                    "error"
                );
                setIsLoading(false);
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ Error HTTP:', response.status, data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                showAlert(
                    "Error de Autenticación",
                    data.error || "Error al registrarse con " + provider,
                    "error"
                );
                setIsLoading(false);
                return;
            }

            if (data.requiresVerification) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
                    "Autenticación",
                    data.error || "Error en autenticación social. Por favor, intenta de nuevo.",
                    "error"
                );
                setIsLoading(false);
            }
        } catch (error) {
            console.error('❌ Error en handleSocialAuth:', error.message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showAlert(
                "Error de Conexión",
                "No se pudo conectar con el servidor. Verifica tu conexión a internet.",
                "error"
            );
            setIsLoading(false);
        }
    };

    const handleSocialRegister = async (provider) => {
        try {
            if (provider === 'Google') {
                try {
                    if (!GoogleSignin) throw new Error('Native module missing');
                    await GoogleSignin.hasPlayServices();
                    const userInfo = await GoogleSignin.signIn();
                    const idToken = userInfo.data?.idToken || userInfo.idToken;
                    if (idToken) handleSocialAuth('google', idToken, 'idToken');
                    return;
                } catch (e) {
                    console.log('Utilizando fallback web para Google Register...');
                }
            }

            setIsLoading(true);
            const redirectUri = AuthSession.makeRedirectUri({
                scheme: 'nexus-fitness',
            });

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider.toLowerCase(),
                options: {
                    redirectTo: redirectUri,
                    skipBrowserRedirect: true,
                }
            });

            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

                if (result.type === 'success' && result.url) {
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
                            if (!sessionError.message?.includes('setAuth')) {
                                throw sessionError;
                            }
                        }
                        handleSocialAuth(provider.toLowerCase(), access_token);
                    }
                }
                setIsLoading(false);
            }
        } catch (error) {
            console.error(`❌ Error en Register ${provider}:`, error);
            showAlert("Error", `No se pudo conectar con ${provider}`, "error");
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollWrapper} keyboardShouldPersistTaps="handled">

                    {/* Header Section */}
                    <Animated.View style={[
                        styles.headerSection,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}>
                        <Text style={styles.registerTitle}>ÚNETE A <Text style={styles.neonText}>NEXUS</Text></Text>
                        <Text style={styles.registerSubtitle}>⚡ EMPIEZA TU TRANSFORMACIÓN</Text>
                    </Animated.View>

                    {/* Referral Banner */}
                    <Animated.View style={[styles.referralBanner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Ionicons name="gift" size={16} color="#63ff15" />
                        <Text style={styles.referralBannerText}>
                            ¿Tienes un código de invitación?{' '}
                            <Text style={{ color: '#63ff15', fontWeight: '800' }}>Ingrésalo abajo</Text> y ambos obtendréis descuentos en el Plan Pro.
                        </Text>
                    </Animated.View>

                    {/* Form Card */}
                    <View style={styles.formCard}>

                        {/* Nombre Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.fieldLabel}>Nombre</Text>
                            <View style={[styles.inputWrapper, focusedInput === 'nombre' && styles.inputFocused]}>
                                <Ionicons name="person-outline" size={18} color={colors.textDim} />
                                <TextInput
                                    placeholder="Tu nombre"
                                    placeholderTextColor={colors.textPlaceholder}
                                    value={nombre}
                                    onChangeText={setNombre}
                                    onFocus={() => setFocusedInput('nombre')}
                                    onBlur={() => setFocusedInput(null)}
                                    editable={!isLoading}
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        {/* Apellido Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.fieldLabel}>Apellido</Text>
                            <View style={[styles.inputWrapper, focusedInput === 'apellido' && styles.inputFocused]}>
                                <Ionicons name="people-outline" size={18} color="#555" />
                                <TextInput
                                    placeholder="Tu apellido"
                                    placeholderTextColor={colors.textPlaceholder}
                                    value={apellido}
                                    onChangeText={setApellido}
                                    onFocus={() => setFocusedInput('apellido')}
                                    onBlur={() => setFocusedInput(null)}
                                    editable={!isLoading}
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.fieldLabel}>Email</Text>
                            <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputFocused]}>
                                <Ionicons name="mail-outline" size={18} color="#555" />
                                <TextInput
                                    placeholder="tu@email.com"
                                    placeholderTextColor={colors.textPlaceholder}
                                    value={email}
                                    onChangeText={setEmail}
                                    onFocus={() => setFocusedInput('email')}
                                    onBlur={() => setFocusedInput(null)}
                                    editable={!isLoading}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        {/* Contraseña Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.fieldLabel}>Contraseña</Text>
                            <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputFocused]}>
                                <Ionicons name="lock-closed-outline" size={18} color="#555" />
                                <TextInput
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textPlaceholder}
                                    value={contraseña}
                                    onChangeText={setContraseña}
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                    editable={!isLoading}
                                    secureTextEntry={!showPassword}
                                    style={styles.input}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#555" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirmar Contraseña Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.fieldLabel}>Confirmar Contraseña</Text>
                            <View style={[styles.inputWrapper, focusedInput === 'confirmPassword' && styles.inputFocused]}>
                                <Ionicons name="shield-checkmark-outline" size={18} color="#555" />
                                <TextInput
                                    placeholder="••••••••"
                                    placeholderTextColor={colors.textPlaceholder}
                                    value={confirmarContraseña}
                                    onChangeText={setConfirmarContraseña}
                                    onFocus={() => setFocusedInput('confirmPassword')}
                                    onBlur={() => setFocusedInput(null)}
                                    editable={!isLoading}
                                    secureTextEntry={!showConfirmPassword}
                                    style={styles.input}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} activeOpacity={0.7}>
                                    <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#555" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Código de Referido (Opcional) */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.fieldLabel}>Código de Invitación (Opcional)</Text>
                            <View style={[styles.inputWrapper, focusedInput === 'referral' && styles.inputFocused]}>
                                <Ionicons name="gift-outline" size={18} color="#555" />
                                <TextInput
                                    placeholder="Ej: JUA-4821"
                                    placeholderTextColor={colors.textPlaceholder}
                                    value={referralCode}
                                    onChangeText={setReferralCode}
                                    onFocus={() => setFocusedInput('referral')}
                                    onBlur={() => setFocusedInput(null)}
                                    editable={!isLoading}
                                    autoCapitalize="characters"
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        {/* Register Button */}
                        <TouchableOpacity
                            style={styles.mainBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                handleRegister();
                            }}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={colors.gradients.primary}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.mainBtnGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#000" size="small" />
                                ) : (
                                    <Text style={styles.btnText}>REGISTRARSE</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerBox}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>O REGÍSTRATE CON</Text>
                            <View style={styles.line} />
                        </View>

                        {/* Social Buttons */}
                        <TouchableOpacity
                            style={styles.googleBtn}
                            onPress={() => handleSocialRegister('Google')}
                            disabled={isLoading}
                            activeOpacity={0.75}
                            accessibilityLabel="Registrarse con Google"
                            accessibilityRole="button"
                        >
                            <Ionicons name="logo-google" size={20} color="#fff" />
                            <Text style={styles.googleBtnText}>Continuar con Google</Text>
                        </TouchableOpacity>

                    </View>

                    {/* Footer Link */}
                    <Animated.View style={{ opacity: fadeAnim }}>
                    <TouchableOpacity
                        style={styles.footerLink}
                        onPress={() => navigation.navigate('Login')}
                        disabled={isLoading}
                        activeOpacity={0.7}
                        data-testid="login-link"
                    >
                        <Text style={styles.footerText}>¿Ya tienes cuenta? <Text style={styles.neonText}>Inicia sesión</Text></Text>
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
        marginBottom: spacing.xxl,
        alignItems: 'center',
    },
    registerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.textPrimary,
        letterSpacing: 1.5,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    registerSubtitle: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    formCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: colors.surface,
        borderRadius: radius.modal,
        padding: spacing.xxl,
        borderWidth: 1,
        borderColor: colors.borderPrimary,
        marginBottom: spacing.lg,
        ...shadows.cardMd,
    },
    inputContainer: {
        marginBottom: 18,
    },
    fieldLabel: {
        ...typography.inputLabel,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceHighlight,
        borderWidth: 1,
        borderColor: colors.surfaceElevated,
        paddingHorizontal: 14,
        height: 56,
        gap: spacing.md,
        borderRadius: radius.md,
    },
    inputFocused: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryDim,
    },
    input: {
        flex: 1,
        color: colors.textPrimary,
        ...typography.inputText,
    },
    mainBtn: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginTop: spacing.lg,
        ...shadows.primaryGlowLg,
    },
    mainBtnGradient: {
        height: 58,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnText: {
        ...typography.buttonPrimary,
    },
    dividerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: colors.surfaceElevated,
    },
    dividerText: {
        color: colors.textMuted,
        marginHorizontal: spacing.md,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    googleBtn: {
        height: 56,
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderPrimary,
    },
    googleBtnText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '700',
    },
    footerLink: {
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    footerText: {
        color: colors.textTertiary,
        fontSize: 14,
        textAlign: 'center',
    },
    neonText: {
        color: colors.primary,
        fontWeight: '700',
    },
    referralBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(99,255,21,0.06)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
        maxWidth: 400,
    },
    referralBannerText: {
        color: '#aaa',
        fontSize: 12,
        flex: 1,
        lineHeight: 17,
        fontWeight: '500',
    },
});
