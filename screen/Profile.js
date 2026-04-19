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
import { colors, typography, spacing, radius, shadows } from '../theme';

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
                    <Ionicons name="arrow-back" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mi Perfil</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={28} color={colors.error} />
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
                        <LinearGradient colors={colors.gradients.dark} style={StyleSheet.absoluteFill} borderRadius={radius.xxl} />
                        <Text style={styles.statVal}>{user.mensajesHoy || 0}</Text>
                        <Text style={styles.statLab}>Consultas IA</Text>
                    </View>
                    <View style={styles.statBox}>
                        <LinearGradient colors={colors.gradients.dark} style={StyleSheet.absoluteFill} borderRadius={radius.xxl} />
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
                        <Ionicons name="fitness-outline" size={22} color={colors.primary} />
                        <Text style={styles.menuText}>Datos Biométricos</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Suscripción</Text>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('PlanesPago')}
                    >
                        <Ionicons name="card-outline" size={22} color={colors.primary} />
                        <Text style={styles.menuText}>Gestionar mi Plan ({user.plan})</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {user.role === 'ADMIN' && (
                    <View style={styles.menuSection}>
                        <Text style={styles.sectionTitle}>Administración</Text>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate('AdminDashboard')}
                        >
                            <Ionicons name="shield-outline" size={22} color={colors.primary} />
                            <Text style={styles.menuText}>Panel de Administración</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Configuración</Text>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('AccountSettings')}
                    >
                        <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuText}>Configuración de Cuenta</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Soporte</Text>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => navigation.navigate('FAQ')}
                    >
                        <Ionicons name="help-buoy-outline" size={22} color={colors.textSecondary} />
                        <Text style={styles.menuText}>Preguntas Frecuentes</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        paddingTop: 50,
        justifyContent: 'space-between',
    },
    headerTitle: {
        ...typography.h3,
    },
    content: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    profileCard: {
        alignItems: 'center',
        marginBottom: spacing.xxxl,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.lg,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    planBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    planText: {
        color: '#000000',
        fontSize: 10,
        fontWeight: 'bold',
    },
    userName: {
        ...typography.h2,
    },
    userEmail: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        marginTop: spacing.sm,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: spacing.xxxl,
    },
    statBox: {
        width: '48%',
        backgroundColor: colors.surfaceHighlight,
        padding: spacing.lg,
        borderRadius: radius.xxl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.surfaceElevated,
    },
    statVal: {
        ...typography.statValue,
    },
    statLab: {
        ...typography.caption,
        marginTop: spacing.sm,
    },
    menuSection: {
        width: '100%',
        marginBottom: spacing.xxl,
    },
    sectionTitle: {
        ...typography.label,
        color: colors.textMuted,
        marginBottom: spacing.md,
        marginLeft: spacing.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
        minHeight: 44,
    },
    menuText: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 16,
        marginLeft: spacing.lg,
    },
    deleteAccount: {
        marginTop: spacing.lg,
        marginBottom: 40,
    },
    deleteText: {
        color: colors.textMuted,
        fontSize: 14,
        textDecorationLine: 'underline',
    }
});
