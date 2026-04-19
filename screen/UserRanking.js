import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity, Image,
    ActivityIndicator, RefreshControl, Animated, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const { width } = Dimensions.get('window');
const BACKEND_URL = Config.BACKEND_URL;

// ─── Liga config ────────────────────────────────────────────────────────────
const LEAGUES = [
    { name: 'MAESTRO',  min: 10000, colors: ['#a855f7','#7c3aed'], icon: 'crown',         glow: '#a855f780' },
    { name: 'DIAMANTE', min: 5000,  colors: ['#22d3ee','#0891b2'], icon: 'diamond-stone',  glow: '#22d3ee80' },
    { name: 'PLATINO',  min: 2000,  colors: ['#e2e8f0','#94a3b8'], icon: 'star-circle',    glow: '#e2e8f060' },
    { name: 'ORO',      min: 500,   colors: ['#FFD700','#FFA500'], icon: 'trophy',          glow: '#FFD70060' },
    { name: 'PLATA',    min: 100,   colors: ['#C0C0C0','#A9A9A9'], icon: 'medal',           glow: '#C0C0C060' },
    { name: 'BRONCE',   min: 0,     colors: ['#CD7F32','#8B4513'], icon: 'medal-outline',   glow: '#CD7F3260' },
];

const getLeague = (score, category) => {
    if (category !== 'xp') return null;
    return LEAGUES.find(l => score >= l.min) || LEAGUES[LEAGUES.length - 1];
};

// ─── Títulos épicos por posición ────────────────────────────────────────────
const getTitle = (rank, category) => {
    const titles = {
        xp:      ['👑 Leyenda de Nexus', '⚡ Élite Absoluto', '🔥 Campeón', '💪 Veterano', '🌱 Aspirante'],
        volumen: ['🏋️ Bestia del Hierro', '💪 Titán Muscular', '🔩 Máquina', '🏋️ Levantador', '🌱 En Camino'],
        social:  ['⭐ Estrella del Feed', '🔥 Influencer Fit', '👏 Popular', '📸 Activo', '👋 Nuevo'],
    };
    const arr = titles[category] || titles.xp;
    if (rank === 1) return arr[0];
    if (rank <= 3) return arr[1];
    if (rank <= 10) return arr[2];
    if (rank <= 25) return arr[3];
    return arr[4];
};

// ─── Tabs de categorías ─────────────────────────────────────────────────────
const TABS = [
    { id: 'xp',      label: 'XP Global', icon: 'lightning-bolt', unit: 'XP',     emoji: '⚡' },
    { id: 'volumen', label: 'Fuerza',    icon: 'weight-lifter',  unit: 'kg vol', emoji: '💪' },
    { id: 'social',  label: 'Social',    icon: 'heart',          unit: 'likes',  emoji: '❤️' },
];

// ─── Sparkle component para #1 ───────────────────────────────────────────────
function SparkleRing() {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const sparks = Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = 48;
        return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, delay: i * 150 };
    });

    return (
        <View pointerEvents="none" style={styles.sparkleContainer}>
            {sparks.map((s, i) => (
                <Animated.Text
                    key={i}
                    style={[
                        styles.sparkle,
                        {
                            left: 50 + s.x - 7,
                            top: 50 + s.y - 7,
                            opacity: anim,
                            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }],
                        },
                    ]}
                >
                    {i % 2 === 0 ? '✨' : '⭐'}
                </Animated.Text>
            ))}
        </View>
    );
}

// ─── Crown pulse ─────────────────────────────────────────────────────────────
function CrownPulse() {
    const scale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.3, duration: 700, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return (
        <Animated.Text style={[styles.crown, { transform: [{ scale }] }]}>👑</Animated.Text>
    );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function UserRanking() {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('xp');
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [myId, setMyId] = useState(null);
    const listAnim = useRef(new Animated.Value(0)).current;
    const headerScale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        AsyncStorage.getItem('user').then(d => { if (d) setMyId(JSON.parse(d).id); });
        Animated.spring(headerScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        loadRanking(activeTab);
    }, [activeTab]);

    const loadRanking = async (tab) => {
        setLoading(true);
        listAnim.setValue(0);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/ranking/users?category=${tab}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRanking(data);
                Animated.spring(listAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }).start();
            }
        } catch (e) {
            console.error('UserRanking error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => { setRefreshing(true); loadRanking(activeTab); };

    const myEntry = ranking.find(u => u.userId === myId);
    const myRank  = myEntry ? myEntry.rank : null;
    const tab     = TABS.find(t => t.id === activeTab);

    // ─── Podium top 3 ─────────────────────────────────────────────────────
    const renderPodium = () => {
        if (ranking.length === 0) return null;
        const top3 = ranking.slice(0, 3);
        const order = [
            top3[1] ? { item: top3[1], pos: 1, h: 110, size: 58 } : null,
            { item: top3[0], pos: 0, h: 148, size: 72 },
            top3[2] ? { item: top3[2], pos: 2, h: 90,  size: 54 } : null,
        ].filter(Boolean);

        const podiumGradients = [
            ['#FFD700', '#B8860B'],
            ['#C0C0C0', '#808080'],
            ['#CD7F32', '#6B3A1F'],
        ];
        const podiumEmojis = ['🥇', '🥈', '🥉'];
        const rankLabels = ['#1', '#2', '#3'];

        return (
            <View style={styles.podiumWrapper}>
                <Text style={styles.podiumTitle}>🏆 TOP ATLETAS</Text>
                <View style={styles.podiumRow}>
                    {order.map(({ item, pos, h, size }) => {
                        const isMe = item.userId === myId;
                        const league = getLeague(item.score, activeTab);
                        return (
                            <View key={item.userId} style={[styles.podiumSlot, pos === 0 && styles.podiumCenter]}>
                                {/* Crown for #1 */}
                                {pos === 0 && <CrownPulse />}

                                {/* Avatar + sparkles for #1 */}
                                <View style={[styles.podiumAvatarWrap, { width: size + 8, height: size + 8 }]}>
                                    {pos === 0 && <SparkleRing />}
                                    <LinearGradient
                                        colors={podiumGradients[pos]}
                                        style={[styles.podiumRing, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]}
                                    />
                                    <Image
                                        source={{ uri: item.avatar || 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                                        style={[styles.podiumAvatar, { width: size, height: size, borderRadius: size / 2 }]}
                                    />
                                    {isMe && (
                                        <View style={styles.meDot}>
                                            <Text style={styles.meDotText}>TÚ</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.podiumName} numberOfLines={1}>
                                    {item.nombre || 'Atleta'}
                                </Text>
                                <Text style={styles.podiumScore}>
                                    {formatScore(item.score, activeTab)}
                                    <Text style={styles.podiumUnit}> {tab?.unit}</Text>
                                </Text>

                                {/* Podium base */}
                                <LinearGradient colors={podiumGradients[pos]} style={[styles.podiumBase, { height: h }]}>
                                    <Text style={styles.podiumEmoji}>{podiumEmojis[pos]}</Text>
                                    <Text style={styles.podiumRankLabel}>{rankLabels[pos]}</Text>
                                </LinearGradient>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    // ─── List item ────────────────────────────────────────────────────────
    const renderItem = ({ item, index }) => {
        if (index < 3) return null;
        const isMe = item.userId === myId;
        const league = getLeague(item.score, activeTab);
        const title = getTitle(item.rank, activeTab);

        return (
            <Animated.View
                style={{
                    opacity: listAnim,
                    transform: [{
                        translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
                    }],
                }}
            >
                <LinearGradient
                    colors={isMe ? ['rgba(99,255,21,0.10)', '#0e0e0e'] : ['#111111', '#0a0a0a']}
                    style={[styles.card, isMe && styles.cardMe]}
                >
                    {/* Rank */}
                    <View style={styles.rankCol}>
                        <Text style={[styles.rankNum, isMe && styles.rankNumMe]}>
                            {item.rank <= 10 ? getRankEmoji(item.rank) : `#${item.rank}`}
                        </Text>
                    </View>

                    {/* Avatar */}
                    <View style={styles.avatarWrap}>
                        <Image
                            source={{ uri: item.avatar || 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                            style={[styles.avatar, isMe && styles.avatarMe]}
                        />
                        {league && (
                            <LinearGradient colors={league.colors} style={styles.leagueDot}>
                                <MaterialCommunityIcons name={league.icon} size={8} color="#000" />
                            </LinearGradient>
                        )}
                    </View>

                    {/* Info */}
                    <View style={styles.info}>
                        <View style={styles.nameRow}>
                            <Text style={styles.name} numberOfLines={1}>
                                {item.nombre} {item.apellido}
                            </Text>
                            {isMe && <View style={styles.youTag}><Text style={styles.youTagText}>TÚ</Text></View>}
                        </View>
                        <Text style={styles.titleText}>{title}</Text>
                        <View style={styles.tagsRow}>
                            <View style={[
                                styles.planTag,
                                item.plan === 'Ultimate' && styles.planUltimate,
                                item.plan === 'Pro' && styles.planPro,
                            ]}>
                                <Text style={styles.planText}>{item.plan || 'Gratis'}</Text>
                            </View>
                            {league && (
                                <LinearGradient colors={league.colors} style={styles.leagueTag}>
                                    <Text style={styles.leagueTagText}>{league.name}</Text>
                                </LinearGradient>
                            )}
                        </View>
                    </View>

                    {/* Score */}
                    <View style={styles.scoreCol}>
                        <Text style={[styles.scoreVal, isMe && styles.scoreValMe]}>
                            {formatScore(item.score, activeTab)}
                        </Text>
                        <Text style={styles.scoreUnit}>{tab?.unit}</Text>
                    </View>
                </LinearGradient>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <Animated.View style={[styles.header, { transform: [{ scale: headerScale }] }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>
                        Liga <Text style={styles.headerGreen}>Nexus</Text> {tab?.emoji}
                    </Text>
                    <Text style={styles.headerSub}>RANKING GLOBAL DE ATLETAS</Text>
                </View>
                {myRank && (
                    <LinearGradient colors={['rgba(99,255,21,0.2)', 'rgba(99,255,21,0.05)']} style={styles.myRankBadge}>
                        <Text style={styles.myRankLabel}>MI PUESTO</Text>
                        <Text style={styles.myRankVal}>#{myRank}</Text>
                    </LinearGradient>
                )}
            </Animated.View>

            {/* Category tabs */}
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContent}
                style={styles.tabsScroll}
            >
                {TABS.map(t => {
                    const active = t.id === activeTab;
                    return (
                        <TouchableOpacity
                            key={t.id}
                            style={[styles.tab, active && styles.tabActive]}
                            onPress={() => setActiveTab(t.id)}
                        >
                            {active ? (
                                <LinearGradient colors={['#63ff15', '#38c000']} style={styles.tabGrad}>
                                    <Text style={styles.tabEmoji}>{t.emoji}</Text>
                                    <Text style={styles.tabLabelActive}>{t.label}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={styles.tabInner}>
                                    <Text style={styles.tabEmoji}>{t.emoji}</Text>
                                    <Text style={styles.tabLabel}>{t.label}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Leagues legend (only for XP) */}
            {activeTab === 'xp' && (
                <ScrollView
                    horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.leaguesBar}
                    style={styles.leaguesScroll}
                >
                    {LEAGUES.map(l => (
                        <LinearGradient key={l.name} colors={l.colors} style={styles.leaguePill}>
                            <MaterialCommunityIcons name={l.icon} size={11} color="#000" />
                            <Text style={styles.leaguePillText}>{l.name}</Text>
                        </LinearGradient>
                    ))}
                </ScrollView>
            )}

            {/* Content */}
            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#63ff15" />
                    <Text style={styles.loaderText}>Calculando posiciones...</Text>
                    <Text style={styles.loaderSub}>Analizando {ranking.length || '...'} atletas</Text>
                </View>
            ) : (
                <FlatList
                    data={ranking}
                    keyExtractor={(item, i) => (item.userId || i).toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#63ff15" />
                    }
                    ListHeaderComponent={
                        <>
                            {renderPodium()}
                            {ranking.length > 3 && (
                                <View style={styles.divider}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>RESTO DEL RANKING</Text>
                                    <View style={styles.dividerLine} />
                                </View>
                            )}
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>🏋️</Text>
                            <Text style={styles.emptyTitle}>Sin datos todavía</Text>
                            <Text style={styles.emptySub}>
                                {activeTab === 'volumen' ? 'Completa un entrenamiento para aparecer.' :
                                 activeTab === 'social'  ? 'Publica en la comunidad para ganar likes.' :
                                 'Completa entrenamientos y publica\npara ganar XP y subir de liga.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Sticky my-position bar */}
            {myEntry && !loading && (
                <LinearGradient
                    colors={['rgba(6,6,6,0.0)', 'rgba(6,6,6,0.95)', '#060606']}
                    style={styles.stickyBar}
                    pointerEvents="none"
                >
                    <LinearGradient colors={['rgba(99,255,21,0.12)', '#111']} style={styles.stickyCard}>
                        <Text style={styles.stickyRank}>#{myRank}</Text>
                        <Image
                            source={{ uri: myEntry.avatar || 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                            style={styles.stickyAvatar}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stickyName}>{myEntry.nombre} — {getTitle(myRank, activeTab)}</Text>
                            {activeTab === 'xp' && getLeague(myEntry.score, 'xp') && (
                                <Text style={styles.stickyLeague}>
                                    Liga {getLeague(myEntry.score, 'xp').name}
                                </Text>
                            )}
                        </View>
                        <Text style={styles.stickyScore}>
                            {formatScore(myEntry.score, activeTab)} <Text style={styles.stickyUnit}>{tab?.unit}</Text>
                        </Text>
                    </LinearGradient>
                </LinearGradient>
            )}
        </SafeAreaView>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getRankEmoji = (rank) => {
    const emojis = { 4: '4️⃣', 5: '5️⃣', 6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟' };
    return emojis[rank] || `#${rank}`;
};

const formatScore = (score, category) => {
    if (category === 'pasos' && score >= 1000)
        return `${(score / 1000).toFixed(1)}k`;
    if ((category === 'volumen' || category === 'xp') && score >= 1000)
        return `${(score / 1000).toFixed(1)}k`;
    return score?.toLocaleString() ?? '0';
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#060606' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(99,255,21,0.08)',
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerGreen: { color: '#63ff15' },
    headerSub: { color: '#555', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
    myRankBadge: {
        borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99,255,21,0.25)',
        paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
    },
    myRankLabel: { color: '#63ff15', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    myRankVal: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },

    // Tabs
    tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(99,255,21,0.06)' },
    tabsContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
    tab: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(99,255,21,0.12)' },
    tabActive: { borderColor: 'transparent' },
    tabGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 5 },
    tabInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 5 },
    tabEmoji: { fontSize: 13 },
    tabLabel: { color: '#555', fontSize: 12, fontWeight: '700' },
    tabLabelActive: { color: '#000', fontSize: 12, fontWeight: '800' },

    // Leagues bar
    leaguesScroll: { flexGrow: 0 },
    leaguesBar: { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
    leaguePill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    leaguePillText: { fontSize: 9, fontWeight: '900', color: '#000' },

    // Podium
    podiumWrapper: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 0 },
    podiumTitle: { textAlign: 'center', color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2, marginBottom: 20 },
    podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 6 },
    podiumSlot: { alignItems: 'center', flex: 1, position: 'relative' },
    podiumCenter: { marginBottom: 0, zIndex: 2 },
    crown: { fontSize: 22, marginBottom: 4 },
    sparkleContainer: { position: 'absolute', width: 100, height: 100, top: -20, left: '50%', marginLeft: -50, zIndex: 10 },
    sparkle: { position: 'absolute', fontSize: 13 },
    podiumAvatarWrap: { position: 'relative', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    podiumRing: { position: 'absolute' },
    podiumAvatar: { zIndex: 1 },
    meDot: {
        position: 'absolute', bottom: -4, right: -4,
        backgroundColor: '#63ff15', borderRadius: 8,
        paddingHorizontal: 5, paddingVertical: 1, zIndex: 2,
    },
    meDotText: { color: '#000', fontSize: 8, fontWeight: '900' },
    podiumName: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
    podiumScore: { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
    podiumUnit: { color: '#888', fontSize: 10 },
    podiumBase: {
        width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14,
        justifyContent: 'center', alignItems: 'center', gap: 2, paddingVertical: 8,
    },
    podiumEmoji: { fontSize: 20 },
    podiumRankLabel: { color: 'rgba(0,0,0,0.5)', fontSize: 16, fontWeight: '900' },

    // Divider
    divider: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 16, gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(99,255,21,0.1)' },
    dividerText: { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

    // List
    list: { paddingHorizontal: 14, paddingBottom: 120 },
    card: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 13,
        borderRadius: 18, marginBottom: 9,
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.05)',
    },
    cardMe: { borderColor: 'rgba(99,255,21,0.28)' },

    rankCol: { width: 36, alignItems: 'center', marginRight: 10 },
    rankNum: { color: '#333', fontSize: 14, fontWeight: '900' },
    rankNumMe: { color: '#63ff15' },

    avatarWrap: { position: 'relative', marginRight: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#1a1a1a' },
    avatarMe: { borderColor: '#63ff15' },
    leagueDot: {
        position: 'absolute', bottom: -2, right: -2,
        width: 18, height: 18, borderRadius: 9,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#060606',
    },

    info: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    name: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 },
    youTag: { backgroundColor: 'rgba(99,255,21,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
    youTagText: { color: '#63ff15', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    titleText: { color: '#555', fontSize: 11, fontWeight: '600', marginBottom: 5 },
    tagsRow: { flexDirection: 'row', gap: 6 },
    planTag: { backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    planUltimate: { backgroundColor: 'rgba(255,51,102,0.15)' },
    planPro: { backgroundColor: 'rgba(99,255,21,0.12)' },
    planText: { color: '#666', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
    leagueTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, justifyContent: 'center' },
    leagueTagText: { color: '#000', fontSize: 9, fontWeight: '900' },

    scoreCol: { alignItems: 'flex-end' },
    scoreVal: { color: '#fff', fontSize: 19, fontWeight: '900', lineHeight: 21 },
    scoreValMe: { color: '#63ff15' },
    scoreUnit: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

    // Loader
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loaderText: { color: '#63ff15', fontWeight: '800', fontSize: 14 },
    loaderSub: { color: '#444', fontSize: 12 },

    // Empty
    empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
    emptyIcon: { fontSize: 56 },
    emptyTitle: { color: '#333', fontSize: 20, fontWeight: '800' },
    emptySub: { color: '#444', fontSize: 14, textAlign: 'center', lineHeight: 22 },

    // Sticky bar
    stickyBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingTop: 30, paddingHorizontal: 14, paddingBottom: 16,
    },
    stickyCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12,
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.3)',
    },
    stickyRank: { color: '#63ff15', fontSize: 18, fontWeight: '900', width: 38, textAlign: 'center' },
    stickyAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: '#63ff15' },
    stickyName: { color: '#fff', fontSize: 13, fontWeight: '700' },
    stickyLeague: { color: '#63ff15', fontSize: 11, fontWeight: '700', marginTop: 2 },
    stickyScore: { color: '#fff', fontSize: 18, fontWeight: '900' },
    stickyUnit: { color: '#555', fontSize: 11 },
});
