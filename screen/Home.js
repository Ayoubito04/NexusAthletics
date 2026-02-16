import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, ScrollView, Image,
    Animated, Easing, Dimensions, RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NativeAd from '../components/NativeAd';
import { BlurView } from 'expo-blur';
import StepCounter from '../components/StepCounter';

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
        await Promise.all([
            loadUserData(),
            loadWater(),
            loadNotifications(),
            loadStats()
        ]);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAllData();
        setRefreshing(false);
    };

    const loadWater = async () => {
        try {
            const today = new Date().toDateString();
            const savedData = await AsyncStorage.getItem('water_data');
            if (savedData) {
                const data = JSON.parse(savedData);
                if (data.date === today) {
                    setWaterCount(data.count);
                } else {
                    setWaterCount(0);
                    await AsyncStorage.setItem('water_data', JSON.stringify({ date: today, count: 0 }));
                }
            }
        } catch (error) { }
    };

    const addWater = async () => {
        const newCount = waterCount + 1;
        setWaterCount(newCount);
        const today = new Date().toDateString();
        await AsyncStorage.setItem('water_data', JSON.stringify({ date: today, count: newCount }));
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
                }
            }
        } catch (error) { }
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
                onPress={onPress}
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
            onPress={() => navigation.navigate(screen)}
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#63ff15" />
                }
            >
                {/* HEADER PREMIUM */}
                <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.headerTop}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={() => toggleSidebar(true)} style={styles.menuBtn}>
                                <Ionicons name="menu" size={28} color="white" />
                            </TouchableOpacity>
                            <View>
                                <Text style={styles.greetingText}>{greeting}</Text>
                                <Text style={styles.userName}>{nombreUsuario}</Text>
                            </View>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={styles.notifBtn}
                                onPress={() => navigation.navigate('Notifications')}
                                data-testid="notifications-btn"
                            >
                                <Ionicons name="notifications-outline" size={22} color="#A1A1AA" />
                                {notifCount > 0 && (
                                    <View style={styles.notifBadge}>
                                        <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.avatarBtn}
                                onPress={() => navigation.navigate('AccountSettings')}
                                data-testid="profile-btn"
                            >
                                <LinearGradient
                                    colors={planConfig.gradient}
                                    style={styles.avatarBorder}
                                >
                                    <Image
                                        source={avatar ? { uri: avatar } : { uri: 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                                        style={styles.avatarImg}
                                    />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Plan Badge */}
                    <TouchableOpacity
                        style={[styles.planCard, { borderColor: planConfig.color + '30' }]}
                        onPress={() => navigation.navigate('PlanesPago')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[planConfig.color + '10', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.planCardLeft}>
                            <Ionicons name={planConfig.icon} size={20} color={planConfig.color} />
                            <View>
                                <Text style={styles.planCardLabel}>Tu Plan</Text>
                                <Text style={[styles.planCardName, { color: planConfig.color }]}>{plan}</Text>
                            </View>
                        </View>
                        {plan === 'Gratis' && (
                            <View style={styles.upgradeBtn}>
                                <Text style={styles.upgradeBtnText}>MEJORAR</Text>
                                <Ionicons name="arrow-forward" size={14} color="#000" />
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* STATS RÁPIDOS */}
                <View style={styles.statsRow}>
                    <Animated.View style={[styles.statMini, { opacity: fadeAnim }]}>
                        <LinearGradient colors={['#121212', '#0a0a0a']} style={StyleSheet.absoluteFill} />
                        <Ionicons name="flame" size={20} color="#FF6B35" />
                        <Text style={styles.statMiniValue}>{Math.round(stats.totalKcal || 0)}</Text>
                        <Text style={styles.statMiniLabel}>kcal totales</Text>
                    </Animated.View>
                    <Animated.View style={[styles.statMini, { opacity: fadeAnim }]}>
                        <LinearGradient colors={['#121212', '#0a0a0a']} style={StyleSheet.absoluteFill} />
                        <Ionicons name="navigate" size={20} color="#00D1FF" />
                        <Text style={styles.statMiniValue}>{(stats.totalKm || 0).toFixed(1)}</Text>
                        <Text style={styles.statMiniLabel}>km totales</Text>
                    </Animated.View>
                    <Animated.View style={[styles.statMini, { opacity: fadeAnim }]}>
                        <LinearGradient colors={['#121212', '#0a0a0a']} style={StyleSheet.absoluteFill} />
                        <Ionicons name="fitness" size={20} color="#A259FF" />
                        <Text style={styles.statMiniValue}>{stats.count || 0}</Text>
                        <Text style={styles.statMiniLabel}>sesiones</Text>
                    </Animated.View>
                </View>

                {/* ACCIONES RÁPIDAS */}
                <Text style={styles.sectionTitle}>Acceso Rápido</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickActionsRow}
                >
                    <QuickAction icon="rocket" label="Nexus IA" color="#A259FF" onPress={() => navigation.navigate('EntrenadorIA')} delay={0} />
                    <QuickAction icon="pulse" label="Voz Coach" color="#00D1FF" onPress={() => navigation.navigate('VoiceCoach')} delay={1} />
                    <QuickAction icon="map" label="Cardio GPS" color="#63ff15" onPress={() => navigation.navigate('ActivityMap')} delay={2} />
                    <QuickAction icon="flask" label="Lab Vault" color="#FFD700" onPress={() => navigation.navigate('SavedElitePlans')} delay={3} />
                    <QuickAction icon="podium" label="Ranking" color="#FF6B6B" onPress={() => navigation.navigate('Ranking')} delay={4} />
                </ScrollView>

                {/* DAILY FOCUS */}
                <Text style={styles.sectionTitle}>Enfoque Diario</Text>
                <View style={styles.dailyRow}>
                    <TouchableOpacity style={styles.dailyCard} onPress={addWater} activeOpacity={0.8}>
                        <LinearGradient colors={['#0D1B2A', '#0a0a0a']} style={StyleSheet.absoluteFill} />
                        <View style={styles.dailyCardTop}>
                            <View style={[styles.dailyIconCircle, { backgroundColor: 'rgba(0,209,255,0.15)' }]}>
                                <Ionicons name="water" size={22} color="#00D1FF" />
                            </View>
                            <TouchableOpacity style={styles.dailyAddBtn} onPress={addWater}>
                                <Ionicons name="add" size={18} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.dailyValue}>{waterCount * 250}<Text style={styles.dailyUnit}>ml</Text></Text>
                        <Text style={styles.dailyLabel}>Hidratación</Text>
                        <View style={styles.dailyProgress}>
                            <View style={[styles.dailyProgressFill, { width: `${Math.min((waterCount * 250 / 2500) * 100, 100)}%`, backgroundColor: '#00D1FF' }]} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.dailyCard}>
                        <LinearGradient colors={['#1A0D0D', '#0a0a0a']} style={StyleSheet.absoluteFill} />
                        <View style={styles.dailyCardTop}>
                            <View style={[styles.dailyIconCircle, { backgroundColor: 'rgba(255,107,0,0.15)' }]}>
                                <MaterialCommunityIcons name="fire" size={24} color="#FF6B00" />
                            </View>
                        </View>
                        <Text style={styles.dailyValue}>{streak}<Text style={styles.dailyUnit}> días</Text></Text>
                        <Text style={styles.dailyLabel}>Racha Activa</Text>
                        <Text style={styles.dailySubtext}>¡Sigue así!</Text>
                    </View>
                </View>

                {/* CONTADOR DE PASOS */}
                <StepCounter />

                {/* PUBLICIDAD SUTIL PARA PLAN GRATIS */}
                {plan === 'Gratis' && (
                    <NativeAd type="fitness" />
                )}

                {/* SECCIÓN: INTELIGENCIA IA */}
                <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(162,89,255,0.15)' }]}>
                        <Ionicons name="sparkles" size={18} color="#A259FF" />
                    </View>
                    <Text style={styles.sectionTitleAlt}>Inteligencia Nexus</Text>
                </View>
                <View style={styles.featuresGrid}>
                    <FeatureCard title="Nexus AI" icon="chatbubbles" color="#A259FF" screen="EntrenadorIA" description="Chat con IA" />
                    <FeatureCard title="Voz Coach" icon="mic" color="#00D1FF" screen="VoiceCoach" badge="NUEVO" description="Entrena por voz" />
                    <FeatureCard title="Bio-Scanner" icon="nutrition" color="#FF00FF" screen="FoodScanner" description="Analiza comidas" />
                    <FeatureCard title="Nexus Vision" icon="scan" color="#00F0FF" screen="BodyScanner" description="Análisis corporal" />
                </View>

                {/* SECCIÓN: ENTRENAMIENTO */}
                <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(99,255,21,0.15)' }]}>
                        <Ionicons name="fitness" size={18} color="#63ff15" />
                    </View>
                    <Text style={styles.sectionTitleAlt}>Zona de Entrenamiento</Text>
                </View>
                <View style={styles.featuresGrid}>
                    <FeatureCard title="Cardio GPS" icon="walk" color="#63ff15" screen="ActivityMap" description="Tracking en vivo" />
                    <FeatureCard title="Calendario" icon="calendar" color="#007AFF" screen="TrainingCalendar" description="Planifica sesiones" />
                    <FeatureCard title="Mis Planes" icon="folder-open" color="#FFD700" screen="SavedElitePlans" description="Rutinas guardadas" />
                    <FeatureCard title="Métricas" icon="stats-chart" color="#FF6B6B" screen="Analytics" description="Tu progreso" />
                </View>

                {/* SECCIÓN: SOCIAL */}
                <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconWrap, { backgroundColor: 'rgba(255,107,107,0.15)' }]}>
                        <Ionicons name="people" size={18} color="#FF6B6B" />
                    </View>
                    <Text style={styles.sectionTitleAlt}>Comunidad Nexus</Text>
                </View>
                <View style={styles.featuresGrid}>
                    <FeatureCard title="Feed Social" icon="globe" color="#FF6B6B" screen="Community" description="Ver actividades" />
                    <FeatureCard title="Ranking" icon="trophy" color="#FFD700" screen="Ranking" description="Compite y gana" />
                    <FeatureCard title="Amigos" icon="people-circle" color="#00D1FF" screen="Friends" description="Tu red fitness" />
                    <FeatureCard title="Logros" icon="medal" color="#FFA500" screen="Achievements" description="Desbloquea badges" />
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

            <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
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
                        <TouchableOpacity style={styles.sidebarItem} onPress={() => { toggleSidebar(false); }}>
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
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

    // Header
    header: { marginBottom: 20 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerLeft: {},
    greetingText: { color: '#52525B', fontSize: 13, fontWeight: '600' },
    userName: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    notifBtn: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: '#121212',
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1F1F1F'
    },
    notifBadge: {
        position: 'absolute', top: -4, right: -4, backgroundColor: '#FF3366',
        width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center'
    },
    notifBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    avatarBtn: {},
    avatarBorder: { padding: 2, borderRadius: 16 },
    avatarImg: { width: 44, height: 44, borderRadius: 14 },

    // Plan Card
    planCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#0D0D0D', borderRadius: 16, padding: 16, borderWidth: 1
    },
    planCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    planCardLabel: { color: '#52525B', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    planCardName: { fontSize: 16, fontWeight: '800', marginTop: 2 },
    upgradeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#63ff15',
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8
    },
    upgradeBtnText: { color: '#000', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    // Stats Row
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statMini: {
        flex: 1, alignItems: 'center', padding: 16, borderRadius: 16,
        borderWidth: 1, borderColor: '#1A1A1A', overflow: 'hidden'
    },
    statMiniValue: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 8 },
    statMiniLabel: { color: '#52525B', fontSize: 10, fontWeight: '600', marginTop: 4, textTransform: 'uppercase' },

    // Section
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: -0.3, marginTop: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 16 },
    sectionIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    sectionTitleAlt: { color: '#E4E4E7', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },

    // Quick Actions
    quickActionsRow: { paddingLeft: 0, paddingRight: 20, gap: 12, marginBottom: 24 },
    quickAction: {
        width: 110, height: 120, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 24,
        backgroundColor: '#121212', overflow: 'hidden', elevation: 5, shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
    },
    quickActionGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.8 },
    quickActionIconBox: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    quickActionLabelText: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center' },
    menuBtn: { marginRight: 15, width: 44, height: 44, borderRadius: 14, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1F1F1F' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },

    // Daily
    dailyRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    dailyCard: {
        flex: 1, padding: 18, borderRadius: 20, borderWidth: 1,
        borderColor: '#1A1A1A', overflow: 'hidden'
    },
    dailyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    dailyIconCircle: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    dailyAddBtn: {
        width: 32, height: 32, borderRadius: 10, backgroundColor: '#00D1FF',
        justifyContent: 'center', alignItems: 'center'
    },
    dailyValue: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
    dailyUnit: { fontSize: 14, color: '#52525B', fontWeight: '600' },
    dailyLabel: { color: '#71717A', fontSize: 12, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    dailySubtext: { color: '#63ff15', fontSize: 11, fontWeight: '700', marginTop: 6 },
    dailyProgress: { height: 4, backgroundColor: '#1A1A1A', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
    dailyProgressFill: { height: '100%', borderRadius: 2 },

    // Features Grid
    featuresGrid: { gap: 10, marginBottom: 16 },
    featureCard: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16,
        borderWidth: 1, borderColor: '#1A1A1A', overflow: 'hidden', position: 'relative'
    },
    featureCardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
    featureIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    featureTextWrap: { flex: 1 },
    featureTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
    featureDesc: { color: '#52525B', fontSize: 11, fontWeight: '500', marginTop: 2 },
    featureBadge: {
        position: 'absolute', top: 10, right: 36, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6
    },
    featureBadgeText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    featureArrow: { marginLeft: 8 },

    // Motivation
    motivationCard: {
        marginTop: 20, padding: 24, borderRadius: 20, borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)', overflow: 'hidden', alignItems: 'center'
    },
    motivationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    motivationLabel: { color: '#63ff15', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    motivationText: { color: '#A1A1AA', fontSize: 15, fontStyle: 'italic', textAlign: 'center', lineHeight: 24 },

    // Promo Banner
    promoBanner: { marginTop: 10, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(99,255,21,0.2)' },
    promoBannerGrad: { padding: 20 },
    promoBannerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    promoBannerText: { flex: 1 },
    promoBadge: { backgroundColor: '#63ff15', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
    promoBadgeText: { color: '#000', fontSize: 9, fontWeight: '900' },
    promoBannerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
    promoBannerSub: { color: '#888', fontSize: 12, marginTop: 4, lineHeight: 18 },
    promoBannerAction: { marginLeft: 15 },
    promoActionCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

    // Sidebar
    sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.8, backgroundColor: '#0a0a0a', zIndex: 1000, borderRightWidth: 1, borderRightColor: '#1a1a1a', shadowColor: '#000', shadowOffset: { width: 10, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 },
    sidebarOverlay: { backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999 },
    sidebarHeader: { padding: 30, flexDirection: 'row', alignItems: 'center', gap: 15, borderBottomWidth: 1, borderBottomColor: '#111' },
    sidebarLogo: { width: 40, height: 40, borderRadius: 10 },
    sidebarTitle: { color: 'white', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
    sidebarUserSection: { padding: 20 },
    sidebarUserCard: { padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#222' },
    sidebarUserTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sidebarAvatar: { width: 50, height: 50, borderRadius: 25 },
    sidebarUserInfo: { flex: 1 },
    sidebarUserNameText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    sidebarPlanBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    sidebarPlanText: { fontSize: 10, fontWeight: 'bold' },
    sidebarMenu: { flex: 1, paddingHorizontal: 15 },
    sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, gap: 15, borderRadius: 12, marginBottom: 5 },
    sidebarItemText: { color: '#eee', fontSize: 15, fontWeight: '600' },
    sidebarDivider: { height: 1, backgroundColor: '#111', marginVertical: 15 },
    sidebarFooter: { padding: 20, alignItems: 'center' },
    versionText: { color: '#444', fontSize: 12, fontWeight: 'bold' },
    emptyTextSidebar: { color: '#444', textAlign: 'center', marginTop: 20 },
});
