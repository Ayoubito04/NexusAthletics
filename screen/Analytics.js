import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Modal, Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, radius, shadows, rs, PAGE_PADDING, BOTTOM_PADDING } from '../theme';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

export default function Analytics() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ totalSegundos: 0, count: 0 });
    const [streak, setStreak] = useState(0);
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Animaciones de entrada
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;
    const cardAnims = useRef([...Array(4)].map(() => new Animated.Value(0))).current;

    useEffect(() => {
        loadData();
        const unsubscribe = navigation.addListener('focus', loadData);
        return unsubscribe;
    }, [navigation]);

    const runEntranceAnimation = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.stagger(80, cardAnims.map(a =>
                Animated.spring(a, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true })
            )),
        ]).start();
    };

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const streakVal = await AsyncStorage.getItem('streak_count');
            if (streakVal) setStreak(parseInt(streakVal) || 0);
            if (token) {
                const response = await fetch(`${BACKEND_URL}/activities/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setStats({ totalSegundos: data.totalSegundos || 0, count: data.count || 0 });
                }
            }
        } catch (_) {}
        finally {
            setLoading(false);
            setRefreshing(false);
            runEntranceAnimation();
        }
    };

    const handleAIAnalysis = async () => {
        setIsAnalyzing(true);
        setModalVisible(true);
        setAiAnalysis('');
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/activities/stats/ai-analysis`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAiAnalysis(data.analysis);
            } else {
                setAiAnalysis('No he podido procesar tus datos en este momento. Inténtalo más tarde.');
            }
        } catch (_) {
            setAiAnalysis('Error de conexión con el núcleo de Nexus AI.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hrs === 0) return `${mins}m`;
        return `${hrs}h ${mins}m`;
    };

    const statCards = [
        {
            title: 'SESIONES',
            value: stats.count,
            unit: 'total',
            icon: 'barbell',
            color: colors.primary,
            gradientColors: ['rgba(99,255,21,0.12)', 'transparent'],
        },
        {
            title: 'TIEMPO ACTIVO',
            value: formatTime(stats.totalSegundos),
            unit: '',
            icon: 'timer-outline',
            color: colors.accentBlue,
            gradientColors: ['rgba(0,209,255,0.12)', 'transparent'],
        },
        {
            title: 'RACHA',
            value: streak,
            unit: 'días',
            icon: 'flame',
            color: '#FF6B35',
            gradientColors: ['rgba(255,107,53,0.12)', 'transparent'],
        },
        {
            title: 'ANÁLISIS IA',
            value: '∞',
            unit: 'disponible',
            icon: 'sparkles',
            color: colors.accentPurple,
            gradientColors: ['rgba(162,89,255,0.12)', 'transparent'],
            onPress: handleAIAnalysis,
        },
    ];

    if (loading) {
        return (
            <View style={styles.loadingScreen}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Cargando datos...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* HEADER */}
            <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <View style={styles.backBtnInner}>
                        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                    </View>
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Nexus <Text style={{ color: colors.accentBlue }}>Stats</Text></Text>
                    <Text style={styles.headerSub}>Tu evolución en tiempo real</Text>
                </View>
            </Animated.View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />
                }
            >
                {/* STAT CARDS GRID */}
                <View style={styles.grid}>
                    {statCards.map((card, i) => (
                        <Animated.View
                            key={card.title}
                            style={{
                                opacity: cardAnims[i],
                                transform: [{ scale: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
                                width: '48%',
                            }}
                        >
                            <TouchableOpacity
                                style={styles.statCard}
                                onPress={card.onPress}
                                activeOpacity={card.onPress ? 0.75 : 1}
                            >
                                <LinearGradient colors={card.gradientColors} style={StyleSheet.absoluteFill} />
                                <View style={[styles.statIconBox, { backgroundColor: card.color + '18', borderColor: card.color + '30' }]}>
                                    <Ionicons name={card.icon} size={rs(22)} color={card.color} />
                                </View>
                                <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
                                {card.unit ? <Text style={styles.statUnit}>{card.unit}</Text> : null}
                                <Text style={styles.statTitle}>{card.title}</Text>
                                {card.onPress && (
                                    <View style={[styles.tapBadge, { backgroundColor: card.color + '20', borderColor: card.color + '40' }]}>
                                        <Text style={[styles.tapBadgeText, { color: card.color }]}>TAP</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                {/* BANNER AI ANÁLISIS */}
                <Animated.View style={{ opacity: fadeAnim }}>
                    <TouchableOpacity style={styles.aiBannerBtn} onPress={handleAIAnalysis} activeOpacity={0.85}>
                        <LinearGradient
                            colors={['#1a0a2e', '#0a1a2e']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.aiBannerGrad}
                        >
                            <View style={styles.aiBannerLeft}>
                                <View style={styles.aiBrainIcon}>
                                    <MaterialCommunityIcons name="brain" size={rs(28)} color="#A259FF" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.aiBannerTitle}>NEXUS AI BRAIN</Text>
                                    <Text style={styles.aiBannerSub}>Análisis profundo de tu evolución física</Text>
                                </View>
                            </View>
                            <LinearGradient colors={['#A259FF', '#007AFF']} style={styles.aiBannerArrow}>
                                <Ionicons name="sparkles" size={18} color="white" />
                            </LinearGradient>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* PRO TIP */}
                <Animated.View style={[styles.proTip, { opacity: fadeAnim }]}>
                    <Ionicons name="bulb-outline" size={18} color="#FFD700" />
                    <Text style={styles.proTipText}>
                        Los usuarios Ultimate reciben reportes biométricos avanzados cada mes directamente desde Nexus AI.
                    </Text>
                </Animated.View>

                <View style={{ height: BOTTOM_PADDING }} />
            </ScrollView>

            {/* MODAL ANÁLISIS IA */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.aiModalContent}>
                        <View style={styles.aiModalHeader}>
                            <MaterialCommunityIcons name="brain" size={rs(26)} color={colors.primary} />
                            <Text style={styles.aiModalTitle}>NEXUS AI BRAIN</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={22} color={colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {isAnalyzing ? (
                            <View style={styles.analyzingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={styles.analyzingText}>Escaneando Evolución...</Text>
                                <Text style={styles.analyzingSubtext}>Procesando métricas y progresión de entrenamiento.</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.analysisResult}>
                                    <Text style={styles.analysisLabel}>ANÁLISIS DE EVOLUCIÓN:</Text>
                                    <Text style={styles.analysisText}>{aiAnalysis}</Text>
                                    <View style={styles.analysisFooter}>
                                        <Ionicons name="star" size={16} color="#FFD700" />
                                        <Text style={styles.footerMsg}>Basado en tus últimas sesiones de entrenamiento.</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.goToChatBtn}
                                    onPress={() => { setModalVisible(false); navigation.navigate('EntrenadorIA'); }}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient colors={[colors.primary, '#00D1FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.goToChatGrad}>
                                        <Text style={styles.goToChatText}>HABLAR CON COACH ÉLITE</Text>
                                        <Ionicons name="arrow-forward" size={18} color="black" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingScreen: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
    loadingText: { color: colors.textDim, fontSize: rs(13), fontWeight: '600' },

    // HEADER
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: PAGE_PADDING,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
        gap: spacing.md,
    },
    backBtn: { marginRight: spacing.xs },
    backBtnInner: {
        width: rs(40),
        height: rs(40),
        borderRadius: radius.lg,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { color: colors.textPrimary, fontSize: rs(26), fontWeight: '900', letterSpacing: -0.5 },
    headerSub: { color: colors.textDim, fontSize: rs(12), fontWeight: '600', marginTop: 2 },

    // SCROLL
    scrollContent: { paddingHorizontal: PAGE_PADDING, paddingTop: spacing.sm },

    // GRID
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    statCard: {
        borderRadius: radius.xxl,
        padding: rs(18),
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
        overflow: 'hidden',
        minHeight: rs(150),
        justifyContent: 'flex-end',
        ...shadows.card,
    },
    statIconBox: {
        width: rs(44),
        height: rs(44),
        borderRadius: radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: spacing.md,
        alignSelf: 'flex-start',
    },
    statValue: {
        fontSize: rs(30),
        fontWeight: '900',
        letterSpacing: -0.8,
    },
    statUnit: { color: colors.textDim, fontSize: rs(11), fontWeight: '700', marginTop: 2, marginBottom: 2 },
    statTitle: { color: '#555', fontSize: rs(10), fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.xs },
    tapBadge: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    tapBadgeText: { fontSize: rs(9), fontWeight: '900', letterSpacing: 0.5 },

    // AI BANNER
    aiBannerBtn: {
        borderRadius: radius.xxl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(162,89,255,0.25)',
        marginBottom: spacing.xl,
        ...shadows.cardMd,
    },
    aiBannerGrad: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    aiBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    aiBrainIcon: {
        width: rs(52),
        height: rs(52),
        borderRadius: radius.xl,
        backgroundColor: 'rgba(162,89,255,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(162,89,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiBannerTitle: { color: colors.textPrimary, fontSize: rs(15), fontWeight: '900', letterSpacing: 1 },
    aiBannerSub: { color: colors.textDim, fontSize: rs(12), fontWeight: '600', marginTop: 3 },
    aiBannerArrow: {
        width: rs(44),
        height: rs(44),
        borderRadius: radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // PRO TIP
    proTip: {
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255,215,0,0.05)',
        padding: spacing.base,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.12)',
        marginBottom: spacing.lg,
    },
    proTipText: { color: '#888', fontSize: rs(12), flex: 1, fontStyle: 'italic', lineHeight: rs(18) },

    // MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    aiModalContent: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: radius.xxxl,
        padding: spacing.xl,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    aiModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingBottom: spacing.base,
    },
    aiModalTitle: { color: colors.textPrimary, fontSize: rs(16), fontWeight: '900', letterSpacing: 2, marginLeft: spacing.md, flex: 1 },
    closeBtn: { padding: spacing.xs },
    analyzingContainer: { paddingVertical: rs(50), alignItems: 'center', gap: spacing.lg },
    analyzingText: { color: colors.primary, fontSize: rs(17), fontWeight: '800', textAlign: 'center' },
    analyzingSubtext: { color: '#666', fontSize: rs(13), textAlign: 'center', lineHeight: rs(20) },
    analysisResult: {
        backgroundColor: colors.background,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    analysisLabel: { color: colors.primary, fontSize: rs(11), fontWeight: '900', marginBottom: spacing.md, letterSpacing: 1 },
    analysisText: { color: '#ddd', fontSize: rs(14), lineHeight: rs(22) },
    analysisFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: spacing.sm,
    },
    footerMsg: { color: '#555', fontSize: rs(12), fontWeight: '600' },
    goToChatBtn: { borderRadius: radius.xl, overflow: 'hidden' },
    goToChatGrad: {
        padding: spacing.base,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    goToChatText: { color: 'black', fontWeight: '900', fontSize: rs(13), letterSpacing: 0.5 },
});
