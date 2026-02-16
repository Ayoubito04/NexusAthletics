import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, ScrollView, TextInput, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import NexusAlert from '../components/NexusAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

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
            showAlert("Campo Requerido", "Por favor, completa todos los campos", "warning");
            return;
        }
        if (contraseña !== confirmarContraseña) {
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
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                await AsyncStorage.setItem('token', data.token);
                navigation.navigate('WelcomePlans');
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

    const handleSocialRegister = async (platform) => {
        console.log("=== REGISTER SOCIAL AUTH DEBUG ===");
        console.log("Platform solicitada:", platform);
        console.log("Android Client ID:", process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
        console.log("iOS Client ID:", process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
        console.log("Web Client ID:", process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
        console.log("Platform OS:", Platform.OS);
        console.log("==================================");

        if (platform === 'Google') {
            try {
                setIsLoading(true);

                // URL HTTPS del proxy de Expo (obligatorio para Google OAuth)
                const redirectUri = "https://auth.expo.io/@ayoubito04/nexus-fitness";

                console.log("=== GOOGLE REGISTER ===");
                console.log("Redirect URI:", redirectUri);
                console.log("Client ID:", process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
                console.log("=======================");

                const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                    `client_id=${process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID}` +
                    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                    `&response_type=id_token` +
                    `&scope=${encodeURIComponent('openid email profile')}` +
                    `&nonce=${Math.random().toString(36)}`;

                const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

                console.log("=== RESPONSE ===");
                console.log("Type:", result.type);

                if (result.type === 'success' && result.url) {
                    console.log("✅ SUCCESS - URL:", result.url);

                    const hashParams = new URLSearchParams(result.url.split('#')[1] || '');
                    const idToken = hashParams.get('id_token');

                    if (idToken) {
                        console.log("Token obtenido:", idToken.substring(0, 20) + "...");
                        handleSocialAuth('google', idToken, 'idToken');
                    } else {
                        console.error("❌ No se encontró id_token");
                        setIsLoading(false);
                    }
                } else {
                    console.log("❌ Register cancelado o falló");
                    setIsLoading(false);
                }

            } catch (error) {
                console.error("❌ Error Google Registration:", error);
                showAlert("Error", "No se pudo registrar con Google", "error");
                setIsLoading(false);
            }
        } else if (platform === 'Facebook') {
            try {
                setIsLoading(true);
                const redirectUri = "https://auth.expo.io/@ayoubito04/nexus-fitness";
                const fbAppId = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';

                if (!fbAppId || fbAppId === 'tu_facebook_app_id') {
                    showAlert("Configuración", "El Facebook App ID no está configurado en el archivo .env", "warning");
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
                        } else {
                            setIsLoading(false);
                        }
                    } else {
                        setIsLoading(false);
                    }
                } else {
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("❌ Error Facebook Registration:", error);
                showAlert("Error", "No se pudo registrar con Facebook", "error");
                setIsLoading(false);
            }
        } else if (platform === 'Instagram') {
            try {
                setIsLoading(true);
                const redirectUri = "https://auth.expo.io/@ayoubito04/nexus-fitness";
                // Usamos el CLIENT_ID de Instagram o el de Facebook si están vinculados
                const instagramClientId = process.env.EXPO_PUBLIC_INSTAGRAM_CLIENT_ID || process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

                if (!instagramClientId || instagramClientId === 'tu_instagram_client_id') {
                    showAlert("Configuración", "Instagram no está configurado. Se intentará usar Facebook.", "info");
                    handleSocialRegister('Facebook');
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
                showAlert("Error", "No se pudo registrar con Instagram", "error");
            }
        } else {
            showAlert(platform, `Registro con ${platform} próximamente.`, "info");
        }
    };

    return (
        <>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.mainContainer}
            >
                <ScrollView contentContainerStyle={styles.scrollWrapper}>
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
                            onPress={handleRegister}
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
                            <TouchableOpacity style={[styles.socialBtn, { borderColor: '#EA4335' }]} onPress={() => handleSocialRegister('Google')}>
                                <FontAwesome5 name="google" size={18} color="#EA4335" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.socialBtn, { borderColor: '#1877f2' }]} onPress={() => handleSocialRegister('Facebook')}>
                                <FontAwesome5 name="facebook-f" size={18} color="#1877f2" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.socialBtn, { borderColor: '#e4405f' }]} onPress={() => handleSocialRegister('Instagram')}>
                                <FontAwesome5 name="instagram" size={18} color="#e4405f" />
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
    },
    socialBtn: {
        width: '22%',
        height: 45,
        borderWidth: 1.5,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
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