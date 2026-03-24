import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, ScrollView, Image,
    Animated, Easing, Dimensions, RefreshControl, Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NativeAd from '../components/NativeAd';
import { BlurView } from 'expo-blur';
import StepCounter from '../components/StepCounter';
import AchievementUnlockedModal from '../components/AchievementUnlockedModal';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import Config from '../constants/Config';
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

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const cardAnims = useRef([...Array(8)].map(() => new Animated.Value(0))).current;

    // Hidratación y Racha
    const [waterCount, setWaterCount] = useState(0);
    const [streak, setStreak] = useState(0);
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
        requestLocationPermission();

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

        const interval = setInterval(loadNotifications, 10000);
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
            loadWater(),
            loadNotifications(),
            loadStats()
        ]);
        // Verificar logros después de cargar todos los datos
        if (user) checkForNewAchievements(user);
    };

    const requestLocationPermission = async () => {
        try {
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus === 'granted') {
                const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
                if (backgroundStatus === 'granted') {
                    const { startLocationTracking } = require('../services/LocationTracker');
                    await startLocationTracking();
                    console.log('Permisos concedidos y rastreo de fondo activado');
                } else {
                    console.log('Permiso de ubicación en segundo plano denegado');
                }
            } else {
                console.log('Permiso de ubicación en primer plano denegado');
            }
        } catch (error) {
            console.error('Error solicitando permisos de ubicación:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAllData();
        setRefreshing(false);
    };

    const loadWater = async () => {
        try {
            const today = new Date().toDateString();
            
            const userJson = await AsyncStorage.getItem('user');
            const userDataParsed = userJson ? JSON.parse(userJson) : null;
            const userId = userDataParsed?._id || userDataParsed?.id || 'default';
            const WATER_KEY = `water_data_${userId}`;

            const savedData = await AsyncStorage.getItem(WATER_KEY);
            if (savedData) {
                const data = JSON.parse(savedData);
                if (data.date === today) {
                    setWaterCount(data.count);
                } else {
                    setWaterCount(0);
                    await AsyncStorage.setItem(WATER_KEY, JSON.stringify({ date: today, count: 0 }));
                }
            }
        } catch (error) { }
    };

    const addWater = async () => {
        const newCount = waterCount + 1;
        setWaterCount(newCount);
        const today = new Date().toDateString();
        
        const userJson = await AsyncStorage.getItem('user');
        const userDataParsed = userJson ? JSON.parse(userJson) : null;
        const userId = userDataParsed?._id || userDataParsed?.id || 'default';
        const WATER_KEY = `water_data_${userId}`;

        await AsyncStorage.setItem(WATER_KEY, JSON.stringify({ date: today, count: newCount }));
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
                if (parsedUser.streak) setStreak(parsedUser.streak);
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
            title: 'Recién Llegado',
            icon: 'hand-wave',
            iconType: 'MaterialCommunityIcons',
            color: '#63ff15',
            check: (user) => !!user.id,
            description: 'Te uniste a la comunidad de Nexus Athletics.'
        },
        {
            id: 'walker',
            title: 'Caminante Pro',
            icon: 'footsteps',
            iconType: 'Ionicons',
            color: '#00D1FF',
            check: (user) => (user.healthSteps || 0) >= 5000,
            description: 'Has superado los 5,000 pasos en un solo día.'
        },
        {
            id: 'ai_user',
            title: 'IA Friend',
            icon: 'robot',
            iconType: 'MaterialCommunityIcons',
            color: '#A259FF',
            check: (user) => (user.mensajesHoy || 0) > 0,
            description: 'Has consultado a Nexus AI para mejorar tu entrenamiento.'
        },
        {
            id: 'premium',
            title: 'Atleta Elite',
            icon: 'crown',
            iconType: 'MaterialCommunityIcons',
            color: '#FFD700',
            check: (user) => user.plan !== 'Gratis',
            description: 'Suscrito a un plan de alto rendimiento.'
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

                {/* BENTO DASHBOARD: STATS & FOCUS */}
                <View style={styles.bentoGrid}>
                    <View style={styles.bentoRow}>
                        {/* Kcal Card */}
                        <TouchableOpacity style={[styles.bentoCard, styles.cardHalf]}>
                            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                            <LinearGradient colors={['rgba(255,107,53,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
                            <View style={styles.bentoIconBox}>
                                <Ionicons name="flame" size={20} color="#FF6B35" />
                            </View>
                            <Text style={styles.bentoValue}>{Math.round(stats.totalKcal || 0)}</Text>
                            <Text style={styles.bentoLabel}>KCAL QUEMADAS</Text>
                            <View style={styles.bentoMiniGraph}>
                                <View style={[styles.graphBar, { width: '70%', backgroundColor: '#FF6B35' }]} />
                            </View>
                        </TouchableOpacity>

                        {/* Hydration Card */}
                        <TouchableOpacity style={[styles.bentoCard, styles.cardHalf]} onPress={addWater}>
                            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                            <LinearGradient colors={['rgba(0,209,255,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
                            <View style={styles.bentoCardHeader}>
                                <View style={styles.bentoIconBox}>
                                    <Ionicons name="water" size={20} color="#00D1FF" />
                                </View>
                                <Ionicons name="add-circle" size={24} color="#00D1FF" />
                            </View>
                            <Text style={styles.bentoValue}>{waterCount * 250}<Text style={styles.unitText}>ml</Text></Text>
                            <Text style={styles.bentoLabel}>HIDRATACIÓN</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bentoRow}>
                        {/* Session Streak Card */}
                        <TouchableOpacity style={[styles.bentoCard, styles.cardFull]}>
                            <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                            <View style={styles.bentoFullContent}>
                                <View style={styles.streakInfo}>
                                    <Text style={styles.bentoValue}>{streak} DÍAS</Text>
                                    <Text style={styles.bentoLabel}>RACHA DE RENDIMIENTO</Text>
                                </View>
                                <View style={styles.streakVisual}>
                                    {[1,2,3,4,5,6,7].map(d => (
                                        <View key={d} style={[styles.streakDot, streak >= d && { backgroundColor: '#63ff15', shadowColor: '#63ff15', shadowOpacity: 0.5, shadowRadius: 5 }]} />
                                    ))}
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* QUICK NAV: HORIZONTAL SCROLL */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.premiumHorizontalScroll}
                >
                    <QuickAction icon="flash" label="Nexus IA" color="#A259FF" onPress={() => navigation.navigate('EntrenadorIA')} delay={0} />
                    <QuickAction icon="mic-outline" label="Voz Coach" color="#00D1FF" onPress={() => navigation.navigate('VoiceCoach')} delay={1} />
                    <QuickAction icon="finger-print" label="Biometrics" color="#63ff15" onPress={() => navigation.navigate('HealthSync')} delay={2} />
                    <QuickAction icon="diamond" label="Elite Vault" color="#FFD700" onPress={() => navigation.navigate('SavedElitePlans')} delay={3} />
                    <QuickAction icon="bar-chart" label="Ranking" color="#FF6B6B" onPress={() => navigation.navigate('Ranking')} delay={4} />
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
                        <FeatureCard title="Bio-Sincronización" icon="sync" color="#63ff15" screen="HealthSync" description="Integración de biometría" />
                        <FeatureCard title="Centro de Comando" icon="calendar" color="#007AFF" screen="TrainingCalendar" description="Programación de ciclos" />
                    </View>
                </View>

                {/* STEP COUNTER PREMIUM */}
                <View style={styles.premiumStepWrapper}>
                    <StepCounter />
                </View>

                {/* PUBLICIDAD SUTIL PARA PLAN GRATIS */}
                {plan === 'Gratis' && (
                    <NativeAd type="fitness" />
                )}

                {/* SECCIÓN: SOCIAL */}
                <View style={styles.sectionGroup}>
                    <View style={styles.premiumSectionHeader}>
                        <View style={styles.accentLine} />
                        <Text style={styles.premiumSectionTitle}>COMUNIDAD NEXUS</Text>
                    </View>
                    <View style={styles.bentoFeatureList}>
                        <FeatureCard title="Feed Social" icon="globe" color="#FF6B6B" screen="Community" description="Ver actividades" />
                        <FeatureCard title="Ranking Global" icon="trophy" color="#FFD700" screen="Ranking" description="Compite y gana" />
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

                {/* BANNER PUBLICITARIO PARA USUARIOS GRATIS */}
                {plan === 'Gratis' && (
                    <TouchableOpacity
                        style={styles.promoBanner}
                        onPress={() => navigation.navigate('PlanesPago')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#1a1a1a', '#000']}
                            style={styles.promoBannerGrad}
                        >
                            <View style={styles.promoBannerContent}>
                                <View style={styles.promoBannerText}>
                                    <View style={styles.promoBadge}>
                                        <Text style={styles.promoBadgeText}>OFERTA LIMITADA</Text>
                                    </View>
                                    <Text style={styles.promoBannerTitle}>Desbloquea Nexus Élite</Text>
                                    <Text style={styles.promoBannerSub}>Rutinas Canvas IA Ilimitadas y Fisiología Master.</Text>
                                </View>
                                <View style={styles.promoBannerAction}>
                                    <LinearGradient
                                        colors={['#63ff15', '#00D1FF']}
                                        style={styles.promoActionCircle}
                                    >
                                        <Ionicons name="star" size={20} color="#000" />
                                    </LinearGradient>
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
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
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); navigation.navigate('AccountSettings'); }}>
                            <Ionicons name="settings-outline" size={22} color="#888" />
                            <Text style={styles.sidebarItemText}>Configuración</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarItem} onPress={async () => {
                            await AsyncStorage.multiRemove(['token', 'user']);
                            navigation.replace('Login');
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
    container: { flex: 1, backgroundColor: '#000' },
    scrollContent: { paddingHorizontal: 0, paddingBottom: 100 },

    // REINVENTED HEADER
    header: { paddingHorizontal: 20, paddingTop: 10, marginBottom: 20 },
    mainHeaderCard: {
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuNavBtn: { borderRadius: 14, overflow: 'hidden' },
    glassBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
    welcomeTextContainer: { gap: 0 },
    greetingText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    userName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },

    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    notifBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    pulsatingDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3366', borderWeight: 2, borderColor: '#000' },
    
    avatarWrapper: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
    avatarGlow: { ...StyleSheet.absoluteFillObject, borderRadius: 23, opacity: 0.3 },
    avatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

    membershipStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        marginTop: 5,
    },
    membershipInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    membershipText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

    // BENTO SYSTEM
    bentoGrid: { paddingHorizontal: 20, gap: 12, marginBottom: 24 },
    bentoRow: { flexDirection: 'row', gap: 12 },
    bentoCard: {
        borderRadius: 28,
        padding: 20,
        backgroundColor: '#0A0A0A',
        borderWeight: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    cardHalf: { flex: 1, height: 160, justifyContent: 'space-between' },
    cardFull: { flex: 1, height: 100, justifyContent: 'center' },
    bentoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    bentoIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    bentoValue: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -1 },
    unitText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
    bentoLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: 4 },
    bentoMiniGraph: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
    graphBar: { height: '100%', borderRadius: 2 },
    
    bentoFullContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    streakVisual: { flexDirection: 'row', gap: 4 },
    streakDot: { width: 12, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)' },

    // HORIZONTAL SCROLL
    premiumHorizontalScroll: { paddingLeft: 20, paddingRight: 20, gap: 15, marginBottom: 30 },

    // SECTION SYSTEM
    sectionGroup: { paddingHorizontal: 20, marginBottom: 32 },
    premiumSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    accentLine: { width: 3, height: 14, backgroundColor: '#63ff15', borderRadius: 2 },
    premiumSectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    bentoFeatureList: { gap: 10 },

    // STEP COUNTER
    premiumStepWrapper: { paddingHorizontal: 20, marginBottom: 30 },

    // PROMO BANNER & MOTIVATION (PREMIUM GLASS)
    promoBanner: { marginHorizontal: 20, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(99,255,21,0.15)', marginBottom: 20 },
    promoBannerGrad: { padding: 22 },
    promoBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    promoBannerText: { flex: 1 },
    promoBadge: { backgroundColor: '#63ff15', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
    promoBadgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    promoBannerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    promoBannerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4, lineHeight: 18, fontWeight: '600' },
    promoBannerAction: { marginLeft: 15 },
    promoActionCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', shadowColor: '#63ff15', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },

    motivationCard: {
        marginHorizontal: 20, padding: 24, borderRadius: 28, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 20
    },
    motivationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    motivationLabel: { color: '#63ff15', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    motivationText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontStyle: 'italic', textAlign: 'center', lineHeight: 26, fontWeight: '500' },

    // SIDEBAR PREMIUM REINVENTED
    sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.82, backgroundColor: '#000', zIndex: 1000, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' },
    sidebarOverlay: { backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 999 },
    sidebarHeader: { padding: 30, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
    sidebarLogo: { width: 44, height: 44, borderRadius: 12 },
    sidebarTitle: { color: 'white', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    sidebarUserSection: { paddingHorizontal: 20, marginBottom: 25 },
    sidebarUserCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    sidebarUserTop: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    sidebarAvatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
    sidebarUserInfo: { flex: 1 },
    sidebarUserNameText: { color: 'white', fontSize: 18, fontWeight: '800' },
    sidebarPlanBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
    sidebarPlanText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    sidebarMenu: { flex: 1, paddingHorizontal: 15 },
    sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, gap: 15, borderRadius: 16, marginBottom: 4 },
    sidebarItemText: { color: '#AAA', fontSize: 15, fontWeight: '700' },
    sidebarDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 15, marginHorizontal: 20 },
    sidebarFooter: { padding: 30, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)' },
    versionText: { color: '#444', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

    // FALLBACKS
    quickAction: { width: 100, height: 110, borderRadius: 24, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
    quickActionLabelText: { color: '#fff', fontSize: 11, fontWeight: '800', marginTop: 8 },
    featureCard: {
        flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 22,
        backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 5
    },
    featureIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    featureTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
    featureDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginTop: 2 },
});
