import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Animated, Platform, ActivityIndicator, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NexusAlert from '../components/NexusAlert';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import Config from '../constants/Config';
import { parseAuthError } from '../utils/authErrorHandler';

const BACKEND_URL = Config.BACKEND_URL;

export default function Verification() {
    const navigation = useNavigation();
    const route = useRoute();
    const { email } = route.params || {};

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const inputs = useRef([]);

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    const showAlert = (title, message, type = 'info', onConfirm = null) => {
        setAlert({
            visible: true,
            title,
            message,
            type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setAlert(prev => ({ ...prev, visible: false }));
            }
        });
    };

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnims = useRef([...Array(6)].map(() => new Animated.Value(1))).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }).start();

        inputs.current[0]?.focus();
    }, []);

    // Countdown timer para reenvío
    useEffect(() => {
        let timer;
        if (timeLeft > 0 && !canResend) {
            timer = setTimeout(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setCanResend(true);
        }
        return () => clearTimeout(timer);
    }, [timeLeft, canResend]);

    const handleChange = (text, index) => {
        if (!/^[0-9]*$/.test(text)) return;

        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        // Animar el dígito ingresado
        if (text) {
            Animated.sequence([
                Animated.timing(scaleAnims[index], {
                    toValue: 1.15,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnims[index], {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();
        }

        // Auto-focus al siguiente input
        if (text && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace') {
            if (!code[index] && index > 0) {
                // Si está vacío, ir al anterior
                const newCode = [...code];
                newCode[index - 1] = '';
                setCode(newCode);
                inputs.current[index - 1].focus();
            } else if (code[index]) {
                // Si tiene contenido, solo limpiar
                const newCode = [...code];
                newCode[index] = '';
                setCode(newCode);
            }
        }
    };

    const handleVerify = async () => {
        const fullCode = code.join('');
        if (fullCode.length < 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showAlert(
                "Código Incompleto",
                "Por favor ingresa los 6 dígitos del código de verificación.",
                "warning"
            );
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: fullCode })
            });

            console.log('📊 Verify response status:', response.status);

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

            if (response.ok && data.token) {
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                await AsyncStorage.setItem('token', data.token);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                console.log('✅ Verificación exitosa');
                showAlert(
                    "Verificado",
                    "Tu cuenta ha sido verificada correctamente. ¡Bienvenido!",
                    "success",
                    () => navigation.replace('MainTabs')
                );
            } else {
                console.error('❌ Error en verificacion:', response.status, data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const errorInfo = parseAuthError(null, response, data);
                showAlert(
                    errorInfo.title,
                    errorInfo.message || data.error || "El código no es válido o ha expirado.",
                    "error"
                );
                setCode(['', '', '', '', '', '']);
                inputs.current[0]?.focus();
            }
        } catch (error) {
            console.error('❌ Error en handleVerify:', error.message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errorInfo = parseAuthError(error);
            showAlert(errorInfo.title, errorInfo.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        setIsLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/auth/resend-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            console.log('📊 Resend code response status:', response.status);

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

            if (response.ok && data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                console.log('✅ Código reenviado');
                setTimeLeft(30);
                setCanResend(false);
                showAlert(
                    "Código Reenviado",
                    "Te hemos enviado un nuevo código de verificación a tu correo. Revisa tu bandeja de entrada.",
                    "success"
                );
            } else {
                console.error('❌ Error reenviando código:', response.status, data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const errorInfo = parseAuthError(null, response, data);
                showAlert(errorInfo.title, errorInfo.message || data.error, "error");
            }
        } catch (error) {
            console.error('❌ Error en handleResend:', error.message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const errorInfo = parseAuthError(error);
            showAlert(errorInfo.title, errorInfo.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>

                {/* Header */}
                <Animated.View style={styles.header}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="shield-checkmark-outline" size={36} color="#63ff15" />
                    </View>
                    <Text style={styles.title}>VERIFICACIÓN</Text>
                    <Text style={styles.subtitle}>
                        Hemos enviado un código de 6 dígitos a tu correo electrónico
                    </Text>
                    <Text style={styles.emailText}>{email}</Text>
                </Animated.View>

                {/* Code Input Grid - 6 separate inputs */}
                <View style={styles.codeContainer}>
                    {code.map((digit, index) => (
                        <Animated.View
                            key={index}
                            style={{
                                transform: [{ scale: scaleAnims[index] }],
                            }}
                        >
                            <TextInput
                                ref={(el) => (inputs.current[index] = el)}
                                style={[
                                    styles.codeInput,
                                    digit !== '' && styles.codeInputFilled,
                                ]}
                                maxLength={1}
                                keyboardType="number-pad"
                                value={digit}
                                onChangeText={(text) => handleChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                placeholder="-"
                                placeholderTextColor="rgba(99,255,21,0.3)"
                                accessibilityLabel={`Dígito ${index + 1} de 6`}
                            />
                        </Animated.View>
                    ))}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={handleVerify}
                    disabled={isLoading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#63ff15', '#4dd10e']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.verifyBtnGradient}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#000" size="small" />
                        ) : (
                            <Text style={styles.verifyBtnText}>VERIFICAR CÓDIGO</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Resend Section */}
                <View style={styles.resendSection}>
                    {canResend ? (
                        <TouchableOpacity
                            onPress={handleResend}
                            disabled={isLoading}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.resendLink}>¿No recibiste el código? <Text style={styles.resendAction}>Reenviar</Text></Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.resendCountdown}>
                            Reenviar en <Text style={styles.timeLeft}>{timeLeft}s</Text>
                        </Text>
                    )}
                </View>

            </Animated.View>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    content: {
        flex: 1,
        padding: 28,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 48,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#141414',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(99,255,21,0.4)',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 12,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 12,
        fontWeight: '500',
    },
    emailText: {
        color: '#63ff15',
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginBottom: 48,
        width: '100%',
    },
    codeInput: {
        width: 60,
        height: 60,
        backgroundColor: '#111',
        borderWidth: 2,
        borderColor: 'rgba(99,255,21,0.15)',
        borderRadius: 12,
        color: '#63ff15',
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 8,
        elevation: 2,
    },
    codeInputFilled: {
        backgroundColor: 'rgba(99,255,21,0.08)',
        borderColor: '#63ff15',
    },
    verifyBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    verifyBtnGradient: {
        height: 58,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifyBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    resendSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    resendLink: {
        color: '#71717A',
        fontSize: 14,
        textAlign: 'center',
    },
    resendAction: {
        color: '#63ff15',
        fontWeight: '700',
    },
    resendCountdown: {
        color: '#52525B',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    timeLeft: {
        color: '#63ff15',
        fontWeight: '800',
        fontSize: 14,
    },
});
