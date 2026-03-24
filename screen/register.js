import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import NexusAlert from '../components/NexusAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { NativeModules } from 'react-native';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

// Carga segura de GoogleSignin
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
    const [hoveredInput, setHoveredInput] = useState(null);
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [email, setEmail] = useState('');
    const [contraseña, setContraseña] = useState('');
    const [confirmarContraseña, setConfirmarContraseña] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // NexusAlert State
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

    const handleRegister = async () => {
        if (!nombre || !apellido || !email || !contraseña || !confirmarContraseña) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showAlert("Campo Requerido", "Por favor, completa todos los campos", "warning");
            return;
        }
        if (contraseña !== confirmarContraseña) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showAlert("Contraseña", "Las contraseñas no coinciden", "error");
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, apellido, email, password: contraseña })
            });
            const data = await response.json();
            if (data.token) {
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                await AsyncStorage.setItem('token', data.token);
                showAlert("Éxito", "✨ ¡Registro exitoso!", "success", () => navigation.navigate('WelcomePlans'));
            } else {
                showAlert("Error", data.error || "Error al registrar", "error");
            }
        } catch (error) {
            console.error(error);
            showAlert("Error", "Error de conexión", "error");
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

            const data = await response.json();

            if (data.requiresVerification) {
                setIsLoading(false);
                navigation.navigate('Verification', { email: data.user.email });
                return;
            }

            if (data.token) {
                // Aseguramos que el usuario tenga un plan por defecto en el almacenamiento local
                const userData = {
                    ...data.user,
                    plan: data.user.plan || "Gratis"
                };
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                await AsyncStorage.setItem('token', data.token);

                // Si es un usuario nuevo (o le faltan datos biométricos), mandarlo a WelcomePlans
                if (data.isNewUser || !data.user.peso || !data.user.altura) {
                    navigation.navigate('WelcomePlans');
                } else {
                    navigation.navigate('Home');
                }
            } else {
                showAlert("Autenticación", data.error || "Error en autenticación social", "error");
                setIsLoading(false);
            }
        } catch (error) {
            console.error(error);
            showAlert("Error", "Error de conexión con el servidor", "error");
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

            // Flujo común via Supabase OAuth para Web Fallback, Facebook e Instagram
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
                        // El navigation se manejará en un useEffect o tras el setSession
                        // Para registro, forzamos la sincronización
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
        <>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.mainContainer}
            >
        <ScrollView contentContainerStyle={styles.scrollWrapper} keyboardShouldPersistTaps="handled">
                    <View style={styles.headerSection}>
                        <Text style={styles.registerTitle}>Únete a la <Text style={styles.neonText}>Élite</Text></Text>
                        <Text style={styles.registerSubtitle}>Empieza tu transformación hoy mismo</Text>
                    </View>

                    <View style={styles.formCard}>
                        <TextInput
                            style={[styles.input, hoveredInput === 'nombre' && styles.inputHovered]}
                            placeholder="Nombre"
                            placeholderTextColor="#444"
                            value={nombre}
                            onChangeText={setNombre}
                            onFocus={() => setHoveredInput('nombre')}
                            onBlur={() => setHoveredInput(null)}
                        />

                        <TextInput
                            style={[styles.input, hoveredInput === 'apellido' && styles.inputHovered]}
                            placeholder="Apellido"
                            placeholderTextColor="#444"
                            value={apellido}
                            onChangeText={setApellido}
                            onFocus={() => setHoveredInput('apellido')}
                            onBlur={() => setHoveredInput(null)}
                        />

                        <TextInput
                            style={[styles.input, hoveredInput === 'email' && styles.inputHovered]}
                            placeholder="Email"
                            placeholderTextColor="#444"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            onFocus={() => setHoveredInput('email')}
                            onBlur={() => setHoveredInput(null)}
                        />

                        <TextInput
                            style={[styles.input, hoveredInput === 'contraseña' && styles.inputHovered]}
                            placeholder="Contraseña"
                            placeholderTextColor="#444"
                            value={contraseña}
                            onChangeText={setContraseña}
                            secureTextEntry
                            onFocus={() => setHoveredInput('contraseña')}
                            onBlur={() => setHoveredInput(null)}
                        />

                        <TextInput
                            style={[styles.input, hoveredInput === 'confirmarContraseña' && styles.inputHovered]}
                            placeholder="Confirmar Contraseña"
                            placeholderTextColor="#444"
                            value={confirmarContraseña}
                            onChangeText={setConfirmarContraseña}
                            secureTextEntry
                            onFocus={() => setHoveredInput('confirmarContraseña')}
                            onBlur={() => setHoveredInput(null)}
                        />

                        <TouchableOpacity
                            style={[styles.mainBtn, hoveredInput === 'btnRegister' && styles.btnActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                handleRegister();
                            }}
                            onPressIn={() => setHoveredInput('btnRegister')}
                            onPressOut={() => setHoveredInput(null)}
                        >
                            <Text style={styles.btnText}>REGISTRARSE</Text>
                        </TouchableOpacity>

                        <View style={styles.dividerBox}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>O regístrate con</Text>
                            <View style={styles.line} />
                        </View>

                        <View style={styles.socialGrid}>
                            <TouchableOpacity
                                style={styles.socialBtn}
                                onPress={() => handleSocialRegister('Google')}
                                disabled={isLoading}
                                activeOpacity={0.7}
                                accessibilityLabel="Registrarse con Google"
                                accessibilityRole="button"
                            >
                                <Ionicons name="logo-google" size={20} color="#EA4335" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.socialBtn}
                                onPress={() => handleSocialRegister('Facebook')}
                                disabled={isLoading}
                                activeOpacity={0.7}
                                accessibilityLabel="Registrarse con Facebook"
                                accessibilityRole="button"
                            >
                                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.socialBtn}
                                onPress={() => handleSocialRegister('Instagram')}
                                disabled={isLoading}
                                activeOpacity={0.7}
                                accessibilityLabel="Registrarse con Instagram"
                                accessibilityRole="button"
                            >
                                <Ionicons name="logo-instagram" size={20} color="#E4405F" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.footerText}>¿Ya tienes cuenta? <Text style={styles.neonText}>Inicia sesión</Text></Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <NexusAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
            />

            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#0ce810" />
                    <Text style={styles.loadingText}>Procesando...</Text>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontWeight: 'bold',
    },
    mainContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    scrollWrapper: {
        padding: 30,
        paddingTop: 60,
        alignItems: 'center',
    },
    headerSection: {
        marginBottom: 30,
        alignItems: 'center',
    },
    registerTitle: {
        fontSize: 34,
        fontWeight: '900',
        color: '#fff',
    },
    registerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    formCard: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#111',
        borderRadius: 30,
        padding: 25,
        borderWidth: 1,
        borderColor: '#222',
    },
    input: {
        height: 50,
        backgroundColor: '#000',
        borderColor: '#222',
        borderWidth: 1.5,
        borderRadius: 15,
        paddingHorizontal: 15,
        color: '#fff',
        marginBottom: 15,
    },
    inputHovered: {
        borderColor: '#0ce810',
    },
    mainBtn: {
        backgroundColor: '#0ce810',
        height: 55,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    btnActive: {
        opacity: 0.8,
    },
    btnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
    },
    dividerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#222',
    },
    dividerText: {
        color: '#555',
        marginHorizontal: 15,
        fontSize: 12,
        fontWeight: 'bold',
    },
    socialGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    socialBtn: {
        flex: 1,
        height: 50,
        backgroundColor: '#000',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#222',
    },
    footerLink: {
        marginTop: 30,
    },
    footerText: {
        color: '#666',
        fontSize: 14,
    },
    neonText: {
        color: '#0ce810',
    },
});