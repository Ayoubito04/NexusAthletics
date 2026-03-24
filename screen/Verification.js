import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Animated, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NexusAlert from '../components/NexusAlert';
import * as Haptics from 'expo-haptics';

import Config from '../constants/Config';
import { parseAuthError } from '../utils/authErrorHandler';

const BACKEND_URL = Config.BACKEND_URL;

export default function Verification() {
    const navigation = useNavigation();
    const route = useRoute();
    const { email } = route.params || {};

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const inputs = useRef([]);

    // NexusAlert State
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

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleChange = (text, index) => {
        const newCode = [...code];
        newCode[index] = text;
        setCode(newCode);

        // Mover al siguiente input si hay texto
        if (text && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputs.current[index - 1].focus();
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
                    () => navigation.navigate('Home')
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
                // Limpiar los inputs
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="shield-checkmark" size={40} color="#0ce810" />
                    </View>
                    <Text style={styles.title}>Verificación</Text>
                    <Text style={styles.subtitle}>
                        Hemos enviado un código de 6 dígitos a su correo electrónico asociado.
                    </Text>
                    <Text style={styles.emailText}>{email}</Text>
                </View>

                <View style={styles.codeContainer}>
                    {code.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(el) => (inputs.current[index] = el)}
                            style={styles.codeInput}
                            maxLength={1}
                            keyboardType="number-pad"
                            value={digit}
                            onChangeText={(text) => handleChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            placeholder="-"
                            placeholderTextColor="#333"
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.verifyBtn}
                    onPress={handleVerify}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <Text style={styles.verifyBtnText}>VERIFICAR CUENTA</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResend}
                    disabled={isLoading}
                >
                    <Text style={styles.resendText}>¿No recibiste el código? <Text style={styles.resendAction}>Reenviar</Text></Text>
                </TouchableOpacity>
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
        backgroundColor: '#0a0a0a',
    },
    content: {
        flex: 1,
        padding: 30,
    },
    backBtn: {
        marginBottom: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#0ce81020',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    },
    emailText: {
        color: '#0ce810',
        fontWeight: 'bold',
        marginTop: 5,
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    codeInput: {
        width: '14%',
        height: 60,
        backgroundColor: '#111',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#222',
        color: '#0ce810',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    verifyBtn: {
        backgroundColor: '#0ce810',
        height: 60,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0ce810',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
    },
    verifyBtnText: {
        color: 'black',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    resendBtn: {
        marginTop: 30,
        alignItems: 'center',
    },
    resendText: {
        color: '#666',
        fontSize: 14,
    },
    resendAction: {
        color: '#0ce810',
        fontWeight: 'bold',
    }
});
