import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Animated, Image, Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

const TYPE_CONFIG = {
    friend_request: { color: '#63ff15', bg: 'rgba(99,255,21,0.1)', icon: 'person-add-outline' },
    success:        { color: '#63ff15', bg: 'rgba(99,255,21,0.1)', icon: 'checkmark-circle-outline' },
    premium:        { color: '#FFD700', bg: 'rgba(255,215,0,0.1)', icon: 'star-outline' },
    warning:        { color: '#FFB800', bg: 'rgba(255,184,0,0.1)', icon: 'warning-outline' },
    info:           { color: '#00D1FF', bg: 'rgba(0,209,255,0.1)', icon: 'information-circle-outline' },
};

export default function Notifications() {
    const navigation = useNavigation();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actioning, setActioning] = useState({});
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) { setIsLoading(false); return; }

            const res = await fetch(`${BACKEND_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = res.ok ? await res.json() : [];
            const welcome = {
                id: 'welcome',
                title: '¡Bienvenido a Nexus!',
                message: 'Comienza tu transformación con el entrenador IA.',
                type: 'info',
                time: 'Hoy',
            };
            setNotifications(data.length > 0 ? [...data, welcome] : [welcome]);

            Animated.timing(fadeAnim, {
                toValue: 1, duration: 400,
                useNativeDriver: true, easing: Easing.out(Easing.ease),
            }).start();
        } catch (_) {}
        setIsLoading(false);
        setRefreshing(false);
    };

    const handleAccept = async (senderId, notifId) => {
        setActioning(p => ({ ...p, [notifId]: 'accepting' }));
        try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${BACKEND_URL}/friends/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ senderId }),
            });
            setNotifications(p => p.filter(n => n.id !== notifId));
        } catch (_) {}
        setActioning(p => ({ ...p, [notifId]: null }));
    };

    const handleDecline = async (senderId, notifId) => {
        setActioning(p => ({ ...p, [notifId]: 'declining' }));
        try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${BACKEND_URL}/friends/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ senderId }),
            });
            setNotifications(p => p.filter(n => n.id !== notifId));
        } catch (_) {}
        setActioning(p => ({ ...p, [notifId]: null }));
    };

    const friendRequests = notifications.filter(n => n.type === 'friend_request');
    const others = notifications.filter(n => n.type !== 'friend_request');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#63ff15" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>NOTIFICACIONES</Text>
                <View style={{ width: 42 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadNotifications(); }}
                        tintColor="#63ff15"
                    />
                }
            >
                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#63ff15" />
                        <Text style={styles.loaderText}>Cargando...</Text>
                    </View>
                ) : (
                    <Animated.View style={{ opacity: fadeAnim }}>

                        {/* Solicitudes de amistad */}
                        {friendRequests.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View style={styles.sectionDot} />
                                    <Text style={styles.sectionTitle}>SOLICITUDES</Text>
                                    <View style={styles.sectionBadge}>
                                        <Text style={styles.sectionBadgeText}>{friendRequests.length}</Text>
                                    </View>
                                </View>
                                {friendRequests.map(n => (
                                    <FriendRequestCard
                                        key={n.id}
                                        notif={n}
                                        actioning={actioning[n.id]}
                                        onAccept={() => handleAccept(n.senderId, n.id)}
                                        onDecline={() => handleDecline(n.senderId, n.id)}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Resto de notificaciones */}
                        {others.length > 0 && (
                            <View style={styles.section}>
                                {friendRequests.length > 0 && (
                                    <View style={styles.sectionHeader}>
                                        <View style={[styles.sectionDot, { backgroundColor: '#52525B' }]} />
                                        <Text style={[styles.sectionTitle, { color: '#52525B' }]}>GENERAL</Text>
                                    </View>
                                )}
                                {others.map(n => (
                                    <NotifCard key={n.id} notif={n} />
                                ))}
                            </View>
                        )}

                        {notifications.length === 0 && (
                            <View style={styles.center}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons name="notifications-off-outline" size={36} color="#3F3F46" />
                                </View>
                                <Text style={styles.emptyTitle}>Todo al día</Text>
                                <Text style={styles.emptyText}>No tienes notificaciones pendientes.</Text>
                            </View>
                        )}
                    </Animated.View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function FriendRequestCard({ notif, actioning, onAccept, onDecline }) {
    return (
        <View style={styles.friendCard}>
            <LinearGradient
                colors={['rgba(99,255,21,0.06)', 'transparent']}
                style={StyleSheet.absoluteFill}
                borderRadius={18}
            />
            <View style={styles.friendTop}>
                {notif.senderAvatar ? (
                    <Image source={{ uri: notif.senderAvatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>
                            {notif.senderName?.[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>
                )}
                <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{notif.senderName}</Text>
                    <Text style={styles.friendSub}>Quiere conectar contigo en Nexus</Text>
                </View>
                <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NUEVO</Text>
                </View>
            </View>
            <View style={styles.friendActions}>
                <TouchableOpacity
                    style={styles.btnDecline}
                    onPress={onDecline}
                    disabled={!!actioning}
                >
                    {actioning === 'declining'
                        ? <ActivityIndicator size="small" color="#71717A" />
                        : <Text style={styles.btnDeclineText}>Rechazar</Text>
                    }
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.btnAccept}
                    onPress={onAccept}
                    disabled={!!actioning}
                >
                    <LinearGradient colors={['#63ff15', '#4ad912']} style={styles.btnAcceptGrad}>
                        {actioning === 'accepting'
                            ? <ActivityIndicator size="small" color="#000" />
                            : <Text style={styles.btnAcceptText}>Aceptar</Text>
                        }
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function NotifCard({ notif }) {
    const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
    return (
        <View style={styles.notifCard}>
            <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                <Ionicons name={notif.icon || cfg.icon} size={20} color={cfg.color} />
            </View>
            <View style={styles.notifBody}>
                <View style={styles.notifRow}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifTime}>{notif.time}</Text>
                </View>
                <Text style={styles.notifMsg}>{notif.message}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050508' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    backBtn: {
        width: 42, height: 42, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },

    scrollContent: { padding: 16, paddingBottom: 40, flexGrow: 1 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    loaderText: { color: '#52525B', marginTop: 12, fontSize: 13, fontWeight: '600' },

    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#63ff15', marginRight: 8 },
    sectionTitle: { color: '#63ff15', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    sectionBadge: {
        marginLeft: 8, backgroundColor: 'rgba(99,255,21,0.15)',
        borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
    },
    sectionBadgeText: { color: '#63ff15', fontSize: 10, fontWeight: '800' },

    // Friend request card
    friendCard: {
        backgroundColor: '#0C0C12',
        borderRadius: 18, borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
        padding: 16, marginBottom: 10,
        overflow: 'hidden', position: 'relative',
    },
    friendTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: 'rgba(99,255,21,0.3)' },
    avatarFallback: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: 'rgba(99,255,21,0.1)',
        borderWidth: 1.5, borderColor: 'rgba(99,255,21,0.3)',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarInitial: { color: '#63ff15', fontSize: 18, fontWeight: '900' },
    friendInfo: { flex: 1, marginLeft: 12 },
    friendName: { color: '#fff', fontSize: 15, fontWeight: '800' },
    friendSub: { color: '#52525B', fontSize: 12, marginTop: 2 },
    newBadge: {
        backgroundColor: 'rgba(99,255,21,0.15)',
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.25)',
    },
    newBadgeText: { color: '#63ff15', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    friendActions: { flexDirection: 'row', gap: 10 },
    btnDecline: {
        flex: 1, paddingVertical: 11, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
    },
    btnDeclineText: { color: '#71717A', fontSize: 13, fontWeight: '700' },
    btnAccept: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    btnAcceptGrad: { paddingVertical: 11, alignItems: 'center' },
    btnAcceptText: { color: '#000', fontSize: 13, fontWeight: '900' },

    // Generic notif card
    notifCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0C0C10', borderRadius: 16,
        padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    },
    iconWrap: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    notifBody: { flex: 1 },
    notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
    notifTitle: { color: '#E4E4E7', fontSize: 14, fontWeight: '700' },
    notifTime: { color: '#3F3F46', fontSize: 11, fontWeight: '600' },
    notifMsg: { color: '#71717A', fontSize: 12, lineHeight: 17 },

    // Empty
    emptyIcon: {
        width: 72, height: 72, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    emptyTitle: { color: '#E4E4E7', fontSize: 18, fontWeight: '800', marginBottom: 6 },
    emptyText: { color: '#52525B', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
