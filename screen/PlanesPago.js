import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NexusAlert from '../components/NexusAlert';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;
const PRO_FULL     = 4.99;
const PRO_DISCOUNT = 2.49;

export default function PlanesPago() {
    const navigation = useNavigation();
    const [user, setUser]           = useState(null);
    const [token, setToken]         = useState(null);
    const [trialStatus, setTrialStatus] = useState(null); // { trialActive, trialExpired, daysLeft, hasDiscount, renewPrice, invites }
    const [loadingTrial, setLoadingTrial] = useState(false);
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    const showAlert = (title, message, type = 'info', onConfirm = null) => {
        setAlert({
            visible: true, title, message, type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setAlert(prev => ({ ...prev, visible: false }));
            }
        });
    };

    useEffect(() => {
        const load = async () => {
            const userData  = await AsyncStorage.getItem('user');
            const userToken = await AsyncStorage.getItem('token');
            if (userData)  setUser(JSON.parse(userData));
            if (userToken) {
                setToken(userToken);
                fetchTrialStatus(userToken);
            }
        };
        load();
    }, []);

    const fetchTrialStatus = async (t) => {
        try {
            const res = await fetch(`${BACKEND_URL}/plans/trial-status`, {
                headers: { Authorization: `Bearer ${t}` },
            });
            if (res.ok) {
                const data = await res.json();
                setTrialStatus(data);
                // Sync user if plan changed (e.g. auto-downgrade)
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
            }
        } catch (_) {}
    };

    // Activa el trial directamente sin pasar por Checkout (0€ real)
    const handleActivateTrial = async () => {
        if (!user || !token) return;
        setLoadingTrial(true);
        try {
            const res = await fetch(`${BACKEND_URL}/plans/start-trial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                await fetchTrialStatus(token);
                showAlert(
                    '🎉 ¡Mes Gratis Activado!',
                    'Tienes 30 días de Plan Pro completamente gratis. Invita a 3 amigos para conseguir un 50% de descuento cuando renueves.',
                    'success',
                    () => navigation.navigate('Home')
                );
            } else {
                showAlert('Error', data.error || 'No se pudo activar el trial', 'error');
            }
        } catch (_) {
            showAlert('Error', 'Error de conexión', 'error');
        } finally {
            setLoadingTrial(false);
        }
    };

    const handleSelectPlan = async (planNombre, precio) => {
        if (!user || !token) {
            showAlert('Acceso Denegado', 'Inicia sesión para cambiar de plan', 'error', () => navigation.navigate('Login'));
            return;
        }
        const planKey = planNombre.includes('Gratis') ? 'Gratis' : planNombre.includes('Pro') ? 'Pro' : 'Ultimate';

        if (user.role === 'ADMIN' || planKey === 'Gratis') {
            await updatePlanDirectly(planKey);
            return;
        }

        navigation.navigate('Checkout', { plan: planNombre, price: precio.toFixed(2) + '€', isTrial: false });
    };

    const updatePlanDirectly = async (plan) => {
        try {
            const res = await fetch(`${BACKEND_URL}/update-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ plan }),
            });
            const updatedUser = await res.json();
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            showAlert('Éxito', `✨ Ahora estás en el plan ${updatedUser.plan}`, 'success', () => navigation.navigate('Home'));
        } catch (_) {
            showAlert('Error', 'No se pudo actualizar el plan', 'error');
        }
    };

    const onInvite = async () => {
        try {
            await Share.share({
                message: `¡Únete a Nexus Athletics AI y entrena con el mejor Coach de IA! Usa mi código: ${user.referralCode} y ambos obtenemos beneficios. ¡Descárgala ahora!`,
            });
        } catch (_) {}
    };

    // ─── Datos derivados ────────────────────────────────────────────────────
    const invites      = trialStatus?.invites ?? (user?.invitacionesExitosas || 0);
    const hasDiscount  = invites >= 3;
    const proPrice     = hasDiscount ? PRO_DISCOUNT : PRO_FULL;
    const isInTrial    = trialStatus?.trialActive;
    const trialExpired = trialStatus?.trialExpired;
    const daysLeft     = trialStatus?.daysLeft;
    const trialUsed    = user?.haUsadoTrial;

    const planes = [
        {
            key: 'Gratis',
            nombre: 'Plan Básico',
            precio: 0,
            color: '#888',
            icono: 'leaf-outline',
            caracteristicas: [
                'Nexus Bio-Scanner Ilimitado',
                'Nexus Vision (Análisis Corporal)',
                'Rutas GPS Ilimitadas',
                'Consultas IA Ilimitadas 🤖',
                'Contador de Hidratación',
            ],
        },
        {
            key: 'Pro',
            nombre: 'Plan Pro',
            precio: proPrice,
            color: '#63ff15',
            icono: 'flask-outline',
            recommended: true,
            caracteristicas: [
                'Generación de Rutinas Canvas IA Ilimitadas',
                'IA Nivel Master Fisiología (Gemini Pro)',
                'Acceso total a Nexus Vault',
                'Presentaciones Élite (Descargables)',
                'Optimización de Macronutrientes por IA',
                'Sin anuncios y Soporte Prioritario',
            ],
        },
        {
            key: 'Ultimate',
            nombre: 'Plan Ultimate',
            precio: 9.99,
            color: '#ff4d4d',
            icono: 'school-outline',
            caracteristicas: [
                'Todo lo del Plan Pro',
                'Bio-optimización de Longevidad',
                'Monitorización Médica IA 24/7',
                'Análisis de Analíticas Avanzado',
                'Invitaciones VIP a Eventos',
            ],
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Suscripciones</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* ── Trial activo: banner de días restantes ── */}
                {isInTrial && (
                    <LinearGradient colors={['rgba(99,255,21,0.15)', 'rgba(99,255,21,0.04)']} style={styles.trialBanner}>
                        <Ionicons name="timer-outline" size={28} color="#63ff15" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.trialBannerTitle}>🎉 Mes Gratis en Curso</Text>
                            <Text style={styles.trialBannerSub}>
                                Te quedan <Text style={{ color: '#63ff15', fontWeight: '900' }}>{daysLeft} día{daysLeft !== 1 ? 's' : ''}</Text> de Plan Pro gratuito.
                            </Text>
                            <Text style={styles.trialBannerAfter}>
                                Al renovar pagarás:{' '}
                                <Text style={{ color: hasDiscount ? '#63ff15' : '#fff', fontWeight: '900' }}>
                                    {proPrice.toFixed(2)}€/mes
                                </Text>
                                {hasDiscount && <Text style={{ color: '#63ff15' }}> (50% dto. por invitaciones ✓)</Text>}
                            </Text>
                        </View>
                    </LinearGradient>
                )}

                {/* ── Trial expirado: aviso ── */}
                {trialExpired && user?.plan === 'Gratis' && (
                    <View style={styles.expiredBanner}>
                        <Ionicons name="alert-circle-outline" size={22} color="#ff6b6b" />
                        <Text style={styles.expiredText}>Tu mes gratis ha terminado. Renueva el Plan Pro para seguir disfrutando de todas las funciones.</Text>
                    </View>
                )}

                {/* ── Programa de invitados ── */}
                {user && (
                    <View style={styles.promoCard}>
                        <Text style={styles.promoTitle}>🎁 Invita y Ahorra</Text>
                        <Text style={styles.promoText}>
                            Invita a <Text style={{ color: '#fff', fontWeight: '800' }}>3 amigos</Text> y consigue un{' '}
                            <Text style={{ color: '#63ff15', fontWeight: '900' }}>50% de descuento</Text> permanente en el Plan Pro.{'\n'}
                            Sin invitaciones: <Text style={{ color: '#aaa' }}>4.99€/mes</Text> {'  '}·{'  '}
                            Con 3+ invitaciones: <Text style={{ color: '#63ff15' }}>2.49€/mes</Text>
                        </Text>

                        {/* Progreso de invitaciones */}
                        <View style={styles.inviteProgress}>
                            {[0, 1, 2].map(i => (
                                <View key={i} style={[styles.inviteDot, i < invites && styles.inviteDotFull]}>
                                    <Ionicons
                                        name={i < invites ? 'person-add' : 'person-add-outline'}
                                        size={14}
                                        color={i < invites ? '#000' : '#444'}
                                    />
                                </View>
                            ))}
                            <Text style={styles.inviteCount}>
                                {invites}/3 amigos{hasDiscount ? ' ✓ ¡Descuento activado!' : ''}
                            </Text>
                        </View>

                        <View style={styles.referralBox}>
                            <Text style={styles.refCode}>{user.referralCode}</Text>
                            <TouchableOpacity style={styles.inviteBtn} onPress={onInvite}>
                                <Ionicons name="share-social-outline" size={14} color="#000" />
                                <Text style={styles.inviteBtnText}>INVITAR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Tarjetas de planes ── */}
                {planes.map((p) => {
                    const isCurrentPlan = user?.plan === p.key;
                    const isIncluded    = user?.plan === 'Ultimate' && p.key === 'Pro';
                    const showSubscribed = isCurrentPlan || isIncluded;

                    // Botón Pro: estados
                    const trialAvailable   = p.key === 'Pro' && !trialUsed;
                    const inTrialPro       = p.key === 'Pro' && isInTrial;
                    const renewPro         = p.key === 'Pro' && trialExpired && !isCurrentPlan;

                    return (
                        <View key={p.key} style={[
                            styles.card,
                            p.recommended && styles.cardRecomendada,
                            showSubscribed && styles.currentPlanCard,
                        ]}>
                            {isCurrentPlan && (
                                <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>TU PLAN ACTUAL</Text></View>
                            )}
                            {isIncluded && (
                                <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>INCLUIDO EN ULTIMATE</Text></View>
                            )}
                            {p.recommended && !showSubscribed && !inTrialPro && (
                                <View style={styles.badge}><Text style={styles.badgeText}>EL MÁS POPULAR</Text></View>
                            )}

                            {/* Header de la tarjeta */}
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: p.color + '20' }]}>
                                    <Ionicons name={p.icono} size={32} color={p.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.planName}>{p.nombre}</Text>
                                    {p.key === 'Pro' ? (
                                        <ProPricing
                                            trialUsed={trialUsed}
                                            isInTrial={isInTrial}
                                            hasDiscount={hasDiscount}
                                            proPrice={proPrice}
                                        />
                                    ) : (
                                        <Text style={styles.planPrice}>
                                            {p.precio === 0 ? 'Gratis' : `${p.precio.toFixed(2)}€/mes`}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {p.caracteristicas.map((feat, idx) => (
                                <View key={idx} style={styles.featureRow}>
                                    <Ionicons name="checkmark-circle" size={18} color={p.color} />
                                    <Text style={styles.featureText}>{feat}</Text>
                                </View>
                            ))}

                            {/* Acción */}
                            <View style={styles.actions}>
                                {showSubscribed ? (
                                    <View style={[styles.selectBtn, { backgroundColor: '#1a1a1a', flex: 1, borderWidth: 1, borderColor: '#333' }]}>
                                        <Text style={[styles.selectBtnText, { color: '#555' }]}>SUSCRITO</Text>
                                    </View>
                                ) : trialAvailable && p.key === 'Pro' ? (
                                    <TouchableOpacity
                                        style={[styles.selectBtn, styles.trialBtn, { flex: 1 }]}
                                        onPress={handleActivateTrial}
                                        disabled={loadingTrial}
                                    >
                                        {loadingTrial
                                            ? <ActivityIndicator color="#000" />
                                            : <>
                                                <Ionicons name="gift-outline" size={18} color="#000" />
                                                <Text style={[styles.selectBtnText, { color: '#000', marginLeft: 6 }]}>
                                                    PRIMER MES GRATIS
                                                </Text>
                                            </>
                                        }
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.selectBtn, { backgroundColor: p.color, flex: 1 }]}
                                        onPress={() => handleSelectPlan(p.nombre, p.precio)}
                                    >
                                        <Text style={[styles.selectBtnText, { color: '#000' }]}>
                                            {renewPro
                                                ? `RENOVAR — ${proPrice.toFixed(2)}€/mes`
                                                : 'SUSCRIBIRSE'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
            />
        </SafeAreaView>
    );
}

// Subcomponente de precio para el Plan Pro
function ProPricing({ trialUsed, isInTrial, hasDiscount, proPrice }) {
    if (!trialUsed) {
        return (
            <View>
                <Text style={styles.planPriceFree}>1er mes GRATIS</Text>
                <Text style={styles.planPriceSub}>Luego {proPrice.toFixed(2)}€/mes</Text>
            </View>
        );
    }
    if (isInTrial) {
        return (
            <View>
                <Text style={styles.planPriceFree}>En prueba gratuita</Text>
                <Text style={styles.planPriceSub}>Renovación: {proPrice.toFixed(2)}€/mes</Text>
            </View>
        );
    }
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {hasDiscount && (
                <Text style={[styles.planPrice, { textDecorationLine: 'line-through', fontSize: 13, color: '#555' }]}>4.99€</Text>
            )}
            <Text style={[styles.planPrice, hasDiscount && { color: '#63ff15' }]}>
                {proPrice.toFixed(2)}€/mes
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    scrollContent: { padding: 20 },

    // Trial activo
    trialBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 14,
        borderRadius: 20, padding: 18, marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.25)',
    },
    trialBannerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 4 },
    trialBannerSub: { color: '#aaa', fontSize: 13, marginBottom: 4 },
    trialBannerAfter: { color: '#666', fontSize: 12 },

    // Trial expirado
    expiredBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,107,107,0.08)',
        borderRadius: 14, padding: 14, marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(255,107,107,0.2)',
    },
    expiredText: { color: '#ff6b6b', fontSize: 13, flex: 1, lineHeight: 18 },

    // Promo card
    promoCard: {
        backgroundColor: '#111', borderRadius: 20, padding: 20,
        marginBottom: 28, borderWidth: 1, borderColor: '#1e1e1e',
    },
    promoTitle: { color: 'white', fontSize: 17, fontWeight: '900', marginBottom: 10 },
    promoText: { color: '#777', fontSize: 13, lineHeight: 21, marginBottom: 16 },

    inviteProgress: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    inviteDot: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333',
        justifyContent: 'center', alignItems: 'center',
    },
    inviteDotFull: { backgroundColor: '#63ff15', borderColor: '#63ff15' },
    inviteCount: { color: '#63ff15', fontSize: 12, fontWeight: '800', flex: 1 },

    referralBox: {
        flexDirection: 'row', backgroundColor: '#000', borderRadius: 12,
        padding: 10, alignItems: 'center', justifyContent: 'space-between',
    },
    refCode: { color: '#63ff15', fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
    inviteBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#63ff15', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    },
    inviteBtnText: { color: 'black', fontSize: 11, fontWeight: '900' },

    // Plan cards
    card: { backgroundColor: '#111', borderRadius: 25, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#1e1e1e' },
    cardRecomendada: { borderColor: '#63ff15', borderWidth: 2 },
    currentPlanCard: { borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1, opacity: 0.85 },
    badge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#63ff15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    badgeText: { color: 'black', fontSize: 10, fontWeight: 'bold' },
    currentBadge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
    currentBadgeText: { color: '#555', fontSize: 10, fontWeight: 'bold' },

    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
    iconContainer: { width: 58, height: 58, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    planName: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    planPrice: { color: '#aaa', fontSize: 15 },
    planPriceFree: { color: '#63ff15', fontSize: 15, fontWeight: '900' },
    planPriceSub: { color: '#555', fontSize: 12, marginTop: 2 },

    divider: { height: 1, backgroundColor: '#1e1e1e', marginBottom: 18 },
    featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 11 },
    featureText: { color: '#ccc', marginLeft: 10, fontSize: 14 },

    actions: { marginTop: 14 },
    selectBtn: {
        height: 52, borderRadius: 15,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    },
    trialBtn: {
        backgroundColor: '#63ff15',
        shadowColor: '#63ff15', shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
    },
    selectBtnText: { fontWeight: '900', fontSize: 14 },
});
