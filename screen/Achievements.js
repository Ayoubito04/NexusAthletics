import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

// ─── Achievement definitions ─────────────────────────────────────────────────
const ACHIEVEMENTS = [
    // SESIONES
    {
        id: 1, cat: 'Sesiones', title: 'Primera Batalla',
        desc: 'Completa tu primera sesión de entrenamiento.',
        icon: 'barbell-outline', req: s => s.count >= 1,
        progress: s => Math.min(s.count, 1), total: 1,
        colors: ['#63ff15','#38c000'],
    },
    {
        id: 7, cat: 'Sesiones', title: 'Consistencia es Poder',
        desc: 'Llega a 25 sesiones completadas.',
        icon: 'checkmark-circle-outline', req: s => s.count >= 25,
        progress: s => Math.min(s.count, 25), total: 25,
        colors: ['#63ff15','#38c000'],
    },
    {
        id: 2, cat: 'Sesiones', title: 'Guerrero del Hierro',
        desc: 'Acumula 50 sesiones de entrenamiento.',
        icon: 'fitness-outline', req: s => s.count >= 50,
        progress: s => Math.min(s.count, 50), total: 50,
        colors: ['#63ff15','#38c000'],
    },
    {
        id: 4, cat: 'Sesiones', title: 'Maestro del Gym',
        desc: 'Llega a 100 sesiones de entrenamiento.',
        icon: 'trophy-outline', req: s => s.count >= 100,
        progress: s => Math.min(s.count, 100), total: 100,
        colors: ['#FFD700','#FFA500'],
    },
    {
        id: 5, cat: 'Sesiones', title: 'Leyenda del Hierro',
        desc: 'Alcanza las 200 sesiones.',
        icon: 'star-outline', req: s => s.count >= 200,
        progress: s => Math.min(s.count, 200), total: 200,
        colors: ['#a855f7','#7c3aed'],
    },
    // TIEMPO
    {
        id: 3, cat: 'Tiempo', title: 'Hora de Fuego',
        desc: 'Acumula más de 5 horas de entrenamiento.',
        icon: 'time-outline', req: s => s.totalSegundos >= 18000,
        progress: s => Math.min(Math.round(s.totalSegundos / 60), 300), total: 300,
        unit: 'min',
        colors: ['#f97316','#ea580c'],
    },
    {
        id: 6, cat: 'Tiempo', title: 'Resistencia Total',
        desc: 'Acumula más de 50 horas de entrenamiento.',
        icon: 'flame-outline', req: s => s.totalSegundos >= 180000,
        progress: s => Math.min(Math.round(s.totalSegundos / 3600), 50), total: 50,
        unit: 'h',
        colors: ['#ef4444','#b91c1c'],
    },
    // SOCIAL
    {
        id: 8, cat: 'Social', title: 'Comunidad Nexus',
        desc: 'Invita a 3 compañeros de entrenamiento.',
        icon: 'people-outline', req: s => (s.invites || 0) >= 3,
        progress: s => Math.min(s.invites || 0, 3), total: 3,
        colors: ['#22d3ee','#0891b2'],
    },
];

const CATS = ['Todos', 'Sesiones', 'Tiempo', 'Social'];
const CAT_ICONS = { Sesiones: 'fitness', Tiempo: 'time', Social: 'people', Todos: 'apps' };

// ─── Animated glow for unlocked ──────────────────────────────────────────────
function GlowPulse({ colors }) {
    const anim = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        ])).start();
    }, []);
    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                { borderRadius: 22, opacity: anim, backgroundColor: colors[0] + '22' },
            ]}
            pointerEvents="none"
        />
    );
}

export default function Achievements() {
    const navigation = useNavigation();
    const [loading, setLoading]     = useState(true);
    const [stats, setStats]         = useState({ totalKm: 0, totalKcal: 0, count: 0, totalSegundos: 0 });
    const [activeFilter, setFilter] = useState('Todos');
    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadData();
        Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
    }, []);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/activities/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = activeFilter === 'Todos'
        ? ACHIEVEMENTS
        : ACHIEVEMENTS.filter(a => a.cat === activeFilter);

    const unlockedCount  = ACHIEVEMENTS.filter(a => a.req(stats)).length;
    const overallPct     = Math.round((unlockedCount / ACHIEVEMENTS.length) * 100);

    const renderCard = ({ item, index }) => {
        const unlocked  = item.req(stats);
        const prog      = item.progress(stats);
        const progPct   = item.total > 0 ? Math.min(prog / item.total, 1) : 0;
        const progLabel = item.unit
            ? `${prog}${item.unit} / ${item.total}${item.unit}`
            : `${prog} / ${item.total}`;

        return (
            <Animated.View
                style={{
                    opacity: headerAnim,
                    transform: [{
                        translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [30 + index * 4, 0] }),
                    }],
                }}
            >
                <View style={[styles.card, unlocked && styles.cardUnlocked]}>
                    {unlocked && <GlowPulse colors={item.colors} />}

                    {/* Icon */}
                    <View style={styles.iconWrap}>
                        {unlocked ? (
                            <LinearGradient colors={item.colors} style={styles.iconCircle}>
                                <Ionicons name={item.icon} size={26} color="#000" />
                            </LinearGradient>
                        ) : (
                            <View style={[styles.iconCircle, styles.iconCircleLocked]}>
                                <Ionicons name={item.icon} size={26} color="#333" />
                            </View>
                        )}
                    </View>

                    {/* Info */}
                    <View style={styles.cardBody}>
                        <View style={styles.cardTitleRow}>
                            <Text style={[styles.cardTitle, !unlocked && styles.textLocked]}>
                                {item.title}
                            </Text>
                            {unlocked && (
                                <LinearGradient colors={item.colors} style={styles.unlockedBadge}>
                                    <Ionicons name="checkmark" size={10} color="#000" />
                                    <Text style={styles.unlockedBadgeText}>LOGRADO</Text>
                                </LinearGradient>
                            )}
                        </View>
                        <Text style={styles.cardDesc}>{item.desc}</Text>

                        {/* Progress bar */}
                        {!unlocked && (
                            <View style={styles.progressWrap}>
                                <View style={styles.progressBg}>
                                    <LinearGradient
                                        colors={item.colors}
                                        style={[styles.progressFill, { width: `${progPct * 100}%` }]}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    />
                                </View>
                                <Text style={styles.progressLabel}>{progLabel}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgLayer} pointerEvents="none">
                <LinearGradient colors={['rgba(255,215,0,0.10)','transparent']} style={styles.bgOrbTop} />
                <LinearGradient colors={['rgba(99,255,21,0.08)','transparent']} style={styles.bgOrbBottom} />
            </View>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>
                        Sala de <Text style={styles.headerGold}>Trofeos</Text>
                    </Text>
                    <Text style={styles.headerSub}>COLECCIÓN DE LOGROS</Text>
                </View>
                <View style={styles.headerBadge}>
                    <Text style={styles.headerBadgeNum}>{unlockedCount}</Text>
                    <Text style={styles.headerBadgeSub}>/{ACHIEVEMENTS.length}</Text>
                </View>
            </View>

            {/* Summary card */}
            <Animated.View style={[styles.summaryCard, { transform: [{ scale: headerAnim.interpolate({ inputRange: [0,1], outputRange: [0.95,1] }) }] }]}>
                <LinearGradient colors={['#1a1a1a','#0e0e0e']} style={styles.summaryInner}>
                    <View style={styles.summaryLeft}>
                        <Text style={styles.summaryPct}>{overallPct}%</Text>
                        <Text style={styles.summaryLabel}>COMPLETADO</Text>
                    </View>
                    <View style={styles.summaryRight}>
                        <View style={styles.summaryBarBg}>
                            <LinearGradient
                                colors={['#FFD700','#FFA500']}
                                style={[styles.summaryBarFill, { width: `${overallPct}%` }]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            />
                        </View>
                        <Text style={styles.summarySub}>
                            {unlockedCount} de {ACHIEVEMENTS.length} logros desbloqueados
                        </Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="dumbbell" size={14} color="#63ff15" />
                                <Text style={styles.statVal}>{stats.count}</Text>
                                <Text style={styles.statLabel}>sesiones</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <MaterialCommunityIcons name="clock-outline" size={14} color="#f97316" />
                                <Text style={styles.statVal}>{Math.round(stats.totalSegundos / 3600)}h</Text>
                                <Text style={styles.statLabel}>entreno</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
                {CATS.map(cat => {
                    const active = cat === activeFilter;
                    return (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.filterTab, active && styles.filterTabActive]}
                            onPress={() => setFilter(cat)}
                        >
                            {active ? (
                                <LinearGradient colors={['#FFD700','#FFA500']} style={styles.filterGrad}>
                                    <MaterialCommunityIcons name={CAT_ICONS[cat]} size={12} color="#000" />
                                    <Text style={styles.filterTextActive}>{cat}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={styles.filterInner}>
                                    <MaterialCommunityIcons name={CAT_ICONS[cat]} size={12} color="#555" />
                                    <Text style={styles.filterText}>{cat}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 80 }} />
            ) : (
                <FlatList
                    data={filtered}
                    renderItem={renderCard}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#060606' },
    bgLayer: { ...StyleSheet.absoluteFillObject },
    bgOrbTop: { position: 'absolute', width: 240, height: 240, borderRadius: 140, top: -80, right: -60 },
    bgOrbBottom: { position: 'absolute', width: 260, height: 260, borderRadius: 140, bottom: -90, left: -80 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,215,0,0.08)',
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerGold: { color: '#FFD700' },
    headerSub: { color: '#555', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
    headerBadge: {
        backgroundColor: 'rgba(255,215,0,0.1)',
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
        flexDirection: 'row', gap: 2,
    },
    headerBadgeNum: { color: '#FFD700', fontSize: 20, fontWeight: '900', lineHeight: 22 },
    headerBadgeSub: { color: '#888', fontSize: 13, fontWeight: '700', alignSelf: 'flex-end', marginBottom: 1 },

    // Summary
    summaryCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 22, overflow: 'hidden' },
    summaryInner: {
        flexDirection: 'row', gap: 16, padding: 18,
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)', borderRadius: 20,
    },
    summaryLeft: { alignItems: 'center', justifyContent: 'center', width: 72 },
    summaryPct: { color: '#FFD700', fontSize: 30, fontWeight: '900', lineHeight: 32 },
    summaryLabel: { color: '#555', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },
    summaryRight: { flex: 1, gap: 8 },
    summaryBarBg: { height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
    summaryBarFill: { height: '100%', borderRadius: 3 },
    summarySub: { color: '#888', fontSize: 12, fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statVal: { color: '#fff', fontSize: 13, fontWeight: '800' },
    statLabel: { color: '#555', fontSize: 11 },
    statDivider: { width: 1, height: 16, backgroundColor: '#222', alignSelf: 'center' },

    // Filters
    filterRow: {
        flexDirection: 'row', gap: 8,
        paddingHorizontal: 16, paddingVertical: 12,
    },
    filterTab: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)' },
    filterTabActive: { borderColor: 'transparent' },
    filterGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, gap: 5 },
    filterInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, gap: 5 },
    filterText: { color: '#555', fontSize: 12, fontWeight: '700' },
    filterTextActive: { color: '#000', fontSize: 12, fontWeight: '800' },

    // List
    list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12, paddingTop: 6 },

    // Card
    card: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: 'rgba(17,17,17,0.92)', borderRadius: 22,
        padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    cardUnlocked: { borderColor: 'rgba(255,215,0,0.24)' },
    iconWrap: {},
    iconCircle: {
        width: 58, height: 58, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },
    iconCircleLocked: { backgroundColor: '#1a1a1a' },
    cardBody: { flex: 1, gap: 5 },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    cardTitle: { color: '#fff', fontSize: 16, fontWeight: '900', flex: 1, letterSpacing: -0.2 },
    textLocked: { color: '#555' },
    unlockedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    },
    unlockedBadgeText: { color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    cardDesc: { color: '#707070', fontSize: 12, lineHeight: 18 },
    progressWrap: { gap: 5, marginTop: 2 },
    progressBg: { height: 5, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    progressLabel: { color: '#444', fontSize: 10, fontWeight: '700' },
});
