import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, ScrollView, Image,
    Animated, Easing, Dimensions, RefreshControl, Platform, StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NativeAd from '../components/NativeAd';
import { BlurView } from 'expo-blur';
import AchievementUnlockedModal from '../components/AchievementUnlockedModal';
import * as Haptics from 'expo-haptics';

import Config from '../constants/Config';
import { supabase } from '../lib/supabase';
import Constants from 'expo-constants';
import { registerForPushNotificationsAsync, saveTokenToBackend } from '../services/NotificationService';

const BACKEND_URL = Config.BACKEND_URL;
const { width } = Dimensions.get('window');


export default function Home() {
    const navigation = useNavigation();
    const [nombreUsuario, setNombreUsuario] = useState('Atleta');
    const [plan, setPlan] = useState('Gratis');
    const [notifCount, setNotifCount] = useState(0);
    const [avatar, setAvatar] = useState(null);
    const [role, setRole] = useState('USER');
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ totalKm: 0, totalKcal: 0, count: 0 });
    const [greeting, setGreeting] = useState('');
    const [promoVisible, setPromoVisible] = useState(false);

    // StatusBar dark
    useEffect(() => {
        StatusBar.setBarStyle('light-content');
        Platform.OS === 'android' && StatusBar.setBackgroundColor('#0A0A0A');
    }, []);

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const cardAnims = useRef([...Array(8)].map(() => new Animated.Value(0))).current;

    const [motivation, setMotivation] = useState("");

    // Achievement System
    const [achievementModal, setAchievementModal] = useState({ visible: false, achievement: null });
    const [userData, setUserData] = useState(null);

    // Sidebar States
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const sidebarAnim = useRef(new Animated.Value(-width * 0.8)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    const motivations = [
        "La disciplina es el puente entre tus metas y tus logros.",
        "Tu único límite eres tú mismo. ¡A por ello!",
        "Cada gota de sudor es un paso hacia el éxito.",
        "No te detengas hasta sentirte orgulloso.",
        "¡Hoy es un gran día para batir un récord personal!",
        "El dolor de hoy es la fuerza del mañana.",
        "Entrena como si tu vida dependiera de ello."
    ];

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 19) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');

        setMotivation(motivations[Math.floor(Math.random() * motivations.length)]);
        loadAllData();
        // Animación de entrada escalonada
        Animated.stagger(100, [
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
                Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
            ]),
            ...cardAnims.map(anim =>
                Animated.spring(anim, { toValue: 1, friction: 8, useNativeDriver: true })
            )
        ]).start();

        if (Constants.executionEnvironment !== 'storeClient' && Constants.appOwnership !== 'expo') {
            registerForPushNotificationsAsync().then(token => {
                if (token) saveTokenToBackend(token);
            });
        }

        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const toggleSidebar = (show) => {
        if (show) {
            setSidebarVisible(true);
            Animated.parallel([
                Animated.timing(sidebarAnim, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.back(0.5)) }),
                Animated.timing(overlayAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(sidebarAnim, { toValue: -width * 0.8, duration: 300, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
                Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => setSidebarVisible(false));
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadAllData();
        }, [])
    );

    const loadAllData = async () => {
        const user = await loadUserData();
        await Promise.all([
            loadNotifications(),
            loadStats(),
            checkPromoVisible()
        ]);
        if (user) checkForNewAchievements(user);
    };

    const checkPromoVisible = async () => {
        try {
            const shown = await AsyncStorage.getItem('promo_banner_shown');
            if (!shown) setPromoVisible(true);
        } catch (e) {}
    };

    const dismissPromo = async () => {
        setPromoVisible(false);
        try {
            await AsyncStorage.setItem('promo_banner_shown', '1');
        } catch (e) {}
    };


    const onRefresh = async () => {
        setRefreshing(true);
        await loadAllData();
        setRefreshing(false);
    };

    const loadStats = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;
            const response = await fetch(`${BACKEND_URL}/activities/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) { }
    };

    const loadUserData = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userDataText = await AsyncStorage.getItem('user');

            if (userDataText) {
                const parsedUser = JSON.parse(userDataText);
                if (parsedUser.nombre) setNombreUsuario(parsedUser.nombre);
                if (parsedUser.plan) setPlan(parsedUser.plan);
                if (parsedUser.avatar) setAvatar(parsedUser.avatar);
                if (parsedUser.role) setRole(parsedUser.role);
            }

            if (token) {
                const response = await fetch(`${BACKEND_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.nombre) setNombreUsuario(data.nombre);
                    if (data.plan) setPlan(data.plan);
                    if (data.avatar) setAvatar(data.avatar);
                    if (data.role) setRole(data.role);
                    setUserData(data); // Guardar todos los datos para evaluación de logros
                    return data; // Devolver los datos
                }
            }
        } catch (error) { }
        return null;
    };

    const loadNotifications = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;
            const response = await fetch(`${BACKEND_URL}/notifications/count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setNotifCount(data.total);
            }
        } catch (error) { }
    };

    const getPlanConfig = (planName) => {
        switch (planName) {
            case 'Ultimate': return { icon: 'diamond', color: '#FF3366', gradient: ['#FF3366', '#FF6B6B'] };
            case 'Pro': return { icon: 'shield-checkmark', color: '#63ff15', gradient: ['#63ff15', '#00D1FF'] };
            default: return { icon: 'ribbon-outline', color: '#71717A', gradient: ['#3F3F46', '#52525B'] };
        }
    };

    const planConfig = getPlanConfig(plan);

    const QuickAction = ({ icon, label, color, onPress, delay = 0 }) => (
        <Animated.View style={{
            opacity: cardAnims[delay] || fadeAnim,
            transform: [{ scale: cardAnims[delay] || scaleAnim }]
        }}>
            <TouchableOpacity
                style={styles.quickAction}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onPress();
                    }}
                    activeOpacity={0.7}
            >
                <LinearGradient
                    colors={[color, color + '60']}
                    style={styles.quickActionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.quickActionIconBox}>
                    <Ionicons name={icon} size={24} color="white" />
                </View>
                <Text style={styles.quickActionLabelText}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    const FeatureCard = ({ title, icon, iconType = "Ionicons", color, screen, badge, description }) => (
        <TouchableOpacity
            style={styles.featureCard}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate(screen);
            }}
            activeOpacity={0.8}
            data-testid={`feature-${screen.toLowerCase()}`}
        >
            <LinearGradient
                colors={['#141414', '#0c0c0c']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.featureCardContent}>
                <View style={[styles.featureIconWrap, { backgroundColor: color + '15' }]}>
                    {iconType === "Ionicons" ? (
                        <Ionicons name={icon} size={24} color={color} />
                    ) : iconType === "FontAwesome5" ? (
                        <FontAwesome5 name={icon} size={20} color={color} />
                    ) : (
                        <MaterialCommunityIcons name={icon} size={24} color={color} />
                    )}
                </View>
                <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>{title}</Text>
                    {description && <Text style={styles.featureDesc}>{description}</Text>}
                </View>
            </View>
            {badge && (
                <View style={[styles.featureBadge, { backgroundColor: color }]}>
                    <Text style={styles.featureBadgeText}>{badge}</Text>
                </View>
            )}
            <Ionicons name="chevron-forward" size={18} color="#3F3F46" style={styles.featureArrow} />
        </TouchableOpacity>
    );

    // Sistema de detección de logros
    const ACHIEVEMENTS = [
        {
            id: 'welcome',
            title: 'Primer Rep',
            icon: 'barbell',
            iconType: 'Ionicons',
            color: '#63ff15',
            check: (user) => !!user.id,
            description: 'Bienvenido a Nexus Athletics. ¡Empieza a entrenar!'
        },
        {
            id: 'ai_coach',
            title: 'Coach IA',
            icon: 'robot',
            iconType: 'MaterialCommunityIcons',
            color: '#A259FF',
            check: (user) => (user.mensajesHoy || 0) > 0,
            description: 'Consultaste a Nexus AI para optimizar tu entrenamiento.'
        },
        {
            id: 'elite_athlete',
            title: 'Atleta de Élite',
            icon: 'crown',
            iconType: 'MaterialCommunityIcons',
            color: '#FFD700',
            check: (user) => user.plan !== 'Gratis',
            description: 'Suscrito a un plan de rendimiento premium.'
        }
    ];

    const checkForNewAchievements = async (user) => {
        try {
            // Obtener logros ya desbloqueados
            const unlockedString = await AsyncStorage.getItem('unlocked_achievements');
            const unlocked = unlockedString ? JSON.parse(unlockedString) : [];

            // Buscar nuevos logros
            for (const achievement of ACHIEVEMENTS) {
                if (!unlocked.includes(achievement.id) && achievement.check(user)) {
                    // ¡Nuevo logro desbloqueado!
                    unlocked.push(achievement.id);
                    await AsyncStorage.setItem('unlocked_achievements', JSON.stringify(unlocked));

                    // Mostrar modal solo para el primer logro nuevo (evitar spam)
                    setAchievementModal({ visible: true, achievement });
                    break;
                }
            }
        } catch (error) {
            console.error('Error checking achievements:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#63ff15" />
                }
            >
                            {/* HEADER PREMIUM - ULTRA-ELITE */}
                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <BlurView intensity={25} tint="dark" style={styles.mainHeaderCard}>
                        <View style={styles.headerTop}>
                            <View style={styles.headerLeft}>
                                <TouchableOpacity onPress={() => toggleSidebar(true)} style={styles.menuNavBtn}>
                                    <View style={styles.glassBtn}>
                                        <Ionicons name="grid-outline" size={22} color="#63ff15" />
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.welcomeTextContainer}>
                                    <Text style={styles.greetingText}>{greeting},</Text>
                                    <Text style={styles.userName}>{nombreUsuario}</Text>
                                </View>
                            </View>

                            <View style={styles.headerRight}>
                                <TouchableOpacity
                                    style={styles.notifBtn}
                                    onPress={() => navigation.navigate('Notifications')}
                                >
                                    <Ionicons name="notifications-outline" size={22} color="#fff" />
                                    {notifCount > 0 && <View style={styles.pulsatingDot} />}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.avatarWrapper}
                                    onPress={() => navigation.navigate('AccountSettings')}
                                >
                                    <LinearGradient
                                        colors={planConfig.gradient}
                                        style={styles.avatarGlow}
                                    />
                                    <Image
                                        source={avatar ? { uri: avatar } : { uri: 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                                        style={styles.avatarImg}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.membershipStrip}
                            onPress={() => navigation.navigate('PlanesPago')}
                        >
                            <View style={styles.membershipInfo}>
                                <MaterialCommunityIcons name="shield-check" size={16} color={planConfig.color} />
                                <Text style={[styles.membershipText, { color: planConfig.color }]}>STATUS: {plan.toUpperCase()} ELITE</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={planConfig.color} />
                        </TouchableOpacity>
                    </BlurView>
                </Animated.View>

                {/* QUICK NAV: HORIZONTAL SCROLL */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.premiumHorizontalScroll}
                >
                    <QuickAction icon="mic-outline" label="Voz Coach" color="#00D1FF" onPress={() => navigation.navigate('VoiceCoach')} delay={1} />
                    <QuickAction icon="diamond" label="Elite Vault" color="#FFD700" onPress={() => navigation.navigate('SavedElitePlans')} delay={2} />
                    <QuickAction icon="bar-chart" label="Ranking" color="#FF6B6B" onPress={() => navigation.navigate('Ranking')} delay={3} />
                </ScrollView>

                {/* SECTIONS: BENTO STYLE LISTS */}
                <View style={styles.sectionGroup}>
                    <View style={styles.premiumSectionHeader}>
                        <View style={styles.accentLine} />
                        <Text style={styles.premiumSectionTitle}>INTELIGENCIA NEXUS</Text>
                    </View>
                    <View style={styles.bentoFeatureList}>
                        <FeatureCard title="Neural Assistant" icon="pulse" color="#A259FF" screen="EntrenadorIA" description="Optimización por IA" />
                        <FeatureCard title="Bio-Scanner" icon="scan" color="#FF00FF" screen="FoodScanner" description="Análisis molecular" />
                        <FeatureCard title="Body Scanner" icon="body" color="#00F0FF" screen="BodyScanner" description="Análisis corporal 3D" />
                    </View>
                </View>

                <View style={styles.sectionGroup}>
                    <View style={styles.premiumSectionHeader}>
                        <View style={styles.accentLine} />
                        <Text style={styles.premiumSectionTitle}>PROTOCOLO DE ENTRENAMIENTO</Text>
                    </View>
                    <View style={styles.bentoFeatureList}>
                        <FeatureCard title="Centro de Comando" icon="calendar" color="#007AFF" screen="TrainingCalendar" description="Programación de ciclos" />
                    </View>
                </View>

                {/* PUBLICIDAD SUTIL - SOLO 1 VEZ */}
                {promoVisible && plan === 'Gratis' && (
                    <NativeAd type="fitness" />
                )}

                {/* SECCIÓN: SOCIAL */}
                <View style={styles.sectionGroup}>
                    <View style={styles.premiumSectionHeader}>
                        <View style={styles.accentLine} />
                        <Text style={styles.premiumSectionTitle}>COMUNIDAD NEXUS</Text>
                    </View>
                    <View style={styles.bentoFeatureList}>
                        <FeatureCard title="Amigos" icon="people-circle" color="#00D1FF" screen="Friends" description="Tu red fitness" />
                        <FeatureCard title="Logros" icon="medal" color="#FFA500" screen="Achievements" description="Desbloquea badges" />
                    </View>
                </View>

                {/* ADMIN */}
                {role === 'ADMIN' && (
                    <>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(99,255,21,0.15)' }]}>
                                <Ionicons name="shield-checkmark" size={18} color="#63ff15" />
                            </View>
                            <Text style={styles.sectionTitleAlt}>Panel Admin</Text>
                        </View>
                        <View style={styles.featuresGrid}>
                            <FeatureCard title="Dashboard" icon="speedometer" color="#63ff15" screen="AdminDashboard" description="Gestión de usuarios" />
                        </View>
                    </>
                )}

                {/* BANNER PUBLICITARIO - SOLO 1 VEZ */}
                {promoVisible && plan === 'Gratis' && (
                    <View style={styles.promoBanner}>
                        <LinearGradient
                            colors={['#1a1a1a', '#000']}
                            style={styles.promoBannerGrad}
                        >
                            <View style={styles.promoBannerContent}>
                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={() => navigation.navigate('PlanesPago')}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.promoBannerText}>
                                        <View style={styles.promoBadge}>
                                            <Text style={styles.promoBadgeText}>OFERTA LIMITADA</Text>
                                        </View>
                                        <Text style={styles.promoBannerTitle}>Desbloquea Nexus Élite</Text>
                                        <Text style={styles.promoBannerSub}>Rutinas Canvas IA Ilimitadas y Fisiología Master.</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={dismissPromo} style={styles.promoCloseBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Ionicons name="close" size={18} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
                )}

                {/* MOTIVACIÓN */}
                <View style={styles.motivationCard}>
                    <LinearGradient
                        colors={['rgba(99,255,21,0.08)', 'rgba(0,209,255,0.05)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.motivationHeader}>
                        <MaterialCommunityIcons name="lightning-bolt" size={16} color="#63ff15" />
                        <Text style={styles.motivationLabel}>NEXUS MOTIVATION</Text>
                    </View>
                    <Text style={styles.motivationText}>"{motivation}"</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* SIDEBAR / DRAWER */}
            {sidebarVisible && (
                <TouchableOpacity
                    activeOpacity={1}
                    style={StyleSheet.absoluteFill}
                    onPress={() => toggleSidebar(false)}
                >
                    <Animated.View style={[styles.sidebarOverlay, { opacity: overlayAnim }]} />
                </TouchableOpacity>
            )}

            {sidebarVisible && <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.sidebarHeader}>
                        <Image source={{ uri: 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }} style={styles.sidebarLogo} />
                        <Text style={styles.sidebarTitle}>NEXUS <Text style={{ color: '#63ff15' }}>ATHLETICS</Text></Text>
                    </View>

                    <View style={styles.sidebarUserSection}>
                        <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.sidebarUserCard}>
                            <View style={styles.sidebarUserTop}>
                                <Image source={avatar ? { uri: avatar } : { uri: 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }} style={styles.sidebarAvatar} />
                                <View style={styles.sidebarUserInfo}>
                                    <Text style={styles.sidebarUserNameText}>{nombreUsuario}</Text>
                                    <View style={[styles.sidebarPlanBadge, { backgroundColor: planConfig.color + '20' }]}>
                                        <Text style={[styles.sidebarPlanText, { color: planConfig.color }]}>{plan.toUpperCase()}</Text>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    <ScrollView style={styles.sidebarMenu}>
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); navigation.navigate('AccountSettings'); }}>
                            <Ionicons name="person-outline" size={22} color="#888" />
                            <Text style={styles.sidebarItemText}>Mi Perfil</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); navigation.navigate('PlanesPago'); }}>
                            <Ionicons name="card-outline" size={22} color="#888" />
                            <Text style={styles.sidebarItemText}>Suscripción</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); navigation.navigate('SavedElitePlans'); }}>
                            <Ionicons name="folder-open-outline" size={22} color="#888" />
                            <Text style={styles.sidebarItemText}>Nexus Vault</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); navigation.navigate('Analytics'); }}>
                            <Ionicons name="analytics-outline" size={22} color="#888" />
                            <Text style={styles.sidebarItemText}>Estadísticas</Text>
                        </TouchableOpacity>
                        <View style={styles.sidebarDivider} />
                        <TouchableOpacity style={styles.sidebarItem} onPress={async () => {
                            try { await supabase.auth.signOut(); } catch (e) {}
                            await AsyncStorage.multiRemove(['token', 'user', 'promo_banner_shown', 'location_step_done']);
                            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                        }}>
                            <Ionicons name="log-out-outline" size={22} color="#ff4d4d" />
                            <Text style={[styles.sidebarItemText, { color: '#ff4d4d' }]}>Cerrar Sesión</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.sidebarFooter}>
                        <Text style={styles.versionText}>v1.0.0 Production Ready</Text>
                    </View>
                </SafeAreaView>
            </Animated.View>}

            {/* Modal de Logro Desbloqueado */}
            <AchievementUnlockedModal
                visible={achievementModal.visible}
                achievement={achievementModal.achievement}
                onClose={() => setAchievementModal({ visible: false, achievement: null })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    scrollContent: { paddingHorizontal: 0, paddingBottom: 100 },

    // HEADER PREMIUM CON NEON
    header: { paddingHorizontal: 16, paddingTop: 12, marginBottom: 24 },
    mainHeaderCard: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
        overflow: 'hidden',
        backgroundColor: '#121212',
        shadowColor: '#63ff15',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuNavBtn: { borderRadius: 12, overflow: 'hidden' },
    glassBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(99,255,21,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
    },
    welcomeTextContainer: { gap: 2 },
    greetingText: { color: '#888', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
    userName: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },

    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    notifBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(99,255,21,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    pulsatingDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3366',
        shadowColor: '#FF3366',
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 3,
    },

    avatarWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(99,255,21,0.3)',
    },
    avatarGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        opacity: 0.2,
    },
    avatarImg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)'
    },

    membershipStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(99,255,21,0.05)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.12)',
    },
    membershipInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    membershipText: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: '#63ff15' },

    // BENTO GRID PREMIUM
    bentoGrid: { paddingHorizontal: 16, gap: 12, marginBottom: 24 },
    bentoRow: { flexDirection: 'row', gap: 12 },
    bentoCard: {
        borderRadius: 20,
        padding: 18,
        backgroundColor: '#121212',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.12)',
        overflow: 'hidden',
        shadowColor: '#63ff15',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHalf: { flex: 1, height: 160, justifyContent: 'space-between' },
    cardFull: { flex: 1, height: 100, justifyContent: 'center' },
    bentoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    bentoIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(99,255,21,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
    },
    bentoValue: { color: '#63ff15', fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 8 },
    unitText: { fontSize: 13, color: '#888', fontWeight: '600' },
    bentoLabel: { color: '#666', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginTop: 6 },
    bentoMiniGraph: { height: 4, backgroundColor: 'rgba(99,255,21,0.08)', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
    graphBar: { height: '100%', borderRadius: 2 },

    bentoFullContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    streakVisual: { flexDirection: 'row', gap: 5 },
    streakDot: { width: 10, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(99,255,21,0.15)' },
    streakInfo: { flex: 1 },

    // QUICK ACTIONS & FEATURES
    premiumHorizontalScroll: { paddingLeft: 16, paddingRight: 16, gap: 12, marginBottom: 28 },
    quickAction: {
        width: 100,
        height: 110,
        borderRadius: 18,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.12)',
    },
    quickActionGradient: { ...StyleSheet.absoluteFill, borderRadius: 18 },
    quickActionIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    quickActionLabelText: { color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 6, textAlign: 'center' },

    // SECTION SYSTEM
    sectionGroup: { paddingHorizontal: 16, marginBottom: 32 },
    premiumSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    accentLine: { width: 3, height: 16, backgroundColor: '#63ff15', borderRadius: 1.5 },
    premiumSectionTitle: { color: '#888', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
    bentoFeatureList: { gap: 10 },

    // FEATURE CARD PREMIUM
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 18,
        backgroundColor: '#121212',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.12)',
        marginBottom: 8,
        shadowColor: '#63ff15',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
    },
    featureCardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    featureIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
    },
    featureTextWrap: { flex: 1 },
    featureTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
    featureDesc: { color: '#666', fontSize: 12, fontWeight: '600', marginTop: 2 },
    featureBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
    featureBadgeText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    featureArrow: { marginLeft: 8 },

    // STEP COUNTER
    premiumStepWrapper: { paddingHorizontal: 16, marginBottom: 28 },

    // PROMO BANNER & MOTIVATION
    promoBanner: {
        marginHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
        marginBottom: 20,
        shadowColor: '#63ff15',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    promoBannerGrad: { padding: 20 },
    promoBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    promoBannerText: { flex: 1 },
    promoBadge: {
        backgroundColor: '#63ff15',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8
    },
    promoBadgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    promoBannerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    promoBannerSub: { color: '#888', fontSize: 13, marginTop: 4, lineHeight: 18, fontWeight: '600' },
    promoBannerAction: { marginLeft: 16 },
    promoCloseBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
    promoActionCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#63ff15',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 5,
    },

    motivationCard: {
        marginHorizontal: 16,
        padding: 22,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
        overflow: 'hidden',
        alignItems: 'center',
        backgroundColor: 'rgba(99,255,21,0.04)',
        marginBottom: 20,
        shadowColor: '#63ff15',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    motivationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    motivationLabel: { color: '#63ff15', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
    motivationText: { color: '#CCC', fontSize: 15, fontStyle: 'italic', textAlign: 'center', lineHeight: 24, fontWeight: '500' },

    // SIDEBAR
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: width * 0.75,
        backgroundColor: '#0A0A0A',
        zIndex: 1000,
        borderRightWidth: 1,
        borderRightColor: 'rgba(99,255,21,0.15)'
    },
    sidebarOverlay: { backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999 },
    sidebarHeader: {
        padding: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(99,255,21,0.1)',
    },
    sidebarLogo: { width: 40, height: 40, borderRadius: 10 },
    sidebarTitle: { color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    sidebarUserSection: { paddingHorizontal: 16, paddingVertical: 20, marginBottom: 12 },
    sidebarUserCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.12)',
        backgroundColor: '#121212',
    },
    sidebarUserTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sidebarAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(99,255,21,0.3)' },
    sidebarUserInfo: { flex: 1 },
    sidebarUserNameText: { color: 'white', fontSize: 16, fontWeight: '800' },
    sidebarPlanBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, marginTop: 4, backgroundColor: 'rgba(99,255,21,0.15)', borderWidth: 1, borderColor: 'rgba(99,255,21,0.3)' },
    sidebarPlanText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5, color: '#63ff15' },
    sidebarMenu: { flex: 1, paddingHorizontal: 12 },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        gap: 12,
        borderRadius: 12,
        marginBottom: 6,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    sidebarItemText: { color: '#AAA', fontSize: 15, fontWeight: '700' },
    sidebarDivider: { height: 1, backgroundColor: 'rgba(99,255,21,0.1)', marginVertical: 14, marginHorizontal: 16 },
    sidebarFooter: { padding: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(99,255,21,0.1)' },
    versionText: { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
