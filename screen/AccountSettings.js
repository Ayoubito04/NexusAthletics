import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NexusAlert from '../components/NexusAlert';
import { Image } from 'react-native';
import Config from '../constants/Config';
import { supabase } from '../lib/supabase';
const BACKEND_URL = Config.BACKEND_URL;

export default function AccountSettings() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState({ nombre: '', apellido: '', email: '', avatar: null, role: 'USER' });
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: 'ACEPTAR' });
    const [passwordModal, setPasswordModal] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
    };

    const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'ACEPTAR') => {
        setAlert({
            visible: true,
            title,
            message,
            type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setAlert(prev => ({ ...prev, visible: false }));
            },
            onCancel: onCancel ? () => {
                onCancel();
                setAlert(prev => ({ ...prev, visible: false }));
            } : null,
            confirmText
        });
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true
        });

        if (!result.canceled) {
            handleUpdateAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleUpdateAvatar = async (base64Image) => {
        setUploadingAvatar(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/user/avatar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ avatar: base64Image })
            });

            if (response.ok) {
                const data = await response.json();
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                showAlert("Éxito", "Foto de perfil actualizada correctamente.", "success");
            } else {
                showAlert("Error", "No se pudo subir la imagen.", "error");
            }
        } catch (error) {
            showAlert("Error", "Error al conectar con el servidor.", "error");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/user/update-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ nombre: user.nombre, apellido: user.apellido })
            });

            if (response.ok) {
                const data = await response.json();
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                showAlert("Éxito", "Perfil actualizado correctamente.", "success");
            } else {
                showAlert("Error", "No se pudo actualizar el perfil.", "error");
            }
        } catch (error) {
            showAlert("Error", "Error de conexión con el servidor.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwords.next || !passwords.current || !passwords.confirm) {
            return showAlert("Error", "Todos los campos son obligatorios.", "error");
        }
        if (passwords.next !== passwords.confirm) {
            return showAlert("Error", "Las contraseñas nuevas no coinciden.", "error");
        }
        if (passwords.next.length < 6) {
            return showAlert("Error", "La nueva contraseña debe tener al menos 6 caracteres.", "error");
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/user/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: passwords.current,
                    newPassword: passwords.next
                })
            });

            const data = await response.json();
            if (response.ok) {
                setPasswordModal(false);
                setPasswords({ current: '', next: '', confirm: '' });
                showAlert("Éxito", "Contraseña actualizada correctamente.", "success");
            } else {
                showAlert("Error", data.error || "No se pudo cambiar la contraseña.", "error");
            }
        } catch (error) {
            showAlert("Error", "Error de conexión.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        showAlert(
            "CERRAR SESIÓN",
            "¿Estás seguro de que quieres salir de tu cuenta?",
            "info",
            async () => {
                try {
                    await supabase.auth.signOut();
                } catch (e) {}
                await AsyncStorage.multiRemove(['token', 'user', 'promo_banner_shown', 'location_step_done']);
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
            },
            () => { },
            "CERRAR SESIÓN"
        );
    };

    const handleDeleteAccount = () => {
        showAlert(
            "ELIMINAR CUENTA",
            "Esta acción es irreversible y perderás todos tus datos, rutinas y logros. ¿Estás seguro?",
            "error",
            async () => {
                try {
                    const token = await AsyncStorage.getItem('token');
                    if (token) {
                        await fetch(`${BACKEND_URL}/user/account`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    }
                } catch (e) {
                    console.warn('Error al eliminar cuenta en el servidor:', e);
                } finally {
                    await AsyncStorage.clear();
                    navigation.navigate('Register');
                }
            },
            () => { },
            "ELIMINAR TODO"
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ajustes de Cuenta</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} disabled={uploadingAvatar}>
                        {user.avatar ? (
                            <Image source={{ uri: user.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={50} color="#444" />
                            </View>
                        )}
                        <View style={styles.editIconContainer}>
                            {uploadingAvatar ? (
                                <ActivityIndicator size="small" color="black" />
                            ) : (
                                <Ionicons name="camera" size={20} color="black" />
                            )}
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.avatarHint}>Toca para cambiar foto</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Información Personal</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nombre</Text>
                        <TextInput
                            style={styles.input}
                            value={user.nombre}
                            onChangeText={(val) => setUser({ ...user, nombre: val })}
                            placeholderTextColor="#444"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Apellido</Text>
                        <TextInput
                            style={styles.input}
                            value={user.apellido}
                            onChangeText={(val) => setUser({ ...user, apellido: val })}
                            placeholderTextColor="#444"
                        />
                    </View>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={loading}>
                        {loading ? <ActivityIndicator color="black" /> : <Text style={styles.saveBtnText}>Guardar Cambios</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Seguridad</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={() => setPasswordModal(true)}>
                        <Ionicons name="lock-closed-outline" size={20} color="#888" />
                        <Text style={styles.menuText}>Cambiar Contraseña</Text>
                        <Ionicons name="chevron-forward" size={18} color="#444" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => showAlert("Seguridad", "Tu cuenta está protegida con cifrado AES-256.", "success")}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#888" />
                        <Text style={styles.menuText}>Autenticación en dos pasos</Text>
                        <Ionicons name="chevron-forward" size={18} color="#444" />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ayuda y Soporte</Text>
                    {user.role === 'ADMIN' && (
                        <TouchableOpacity style={[styles.menuItem, { borderColor: '#63ff1540', borderLeftWidth: 1 }]} onPress={() => navigation.navigate('AdminDashboard')}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#63ff15" />
                            <Text style={styles.menuText}>Panel de Administración (Usuarios)</Text>
                            <Ionicons name="chevron-forward" size={18} color="#444" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('FAQ')}>
                        <Ionicons name="help-circle-outline" size={20} color="#888" />
                        <Text style={styles.menuText}>Preguntas Frecuentes (FAQ)</Text>
                        <Ionicons name="chevron-forward" size={18} color="#444" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => showAlert("Soporte", "Contacto: soporte@nexusai.com", "info")}>
                        <Ionicons name="chatbubbles-outline" size={20} color="#888" />
                        <Text style={styles.menuText}>Contactar con Soporte</Text>
                        <Ionicons name="chevron-forward" size={18} color="#444" />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cuenta</Text>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: '#1a1a1a' }]} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#ff4d4d" />
                        <Text style={[styles.menuText, { color: '#ff4d4d' }]}>Cerrar Sesión</Text>
                        <Ionicons name="chevron-forward" size={18} color="#444" />
                    </TouchableOpacity>
                </View>

                <View style={[styles.section, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.sectionTitle, { color: '#ff4d4d' }]}>Zona de Peligro</Text>
                    <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
                        <Text style={styles.dangerBtnText}>Eliminar mi cuenta definitivamente</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
                onCancel={alert.onCancel}
                confirmText={alert.confirmText}
            />

            {/* MODAL DE CAMBIO DE CONTRASEÑA */}
            {passwordModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
                            <TouchableOpacity onPress={() => setPasswordModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Contraseña Actual</Text>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry
                                    value={passwords.current}
                                    onChangeText={(val) => setPasswords({ ...passwords, current: val })}
                                    placeholder="******"
                                    placeholderTextColor="#444"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Nueva Contraseña</Text>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry
                                    value={passwords.next}
                                    onChangeText={(val) => setPasswords({ ...passwords, next: val })}
                                    placeholder="Min. 6 caracteres"
                                    placeholderTextColor="#444"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry
                                    value={passwords.confirm}
                                    onChangeText={(val) => setPasswords({ ...passwords, confirm: val })}
                                    placeholder="******"
                                    placeholderTextColor="#444"
                                />
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={loading}>
                                {loading ? <ActivityIndicator color="black" /> : <Text style={styles.saveBtnText}>Sincronizar nueva contraseña</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );

}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    scrollContent: { padding: 20 },
    section: { marginBottom: 35, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', paddingBottom: 20 },
    sectionTitle: { color: '#63ff15', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 20, letterSpacing: 1 },
    inputGroup: { marginBottom: 15 },
    label: { color: '#666', fontSize: 13, marginBottom: 8, marginLeft: 5 },
    input: { backgroundColor: '#111', borderRadius: 15, padding: 15, color: 'white', fontSize: 16, borderWidth: 1, borderColor: '#222' },
    saveBtn: { backgroundColor: '#63ff15', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: 'black', fontWeight: 'bold', fontSize: 16 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 15, borderRadius: 15, marginBottom: 10 },
    menuText: { flex: 1, color: 'white', fontSize: 15, marginLeft: 12 },
    dangerBtn: { backgroundColor: '#1a0a0a', padding: 18, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#301010' },
    dangerBtnText: { color: '#ff4d4d', fontWeight: 'bold' },
    avatarSection: { alignItems: 'center', marginBottom: 30 },
    avatarContainer: { width: 120, height: 120, borderRadius: 60, position: 'relative', marginBottom: 10 },
    avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#63ff15' },
    avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#222' },
    editIconContainer: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#63ff15', padding: 10, borderRadius: 20, borderWidth: 3, borderColor: '#0a0a0a' },
    avatarHint: { color: '#888', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 25, zIndex: 1000 },
    modalContent: { backgroundColor: '#0f0f0f', borderRadius: 30, padding: 25, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' }
});
