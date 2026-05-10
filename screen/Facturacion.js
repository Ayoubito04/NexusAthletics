import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import NexusAlert from '../components/NexusAlert';
import Config from '../constants/Config';
import { colors } from '../theme';

const BACKEND_URL = Config.BACKEND_URL;

const PLAN_COLORS = { Gratis: '#888', Pro: '#63ff15', Ultimate: '#ff4d4d' };
const PLAN_ICONS  = { Gratis: 'leaf-outline', Pro: 'flask-outline', Ultimate: 'school-outline' };
const PLAN_PRICE  = { Gratis: '0,00 €', Pro: 'desde 2,50 €/mes', Ultimate: '9,99 €/mes' };

export default function Facturacion() {
    const navigation = useNavigation();
    const [user, setUser]         = useState(null);
    const [token, setToken]       = useState(null);
    const [loading, setLoading]   = useState(false);
    const [alert, setAlert]       = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: 'ACEPTAR' });

    const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'ACEPTAR') => {
        setAlert({
            visible: true, title, message, type,
            onConfirm: () => { if (onConfirm) onConfirm(); setAlert(p => ({ ...p, visible: false })); },
            onCancel: onCancel ? () => { onCancel(); setAlert(p => ({ ...p, visible: false })); } : null,
            confirmText,
        });
    };

    useEffect(() => {
        const load = async () => {
            const u = await AsyncStorage.getItem('user');
            const t = await AsyncStorage.getItem('token');
            if (u) setUser(JSON.parse(u));
            if (t) setToken(t);
        };
        load();
    }, []);

    const handleCancelar = () => {
        showAlert(
            '⚠️ Cancelar Suscripción',
            `¿Seguro que quieres cancelar el Plan ${user?.plan}? Perderás acceso inmediato a todas las funciones premium y pasarás al Plan Básico.`,
            'warning',
            confirmCancel,
            () => {},
            'SÍ, CANCELAR'
        );
    };

    const confirmCancel = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/plans/cancel-subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                showAlert(
                    'Suscripción cancelada',
                    'Has vuelto al Plan Básico. Puedes volver a suscribirte en cualquier momento.',
                    'info',
                    () => navigation.navigate('PlanesPago')
                );
            } else {
                showAlert('Error', data.error || 'No se pudo cancelar', 'error');
            }
        } catch (_) {
            showAlert('Error', 'Error de conexión', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
            </SafeAreaView>
        );
    }

    const planColor = PLAN_COLORS[user.plan] || '#888';
    const planIcon  = PLAN_ICONS[user.plan]  || 'card-outline';
    const planPrice = PLAN_PRICE[user.plan]  || '—';
    const isPaid    = user.plan === 'Pro' || user.plan === 'Ultimate';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Facturación</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Plan actual */}
                <View style={[styles.planCard, { borderColor: planColor }]}>
                    <LinearGradient
                        colors={[`${planColor}18`, 'transparent']}
                        style={StyleSheet.absoluteFill}
                        borderRadius={16}
                    />
                    <View style={styles.planRow}>
                        <View style={[styles.planIconBox, { backgroundColor: `${planColor}22` }]}>
                            <Ionicons name={planIcon} size={28} color={planColor} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={styles.planLabel}>PLAN ACTUAL</Text>
                            <Text style={[styles.planName, { color: planColor }]}>{user.plan}</Text>
                            <Text style={styles.planPrice}>{planPrice}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: isPaid ? `${planColor}22` : '#1a1a1a' }]}>
                            <Text style={[styles.statusText, { color: isPaid ? planColor : '#888' }]}>
                                {isPaid ? 'ACTIVO' : 'GRATUITO'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Información de facturación */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DETALLES</Text>

                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={18} color="#666" />
                        <Text style={styles.infoLabel}>Titular</Text>
                        <Text style={styles.infoValue}>{user.nombre} {user.apellido}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={18} color="#666" />
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{user.email}</Text>
                    </View>

                    {isPaid && (
                        <View style={styles.infoRow}>
                            <Ionicons name="card-outline" size={18} color="#666" />
                            <Text style={styles.infoLabel}>Ciclo</Text>
                            <Text style={styles.infoValue}>Mensual</Text>
                        </View>
                    )}

                    {user.haUsadoTrial && user.trialEndDate && (
                        <View style={styles.infoRow}>
                            <Ionicons name="timer-outline" size={18} color="#666" />
                            <Text style={styles.infoLabel}>Trial hasta</Text>
                            <Text style={styles.infoValue}>
                                {new Date(user.trialEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Botones de acción */}
                {isPaid ? (
                    <View style={styles.actionsSection}>
                        <TouchableOpacity
                            style={styles.upgradeBtn}
                            onPress={() => navigation.navigate('PlanesPago')}
                        >
                            <Ionicons name="swap-vertical-outline" size={18} color="#000" />
                            <Text style={styles.upgradeBtnText}>CAMBIAR PLAN</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={handleCancelar}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator size="small" color="#ff4d4d" />
                                : <>
                                    <Ionicons name="close-circle-outline" size={18} color="#ff4d4d" />
                                    <Text style={styles.cancelBtnText}>CANCELAR SUSCRIPCIÓN</Text>
                                </>
                            }
                        </TouchableOpacity>

                        <Text style={styles.cancelNote}>
                            Al cancelar, perderás acceso inmediato a las funciones premium y pasarás al Plan Básico.
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.upgradeBtn}
                        onPress={() => navigation.navigate('PlanesPago')}
                    >
                        <Ionicons name="rocket-outline" size={18} color="#000" />
                        <Text style={styles.upgradeBtnText}>VER PLANES PREMIUM</Text>
                    </TouchableOpacity>
                )}

            </ScrollView>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
                onCancel={alert.onCancel}
                confirmText={alert.confirmText}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    planCard: {
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 20,
        overflow: 'hidden',
        marginBottom: 24,
    },
    planRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    planIconBox: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    planLabel: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    planName: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1,
        marginTop: 2,
    },
    planPrice: {
        color: '#888',
        fontSize: 13,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    section: {
        backgroundColor: '#111',
        borderRadius: 14,
        padding: 16,
        marginBottom: 24,
        gap: 14,
    },
    sectionTitle: {
        color: '#444',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoLabel: {
        color: '#555',
        fontSize: 13,
        flex: 1,
    },
    infoValue: {
        color: '#ddd',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'right',
        flex: 2,
    },
    actionsSection: {
        gap: 12,
    },
    upgradeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#63ff15',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    upgradeBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#ff4d4d',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
        backgroundColor: 'rgba(255,77,77,0.07)',
    },
    cancelBtnText: {
        color: '#ff4d4d',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    cancelNote: {
        color: '#444',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
});
