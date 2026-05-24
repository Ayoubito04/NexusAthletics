import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated, Easing, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import NexusAlert from '../components/NexusAlert';
import Config from '../constants/Config';
import AchievementsShowcase from '../components/AchievementsShowcase';
import { colors, spacing, radius, rs } from '../theme';

const BACKEND_URL = Config.BACKEND_URL;
const { width } = Dimensions.get('window');

const PLAN_CONFIG = {
    Ultimate: {
        badge: ['#FF3366', '#FF6B35'],
        text: '#FF3366',
        ring: ['#FF3366', '#FF6B35', '#FF3366'],
        label: 'ULTIMATE',
    },
    Pro: {
        badge: ['#63ff15', '#00D1FF'],
        text: '#63ff15',
        ring: ['#63ff15', '#00D1FF', '#63ff15'],
        label: 'PRO',
    },
    Gratis: {
        badge: ['#3F3F46', '#52525B'],
        text: '#71717A',
        ring: ['#3F3F46', '#52525B', '#3F3F46'],
        label: 'FREE',
    },
};

export default function Profile() {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: 'ACEPTAR' });

    const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'ACEPTAR') => {
        setAlert({
            visible: true, title, message, type,
            onConfirm: () => { if (onConfirm) onConfirm(); setAlert(p => ({ ...p, visible: false })); },
            onCancel: onCancel ? () => { onCancel(); setAlert(p => ({ ...p, visible: false })); } : null,
            confirmText,
        });
    };

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        ]).start();

        const loadUser = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');
                const token = await AsyncStorage.getItem('token');
                if (userData) setUser(JSON.parse(userData));
                if (token) {
                    const res = await fetch(`${BACKEND_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const data = await res.json();
                    if (data && !data.error) {
                        setUser(data);
                        await AsyncStorage.setItem('user', JSON.stringify(data));
                    }
                }
            } catch (_) {}
        };
        loadUser();
    }, []);

    const handleLogout = () => {
        showAlert("Cerrar Sesión", "¿Estás seguro de que quieres salir?", "warning",
            async () => { await AsyncStorage.clear(); navigation.navigate('Login'); },
            () => {}, "SALIR"
        );
    };

    if (!user) {
        return (
            <View style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#63ff15', fontWeight: '900', letterSpacing: 2 }}>CARGANDO...</Text>
                </View>
            </View>
        );
    }

    const planKey = user.plan || 'Gratis';
    const plan = PLAN_CONFIG[planKey] || PLAN_CONFIG.Gratis;

    const ultimateExpiry = user.plan === 'Ultimate' && user.role !== 'ADMIN' && user.trialEndDate
        ? new Date(user.trialEndDate) : null;
    const daysLeft = ultimateExpiry
        ? Math.max(0, Math.ceil((ultimateExpiry - new Date()) / (1000 * 60 * 60 * 24))) : null;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={20} color="#63ff15" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MI PERFIL</Text>
                <TouchableOpacity onPress={handleLogout} style={[styles.headerBtn, { borderColor: 'rgba(255,77,77,0.25)' }]}>
                    <Ionicons name="log-out-outline" size={20} color="#ff4d4d" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ width: '100%', opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>

                    {/* HERO CARD */}
                    <View style={styles.heroCard}>
                        {/* Cover gradient */}
                        <LinearGradient
                            colors={['rgba(10,10,14,0)', 'rgba(5,5,8,0.97)']}
                            style={StyleSheet.absoluteFill}
                            borderRadius={24}
                        />
                        <LinearGradient
                            colors={[plan.badge[0] + '22', plan.badge[1] + '08', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                            borderRadius={24}
                        />

                        {/* Grid pattern */}
                        <View style={styles.gridOverlay} pointerEvents="none">
                            {[...Array(5)].map((_, i) => (
                                <View key={i} style={[styles.gridLine, { left: (width / 5) * i - 16 }]} />
                            ))}
                        </View>

                        {/* Corner accents */}
                        <View style={[styles.corner, { top: 14, left: 14 }]} />
                        <View style={[styles.corner, { top: 14, right: 14, transform: [{ rotate: '90deg' }] }]} />
                        <View style={[styles.corner, { bottom: 14, left: 14, transform: [{ rotate: '-90deg' }] }]} />
                        <View style={[styles.corner, { bottom: 14, right: 14, transform: [{ rotate: '180deg' }] }]} />

                        {/* Plan strip */}
                        <View style={[styles.planStrip, { backgroundColor: plan.badge[0] + '18', borderColor: plan.badge[0] + '30' }]}>
                            <View style={[styles.planDot, { backgroundColor: plan.text }]} />
                            <Text style={[styles.planStripText, { color: plan.text }]}>NEXUS {plan.label}</Text>
                        </View>

                        {/* Avatar */}
                        <View style={styles.avatarWrapper}>
                            <LinearGradient colors={plan.ring} style={styles.avatarRing} />
                            <Image
                                source={user.avatar ? { uri: user.avatar } : { uri: 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                                style={styles.avatar}
                            />
                            <TouchableOpacity
                                style={styles.editAvatarBtn}
                                onPress={() => navigation.navigate('AccountSettings')}
                            >
                                <Ionicons name="pencil" size={12} color="#000" />
                            </TouchableOpacity>
                        </View>

                        {/* Identity */}
                        <Text style={styles.heroName}>{user.nombre} {user.apellido}</Text>
                        <Text style={styles.heroEmail}>{user.email}</Text>

                        {/* Divider */}
                        <View style={styles.heroDivider} />

                        {/* Stats row */}
                        <View style={styles.heroStats}>
                            <TouchableOpacity
                                style={styles.heroStat}
                                onPress={() => navigation.navigate('MainTabs', { screen: 'Comunidad' })}
                            >
                                <Text style={[styles.heroStatVal, { color: '#63ff15' }]}>{user.friendsCount ?? 0}</Text>
                                <Text style={styles.heroStatLab}>Amigos</Text>
                            </TouchableOpacity>

                            <View style={styles.heroStatDivider} />

                            <View style={styles.heroStat}>
                                <Text style={[styles.heroStatVal, { color: '#A259FF' }]}>{user.mensajesHoy ?? 0}</Text>
                                <Text style={styles.heroStatLab}>Consultas IA</Text>
                            </View>

                            <View style={styles.heroStatDivider} />

                            <View style={styles.heroStat}>
                                <Text style={[styles.heroStatVal, { color: '#FF8C00' }]}>{user.racha ?? 0}</Text>
                                <Text style={styles.heroStatLab}>Racha</Text>
                            </View>
                        </View>
                    </View>

                    {/* LOGROS */}
                    <View style={{ width: '100%', marginBottom: spacing.xxl }}>
                        <AchievementsShowcase
                            user={user}
                            onPressAll={() => navigation.navigate('Achievements')}
                        />
                    </View>

                    {/* MENU */}
                    <MenuSection title="Mi Cuerpo">
                        <MenuItem icon="fitness-outline" label="Datos Biométricos" onPress={() => navigation.navigate('BiometricData')} />
                    </MenuSection>

                    <MenuSection title="Suscripción">
                        <MenuItem icon="card-outline" label={`Gestionar mi Plan (${user.plan})`} onPress={() => navigation.navigate('PlanesPago')} />
                        <MenuItem icon="receipt-outline" label="Facturación" onPress={() => navigation.navigate('Facturacion')} />
                        {user.plan === 'Ultimate' && user.role !== 'ADMIN' && (
                            <View style={{
                                marginHorizontal: 4, marginBottom: 8, borderRadius: 12, padding: 12,
                                backgroundColor: daysLeft !== null && daysLeft <= 5 ? 'rgba(255,68,68,0.08)' : 'rgba(255,215,0,0.06)',
                                borderWidth: 1,
                                borderColor: daysLeft !== null && daysLeft <= 5 ? 'rgba(255,68,68,0.25)' : 'rgba(255,215,0,0.2)',
                                flexDirection: 'row', alignItems: 'center', gap: 10,
                            }}>
                                <Ionicons
                                    name={daysLeft !== null && daysLeft <= 5 ? 'warning-outline' : 'time-outline'}
                                    size={18}
                                    color={daysLeft !== null && daysLeft <= 5 ? '#FF4444' : '#FFD700'}
                                />
                                <View style={{ flex: 1 }}>
                                    {ultimateExpiry ? (
                                        <>
                                            <Text style={{ color: daysLeft <= 5 ? '#FF4444' : '#FFD700', fontSize: 12, fontWeight: '800' }}>
                                                {daysLeft <= 5 ? `⚠️ Expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}` : `Plan Ultimate activo`}
                                            </Text>
                                            <Text style={{ color: '#555', fontSize: 11, marginTop: 2 }}>
                                                Expira el {ultimateExpiry.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '800' }}>Plan Ultimate activo</Text>
                                            <Text style={{ color: '#555', fontSize: 11, marginTop: 2 }}>Renueva para registrar fecha de expiración</Text>
                                        </>
                                    )}
                                </View>
                                {(daysLeft !== null && daysLeft <= 5) || !ultimateExpiry ? (
                                    <TouchableOpacity onPress={() => navigation.navigate('PlanesPago')}
                                        style={{ backgroundColor: daysLeft !== null && daysLeft <= 5 ? '#FF4444' : '#FFD700', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                                        <Text style={{ color: '#000', fontSize: 11, fontWeight: '900' }}>RENOVAR</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        )}
                        {user.plan === 'Ultimate' && (
                            <MenuItem
                                icon="body-outline"
                                label="Digital Twin"
                                sublabel="Evolución física IA · Exclusivo Ultimate"
                                highlight
                                onPress={() => navigation.navigate('DigitalTwin')}
                            />
                        )}
                    </MenuSection>

                    {user.role === 'ADMIN' && (
                        <MenuSection title="Administración">
                            <MenuItem icon="shield-outline" label="Panel de Administración" onPress={() => navigation.navigate('AdminDashboard')} />
                        </MenuSection>
                    )}

                    <MenuSection title="Configuración">
                        <MenuItem icon="settings-outline" label="Configuración de Cuenta" iconColor="#71717A" onPress={() => navigation.navigate('AccountSettings')} />
                    </MenuSection>

                    <MenuSection title="Soporte">
                        <MenuItem icon="help-buoy-outline" label="Preguntas Frecuentes" iconColor="#71717A" onPress={() => navigation.navigate('FAQ')} />
                    </MenuSection>

                    <TouchableOpacity style={styles.deleteAccount} onPress={() => navigation.navigate('AccountSettings')}>
                        <Text style={styles.deleteText}>Eliminar Cuenta</Text>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </Animated.View>
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

function MenuSection({ title, children }) {
    return (
        <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

function MenuItem({ icon, label, sublabel, onPress, iconColor = '#63ff15', highlight = false }) {
    return (
        <TouchableOpacity style={[styles.menuItem, highlight && styles.menuItemHighlight]} onPress={onPress}>
            {highlight && (
                <LinearGradient colors={['rgba(99,255,21,0.06)', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={15} />
            )}
            <View style={[styles.menuIconBox, highlight && { backgroundColor: 'rgba(99,255,21,0.1)', borderColor: 'rgba(99,255,21,0.2)' }]}>
                <Ionicons name={icon} size={18} color={iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.menuText, highlight && { color: '#63ff15' }]}>{label}</Text>
                {sublabel ? <Text style={styles.menuSub}>{sublabel}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={highlight ? '#63ff15' : colors.textMuted} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050508' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    headerBtn: {
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { color: '#fff', fontSize: rs(14), fontWeight: '900', letterSpacing: 2 },

    content: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' },

    // HERO CARD
    heroCard: {
        width: '100%', borderRadius: 24, marginBottom: 20,
        paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20,
        alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.12)',
        backgroundColor: '#0C0C12',
        overflow: 'hidden',
        position: 'relative',
    },
    gridOverlay: {
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        flexDirection: 'row', overflow: 'hidden', opacity: 0.04,
    },
    gridLine: {
        position: 'absolute', top: 0, bottom: 0, width: 1,
        backgroundColor: '#63ff15',
    },
    corner: {
        position: 'absolute', width: 16, height: 16,
        borderColor: 'rgba(99,255,21,0.35)',
        borderTopWidth: 1.5, borderLeftWidth: 1.5,
    },
    planStrip: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4,
        marginBottom: 20, alignSelf: 'center',
    },
    planDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    planStripText: { fontSize: rs(10), fontWeight: '900', letterSpacing: 1.5 },

    avatarWrapper: {
        position: 'relative', width: 88, height: 88,
        justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    avatarRing: {
        position: 'absolute', width: 96, height: 96, borderRadius: 48,
        top: -4, left: -4,
    },
    avatar: {
        width: 84, height: 84, borderRadius: 42,
        borderWidth: 2, borderColor: '#0C0C12',
    },
    editAvatarBtn: {
        position: 'absolute', bottom: 0, right: 0,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#63ff15',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#0C0C12',
    },
    heroName: { color: '#fff', fontSize: rs(20), fontWeight: '900', letterSpacing: -0.3, marginBottom: 3 },
    heroEmail: { color: '#52525B', fontSize: rs(12), fontWeight: '500' },
    heroDivider: { width: '80%', height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 18 },

    heroStats: { flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center' },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatVal: { fontSize: rs(24), fontWeight: '900', letterSpacing: -0.5 },
    heroStatLab: { color: '#52525B', fontSize: rs(11), fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },
    heroStatDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.06)' },

    // MENU
    menuSection: { width: '100%', marginBottom: 20 },
    sectionTitle: {
        color: '#3F3F46', fontSize: rs(10), fontWeight: '800',
        textTransform: 'uppercase', letterSpacing: 2,
        marginBottom: 8, marginLeft: 2,
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0C0C10', borderRadius: 16,
        paddingHorizontal: 14, paddingVertical: 14,
        marginBottom: 6, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
        minHeight: 54, position: 'relative', overflow: 'hidden',
    },
    menuItemHighlight: { borderColor: 'rgba(99,255,21,0.25)' },
    menuIconBox: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center', alignItems: 'center',
    },
    menuText: { color: '#D4D4D8', fontSize: rs(14), fontWeight: '600' },
    menuSub: { color: 'rgba(99,255,21,0.55)', fontSize: rs(11), marginTop: 1 },

    deleteAccount: { marginTop: 8, marginBottom: 8, alignSelf: 'center' },
    deleteText: { color: '#3F3F46', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
});
