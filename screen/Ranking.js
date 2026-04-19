import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity, Image,
    ActivityIndicator, RefreshControl, Animated, ScrollView, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;
const { width } = Dimensions.get('window');

const MUSCLE_TABS = [
    { id: 'global', label: 'Global', icon: 'trophy', unit: 'pts' },
    { id: 'Pecho', label: 'Pecho', icon: 'human', unit: 'kg' },
    { id: 'Espalda', label: 'Espalda', icon: 'human-handsup', unit: 'kg' },
    { id: 'Piernas', label: 'Piernas', icon: 'run-fast', unit: 'kg' },
    { id: 'Hombros', label: 'Hombros', icon: 'weight-lifter', unit: 'kg' },
    { id: 'Brazos', label: 'Brazos', icon: 'arm-flex', unit: 'kg' },
    { id: 'Core', label: 'Core', icon: 'human-male', unit: 'kg' },
];

const MEDAL_GRADIENTS = [
    ['#FFD700', '#FFA500'],
    ['#E8E8E8', '#A9A9A9'],
    ['#CD7F32', '#8B4513'],
];

const MEDAL_GLOW = ['#FFD70060', '#C0C0C060', '#CD7F3260'];

export default function Ranking() {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('global');
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [myId, setMyId] = useState(null);
    const [myRankData, setMyRankData] = useState(null);
    const tabScrollRef = useRef(null);
    const headerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadMyData();
    }, []);

    useEffect(() => {
        loadRanking(activeTab);
    }, [activeTab]);

    useEffect(() => {
        Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
    }, [ranking]);

    const loadMyData = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) setMyId(JSON.parse(userData).id);
    };

    const loadRanking = async (tab) => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const url = tab === 'global'
                ? `${BACKEND_URL}/strength/ranking`
                : `${BACKEND_URL}/strength/ranking?muscle=${encodeURIComponent(tab)}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRanking(data);
                const me = data.find(u => u.userId === myId || u.id === myId);
                setMyRankData(me || null);
            }
        } catch (error) {
            console.error('Error al cargar ranking:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadRanking(activeTab);
    };

    const getActiveUnit = () => MUSCLE_TABS.find(t => t.id === activeTab)?.unit || 'pts';

    const getScore = (item) => {
        if (activeTab === 'global') return item.totalScore ?? 0;
        return item.bestOneRM ?? 0;
    };

    const getMySessions = (item) => {
        if (activeTab === 'global') return item.totalSessions ?? 0;
        return item.sessions ?? 0;
    };

    const renderTopThree = () => {
        const top3 = ranking.slice(0, 3);
        if (top3.length === 0) return null;
        // Order: 2nd - 1st - 3rd
        const order = [top3[1], top3[0], top3[2]].filter(Boolean);
        const positions = top3[1] ? [1, 0, 2] : [0];
        const heights = [120, 150, 100];
        const actualOrder = top3.length >= 2 ? [
            { item: top3[1], pos: 1, h: 120 },
            { item: top3[0], pos: 0, h: 150 },
            { item: top3[2], pos: 2, h: 100 },
        ].filter(e => e.item) : [{ item: top3[0], pos: 0, h: 150 }];

        return (
            <View style={styles.podiumContainer}>
                {actualOrder.map(({ item, pos, h }) => {
                    const isMe = item.userId === myId || item.id === myId;
                    return (
                        <View key={item.userId || item.id} style={[styles.podiumSlot, pos === 0 && styles.podiumCenter]}>
                            <View style={[styles.podiumAvatarWrapper, isMe && styles.podiumAvatarMe]}>
                                <LinearGradient colors={MEDAL_GRADIENTS[pos]} style={styles.podiumAvatarRing} />
                                <Image
                                    source={{ uri: item.avatar || 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                                    style={[styles.podiumAvatar, pos === 0 && styles.podiumAvatarFirst]}
                                />
                                <LinearGradient
                                    colors={[MEDAL_GLOW[pos], 'transparent']}
                                    style={styles.podiumAvatarGlow}
                                />
                            </View>
                            <Text style={styles.podiumName} numberOfLines={1}>
                                {item.nombre}{isMe ? ' (TÚ)' : ''}
                            </Text>
                            <Text style={styles.podiumScore}>
                                {getScore(item)} <Text style={styles.podiumUnit}>{getActiveUnit()}</Text>
                            </Text>
                            <LinearGradient
                                colors={MEDAL_GRADIENTS[pos]}
                                style={[styles.podiumBase, { height: h }]}
                            >
                                <MaterialCommunityIcons name="medal" size={28} color="rgba(0,0,0,0.4)" />
                                <Text style={styles.podiumRankNum}>#{pos + 1}</Text>
                            </LinearGradient>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderUser = ({ item, index }) => {
        if (index < 3) return null; // top 3 shown in podium
        const isMe = item.userId === myId || item.id === myId;
        const score = getScore(item);
        const sessions = getMySessions(item);
        const rank = item.rank || index + 1;

        return (
            <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <LinearGradient
                    colors={isMe ? ['rgba(99,255,21,0.12)', '#111'] : ['#111', '#0a0a0a']}
                    style={[styles.userCard, isMe && styles.myCard]}
                >
                    <View style={styles.rankBadge}>
                        <Text style={[styles.rankNum, isMe && styles.rankNumMe]}>#{rank}</Text>
                    </View>

                    <Image
                        source={{ uri: item.avatar || 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                        style={[styles.avatar, isMe && styles.avatarMe]}
                    />

                    <View style={styles.userInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {item.nombre} {item.apellido}
                            </Text>
                            {isMe && <View style={styles.meTag}><Text style={styles.meTagText}>TÚ</Text></View>}
                        </View>
                        <View style={styles.metaRow}>
                            <View style={[styles.planTag, item.plan === 'Ultimate' && styles.planUltimate, item.plan === 'Pro' && styles.planPro]}>
                                <Text style={styles.planText}>{item.plan || 'Gratis'}</Text>
                            </View>
                            <Text style={styles.sessionsText}>{sessions} sesiones</Text>
                        </View>
                    </View>

                    <View style={styles.scoreBlock}>
                        <Text style={[styles.scoreValue, isMe && styles.scoreValueMe]}>{score}</Text>
                        <Text style={styles.scoreUnit}>{getActiveUnit()}</Text>
                    </View>
                </LinearGradient>
            </Animated.View>
        );
    };

    const myRank = ranking.findIndex(u => u.userId === myId || u.id === myId) + 1;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={26} color="white" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Ranking <Text style={styles.headerHighlight}>Fuerza</Text></Text>
                    <Text style={styles.headerSub}>Competición entre atletas</Text>
                </View>
                {myRankData && (
                    <View style={styles.myRankBadge}>
                        <Text style={styles.myRankLabel}>MI PUESTO</Text>
                        <Text style={styles.myRankValue}>#{myRank || '—'}</Text>
                    </View>
                )}
            </View>

            {/* Muscle tabs */}
            <ScrollView
                ref={tabScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContainer}
                style={styles.tabsScroll}
            >
                {MUSCLE_TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tab, isActive && styles.tabActive]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            {isActive ? (
                                <LinearGradient colors={['#63ff15', '#4dd10e']} style={styles.tabGradient}>
                                    <MaterialCommunityIcons name={tab.icon} size={15} color="#000" />
                                    <Text style={styles.tabTextActive}>{tab.label}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={styles.tabInner}>
                                    <MaterialCommunityIcons name={tab.icon} size={15} color="#555" />
                                    <Text style={styles.tabText}>{tab.label}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#63ff15" />
                    <Text style={styles.loaderText}>Calculando posiciones...</Text>
                </View>
            ) : (
                <FlatList
                    data={ranking}
                    renderItem={renderUser}
                    keyExtractor={(item, i) => (item.userId || item.id || i).toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#63ff15" />}
                    ListHeaderComponent={
                        <>
                            {renderTopThree()}
                            {ranking.length > 3 && (
                                <View style={styles.restLabel}>
                                    <View style={styles.restLine} />
                                    <Text style={styles.restLabelText}>RESTO DEL RANKING</Text>
                                    <View style={styles.restLine} />
                                </View>
                            )}
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="dumbbell" size={64} color="#1a1a1a" />
                            <Text style={styles.emptyTitle}>Sin datos aún</Text>
                            <Text style={styles.emptySub}>Completa entrenamientos para{'\n'}aparecer en el ranking.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#060606' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(99,255,21,0.08)',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center', alignItems: 'center',
        marginRight: 14,
    },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerHighlight: { color: '#63ff15' },
    headerSub: { color: '#555', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    myRankBadge: {
        backgroundColor: 'rgba(99,255,21,0.1)',
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.25)',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
        alignItems: 'center',
    },
    myRankLabel: { color: '#63ff15', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    myRankValue: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },

    // Tabs
    tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(99,255,21,0.06)' },
    tabsContainer: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    tab: {
        borderRadius: 20, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.1)',
    },
    tabActive: { borderColor: 'transparent' },
    tabGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 5 },
    tabInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 5 },
    tabText: { color: '#555', fontSize: 13, fontWeight: '700' },
    tabTextActive: { color: '#000', fontSize: 13, fontWeight: '800' },

    // Podium
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 8,
        gap: 8,
    },
    podiumSlot: { alignItems: 'center', flex: 1 },
    podiumCenter: { marginTop: -20 },
    podiumAvatarWrapper: {
        position: 'relative',
        marginBottom: 8,
        width: 60, height: 60,
    },
    podiumAvatarMe: { shadowColor: '#63ff15', shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
    podiumAvatarRing: {
        position: 'absolute',
        width: 66, height: 66,
        borderRadius: 33,
        top: -3, left: -3,
        zIndex: 0,
    },
    podiumAvatar: { width: 60, height: 60, borderRadius: 30, zIndex: 1 },
    podiumAvatarFirst: { width: 70, height: 70, borderRadius: 35, marginLeft: -5, marginTop: -5 },
    podiumAvatarGlow: {
        position: 'absolute', width: 80, height: 80,
        borderRadius: 40, top: -10, left: -10, zIndex: 0,
    },
    podiumName: { color: '#fff', fontSize: 11, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
    podiumScore: { color: '#fff', fontSize: 14, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
    podiumUnit: { color: '#888', fontSize: 10, fontWeight: '600' },
    podiumBase: {
        width: '100%', borderTopLeftRadius: 12, borderTopRightRadius: 12,
        justifyContent: 'center', alignItems: 'center', gap: 4,
    },
    podiumRankNum: { color: 'rgba(0,0,0,0.5)', fontSize: 20, fontWeight: '900' },

    // Divider
    restLabel: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 16, gap: 10 },
    restLine: { flex: 1, height: 1, backgroundColor: 'rgba(99,255,21,0.1)' },
    restLabelText: { color: '#444', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

    // List
    list: { paddingHorizontal: 16, paddingBottom: 32 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 18,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.06)',
    },
    myCard: { borderColor: 'rgba(99,255,21,0.3)' },
    rankBadge: { width: 36, alignItems: 'center', marginRight: 12 },
    rankNum: { color: '#333', fontSize: 15, fontWeight: '900' },
    rankNumMe: { color: '#63ff15' },
    avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#1a1a1a', marginRight: 14 },
    avatarMe: { borderColor: '#63ff15' },
    userInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
    userName: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
    meTag: { backgroundColor: 'rgba(99,255,21,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    meTagText: { color: '#63ff15', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    planTag: { backgroundColor: '#1a1a1a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    planUltimate: { backgroundColor: 'rgba(255,51,102,0.15)' },
    planPro: { backgroundColor: 'rgba(99,255,21,0.12)' },
    planText: { color: '#888', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    sessionsText: { color: '#444', fontSize: 11, fontWeight: '600' },
    scoreBlock: { alignItems: 'flex-end' },
    scoreValue: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
    scoreValueMe: { color: '#63ff15' },
    scoreUnit: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

    // Loader
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loaderText: { color: '#63ff15', fontWeight: '700', fontSize: 13 },

    // Empty
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyTitle: { color: '#333', fontSize: 20, fontWeight: '800' },
    emptySub: { color: '#444', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
