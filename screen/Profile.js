import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import NexusAlert from '../components/NexusAlert';
import Config from '../constants/Config';
import AchievementsShowcase from '../components/AchievementsShowcase';

const BACKEND_URL = Config.BACKEND_URL;

export default function Profile() {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    // NexusAlert State
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: 'ACEPTAR' });

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

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        ]).start();

        const loadUser = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');
                const token = await AsyncStorage.getItem('token');
                if (userData) {
                    const localUser = JSON.parse(userData);
                    setUser(localUser);

                    if (token) {
                        const response = await fetch(`${BACKEND_URL}/auth/me`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await response.json();
                        if (data && !data.error) {
                            setUser(data);
                            await AsyncStorage.setItem('user', JSON.stringify(data));
                        }
                    }
                }
            } catch (error) {
                // Silent
            }
        };
        loadUser();
    }, []);

    const handleLogout = async () => {
        showAlert(
            "Cerrar Sesión",
            "¿Estás seguro de que quieres salir?",
            "warning",
            async () => {
                await AsyncStorage.clear();
                navigation.navigate('Login');
            },
            () => { },
            "SALIR"
        );
    };

    if (!user) return <View style={styles.container}><Text>Cargando...</Text></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={28} color="#ff4d4d" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                            style={styles.avatar}
                        />
                        <View style={styles.planBadge}>
                            <Text style={styles.planText}>{user.plan}</Text>
                        </View>
                    </View>
                    <Text style={styles.userName}>{user.nombre} {user.apellido}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={StyleSheet.absoluteFill} borderRadius={20} />
                        <Text style={styles.statVal}>{user.mensajesHoy || 0}</Text>
                        <Text style={styles.statLab}>Consultas IA</Text>
                    </View>
                    <View style={styles.statBox}>
                        <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={StyleSheet.absoluteFill} borderRadius={20} />
                        <Text style={styles.statVal}>{user.healthSteps || 0}</Text>
                        <Text style={styles.statLab}>Pasos Hoy</Text>
                    </View>
                </View>

                {/* Vitrina de Trofeos */}
                <AchievementsShowcase user={user} />

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Mi Cuerpo (IA Optimization)</Text>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('BiometricData')}
                    >
                        <Ionicons name="fitness-outline" size={22} color="#63ff15" />
                        <Text style={styles.menuText}>Datos Biométricos</Text>
                        <Ionicons name="chevron-forward" size={20} color="#444" />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Suscripción</Text>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('PlanesPago')}
                    >
                        <Ionicons name="card-outline" size={22} color="#63ff15" />
                        <Text style={styles.menuText}>Gestionar mi Plan ({user.plan})</Text>
                        <Ionicons name="chevron-forward" size={20} color="#444" />
                    </TouchableOpacity>
                </View>

                {user.role === 'ADMIN' && (
                    <View style={styles.menuSection}>
                        <Text style={styles.sectionTitle}>Administración</Text>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('AdminDashboard')}
                        >
                            <Ionicons name="shield-outline" size={22} color="#63ff15" />
                            <Text style={styles.menuText}>Panel de Administración</Text>
                            <Ionicons name="chevron-forward" size={20} color="#444" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Configuración</Text>
                    <TouchableOpacity style={styles.menuItem}>
                        <Ionicons name="notifications-outline" size={22} color="#aaa" />
                        <Text style={styles.menuText}>Notificaciones</Text>
                        <Ionicons name="chevron-forward" size={20} color="#444" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('AccountSettings')}
                    >
                        <Ionicons name="settings-outline" size={22} color="#aaa" />
                        <Text style={styles.menuText}>Configuración de Cuenta</Text>
                        <Ionicons name="chevron-forward" size={20} color="#444" />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Soporte</Text>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('FAQ')}
                    >
                        <Ionicons name="help-buoy-outline" size={22} color="#aaa" />
                        <Text style={styles.menuText}>Preguntas Frecuentes</Text>
                        <Ionicons name="chevron-forward" size={20} color="#444" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.deleteAccount} onPress={() => navigation.navigate('AccountSettings')}>
                    <Text style={styles.deleteText}>Eliminar Cuenta</Text>
                </TouchableOpacity>
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    profileCard: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#63ff15',
    },
    planBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#63ff15',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
    },
    planText: {
        color: 'black',
        fontSize: 10,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    statBox: {
        width: '48%',
        backgroundColor: '#1a1a1a',
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    statVal: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#63ff15',
    },
    statLab: {
        fontSize: 12,
        color: '#888',
        marginTop: 5,
    },
    menuSection: {
        width: '100%',
        marginBottom: 25,
    },
    sectionTitle: {
        color: '#444',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
    },
    menuText: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        marginLeft: 15,
    },
    deleteAccount: {
        marginTop: 20,
        marginBottom: 40,
    },
    deleteText: {
        color: '#444',
        fontSize: 14,
        textDecorationLine: 'underline',
    }
});
