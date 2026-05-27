import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, Modal, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NexusAlert from '../components/NexusAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const API_URL = Config.BACKEND_URL;

const PLAN_CONFIG = {
    Gratis: { color: '#A1A1AA', bg: 'rgba(161,161,170,0.12)', label: 'GRATIS' },
    Pro:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  label: 'PRO' },
    Ultimate: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)', label: 'ULTIMATE' },
};
const ALL_PLANS = ['Gratis', 'Pro', 'Ultimate'];

export default function AdminDashboard() {
    const navigation = useNavigation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);

    // Plan selector modal
    const [planModal, setPlanModal] = useState({ visible: false, user: null });

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: 'ACEPTAR' });
    const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'ACEPTAR') => {
        setAlert({
            visible: true, title, message, type,
            onConfirm: () => { if (onConfirm) onConfirm(); setAlert(p => ({ ...p, visible: false })); },
            onCancel: onCancel ? () => { onCancel(); setAlert(p => ({ ...p, visible: false })); } : null,
            confirmText
        });
    };

    const getToken = async () => AsyncStorage.getItem('token');

    const fetchUsers = useCallback(async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (res.ok) setUsers(data);
            else showAlert('Error', data.error || 'No se pudieron cargar los usuarios', 'error');
        } catch {
            showAlert('Error', 'Error de conexión', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchOnlineCount = useCallback(async () => {
        try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/admin/online-count`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setOnlineCount(data.count);
            }
        } catch {}
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchOnlineCount();
        const interval = setInterval(fetchOnlineCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleChangePlan = async (userId, newPlan) => {
        setPlanModal({ visible: false, user: null });
        try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/admin/users/${userId}/plan`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ plan: newPlan }),
            });
            if (res.ok) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
            } else {
                const data = await res.json();
                showAlert('Error', data.error || 'No se pudo actualizar', 'error');
            }
        } catch {
            showAlert('Error', 'Error de conexión', 'error');
        }
    };

    const handleDeleteUser = (userId, email) => {
        showAlert(
            'Eliminar Usuario',
            `¿Seguro que quieres eliminar a ${email}? Esta acción no se puede deshacer.`,
            'warning',
            async () => {
                try {
                    const token = await getToken();
                    const res = await fetch(`${API_URL}/admin/users/${userId}`, {
                        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) setUsers(prev => prev.filter(u => u.id !== userId));
                    else showAlert('Error', 'No se pudo eliminar', 'error');
                } catch {
                    showAlert('Error', 'Error de conexión', 'error');
                }
            },
            () => {},
            'ELIMINAR'
        );
    };

    const renderUser = ({ item }) => {
        const cfg = PLAN_CONFIG[item.plan] || PLAN_CONFIG.Gratis;
        const isAdmin = item.role === 'ADMIN';
        return (
            <View style={styles.userCard}>
                <View style={styles.userLeft}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(item.nombre?.[0] || item.email?.[0] || '?').toUpperCase()}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {item.nombre ? `${item.nombre} ${item.apellido || ''}`.trim() : item.email}
                            </Text>
                            {isAdmin && (
                                <View style={styles.adminPill}>
                                    <Text style={styles.adminPillText}>ADMIN</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                        <View style={[styles.planBadge, { backgroundColor: cfg.bg }]}>
                            <Text style={[styles.planBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                    </View>
                </View>
                {!isAdmin && (
                    <View style={styles.userActions}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => setPlanModal({ visible: true, user: item })}
                        >
                            <Ionicons name="shield-outline" size={20} color="#63ff15" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleDeleteUser(item.id, item.email)}
                        >
                            <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0A0A0A', '#121212']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>PANEL ADMIN</Text>
                <TouchableOpacity onPress={() => { setRefreshing(true); fetchUsers(); fetchOnlineCount(); }}>
                    <Ionicons name="refresh-outline" size={24} color="#63ff15" />
                </TouchableOpacity>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.statVal}>{onlineCount}</Text>
                    <Text style={styles.statLabel}>EN LÍNEA</Text>
                </View>
                <View style={[styles.statCard, { borderColor: 'rgba(255,255,255,0.06)' }]}>
                    <MaterialCommunityIcons name="account-group-outline" size={20} color="#A1A1AA" />
                    <Text style={styles.statVal}>{users.length}</Text>
                    <Text style={styles.statLabel}>USUARIOS</Text>
                </View>
                <View style={[styles.statCard, { borderColor: 'rgba(255,215,0,0.15)' }]}>
                    <Ionicons name="star-outline" size={20} color="#FFD700" />
                    <Text style={[styles.statVal, { color: '#FFD700' }]}>
                        {users.filter(u => u.plan === 'Ultimate').length}
                    </Text>
                    <Text style={styles.statLabel}>ULTIMATE</Text>
                </View>
                <View style={[styles.statCard, { borderColor: 'rgba(59,130,246,0.2)' }]}>
                    <Ionicons name="rocket-outline" size={20} color="#3b82f6" />
                    <Text style={[styles.statVal, { color: '#3b82f6' }]}>
                        {users.filter(u => u.plan === 'Pro').length}
                    </Text>
                    <Text style={styles.statLabel}>PRO</Text>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#63ff15" style={{ flex: 1 }} />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderUser}
                    contentContainerStyle={styles.list}
                    onRefresh={() => { setRefreshing(true); fetchUsers(); fetchOnlineCount(); }}
                    refreshing={refreshing}
                    ListEmptyComponent={<Text style={styles.empty}>Sin usuarios registrados</Text>}
                />
            )}

            {/* Plan selector modal */}
            <Modal visible={planModal.visible} transparent animationType="fade" onRequestClose={() => setPlanModal({ visible: false, user: null })}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>CAMBIAR PLAN</Text>
                        <Text style={styles.modalSub} numberOfLines={1}>
                            {planModal.user?.nombre || planModal.user?.email}
                        </Text>
                        {ALL_PLANS.map(plan => {
                            const cfg = PLAN_CONFIG[plan];
                            const isCurrent = planModal.user?.plan === plan;
                            return (
                                <TouchableOpacity
                                    key={plan}
                                    style={[styles.planOption, { borderColor: isCurrent ? cfg.color : 'rgba(255,255,255,0.08)', backgroundColor: isCurrent ? cfg.bg : 'transparent' }]}
                                    onPress={() => handleChangePlan(planModal.user.id, plan)}
                                    disabled={isCurrent}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.planOptionText, { color: cfg.color }]}>{cfg.label}</Text>
                                    {isCurrent && <Text style={[styles.planCurrentLabel, { color: cfg.color }]}>ACTUAL</Text>}
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setPlanModal({ visible: false, user: null })}>
                            <Text style={styles.cancelText}>CANCELAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <NexusAlert
                visible={alert.visible} title={alert.title} message={alert.message}
                type={alert.type} onConfirm={alert.onConfirm} onCancel={alert.onCancel}
                confirmText={alert.confirmText}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 3 },

    statsRow: {
        flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 16,
    },
    statCard: {
        flex: 1, backgroundColor: 'rgba(18,18,18,0.9)', borderRadius: 16,
        alignItems: 'center', paddingVertical: 14, gap: 4,
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.2)',
    },
    onlineDot: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: '#63ff15',
        shadowColor: '#63ff15', shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
    },
    statVal: { color: '#fff', fontSize: 20, fontWeight: '900' },
    statLabel: { color: '#555', fontSize: 8, fontWeight: '900', letterSpacing: 1 },

    list: { paddingHorizontal: 16, paddingBottom: 40 },
    userCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(18,18,18,0.8)', borderRadius: 18,
        padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    userLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(99,255,21,0.12)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.25)',
    },
    avatarText: { color: '#63ff15', fontSize: 18, fontWeight: '900' },
    userName: { color: '#fff', fontSize: 14, fontWeight: '700', maxWidth: 160 },
    userEmail: { color: '#555', fontSize: 11, marginTop: 2 },
    planBadge: {
        alignSelf: 'flex-start', borderRadius: 8,
        paddingHorizontal: 8, paddingVertical: 2, marginTop: 5,
    },
    planBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    adminPill: {
        backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 6,
        paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    },
    adminPillText: { color: '#ef4444', fontSize: 8, fontWeight: '900' },
    userActions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.04)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },

    // Plan modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalCard: {
        backgroundColor: '#121218', borderRadius: 24, padding: 24,
        width: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
    modalSub: { color: '#555', fontSize: 12, marginBottom: 20 },
    planOption: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10,
    },
    planOptionText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    planCurrentLabel: { fontSize: 10, fontWeight: '900', opacity: 0.7 },
    cancelBtn: { marginTop: 6, alignItems: 'center', paddingVertical: 10 },
    cancelText: { color: '#555', fontSize: 13, fontWeight: '700' },

    empty: { color: '#333', textAlign: 'center', marginTop: 60, fontSize: 14 },
});
