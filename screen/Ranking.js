import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity, Image,
    ActivityIndicator, RefreshControl, Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

// ─── Config de ligas ──────────────────────────────────────────────────────────
const LEAGUES = [
    { name: 'MAESTRO',  min: 10000, colors: ['#a855f7','#7c3aed'], glow: '#a855f7' },
    { name: 'DIAMANTE', min: 5000,  colors: ['#22d3ee','#0891b2'], glow: '#22d3ee' },
    { name: 'PLATINO',  min: 2000,  colors: ['#e2e8f0','#94a3b8'], glow: '#e2e8f0' },
    { name: 'ORO',      min: 500,   colors: ['#FFD700','#FFA500'], glow: '#FFD700' },
    { name: 'PLATA',    min: 100,   colors: ['#C0C0C0','#A9A9A9'], glow: '#C0C0C0' },
    { name: 'BRONCE',   min: 0,     colors: ['#CD7F32','#8B4513'], glow: '#CD7F32' },
];
const getLeague = score => LEAGUES.find(l => score >= l.min) || LEAGUES[LEAGUES.length - 1];

// ─── Tiers estéticos ──────────────────────────────────────────────────────────
const AESTHETIC_TIERS = [
    { label: 'MAESTRO',  min: 90, colors: ['#a855f7','#7c3aed'] },
    { label: 'DIAMANTE', min: 75, colors: ['#22d3ee','#0891b2'] },
    { label: 'PLATINO',  min: 60, colors: ['#e2e8f0','#94a3b8'] },
    { label: 'ORO',      min: 45, colors: ['#FFD700','#FFA500'] },
    { label: 'PLATA',    min: 30, colors: ['#C0C0C0','#A9A9A9'] },
    { label: 'BRONCE',   min: 0,  colors: ['#CD7F32','#8B4513'] },
];
const getAestheticTier = score =>
    AESTHETIC_TIERS.find(t => score >= t.min) || AESTHETIC_TIERS[AESTHETIC_TIERS.length - 1];

const MUSCLE_LABELS = {
    pecho:'Pecho', espalda:'Espalda', biceps:'Bíceps', triceps:'Tríceps',
    hombros:'Hombros', piernas:'Piernas', abdomen:'Abdomen', gluteos:'Glúteos', core:'Core',
};

const MUSCLE_TABS = [
    { id:'global',   label:'Global',   icon:'trophy' },
    { id:'Pecho',    label:'Pecho',    icon:'human' },
    { id:'Espalda',  label:'Espalda',  icon:'human-handsup' },
    { id:'Piernas',  label:'Piernas',  icon:'run-fast' },
    { id:'Hombros',  label:'Hombros',  icon:'weight-lifter' },
    { id:'Brazos',   label:'Brazos',   icon:'arm-flex' },
    { id:'Core',     label:'Core',     icon:'human-male' },
];

const MAIN_TABS = [
    { id:'liga',     label:'Liga XP',  icon:'lightning-bolt',   unit:'XP',  accent:'#63ff15' },
    { id:'fuerza',   label:'Fuerza',   icon:'dumbbell',          unit:'kg',  accent:'#ef4444' },
    { id:'social',   label:'Social',   icon:'heart',             unit:'pts', accent:'#ec4899' },
    { id:'estetica', label:'Estética', icon:'human-male-height', unit:'pts', accent:'#FFD700' },
];

const PODIUM_COLORS = [
    { ring: ['#FFD700','#B8860B'], base: ['#FFD700','#92650080'], emoji: '🥇' },
    { ring: ['#C0C0C0','#808080'], base: ['#C0C0C0','#60606080'], emoji: '🥈' },
    { ring: ['#CD7F32','#6B3A1F'], base: ['#CD7F32','#5B2A0F80'], emoji: '🥉' },
];

const formatScore = (score, cat) => {
    if ((cat==='xp'||cat==='liga'||cat==='volumen'||cat==='global') && score >= 1000)
        return `${(score/1000).toFixed(1)}k`;
    return score?.toLocaleString() ?? '0';
};

// ─── Crown pulse ──────────────────────────────────────────────────────────────
function CrownPulse() {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.9)).current;
    useEffect(() => {
        Animated.loop(Animated.parallel([
            Animated.sequence([
                Animated.spring(scale, { toValue: 1.25, friction: 4, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
            ]),
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
            ]),
        ])).start();
    }, []);
    return (
        <Animated.Text style={{ fontSize: 22, marginBottom: 6, transform: [{ scale }], opacity }}>
            👑
        </Animated.Text>
    );
}

// ─── Avatar glow ring ─────────────────────────────────────────────────────────
function GlowAvatar({ uri, size, ringColors, isFirst }) {
    const glow = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ])).start();
    }, []);
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{
                position: 'absolute',
                width: size + 16, height: size + 16,
                borderRadius: (size + 16) / 2,
                backgroundColor: ringColors[0] + '40',
                opacity: glow,
            }} />
            <LinearGradient
                colors={ringColors}
                style={{
                    width: size + 6, height: size + 6,
                    borderRadius: (size + 6) / 2,
                    position: 'absolute',
                }}
            />
            <Image
                source={{ uri: uri || 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                style={{
                    width: size, height: size, borderRadius: size / 2,
                    borderWidth: 2, borderColor: '#000',
                }}
            />
        </View>
    );
}

// ─── Podium component ─────────────────────────────────────────────────────────
function Podium({ top3, myId, getScore, unit }) {
    if (!top3 || top3.length === 0) return null;
    const order = [
        top3[1] ? { item: top3[1], pos: 1, h: 100, size: 56 } : null,
        { item: top3[0], pos: 0, h: 140, size: 72 },
        top3[2] ? { item: top3[2], pos: 2, h: 80,  size: 50 } : null,
    ].filter(Boolean);

    return (
        <View style={styles.podiumWrapper}>
            <LinearGradient
                colors={['rgba(99,255,21,0.04)','transparent']}
                style={StyleSheet.absoluteFill}
            />
            <Text style={styles.podiumTitle}>🏆  TOP ATLETAS</Text>
            <View style={styles.podiumRow}>
                {order.map(({ item, pos, h, size }) => {
                    const isMe = item.userId === myId || item.id === myId;
                    const pc = PODIUM_COLORS[pos];
                    return (
                        <View key={item.userId || item.id} style={[styles.podiumSlot, pos === 0 && styles.podiumCenter]}>
                            {pos === 0 && <CrownPulse />}
                            <View style={{ marginBottom: 10 }}>
                                <GlowAvatar
                                    uri={item.avatar}
                                    size={size}
                                    ringColors={pc.ring}
                                    isFirst={pos === 0}
                                />
                                {isMe && (
                                    <View style={styles.meDot}>
                                        <Text style={styles.meDotText}>TÚ</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.podiumName} numberOfLines={1}>
                                {item.nombre} {item.apellido || ''}
                            </Text>
                            <Text style={[styles.podiumScore, { color: pc.ring[0] }]}>
                                {formatScore(getScore(item), '')}
                            </Text>
                            <Text style={styles.podiumUnit}>{unit}</Text>
                            <LinearGradient colors={pc.base} style={[styles.podiumBase, { height: h }]}>
                                <Text style={styles.podiumEmoji}>{pc.emoji}</Text>
                                <Text style={styles.podiumRankNum}>#{pos + 1}</Text>
                            </LinearGradient>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function Ranking() {
    const navigation  = useNavigation();
    const route       = useRoute();
    const [mainTab, setMainTab]         = useState(route.params?.tab || 'liga');
    const [muscleTab, setMuscleTab]     = useState('global');
    const [ranking, setRanking]         = useState([]);
    const [loading, setLoading]         = useState(true);
    const [refreshing, setRefreshing]   = useState(false);
    const [myId, setMyId]               = useState(null);
    const [muscleScores, setMuscleScores] = useState({});
    const listAnim   = useRef(new Animated.Value(0)).current;
    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        AsyncStorage.getItem('user').then(d => { if (d) setMyId(JSON.parse(d).id); });
        AsyncStorage.getItem('muscle_scores').then(d => { if (d) setMuscleScores(JSON.parse(d)); });
        Animated.spring(headerAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (mainTab !== 'estetica') loadRanking();
        else setLoading(false);
    }, [mainTab, muscleTab]);

    const loadRanking = useCallback(async () => {
        setLoading(true);
        listAnim.setValue(0);
        try {
            const token = await AsyncStorage.getItem('token');
            let url;
            if (mainTab === 'fuerza') {
                url = muscleTab === 'global'
                    ? `${BACKEND_URL}/strength/ranking`
                    : `${BACKEND_URL}/strength/ranking?muscle=${encodeURIComponent(muscleTab)}`;
            } else {
                const cat = mainTab === 'liga' ? 'xp' : 'social';
                url = `${BACKEND_URL}/ranking/users?category=${cat}`;
            }
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                setRanking(await res.json());
                Animated.spring(listAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
            }
        } catch (e) { console.error('Ranking error:', e); }
        finally { setLoading(false); setRefreshing(false); }
    }, [mainTab, muscleTab]);

    const onRefresh = () => { setRefreshing(true); loadRanking(); };

    const myEntry = ranking.find(u => u.userId === myId || u.id === myId);
    const myRank  = myEntry ? (myEntry.rank || ranking.indexOf(myEntry) + 1) : null;
    const tab     = MAIN_TABS.find(t => t.id === mainTab);

    const getScore = item => {
        if (mainTab === 'fuerza') return muscleTab === 'global' ? (item.totalScore ?? 0) : (item.bestOneRM ?? 0);
        return item.score ?? item.totalScore ?? 0;
    };

    const muscleKeys   = Object.keys(muscleScores);
    const aestheticAvg = muscleKeys.length
        ? Math.round(muscleKeys.reduce((s, k) => s + (muscleScores[k] || 0), 0) / muscleKeys.length)
        : 0;
    const aestheticTier = getAestheticTier(aestheticAvg);

    // ─── List item ───────────────────────────────────────────────────────
    const renderItem = ({ item, index }) => {
        if (index < 3) return null;
        const isMe   = item.userId === myId || item.id === myId;
        const score  = getScore(item);
        const rank   = item.rank || index + 1;
        const league = mainTab === 'liga' ? getLeague(score) : null;

        return (
            <Animated.View style={{
                opacity: listAnim,
                transform: [{ translateY: listAnim.interpolate({ inputRange:[0,1], outputRange:[28,0] }) }],
            }}>
                <View style={[styles.card, isMe && styles.cardMe]}>
                    {isMe && (
                        <LinearGradient
                            colors={['rgba(99,255,21,0.06)','transparent']}
                            style={StyleSheet.absoluteFill}
                        />
                    )}
                    {/* Rank */}
                    <View style={styles.rankCol}>
                        {rank <= 3 ? (
                            <Text style={{ fontSize: 18 }}>{['🥇','🥈','🥉'][rank-1]}</Text>
                        ) : (
                            <Text style={[styles.rankNum, isMe && styles.rankNumMe]}>#{rank}</Text>
                        )}
                    </View>

                    {/* Avatar */}
                    <View style={styles.avatarWrap}>
                        <Image
                            source={{ uri: item.avatar || 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                            style={[styles.avatar, isMe && { borderColor: '#63ff15' }]}
                        />
                        {league && (
                            <LinearGradient colors={league.colors} style={styles.leagueDot}>
                                <MaterialCommunityIcons name="crown" size={7} color="#000" />
                            </LinearGradient>
                        )}
                    </View>

                    {/* Info */}
                    <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.cardName} numberOfLines={1}>
                                {item.nombre} {item.apellido || ''}
                            </Text>
                            {isMe && (
                                <LinearGradient colors={['#63ff15','#38c000']} style={styles.youTag}>
                                    <Text style={styles.youTagText}>TÚ</Text>
                                </LinearGradient>
                            )}
                        </View>
                        <View style={styles.tagsRow}>
                            <View style={[
                                styles.planTag,
                                item.plan==='Ultimate' && styles.planUltimate,
                                item.plan==='Pro' && styles.planPro,
                            ]}>
                                <Text style={styles.planText}>{item.plan || 'Gratis'}</Text>
                            </View>
                            {league && (
                                <LinearGradient colors={league.colors} style={styles.leagueTag}>
                                    <Text style={styles.leagueTagText}>{league.name}</Text>
                                </LinearGradient>
                            )}
                            {isMe && aestheticAvg > 0 && (
                                <LinearGradient colors={aestheticTier.colors} style={styles.leagueTag}>
                                    <Text style={styles.leagueTagText}>🔬 {aestheticAvg}pts</Text>
                                </LinearGradient>
                            )}
                        </View>
                    </View>

                    {/* Score */}
                    <View style={styles.scoreCol}>
                        <Text style={[styles.scoreVal, isMe && { color: tab?.accent || '#63ff15' }]}>
                            {formatScore(score, mainTab)}
                        </Text>
                        <Text style={styles.scoreUnit}>{tab?.unit}</Text>
                    </View>
                </View>
            </Animated.View>
        );
    };

    // ─── Estética tab ────────────────────────────────────────────────────
    const renderEstetica = () => {
        if (muscleKeys.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Text style={{ fontSize: 56 }}>🔬</Text>
                    <Text style={styles.emptyTitle}>Sin datos de escáner</Text>
                    <Text style={styles.emptySub}>Realiza un Body Scanner para ver{'\n'}tu puntuación estética.</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('BodyScanner')} style={styles.ctaBtn}>
                        <LinearGradient colors={['#FFD700','#FFA500']} style={styles.ctaBtnGrad}>
                            <Text style={styles.ctaBtnText}>IR AL BODY SCANNER</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <ScrollView contentContainerStyle={styles.esteticaScroll} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#1a1208','#0e0e0e']} style={styles.aestheticCard}>
                    <Text style={styles.aestheticLabel}>SCORE ESTÉTICO COMPUESTO</Text>
                    <LinearGradient colors={aestheticTier.colors} style={styles.aestheticCircle}>
                        <Text style={styles.aestheticNum}>{aestheticAvg}</Text>
                        <Text style={styles.aestheticMax}>/100</Text>
                    </LinearGradient>
                    <LinearGradient colors={aestheticTier.colors} style={styles.tierBadge}>
                        <Text style={styles.tierBadgeText}>{aestheticTier.label}</Text>
                    </LinearGradient>
                </LinearGradient>
                <Text style={styles.breakdownTitle}>DESGLOSE MUSCULAR</Text>
                {muscleKeys.map(key => {
                    const val  = muscleScores[key] || 0;
                    const tier = getAestheticTier(val);
                    return (
                        <View key={key} style={styles.muscleRow}>
                            <Text style={styles.muscleName}>{MUSCLE_LABELS[key] || key}</Text>
                            <View style={styles.muscleBarBg}>
                                <LinearGradient
                                    colors={tier.colors}
                                    style={[styles.muscleBarFill, { width: `${Math.max(4, val)}%` }]}
                                    start={{ x:0, y:0 }} end={{ x:1, y:0 }}
                                />
                            </View>
                            <Text style={[styles.muscleScore, { color: tier.colors[0] }]}>{val}</Text>
                        </View>
                    );
                })}
                <TouchableOpacity onPress={() => navigation.navigate('BodyScanner')} style={styles.ctaBtn}>
                    <LinearGradient colors={['#FFD700','#FFA500']} style={styles.ctaBtnGrad}>
                        <Text style={styles.ctaBtnText}>ACTUALIZAR ESCÁNER</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* ── HERO HEADER ── */}
            <LinearGradient
                colors={['#0e1a0e','#060606']}
                style={styles.heroHeader}
            >
                <Animated.View style={{
                    opacity: headerAnim,
                    transform: [{ translateY: headerAnim.interpolate({ inputRange:[0,1], outputRange:[-20,0] }) }],
                    flexDirection: 'row', alignItems: 'center',
                }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroTitle}>
                            RANKING <Text style={{ color: tab?.accent || '#63ff15' }}>NEXUS</Text>
                        </Text>
                        <Text style={styles.heroSub}>COMPETICIÓN GLOBAL DE ATLETAS</Text>
                    </View>
                    {myRank && mainTab !== 'estetica' && (
                        <View style={[styles.myRankBadge, { borderColor: (tab?.accent || '#63ff15') + '50' }]}>
                            <Text style={[styles.myRankLabel, { color: tab?.accent || '#63ff15' }]}>MI PUESTO</Text>
                            <Text style={styles.myRankVal}>#{myRank}</Text>
                        </View>
                    )}
                </Animated.View>
            </LinearGradient>

            {/* ── MAIN TABS ── */}
            <View style={styles.mainTabsRow}>
                {MAIN_TABS.map(t => {
                    const active = t.id === mainTab;
                    return (
                        <TouchableOpacity
                            key={t.id}
                            style={[styles.mainTab, active && { borderColor: t.accent + '60', backgroundColor: t.accent + '12' }]}
                            onPress={() => setMainTab(t.id)}
                        >
                            <MaterialCommunityIcons name={t.icon} size={14} color={active ? t.accent : '#444'} />
                            <Text style={[styles.mainTabText, active && { color: t.accent }]}>{t.label}</Text>
                            {active && <View style={[styles.mainTabDot, { backgroundColor: t.accent }]} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── FUERZA MUSCLE SUB-TABS ── */}
            {mainTab === 'fuerza' && (
                <ScrollView
                    horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.subTabsContent}
                    style={styles.subTabsScroll}
                >
                    {MUSCLE_TABS.map(t => {
                        const active = muscleTab === t.id;
                        return (
                            <TouchableOpacity
                                key={t.id}
                                style={[styles.subTab, active && styles.subTabActive]}
                                onPress={() => setMuscleTab(t.id)}
                            >
                                <MaterialCommunityIcons name={t.icon} size={12} color={active ? '#ef4444' : '#444'} />
                                <Text style={[styles.subTabText, active && { color: '#ef4444' }]}>{t.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            {/* ── LIGA LEGEND ── */}
            {mainTab === 'liga' && (
                <ScrollView
                    horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.leaguesBar}
                    style={{ flexGrow: 0 }}
                >
                    {LEAGUES.map(l => (
                        <LinearGradient key={l.name} colors={l.colors} style={styles.leaguePill}>
                            <MaterialCommunityIcons name="crown" size={9} color="#000" />
                            <Text style={styles.leaguePillText}>{l.name}</Text>
                        </LinearGradient>
                    ))}
                </ScrollView>
            )}

            {/* ── CONTENT ── */}
            {mainTab === 'estetica' ? renderEstetica() :
             loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={tab?.accent || '#63ff15'} />
                    <Text style={[styles.loaderText, { color: tab?.accent || '#63ff15' }]}>
                        Calculando posiciones...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={ranking}
                    keyExtractor={(item, i) => (item.userId || item.id || i).toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tab?.accent || '#63ff15'} />
                    }
                    ListHeaderComponent={
                        <>
                            <Podium top3={ranking.slice(0, 3)} myId={myId} getScore={getScore} unit={tab?.unit} />
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
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="dumbbell" size={56} color="#1e1e1e" />
                            <Text style={styles.emptyTitle}>Sin datos aún</Text>
                            <Text style={styles.emptySub}>
                                {mainTab==='fuerza' ? 'Completa entrenamientos para aparecer.' :
                                 mainTab==='social'  ? 'Publica en la comunidad para ganar puntos.' :
                                 'Completa sesiones para ganar XP.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ── STICKY MY POSITION ── */}
            {myEntry && !loading && mainTab !== 'estetica' && (
                <LinearGradient
                    colors={['transparent','rgba(6,6,6,0.97)','#060606']}
                    style={styles.stickyBar}
                    pointerEvents="none"
                >
                    <View style={[styles.stickyCard, { borderColor: (tab?.accent || '#63ff15') + '40' }]}>
                        <LinearGradient
                            colors={[(tab?.accent || '#63ff15') + '12', 'transparent']}
                            style={StyleSheet.absoluteFill}
                        />
                        <Text style={[styles.stickyRank, { color: tab?.accent || '#63ff15' }]}>#{myRank}</Text>
                        <Image
                            source={{ uri: myEntry.avatar || 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                            style={[styles.stickyAvatar, { borderColor: tab?.accent || '#63ff15' }]}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.stickyName}>{myEntry.nombre} {myEntry.apellido || ''}</Text>
                            {mainTab === 'liga' && (
                                <Text style={[styles.stickyLeague, { color: getLeague(getScore(myEntry)).colors[0] }]}>
                                    Liga {getLeague(getScore(myEntry)).name}
                                </Text>
                            )}
                        </View>
                        <Text style={[styles.stickyScore, { color: tab?.accent || '#63ff15' }]}>
                            {formatScore(getScore(myEntry), mainTab)}{' '}
                            <Text style={styles.stickyUnit}>{tab?.unit}</Text>
                        </Text>
                    </View>
                </LinearGradient>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#060606' },

    // Hero header
    heroHeader: {
        paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18,
        borderBottomWidth: 1, borderBottomColor: 'rgba(99,255,21,0.06)',
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.07)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    heroTitle: {
        fontSize: 26, fontWeight: '900', color: '#fff',
        letterSpacing: 1, lineHeight: 28,
    },
    heroSub: { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 3 },
    myRankBadge: {
        borderWidth: 1, borderRadius: 14,
        paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    myRankLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    myRankVal: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },

    // Main tabs
    mainTabsRow: {
        flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10,
        gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    mainTab: {
        flex: 1, flexDirection: 'column', alignItems: 'center', gap: 3,
        paddingVertical: 9, borderRadius: 14,
        borderWidth: 1, borderColor: 'transparent',
        position: 'relative',
    },
    mainTabText: { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
    mainTabDot: {
        position: 'absolute', bottom: -1, width: 20, height: 2,
        borderRadius: 1,
    },

    // Sub-tabs
    subTabsScroll: { flexGrow: 0, backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    subTabsContent: { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
    subTab: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 11, paddingVertical: 5,
        borderRadius: 12, borderWidth: 1, borderColor: 'transparent',
    },
    subTabActive: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
    subTabText: { color: '#444', fontSize: 11, fontWeight: '700' },

    // Liga legend
    leaguesBar: { paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
    leaguePill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    leaguePillText: { fontSize: 9, fontWeight: '900', color: '#000' },

    // Podium
    podiumWrapper: {
        marginHorizontal: 14, marginTop: 16, marginBottom: 4,
        borderRadius: 24, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.06)',
        paddingTop: 20, paddingBottom: 0, paddingHorizontal: 10,
    },
    podiumTitle: {
        textAlign: 'center', color: '#fff', fontSize: 12,
        fontWeight: '900', letterSpacing: 3, marginBottom: 24,
    },
    podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 4 },
    podiumSlot: { alignItems: 'center', flex: 1, position: 'relative' },
    podiumCenter: { zIndex: 2 },
    meDot: {
        position: 'absolute', bottom: -4, right: -4, zIndex: 3,
        backgroundColor: '#63ff15', borderRadius: 7,
        paddingHorizontal: 5, paddingVertical: 1,
    },
    meDotText: { color: '#000', fontSize: 8, fontWeight: '900' },
    podiumName: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
    podiumScore: { fontSize: 15, fontWeight: '900', textAlign: 'center' },
    podiumUnit: { color: '#666', fontSize: 10, marginBottom: 8, textAlign: 'center' },
    podiumBase: {
        width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14,
        justifyContent: 'center', alignItems: 'center', paddingVertical: 10, gap: 2,
    },
    podiumEmoji: { fontSize: 20 },
    podiumRankNum: { color: 'rgba(0,0,0,0.5)', fontSize: 16, fontWeight: '900' },

    // Divider
    divider: { flexDirection:'row', alignItems:'center', marginHorizontal:16, marginVertical:16, gap:10 },
    dividerLine: { flex:1, height:1, backgroundColor:'rgba(255,255,255,0.07)' },
    dividerText: { color:'#333', fontSize:9, fontWeight:'900', letterSpacing:2 },

    // List
    list: { paddingHorizontal: 14, paddingBottom: 120 },
    card: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 13,
        borderRadius: 20, marginBottom: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        backgroundColor: '#0e0e0e', overflow: 'hidden',
    },
    cardMe: { borderColor: 'rgba(99,255,21,0.22)' },

    rankCol: { width: 38, alignItems: 'center', marginRight: 10 },
    rankNum: { color: '#2a2a2a', fontSize: 14, fontWeight: '900' },
    rankNumMe: { color: '#63ff15' },

    avatarWrap: { position: 'relative', marginRight: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#1a1a1a' },
    leagueDot: {
        position: 'absolute', bottom: -2, right: -2,
        width: 16, height: 16, borderRadius: 8,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#060606',
    },
    cardInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
    cardName: { color: '#e5e5e5', fontSize: 14, fontWeight: '700', flex: 1 },
    youTag: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
    youTagText: { color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    tagsRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
    planTag: { backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    planUltimate: { backgroundColor: 'rgba(168,85,247,0.15)' },
    planPro: { backgroundColor: 'rgba(99,255,21,0.1)' },
    planText: { color: '#555', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
    leagueTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, justifyContent: 'center' },
    leagueTagText: { color: '#000', fontSize: 9, fontWeight: '900' },

    scoreCol: { alignItems: 'flex-end' },
    scoreVal: { color: '#e5e5e5', fontSize: 20, fontWeight: '900', lineHeight: 22 },
    scoreUnit: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },

    // Estética
    esteticaScroll: { padding: 16, paddingBottom: 40 },
    aestheticCard: {
        borderRadius: 24, padding: 24, alignItems: 'center', gap: 14,
        borderWidth: 1, borderColor: 'rgba(255,215,0,0.1)', marginBottom: 24,
    },
    aestheticLabel: { color: '#555', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    aestheticCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
    aestheticNum: { color: '#000', fontSize: 44, fontWeight: '900', lineHeight: 46 },
    aestheticMax: { color: 'rgba(0,0,0,0.5)', fontSize: 14, fontWeight: '700' },
    tierBadge: { borderRadius: 20, paddingHorizontal: 22, paddingVertical: 7 },
    tierBadgeText: { color: '#000', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
    breakdownTitle: { color: '#333', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
    muscleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    muscleName: { color: '#666', fontSize: 12, fontWeight: '700', width: 70 },
    muscleBarBg: { flex: 1, height: 7, backgroundColor: '#1a1a1a', borderRadius: 4, overflow: 'hidden' },
    muscleBarFill: { height: '100%', borderRadius: 4 },
    muscleScore: { fontSize: 12, fontWeight: '900', width: 28, textAlign: 'right' },
    ctaBtn: { marginTop: 20, overflow: 'hidden', borderRadius: 16 },
    ctaBtnGrad: { paddingVertical: 13, paddingHorizontal: 28, alignItems: 'center' },
    ctaBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },

    // Loader
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loaderText: { fontWeight: '800', fontSize: 14 },

    // Empty
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyTitle: { color: '#2a2a2a', fontSize: 20, fontWeight: '800' },
    emptySub: { color: '#333', fontSize: 14, textAlign: 'center', lineHeight: 22 },

    // Sticky bar
    stickyBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingTop: 40, paddingHorizontal: 14, paddingBottom: 16,
    },
    stickyCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12,
        borderWidth: 1, backgroundColor: '#0d0d0d', overflow: 'hidden',
    },
    stickyRank: { fontSize: 18, fontWeight: '900', width: 42 },
    stickyAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2 },
    stickyName: { color: '#e5e5e5', fontSize: 13, fontWeight: '700' },
    stickyLeague: { fontSize: 10, fontWeight: '700', marginTop: 2 },
    stickyScore: { fontSize: 18, fontWeight: '900' },
    stickyUnit: { color: '#555', fontSize: 11 },
});
