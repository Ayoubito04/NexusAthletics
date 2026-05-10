import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, ActivityIndicator, Animated, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import NexusAlert from '../components/NexusAlert';
import Config from '../constants/Config';
import { colors } from '../theme';

const BACKEND_URL = Config.BACKEND_URL;
const PRO_BASE_PRICE = 4.99;
const MAX_DISCOUNT_INVITES = 3;
const MAX_DISCOUNT_PERCENT = 0.50;
const DISCOUNT_PER_INVITE = (PRO_BASE_PRICE * MAX_DISCOUNT_PERCENT) / MAX_DISCOUNT_INVITES;

function getProgressivePrice(invites) {
    const discount = Math.min(invites, MAX_DISCOUNT_INVITES) * DISCOUNT_PER_INVITE;
    const minPrice = PRO_BASE_PRICE * (1 - MAX_DISCOUNT_PERCENT);
    return Math.max(minPrice, Math.round((PRO_BASE_PRICE - discount) * 100) / 100);
}

function getNextDiscountInfo(invites) {
    const currentPrice = getProgressivePrice(invites);
    const nextPrice = invites < MAX_DISCOUNT_INVITES ? getProgressivePrice(invites + 1) : 0;
    const savedAmount = Math.round((PRO_BASE_PRICE - currentPrice) * 100) / 100;
    const maxReached = invites >= MAX_DISCOUNT_INVITES;
    return {
        currentPrice,
        nextPrice,
        savedAmount,
        savedPercent: Math.round((savedAmount / PRO_BASE_PRICE) * 100),
        maxReached,
        totalInvites: invites,
        invitesForMax: MAX_DISCOUNT_INVITES,
    };
}

export default function PlanesPago() {
    const navigation = useNavigation();
    const [user, setUser]           = useState(null);
    const [token, setToken]         = useState(null);
    const [trialStatus, setTrialStatus] = useState(null); // { trialActive, trialExpired, daysLeft, hasDiscount, renewPrice, invites }
    const [loadingTrial, setLoadingTrial] = useState(false);
    const [codigoInput, setCodigoInput] = useState('');
    const [aplicandoCodigo, setAplicandoCodigo] = useState(false);
    const [codigoAplicado, setCodigoAplicado] = useState(false);
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

    const handleAplicarCodigo = async () => {
        if (!codigoInput.trim()) return;
        setAplicandoCodigo(true);
        try {
            const res = await fetch(`${BACKEND_URL}/plans/use-referral`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ referralCode: codigoInput.trim().toUpperCase() }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setCodigoAplicado(true);
                setCodigoInput('');
                if (data.user) {
                    await AsyncStorage.setItem('user', JSON.stringify(data.user));
                    setUser(data.user);
                }
                const currentInvites = trialStatus?.invites ?? (user?.invitacionesExitosas || 0);
                const newInvites = data.invites ?? Math.min(currentInvites + 1, MAX_DISCOUNT_INVITES);
                setTrialStatus(prev => ({ ...(prev || {}), invites: newInvites }));
                await fetchTrialStatus(token);
                const newPrice = getProgressivePrice(newInvites);
                showAlert('✅ Código Aplicado', `¡Descuento activado! Tu nuevo precio Pro: €${newPrice.toFixed(2)}/mes`, 'success');
            } else {
                showAlert('Error', data.error || 'Código inválido', 'error');
            }
        } catch (_) {
            showAlert('Error', 'Error de conexión', 'error');
        } finally {
            setAplicandoCodigo(false);
        }
    };

    const onInvite = async () => {
        try {
            const result = await Share.share({
                message: `¡Únete a Nexus Athletics AI y entrena con el mejor Coach de IA! 💪\n\nUsa mi código: ${user.referralCode} al registrarte y ambos obtenemos beneficios.\n\n📲 Descarga la app (APK Android):\nhttps://expo.dev/artifacts/eas/6NB41awp4qm8SpBJZu8pK9.apk`,
            });
            if (result?.action === Share.sharedAction && token) {
                const res = await fetch(`${BACKEND_URL}/plans/register-share`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.user) {
                        await AsyncStorage.setItem('user', JSON.stringify(data.user));
                        setUser(data.user);
                    }
                    if (data?.invites !== undefined) {
                        setTrialStatus(prev => ({
                            ...(prev || {}),
                            invites: data.invites,
                            pricing: data.pricing,
                            renewPrice: data.renewPrice,
                            hasDiscount: data.hasDiscount,
                            hasMaxDiscount: data.hasMaxDiscount,
                        }));
                    }
                    showAlert('Compartido', 'Se aplicó progreso de descuento por compartir.', 'success');
                }
            }
        } catch (_) {}
    };

    // ─── Datos derivados ────────────────────────────────────────────────────
    const invites      = trialStatus?.invites ?? (user?.invitacionesExitosas || 0);
    const pricing      = getNextDiscountInfo(invites);
    const hasDiscount  = invites > 0;
    const proPrice     = pricing.currentPrice;
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
                            Cada amigo que se registre con tu código reduce el precio del Plan Pro.{'\n'}
                            ¡Consigue <Text style={{ color: '#63ff15', fontWeight: '900' }}>{MAX_DISCOUNT_INVITES} invitaciones</Text> y llévate un <Text style={{ color: '#63ff15', fontWeight: '900' }}>50% de DESCUENTO</Text>!
                        </Text>

                        {/* Price Ladder */}
                        <View style={styles.priceLadder}>
                            <View style={styles.priceLadderHeader}>
                                <Text style={styles.priceLadderLabel}>PRECIO ACTUAL</Text>
                                <View style={styles.priceDisplay}>
                                    <Text style={styles.priceCurrent}>{pricing.currentPrice.toFixed(2)}€</Text>
                                    <Text style={styles.priceMonth}>/mes</Text>
                                    {pricing.maxReached && (
                                        <View style={styles.maxBadge}>
                                            <Text style={styles.maxBadgeText}>MAX 50%</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {!pricing.maxReached && (
                                <>
                                    {/* Savings bar */}
                                    <View style={styles.savingsBar}>
                                        <View style={[styles.savingsFill, { width: `${pricing.savedPercent}%` }]} />
                                    </View>
                                    <View style={styles.savingsInfo}>
                                        <Text style={styles.savingsText}>
                                            Ahorrado: <Text style={{ color: '#63ff15', fontWeight: '800' }}>{pricing.savedAmount.toFixed(2)}€</Text>
                                            ({pricing.savedPercent}%)
                                        </Text>
                                        <Text style={styles.savingsText}>
                                            Base: <Text style={{ color: '#888' }}>{PRO_BASE_PRICE.toFixed(2)}€</Text>
                                        </Text>
                                    </View>

                                    {/* Price ladder steps */}
                                    <View style={styles.ladderSteps}>
                                        {Array.from({ length: MAX_DISCOUNT_INVITES + 1 }, (_, i) => i).map(step => {
                                            const stepPrice = getProgressivePrice(step);
                                            const isReached = step <= invites;
                                            const isNext = step === invites + 1;
                                            return (
                                                <View
                                                    key={step}
                                                    style={[
                                                        styles.ladderStep,
                                                        isReached && styles.ladderStepReached,
                                                        isNext && styles.ladderStepNext,
                                                    ]}
                                                >
                                                    <View style={styles.ladderStepLeft}>
                                                        <View style={[
                                                            styles.ladderDot,
                                                            isReached && styles.ladderDotReached,
                                                            isNext && styles.ladderDotNext,
                                                        ]}>
                                                            {isReached && (
                                                                <Ionicons name="checkmark" size={10} color="#000" />
                                                            )}
                                                        </View>
                                                        <Text style={[
                                                            styles.ladderStepLabel,
                                                            isReached && styles.ladderStepLabelReached,
                                                        ]}>
                                                            {step}/{MAX_DISCOUNT_INVITES} inv.
                                                        </Text>
                                                    </View>
                                                    <Text style={[
                                                        styles.ladderStepPrice,
                                                        isReached && styles.ladderStepPriceReached,
                                                        isNext && { color: '#63ff15' },
                                                    ]}>
                                                        {`${stepPrice.toFixed(2)}€`}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {invites < MAX_DISCOUNT_INVITES && (
                                        <View style={styles.nextDiscountBanner}>
                                            <Ionicons name="trending-down-outline" size={16} color="#63ff15" />
                                            <Text style={styles.nextDiscountText}>
                                                {MAX_DISCOUNT_INVITES - invites} invitación(es) más para llegar al 50% de descuento
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}

                            {pricing.maxReached && (
                                <View style={styles.freeBanner}>
                                    <Ionicons name="trophy" size={24} color="#FFD700" />
                                    <Text style={styles.freeBannerText}>
                                        ¡Felicidades! Ya alcanzaste el descuento máximo del 50% en Plan Pro.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Progreso de invitaciones */}
                        <View style={styles.inviteProgress}>
                            {Array.from({ length: MAX_DISCOUNT_INVITES }).map((_, i) => (
                                <View key={i} style={[styles.inviteDot, i < invites && styles.inviteDotFull]}>
                                    <Ionicons
                                        name={i < invites ? 'person' : 'person-outline'}
                                        size={12}
                                        color={i < invites ? '#000' : '#444'}
                                    />
                                </View>
                            ))}
                            <Text style={styles.inviteCount}>
                                {invites}/{MAX_DISCOUNT_INVITES} amigos
                            </Text>
                        </View>

                        <View style={styles.referralBox}>
                            <View style={styles.refCodeContainer}>
                                <Text style={styles.refLabel}>TU CÓDIGO</Text>
                                <Text style={styles.refCode}>{user.referralCode}</Text>
                            </View>
                            <TouchableOpacity style={styles.inviteBtn} onPress={onInvite}>
                                <Ionicons name="share-social" size={16} color="#000" />
                                <Text style={styles.inviteBtnText}>COMPARTIR</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ── Aplicar código de descuento ── */}
                        {!codigoAplicado ? (
                            <View style={styles.codigoBox}>
                                <Text style={styles.codigoLabel}>¿Tienes un código de descuento?</Text>
                                <View style={styles.codigoRow}>
                                    <TextInput
                                        style={styles.codigoInput}
                                        placeholder="Ej: JUA-5283"
                                        placeholderTextColor="#555"
                                        value={codigoInput}
                                        onChangeText={t => setCodigoInput(t.toUpperCase())}
                                        autoCapitalize="characters"
                                        maxLength={10}
                                    />
                                    <TouchableOpacity
                                        style={[styles.codigoBtn, (!codigoInput.trim() || aplicandoCodigo) && { opacity: 0.5 }]}
                                        onPress={handleAplicarCodigo}
                                        disabled={!codigoInput.trim() || aplicandoCodigo}
                                    >
                                        {aplicandoCodigo
                                            ? <ActivityIndicator size="small" color="#000" />
                                            : <Text style={styles.codigoBtnText}>APLICAR</Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={[styles.codigoBox, { borderColor: '#63ff15' }]}>
                                <Ionicons name="checkmark-circle" size={18} color="#63ff15" />
                                <Text style={{ color: '#63ff15', fontWeight: '700', marginLeft: 8 }}>Código aplicado correctamente</Text>
                            </View>
                        )}
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
                                            invites={invites}
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

function ProPricing({ trialUsed, isInTrial, hasDiscount, proPrice, invites }) {
    const pricing = getNextDiscountInfo(invites || 0);
    if (!trialUsed) {
        return (
            <View>
                <Text style={styles.planPriceFree}>1er mes GRATIS</Text>
                <Text style={styles.planPriceSub}>Luego {pricing.currentPrice.toFixed(2)}€/mes</Text>
            </View>
        );
    }
    if (isInTrial) {
        return (
            <View>
                <Text style={styles.planPriceFree}>En prueba gratuita</Text>
                <Text style={styles.planPriceSub}>Renovación: {pricing.currentPrice.toFixed(2)}€/mes</Text>
            </View>
        );
    }
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {invites > 0 && (
                <Text style={[styles.planPrice, { textDecorationLine: 'line-through', fontSize: 13, color: '#555' }]}>{PRO_BASE_PRICE.toFixed(2)}€</Text>
            )}
            <Text style={[styles.planPrice, invites > 0 && { color: '#63ff15' }]}>
                {pricing.currentPrice.toFixed(2)}€/mes
            </Text>
            {pricing.isFree && (
                <View style={{ backgroundColor: '#FFD70020', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '900' }}>GRATIS</Text>
                </View>
            )}
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

    codigoBox: {
        flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
        backgroundColor: '#111', borderRadius: 14, borderWidth: 1,
        borderColor: '#2a2a2a', padding: 14, marginTop: 12, gap: 8,
    },
    codigoLabel: { color: '#888', fontSize: 12, fontWeight: '600', width: '100%' },
    codigoRow: { flexDirection: 'row', flex: 1, gap: 8 },
    codigoInput: {
        flex: 1, backgroundColor: '#0d0d0d', borderWidth: 1, borderColor: '#333',
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
        color: '#fff', fontSize: 14, letterSpacing: 2, fontWeight: '700',
    },
    codigoBtn: {
        backgroundColor: '#63ff15', borderRadius: 10,
        paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
    },
    codigoBtnText: { color: '#000', fontWeight: '900', fontSize: 12 },

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

    // Price Ladder
    priceLadder: {
        backgroundColor: '#0A0A0A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
    },
    priceLadderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    priceLadderLabel: {
        color: '#888',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    priceDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    maxBadge: {
        marginLeft: 6,
        backgroundColor: 'rgba(255,215,0,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.35)',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    maxBadgeText: {
        color: '#FFD700',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    priceCurrent: {
        color: '#63ff15',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    priceMonth: {
        color: '#888',
        fontSize: 13,
        fontWeight: '600',
    },
    priceFree: {
        color: '#63ff15',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 1,
    },
    savingsBar: {
        height: 4,
        backgroundColor: '#1a1a1a',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    savingsFill: {
        height: '100%',
        backgroundColor: '#63ff15',
        borderRadius: 2,
    },
    savingsInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    savingsText: {
        color: '#666',
        fontSize: 11,
        fontWeight: '600',
    },
    ladderSteps: {
        gap: 6,
        marginBottom: 12,
    },
    ladderStep: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: '#0d0d0d',
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    ladderStepReached: {
        backgroundColor: 'rgba(99,255,21,0.06)',
        borderColor: 'rgba(99,255,21,0.2)',
    },
    ladderStepNext: {
        borderColor: 'rgba(99,255,21,0.4)',
        borderStyle: 'dashed',
    },
    ladderStepLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ladderDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ladderDotReached: {
        backgroundColor: '#63ff15',
        borderColor: '#63ff15',
    },
    ladderDotNext: {
        borderColor: '#63ff15',
        borderWidth: 2,
    },
    ladderStepLabel: {
        color: '#666',
        fontSize: 12,
        fontWeight: '600',
    },
    ladderStepLabelReached: {
        color: '#63ff15',
        fontWeight: '800',
    },
    ladderStepPrice: {
        color: '#555',
        fontSize: 13,
        fontWeight: '700',
    },
    ladderStepPriceReached: {
        color: '#63ff15',
    },
    nextDiscountBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(99,255,21,0.08)',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
    },
    nextDiscountText: {
        color: '#63ff15',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    freeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,215,0,0.08)',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.2)',
    },
    freeBannerText: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
        lineHeight: 18,
    },
    refCodeContainer: {
        flex: 1,
    },
    refLabel: {
        color: '#555',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 2,
    },
});
