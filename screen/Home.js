import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, ScrollView, Image,
    Animated, Easing, Dimensions, RefreshControl, Platform, StatusBar,
    useWindowDimensions
} from 'react-native';
import { colors, typography, spacing, radius, shadows, rs, PAGE_PADDING, BOTTOM_PADDING } from '../theme';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NativeAd from '../components/NativeAd';
import { BlurView } from 'expo-blur';
import AchievementUnlockedModal from '../components/AchievementUnlockedModal';
import * as Haptics from 'expo-haptics';
import { useLoading } from '../App';

import Config from '../constants/Config';
import Constants from 'expo-constants';
import { registerForPushNotificationsAsync, saveTokenToBackend, sendAchievementNotification } from '../services/NotificationService';

const BACKEND_URL = Config.BACKEND_URL;
const { width } = Dimensions.get('window');


export default function Home() {
    const navigation = useNavigation();
    const { showLoading } = useLoading();
    const [nombreUsuario, setNombreUsuario] = useState('Atleta');
    const [plan, setPlan] = useState('Gratis');

    const navigateToScreen = (screenName) => {
        let msg = 'CARGANDO SISTEMA';
        let subMsg = 'SINCRONIZANDO...';

        switch (screenName) {
            case 'SavedElitePlans':
                msg = 'ACCEDIENDO AL ELITE VAULT';
                subMsg = 'DESBLOQUEANDO EXPEDIENTES...';
                break;
            case 'Ranking':
                msg = 'CONECTANDO A LIGA NEXUS';
                subMsg = 'RECOPILANDO CLASIFICACIÓN...';
                break;
            case 'Achievements':
                msg = 'ACCEDIENDO A LOGROS';
                subMsg = 'SINTONIZANDO RECOMPENSAS...';
                break;
            case 'Notifications':
                msg = 'CARGANDO NOTIFICACIONES';
                subMsg = 'COMPUTANDO ALERTAS...';
                break;
            case 'AccountSettings':
                msg = 'ACCEDIENDO A CONFIGURACIÓN';
                subMsg = 'CARGANDO DATOS DE SEGURIDAD...';
                break;
            case 'PlanesPago':
                msg = 'CARGANDO PLANES ÉLITE';
                subMsg = 'CONECTANDO PASARELA DE PAGO...';
                break;
            case 'TrainingCalendar':
                msg = 'CARGANDO CALENDARIO';
                subMsg = 'SINTONIZANDO TUS ENTRENAMIENTOS...';
                break;
            case 'BodyScanner':
                msg = 'ACCEDIENDO AL BODY SCANNER';
                subMsg = 'INICIALIZANDO LENTES SENSORIALES...';
                break;
            case 'FoodScanner':
                msg = 'ACCEDIENDO AL NUTRI SCANNER';
                subMsg = 'CARGANDO BASE DE ALIMENTOS IA...';
                break;
            case 'FormAnalysis':
                msg = 'ACCEDIENDO A FORM ANALYSIS';
                subMsg = 'CONECTANDO CÁMARA DE MOVIMIENTO...';
                break;
            case 'DigitalTwin':
                msg = 'ACCEDIENDO AL DIGITAL TWIN';
                subMsg = 'COMPUTANDO AVATAR TRIDIMENSIONAL...';
                break;
            case 'Analytics':
                msg = 'PROCESANDO METRICAS';
                subMsg = 'CALCULANDO RENDIMIENTO DEPORTIVO...';
                break;
            case 'Nexus IA':
            case 'EntrenadorIA':
                msg = 'ACCEDIENDO A NEXUS IA';
                subMsg = 'CONECTANDO CON TU ENTRENADOR...';
                break;
        }

        showLoading(msg, subMsg, 1200);
        setTimeout(() => {
            navigation.navigate(screenName);
        }, 100);
    };
    const [notifCount, setNotifCount] = useState(0);
    const [avatar, setAvatar] = useState(null);
    const [role, setRole] = useState('USER');
    const [refreshing, setRefreshing] = useState(false);
    const [greeting, setGreeting] = useState('');

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

    // Racha
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
            loadStreak(),
            loadNotifications(),
        ]);
        if (user) checkForNewAchievements(user);
    };


    const onRefresh = async () => {
        setRefreshing(true);
        await loadAllData();
        setRefreshing(false);
    };

    const loadStreak = async () => {
        try {
            const val = await AsyncStorage.getItem('streak_count');
            if (val) setStreak(parseInt(val) || 0);
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

    const QuickAction = ({ icon, label, color, onPress, delay = 0 }) => {
        const pressAnim = useRef(new Animated.Value(1)).current;
        const handlePressIn = () => {
            Animated.spring(pressAnim, { toValue: 0.93, useNativeDriver: true, friction: 8 }).start();
        };
        const handlePressOut = () => {
            Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 140 }).start();
        };
        return (
        <Animated.View style={{
            opacity: cardAnims[delay] || fadeAnim,
            transform: [{ scale: Animated.multiply(cardAnims[delay] || scaleAnim, pressAnim) }]
        }}>
            <TouchableOpacity
                style={[styles.quickAction, { borderColor: color + '30' }]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onPress();
                    }}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    activeOpacity={1}
            >
                <LinearGradient
                    colors={[color, color + '60']}
                    style={styles.quickActionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <LinearGradient
                    colors={[color + 'CC', color + '55']}
                    style={styles.quickActionIconBox}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons name={icon} size={22} color="white" />
                </LinearGradient>
                <Text style={styles.quickActionLabelText}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
        );
    };

    const FeatureCard = ({ title, icon, iconType = "Ionicons", color, screen, badge, description }) => {
        const featurePressAnim = useRef(new Animated.Value(1)).current;
        const handleFeaturePressIn = () => {
            Animated.spring(featurePressAnim, { toValue: 0.97, useNativeDriver: true, friction: 10 }).start();
        };
        const handleFeaturePressOut = () => {
            Animated.spring(featurePressAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start();
        };
        return (
        <Animated.View style={{ transform: [{ scale: featurePressAnim }] }}>
        <TouchableOpacity
            style={styles.featureCard}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigateToScreen(screen);
            }}
            onPressIn={handleFeaturePressIn}
            onPressOut={handleFeaturePressOut}
            activeOpacity={1}
            data-testid={`feature-${screen.toLowerCase()}`}
        >
            <LinearGradient
                colors={['#1B1B1B', '#121212']}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.featureCardTopSheen}
            />
            {/* Left accent border strip */}
            <View style={[styles.featureAccentStrip, { backgroundColor: color }]} />
            <View style={styles.featureCardContent}>
                <LinearGradient
                    colors={[color + '30', color + '10']}
                    style={styles.featureIconWrap}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {iconType === "Ionicons" ? (
                        <Ionicons name={icon} size={24} color={color} />
                    ) : iconType === "FontAwesome5" ? (
                        <FontAwesome5 name={icon} size={20} color={color} />
                    ) : (
                        <MaterialCommunityIcons name={icon} size={24} color={color} />
                    )}
                </LinearGradient>
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
            <View style={[styles.featureArrowWrap, { backgroundColor: color + '15' }]}>
                <Ionicons name="chevron-forward" size={16} color={color} style={styles.featureArrow} />
            </View>
        </TouchableOpacity>
        </Animated.View>
        );
    };

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

                    // Notificación push + modal para el primer logro nuevo
                    sendAchievementNotification(achievement);
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
            <View style={styles.backgroundLayer} pointerEvents="none">
                <LinearGradient
                    colors={['rgba(99,255,21,0.08)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bgOrbTop}
                />
                <LinearGradient
                    colors={['rgba(0,209,255,0.08)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bgOrbMid}
                />
            </View>
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
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.userName}>{nombreUsuario}</Text>
                                        <View style={styles.activeIndicatorDot} />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.headerRight}>
                                <TouchableOpacity
                                    style={styles.notifBtn}
                                    onPress={() => navigateToScreen('Notifications')}
                                >
                                    <Ionicons name="notifications-outline" size={22} color="#fff" />
                                    {notifCount > 0 && <View style={styles.pulsatingDot} />}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.avatarWrapper}
                                    onPress={() => navigateToScreen('AccountSettings')}
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
                            onPress={() => navigateToScreen('PlanesPago')}
                        >
                            <View style={styles.membershipInfo}>
                                <MaterialCommunityIcons name="shield-check" size={16} color={planConfig.color} />
                                <Text style={[styles.membershipText, { color: planConfig.color }]}>STATUS: {plan.toUpperCase()} ELITE</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={planConfig.color} />
                        </TouchableOpacity>
                    </BlurView>
                </Animated.View>

                {/* BENTO DASHBOARD */}
                <View style={styles.bentoGrid}>
                    <View style={styles.bentoRow}>
                        {/* AI Sessions Card */}
                        <TouchableOpacity
                            style={[styles.bentoCard, styles.cardHalf]}
                            onPress={() => navigateToScreen('Nexus IA')}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['rgba(162,89,255,0.25)', 'rgba(162,89,255,0.05)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            {/* Top color bar */}
                            <View style={[styles.bentoTopBar, { backgroundColor: '#A259FF' }]} />
                            <View style={[styles.bentoIconBox, { backgroundColor: 'rgba(162,89,255,0.2)', borderColor: 'rgba(162,89,255,0.5)' }]}>
                                <Ionicons name="sparkles" size={22} color="#A259FF" />
                            </View>
                            <Text style={[styles.bentoValue, { color: '#A259FF', fontSize: rs(38) }]}>{userData?.mensajesHoy || 0}</Text>
                            <Text style={styles.bentoLabel}>CONSULTAS HOY</Text>
                            <View style={styles.bentoMiniGraph}>
                                <LinearGradient
                                    colors={['#A259FF', '#6B2FD9']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.graphBar, { width: `${Math.min((userData?.mensajesHoy || 0) * 10, 100)}%` }]}
                                />
                            </View>
                            <View style={styles.bentoFooterRow}>
                                <Text style={[styles.bentoFooterText, { color: 'rgba(162,89,255,0.7)' }]}>Ver chat →</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Training Streak Card */}
                        <TouchableOpacity
                            style={[styles.bentoCard, styles.cardHalf]}
                            onPress={() => navigateToScreen('TrainingCalendar')}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['rgba(99,255,21,0.2)', 'rgba(99,255,21,0.04)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={[styles.bentoTopBar, { backgroundColor: '#63ff15' }]} />
                            <View style={[styles.bentoIconBox, { backgroundColor: 'rgba(99,255,21,0.15)', borderColor: 'rgba(99,255,21,0.4)' }]}>
                                <MaterialCommunityIcons name="fire" size={22} color="#63ff15" />
                            </View>
                            <Text style={[styles.bentoValue, { fontSize: rs(38) }]}>{streak}</Text>
                            <Text style={styles.bentoLabel}>DÍAS DE RACHA</Text>
                            <View style={styles.bentoMiniGraph}>
                                <LinearGradient
                                    colors={['#63ff15', '#00D1FF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={[styles.graphBar, { width: `${Math.min(streak * 14, 100)}%` }]}
                                />
                            </View>
                            <View style={styles.bentoFooterRow}>
                                <Text style={[styles.bentoFooterText, { color: 'rgba(99,255,21,0.7)' }]}>Calendario →</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Wide promo card */}
                    <TouchableOpacity
                        style={styles.bentoBigCard}
                        onPress={() => navigateToScreen('Nexus IA')}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['rgba(0,209,255,0.15)', 'rgba(99,255,21,0.08)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <LinearGradient
                            colors={['#63ff15', '#00D1FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.bentoBigTopBar}
                        />
                        <View style={styles.bentoBigContent}>
                            <View style={styles.bentoBigLeft}>
                                <View style={styles.bentoBigBadge}>
                                    <Text style={styles.bentoBigBadgeText}>⚡ NEXUS AI</Text>
                                </View>
                                <Text style={styles.bentoBigTitle}>Entrena con{`\n`}<Text style={{ color: '#63ff15' }}>Inteligencia</Text></Text>
                                <Text style={styles.bentoBigSub}>Tu entrenador personal 24/7</Text>
                            </View>
                            <LinearGradient
                                colors={['rgba(99,255,21,0.25)', 'rgba(99,255,21,0.08)']}
                                style={styles.bentoBigIconCircle}
                            >
                                <Ionicons name="sparkles" size={32} color="#63ff15" />
                            </LinearGradient>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* QUICK NAV: HORIZONTAL SCROLL */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.premiumHorizontalScroll}
                >
                    <QuickAction icon="diamond" label="Elite Vault" color="#FFD700" onPress={() => navigateToScreen('SavedElitePlans')} delay={1} />
                    <QuickAction icon="trophy-outline" label="Liga Nexus" color="#a855f7" onPress={() => navigateToScreen('Ranking')} delay={2} />
                    <QuickAction icon="medal-outline" label="Logros" color="#63ff15" onPress={() => navigateToScreen('Achievements')} delay={3} />
                </ScrollView>

                {/* SECTIONS: BENTO STYLE LISTS */}
                <View style={[styles.sectionGroup, styles.sectionCardWrap]}>
                    <View style={styles.premiumSectionHeader}>
                        <LinearGradient
                            colors={['#A259FF', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.accentLine}
                        />
                        <Text style={styles.premiumSectionTitle}>INTELIGENCIA NEXUS</Text>
                    </View>
                    <View style={styles.bentoFeatureList}>
                        <FeatureCard title="Neural Assistant" icon="pulse" color="#A259FF" screen="EntrenadorIA" description="Optimización por IA" />
                        <FeatureCard title="Bio-Scanner" icon="scan" color="#FF00FF" screen="FoodScanner" description="Análisis molecular" />
                        <FeatureCard title="Body Scanner" icon="body" color="#00F0FF" screen="BodyScanner" description="Análisis corporal 3D" />
                    </View>
                </View>

                <View style={[styles.sectionGroup, styles.sectionCardWrap]}>
                    <View style={styles.premiumSectionHeader}>
                        <LinearGradient
                            colors={['#007AFF', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.accentLine}
                        />
                        <Text style={styles.premiumSectionTitle}>PROTOCOLO DE ENTRENAMIENTO</Text>
                    </View>
                    <View style={styles.bentoFeatureList}>
                        <FeatureCard title="Centro de Comando" icon="calendar" color="#007AFF" screen="TrainingCalendar" description="Programación de ciclos" />
                    </View>
                </View>

                {/* PUBLICIDAD SUTIL PARA PLAN GRATIS */}
                {plan === 'Gratis' && (
                    <NativeAd type="fitness" />
                )}

                {/* SECCIÓN: SOCIAL */}
                <View style={[styles.sectionGroup, styles.sectionCardWrap]}>
                    <View style={styles.premiumSectionHeader}>
                        <LinearGradient
                            colors={['#00D1FF', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.accentLine}
                        />
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

                {/* BANNER PUBLICITARIO PARA USUARIOS GRATIS */}
                {plan === 'Gratis' && (
                    <TouchableOpacity
                        style={styles.promoBanner}
                        onPress={() => navigateToScreen('PlanesPago')}
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

                {/* MOTIVACIÓN - PREMIUM */}
                <TouchableOpacity
                    style={styles.motivationCard}
                    onPress={() => setMotivation(motivations[Math.floor(Math.random() * motivations.length)])}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={['#0d1117', '#070b0f']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <LinearGradient
                        colors={['rgba(99,255,21,0.04)', 'transparent', 'rgba(0,209,255,0.03)']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    {/* Left green accent strip */}
                    <View style={styles.motivationAccentStrip} />
                    <Text style={styles.motivationQuoteMark}>"</Text>
                    <View style={styles.motivationContent}>
                        <Text style={styles.motivationText}>{motivation}</Text>
                    </View>
                    <View style={styles.motivationFooter}>
                        <View style={styles.motivationTag}>
                            <MaterialCommunityIcons name="lightning-bolt" size={11} color="#63ff15" />
                            <Text style={styles.motivationTagText}>NEXUS MOTIVATION</Text>
                        </View>
                        <View style={styles.motivationRefresh}>
                            <Ionicons name="refresh-outline" size={14} color="#444" />
                        </View>
                    </View>
                </TouchableOpacity>

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
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); navigateToScreen('AccountSettings'); }}>
                            <Ionicons name="person-outline" size={22} color="#888" />
                            <Text style={styles.sidebarItemText}>Mi Perfil</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); navigateToScreen('PlanesPago'); }}>
                            <Ionicons name="card-outline" size={22} color="#888" />
                            <Text style={styles.sidebarItemText}>Suscripción</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); navigateToScreen('SavedElitePlans'); }}>
                            <Ionicons name="folder-open-outline" size={22} color="#888" />
                            <Text style={styles.sidebarItemText}>Nexus Vault</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); navigateToScreen('Analytics'); }}>
                            <Ionicons name="analytics-outline" size={22} color="#888" />
                            <Text style={styles.sidebarItemText}>Estadísticas</Text>
                        </TouchableOpacity>
                        <View style={styles.sidebarDivider} />
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
    container: { flex: 1, backgroundColor: colors.background },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    bgOrbTop: {
        position: 'absolute',
        top: -110,
        right: -70,
        width: 260,
        height: 260,
        borderRadius: 160,
    },
    bgOrbMid: {
        position: 'absolute',
        top: 260,
        left: -90,
        width: 240,
        height: 240,
        borderRadius: 160,
    },
    scrollContent: { paddingHorizontal: 0, paddingBottom: BOTTOM_PADDING + 16 },

    // HEADER
    header: { paddingHorizontal: PAGE_PADDING, paddingTop: spacing.md, marginBottom: spacing.lg },
    mainHeaderCard: {
        borderRadius: radius.xxl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        overflow: 'hidden',
        backgroundColor: 'rgba(18,18,18,0.94)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(99,255,21,0.1)',
        ...shadows.cardMd,
    },
    activeIndicatorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#63ff15',
        shadowColor: '#63ff15',
        shadowOpacity: 0.8,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.base },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    menuNavBtn: { borderRadius: radius.lg, overflow: 'hidden' },
    glassBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primaryGlow,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
    },
    welcomeTextContainer: { gap: 2 },
    greetingText: { color: 'rgba(99,255,21,0.7)', fontSize: rs(11), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
    userName: { color: colors.textPrimary, fontSize: rs(22), fontWeight: '900', letterSpacing: -0.4 },

    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    notifBtn: {
        width: 44,
        height: 44,
        borderRadius: radius.lg,
        backgroundColor: colors.primaryGlow,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulsatingDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.accentPink,
        shadowColor: colors.accentPink,
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 3,
    },
    avatarWrapper: {
        width: rs(48),
        height: rs(48),
        borderRadius: rs(24),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.borderPrimaryBright,
    },
    avatarGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: rs(24),
        opacity: 0.2,
    },
    avatarImg: {
        width: rs(44),
        height: rs(44),
        borderRadius: rs(22),
        borderWidth: 1,
        borderColor: colors.primaryDim,
    },
    membershipStrip: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(99,255,21,0.06)',
        paddingHorizontal: 14,
        paddingVertical: spacing.sm,
        borderRadius: radius.lg,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
    },
    membershipInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    membershipText: { fontSize: rs(11), fontWeight: '800', letterSpacing: 1, color: colors.primary },

    // BENTO GRID
    bentoGrid: { paddingHorizontal: PAGE_PADDING, gap: spacing.md, marginBottom: spacing.lg },
    bentoRow: { flexDirection: 'row', gap: spacing.md },
    bentoCard: {
        borderRadius: radius.xl,
        padding: 18,
        backgroundColor: '#111114',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    bentoTopBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
    },
    cardHalf: { flex: 1, height: rs(185), justifyContent: 'space-between' },
    bentoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    bentoIconBox: {
        width: rs(44),
        height: rs(44),
        borderRadius: radius.lg,
        backgroundColor: colors.primaryGlow,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        marginTop: spacing.sm,
    },
    bentoValue: { color: colors.primary, fontSize: rs(30), fontWeight: '900', letterSpacing: -1.5, marginTop: spacing.xs },
    unitText: { fontSize: rs(13), color: colors.textDim, fontWeight: '600' },
    bentoLabel: { color: '#555', fontSize: rs(10), fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    bentoMiniGraph: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
    graphBar: { height: '100%', borderRadius: 2 },
    bentoFooterRow: { marginTop: spacing.xs },
    bentoFooterText: { fontSize: rs(11), fontWeight: '700', letterSpacing: 0.3 },

    // BIG BENTO CARD
    bentoBigCard: {
        borderRadius: radius.xl,
        backgroundColor: '#111114',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
        overflow: 'hidden',
        shadowColor: '#63ff15',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
    },
    bentoBigTopBar: {
        height: 3,
        width: '100%',
    },
    bentoBigContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
    },
    bentoBigLeft: { flex: 1 },
    bentoBigBadge: {
        backgroundColor: 'rgba(99,255,21,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.3)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    bentoBigBadgeText: {
        color: '#63ff15',
        fontSize: rs(10),
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    bentoBigTitle: {
        color: '#fff',
        fontSize: rs(22),
        fontWeight: '900',
        letterSpacing: -0.5,
        lineHeight: rs(28),
        marginBottom: 6,
    },
    bentoBigSub: {
        color: '#555',
        fontSize: rs(12),
        fontWeight: '600',
    },
    bentoBigIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
    },

    // QUICK ACTIONS & FEATURES
    premiumHorizontalScroll: { paddingLeft: PAGE_PADDING, paddingRight: PAGE_PADDING, gap: spacing.md, marginBottom: spacing.xl },
    quickAction: {
        width: rs(100),
        height: rs(110),
        borderRadius: radius.xl,
        backgroundColor: 'rgba(24,24,24,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    quickActionGradient: { ...StyleSheet.absoluteFill, borderRadius: radius.card },
    quickActionIconBox: { width: 50, height: 50, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm, overflow: 'hidden' },
    quickActionLabelText: { color: colors.textPrimary, fontSize: rs(11), fontWeight: '800', marginTop: spacing.xs, textAlign: 'center', letterSpacing: 0.4 },

    // SECTION SYSTEM
    sectionGroup: { paddingHorizontal: PAGE_PADDING, marginBottom: spacing.xxl },
    sectionCardWrap: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        borderRadius: radius.xl,
        paddingTop: spacing.xs,
        paddingBottom: 0,
        paddingHorizontal: 0,
    },
    premiumSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.base },
    accentLine: { width: 3, height: 16, borderRadius: 1.5 },
    premiumSectionTitle: { color: '#A2A2AC', fontSize: rs(12), fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
    bentoFeatureList: { gap: spacing.sm },

    // FEATURE CARD
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: radius.xl,
        backgroundColor: '#161616',
        borderWidth: 0,
        borderColor: 'transparent',
        marginBottom: spacing.sm,
        minHeight: 86,
        overflow: 'hidden',
        ...shadows.card,
    },
    featureAccentStrip: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderTopLeftRadius: radius.xl,
        borderBottomLeftRadius: radius.xl,
    },
    featureCardTopSheen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
    },
    featureCardContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    featureIconWrap: {
        width: 48,
        height: 48,
        borderRadius: radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        marginLeft: spacing.xs,
        borderWidth: 0,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    featureTextWrap: { flex: 1 },
    featureTitle: { color: colors.textPrimary, fontSize: rs(16), fontWeight: '900', letterSpacing: -0.2 },
    featureDesc: { color: '#A1A1AA', fontSize: rs(12), fontWeight: '500', marginTop: 3, lineHeight: rs(16) },
    featureBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, borderRadius: radius.md, marginLeft: spacing.sm },
    featureBadgeText: { color: '#000', fontSize: rs(9), fontWeight: '900', letterSpacing: 0.5 },
    featureArrowWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.04)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    featureArrow: { opacity: 0.9 },

    // PROMO BANNER
    promoBanner: {
        marginHorizontal: PAGE_PADDING,
        borderRadius: radius.xxl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.primaryDim,
        marginBottom: spacing.lg,
        ...shadows.cardMd,
    },
    promoBannerGrad: { padding: spacing.lg },
    promoBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    promoBannerText: { flex: 1 },
    promoBadge: {
        backgroundColor: colors.primary,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: radius.lg,
        marginBottom: spacing.sm,
    },
    promoBadgeText: { color: '#000', fontSize: rs(10), fontWeight: '900', letterSpacing: 0.5 },
    promoBannerTitle: { color: colors.textPrimary, fontSize: rs(20), fontWeight: '900', letterSpacing: -0.5 },
    promoBannerSub: { color: colors.textDim, fontSize: rs(13), marginTop: spacing.xxs, lineHeight: rs(18), fontWeight: '600' },
    promoBannerAction: { marginLeft: spacing.base },
    promoActionCircle: {
        width: rs(56),
        height: rs(56),
        borderRadius: rs(28),
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.primaryGlow,
    },

    motivationCard: {
        marginHorizontal: PAGE_PADDING,
        borderRadius: radius.xxl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.1)',
        marginBottom: spacing.lg,
        ...shadows.cardMd,
    },
    motivationAccentStrip: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: '#63ff15',
        borderTopLeftRadius: radius.xxl,
        borderBottomLeftRadius: radius.xxl,
    },
    motivationQuoteMark: {
        position: 'absolute',
        top: -rs(10),
        left: rs(16),
        fontSize: rs(120),
        color: 'rgba(99,255,21,0.07)',
        fontWeight: '900',
        lineHeight: rs(120),
    },
    motivationContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: rs(36),
        paddingBottom: spacing.md,
        paddingVertical: 20,
    },
    motivationText: {
        color: '#D4D4D8',
        fontSize: rs(16),
        fontStyle: 'italic',
        lineHeight: rs(26),
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    motivationFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
        paddingTop: spacing.sm,
    },
    motivationTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(99,255,21,0.07)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.12)',
    },
    motivationTagText: {
        color: '#63ff15',
        fontSize: rs(9),
        fontWeight: '900',
        letterSpacing: 1,
    },
    motivationRefresh: {
        width: rs(30),
        height: rs(30),
        borderRadius: radius.sm,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },

    // SIDEBAR
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: width * 0.75,
        backgroundColor: colors.background,
        zIndex: 1000,
        borderRightWidth: 1,
        borderRightColor: colors.primaryBorder,
    },
    sidebarOverlay: { backgroundColor: colors.overlay, zIndex: 999 },
    sidebarHeader: {
        padding: spacing.lg,
        paddingBottom: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.primaryGlow,
    },
    sidebarLogo: { width: rs(40), height: rs(40), borderRadius: radius.sm },
    sidebarTitle: { color: colors.textPrimary, fontSize: rs(20), fontWeight: '900', letterSpacing: -0.5 },
    sidebarUserSection: { paddingHorizontal: spacing.base, paddingVertical: spacing.lg, marginBottom: spacing.md },
    sidebarUserCard: {
        padding: spacing.base,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        backgroundColor: colors.surface,
    },
    sidebarUserTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    sidebarAvatar: { width: rs(50), height: rs(50), borderRadius: rs(25), borderWidth: 2, borderColor: colors.borderPrimaryBright },
    sidebarUserInfo: { flex: 1 },
    sidebarUserNameText: { color: colors.textPrimary, fontSize: rs(16), fontWeight: '800' },
    sidebarPlanBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.md, marginTop: spacing.xxs, backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.borderPrimaryBright },
    sidebarPlanText: { fontSize: rs(9), fontWeight: '900', letterSpacing: 0.5, color: colors.primary },
    sidebarMenu: { flex: 1, paddingHorizontal: spacing.md },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: radius.lg,
        gap: spacing.md,
        marginBottom: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.02)',
        minHeight: 44,
    },
    sidebarItemText: { color: '#AAA', fontSize: rs(15), fontWeight: '700' },
    sidebarDivider: { height: 1, backgroundColor: colors.primaryGlow, marginVertical: 14, marginHorizontal: spacing.base },
    sidebarFooter: { padding: spacing.lg, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.primaryGlow },
    versionText: { color: '#444', fontSize: rs(10), fontWeight: '800', letterSpacing: 1 },

    // ADMIN (legacy styles kept for compatibility)
    sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAGE_PADDING, marginBottom: spacing.base },
    sectionIconWrap: { width: 36, height: 36, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
    sectionTitleAlt: { color: colors.textPrimary, fontSize: rs(16), fontWeight: '800' },
    featuresGrid: { paddingHorizontal: PAGE_PADDING, gap: spacing.sm },
});
