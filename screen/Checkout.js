import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NexusAlert from '../components/NexusAlert';
import * as WebBrowser from 'expo-web-browser';

const BACKEND_URL = Config.BACKEND_URL;
const { width } = Dimensions.get('window');

const PAYMENT_METHODS = [
    {
        id: 'stripe',
        label: 'Stripe',
        sublabel: 'Recomendado',
        icon: <FontAwesome5 name="stripe-s" size={22} color="#635bff" />,
        activeColor: '#635bff',
    },
    {
        id: 'paypal',
        label: 'PayPal',
        sublabel: 'Seguro',
        icon: <FontAwesome5 name="paypal" size={22} color="#009cde" />,
        activeColor: '#009cde',
    },
    {
        id: 'mastercard',
        label: 'Tarjeta',
        sublabel: 'Mastercard',
        icon: <FontAwesome5 name="cc-mastercard" size={22} color="#eb001b" />,
        activeColor: '#eb001b',
    },
];

export default function Checkout() {
    const navigation = useNavigation();
    const route = useRoute();
    const { plan, price, isTrial, originalPrice } = route.params || { plan: 'Pro', price: '4.99€', isTrial: false, originalPrice: '4.99€' };

    const [isSuccess, setIsSuccess] = useState(false);
    const [method, setMethod] = useState('stripe');
    const [isLoading, setIsLoading] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

    const showAlert = (title, message, type = 'info') => {
        setAlert({ visible: true, title, message, type });
    };

    const isUltimate = plan.includes('Ultimate');
    const planColor = isUltimate ? '#ff4d4d' : '#63ff15';
    const planGradient = isUltimate
        ? ['#ff4d4d22', '#ff4d4d08', 'transparent']
        : ['#63ff1522', '#63ff1508', 'transparent'];

    const handlePayment = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const amount = parseFloat(price.replace('€', ''));

            if (method === 'stripe' || method === 'mastercard') {
                const response = await fetch(`${BACKEND_URL}/payments/create-intent`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ amount, plan, isTrial })
                });

                const resText = await response.text();
                let data;
                try {
                    data = JSON.parse(resText);
                } catch (e) {
                    throw new Error("Respuesta no válida del servidor.");
                }

                const { clientSecret, error, isSetupIntent } = data;
                if (error) throw new Error(error);

                const sheetParams = {
                    merchantDisplayName: 'Nexus Athletics AI',
                    appearance: {
                        colors: { primary: '#63ff15', background: '#0a0a0a', componentBackground: '#111111', text: '#ffffff' }
                    }
                };
                if (isSetupIntent) {
                    sheetParams.setupIntentClientSecret = clientSecret;
                } else {
                    sheetParams.paymentIntentClientSecret = clientSecret;
                }

                const { error: initError } = await initPaymentSheet(sheetParams);
                if (initError) throw new Error(initError.message);

                const { error: presentError } = await presentPaymentSheet();
                if (presentError) {
                    if (presentError.code !== 'Canceled') {
                        showAlert("Error de Pago", presentError.message, "error");
                    }
                    setIsLoading(false);
                    return;
                }
            } else if (method === 'paypal') {
                const orderRes = await fetch(`${BACKEND_URL}/payments/paypal-create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ amount, plan })
                });
                const orderData = await orderRes.json();
                if (orderData.error) throw new Error(orderData.error);

                const result = await WebBrowser.openAuthSessionAsync(
                    orderData.approveLink,
                    'nexus-fitness://paypal'
                );

                if (result.type !== 'success') {
                    setIsLoading(false);
                    return;
                }

                const params = {};
                (result.url.split('?')[1] || '').split('&').forEach(p => {
                    const [k, v] = p.split('=');
                    if (k) params[k] = decodeURIComponent(v || '');
                });
                const paypalOrderId = params.token || orderData.orderID;

                const captureRes = await fetch(`${BACKEND_URL}/payments/paypal-capture`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ orderID: paypalOrderId, plan: isUltimate ? 'Ultimate' : 'Pro' })
                });
                const captureData = await captureRes.json();
                if (!captureData.success) throw new Error(captureData.error || 'Error al capturar pago PayPal');

                await AsyncStorage.setItem('user', JSON.stringify(captureData.user));
                setIsLoading(false);
                setIsSuccess(true);
                return;
            }

            const endpoint = isTrial ? '/plans/start-trial' : '/update-plan';
            const body = isTrial ? {} : { plan: isUltimate ? 'Ultimate' : 'Pro' };

            const updateRes = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (updateRes.ok) {
                const updatedData = await updateRes.json();
                await AsyncStorage.setItem('user', JSON.stringify(updatedData.user));
                setIsSuccess(true);
            } else {
                throw new Error("El pago se realizó pero no pudimos actualizar tu plan. Contacta con soporte.");
            }

        } catch (error) {
            showAlert("Error de Pago", error.message, "error");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={['#0a0a0a', '#0d1a0d', '#0a0a0a']}
                    style={styles.successBg}
                >
                    <View style={styles.successParticles}>
                        {[...Array(6)].map((_, i) => (
                            <View key={i} style={[styles.particle, { left: `${15 + i * 14}%`, top: `${10 + (i % 3) * 20}%`, opacity: 0.15 + i * 0.05 }]} />
                        ))}
                    </View>

                    <View style={styles.successContent}>
                        <View style={styles.successGlowRing}>
                            <LinearGradient
                                colors={['#63ff1540', '#63ff1510']}
                                style={styles.successGlowRingInner}
                            >
                                <Ionicons name="checkmark-done-circle" size={80} color="#63ff15" />
                            </LinearGradient>
                        </View>

                        <Text style={styles.successBadge}>ACCESO CONCEDIDO</Text>
                        <Text style={styles.successTitle}>¡NIVEL {plan.toUpperCase()} ACTIVADO!</Text>
                        <Text style={styles.successDesc}>
                            {isTrial
                                ? 'Tu mes de prueba ha sido activado. Disfruta de todas las ventajas Pro sin coste durante 30 días.'
                                : 'Tu suscripción ha sido procesada con éxito. Nexus AI ya está preparando algo especial para ti.'}
                        </Text>

                        <View style={styles.successFeatures}>
                            {['IA sin límites', 'Rutinas ilimitadas', 'Coach de voz', 'Planes Elite'].map((f, i) => (
                                <View key={i} style={styles.successFeatureItem}>
                                    <Ionicons name="checkmark-circle" size={16} color="#63ff15" />
                                    <Text style={styles.successFeatureText}>{f}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.85}>
                            <LinearGradient
                                colors={['#63ff15', '#4acc10']}
                                style={styles.successBtn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Text style={styles.successBtnText}>EMPEZAR AHORA</Text>
                                <Ionicons name="arrow-forward" size={18} color="black" style={{ marginLeft: 8 }} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </SafeAreaView>
        );
    }

    const selectedMethod = PAYMENT_METHODS.find(m => m.id === method);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <LinearGradient colors={['#1a1a1a', '#111']} style={styles.backBtnInner}>
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </LinearGradient>
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Finalizar Compra</Text>
                    <Text style={styles.headerSub}>Pago seguro y encriptado</Text>
                </View>
                <View style={styles.secureChip}>
                    <Ionicons name="shield-checkmark" size={12} color="#63ff15" />
                    <Text style={styles.secureChipText}>SSL</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Plan Summary Card */}
                <LinearGradient
                    colors={planGradient}
                    style={styles.summaryCard}
                >
                    <View style={styles.summaryCardBorder}>
                        <View style={styles.summaryTop}>
                            <Text style={styles.summaryLabel}>PLAN SELECCIONADO</Text>
                            <View style={[styles.planBadge, { backgroundColor: planColor + '22', borderColor: planColor + '55' }]}>
                                <Text style={[styles.planBadgeText, { color: planColor }]}>{isUltimate ? 'PREMIUM' : 'PRO'}</Text>
                            </View>
                        </View>

                        <View style={styles.planRow}>
                            <LinearGradient
                                colors={isUltimate ? ['#ff4d4d33', '#ff4d4d11'] : ['#63ff1533', '#63ff1511']}
                                style={styles.planIconBox}
                            >
                                <Ionicons
                                    name={isUltimate ? 'diamond' : 'star'}
                                    size={28}
                                    color={planColor}
                                />
                            </LinearGradient>
                            <View style={styles.planInfo}>
                                <Text style={styles.planName}>{plan}</Text>
                                <View style={styles.priceRow}>
                                    <Text style={[styles.planPrice, { color: planColor }]}>{price}</Text>
                                    <Text style={styles.planPriceSuffix}>{isTrial ? ' prueba gratis' : '/mes'}</Text>
                                </View>
                                {isTrial && (
                                    <Text style={styles.trialNotice}>Después {originalPrice}/mes · Cancela cuando quieras</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.planFeatureRow}>
                            {['IA ilimitada', 'Rutinas Pro', 'Sin anuncios'].map((f, i) => (
                                <View key={i} style={styles.planFeatureChip}>
                                    <Ionicons name="checkmark" size={11} color={planColor} />
                                    <Text style={[styles.planFeatureChipText, { color: planColor }]}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </LinearGradient>

                {/* Payment Method */}
                <Text style={styles.sectionTitle}>Método de Pago</Text>

                <View style={styles.methodsGrid}>
                    {PAYMENT_METHODS.map((m) => {
                        const active = method === m.id;
                        return (
                            <TouchableOpacity
                                key={m.id}
                                style={styles.methodBtnWrapper}
                                onPress={() => setMethod(m.id)}
                                activeOpacity={0.8}
                            >
                                {active ? (
                                    <LinearGradient
                                        colors={[m.activeColor + '22', m.activeColor + '08']}
                                        style={[styles.methodBtn, { borderColor: m.activeColor + '80' }]}
                                    >
                                        <View style={[styles.methodIconBox, { backgroundColor: m.activeColor + '22' }]}>
                                            {m.icon}
                                        </View>
                                        <Text style={[styles.methodLabel, { color: 'white' }]}>{m.label}</Text>
                                        <Text style={[styles.methodSublabel, { color: m.activeColor }]}>{m.sublabel}</Text>
                                        <View style={[styles.methodActiveDot, { backgroundColor: m.activeColor }]} />
                                    </LinearGradient>
                                ) : (
                                    <View style={[styles.methodBtn, { borderColor: '#222', backgroundColor: '#0e0e0e' }]}>
                                        <View style={styles.methodIconBox}>
                                            {m.icon}
                                        </View>
                                        <Text style={styles.methodLabel}>{m.label}</Text>
                                        <Text style={styles.methodSublabel}>{m.sublabel}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Payment Info Box */}
                {method !== 'paypal' ? (
                    <View style={styles.infoBox}>
                        <View style={styles.infoBoxHeader}>
                            <LinearGradient colors={['#63ff1522', '#63ff1508']} style={styles.infoIconBox}>
                                <Ionicons name="shield-checkmark" size={22} color="#63ff15" />
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoBoxTitle}>
                                    {isTrial ? 'Verificación de Tarjeta' : `Pago Seguro · ${method === 'stripe' ? 'Stripe' : 'MasterCard'}`}
                                </Text>
                                <Text style={styles.infoBoxSub}>Encriptación bancaria 256-bit</Text>
                            </View>
                        </View>
                        <Text style={styles.infoBoxDesc}>
                            {isTrial
                                ? 'Solo verificamos tu tarjeta. No se realiza ningún cargo ahora. Puedes cancelar en cualquier momento antes de que finalice el mes gratuito.'
                                : method === 'stripe'
                                    ? 'Al continuar, se abrirá la pasarela oficial de Stripe para completar tu suscripción de forma segura.'
                                    : 'Tu tarjeta MasterCard será procesada mediante encriptación bancaria de alto nivel.'}
                        </Text>
                        <View style={styles.infoBoxBadges}>
                            {['PCI DSS', '3D Secure', 'Cifrado SSL'].map((b, i) => (
                                <View key={i} style={styles.infoBadge}>
                                    <Text style={styles.infoBadgeText}>{b}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.paypalBox}>
                        <LinearGradient colors={['#009cde15', '#003087' + '08']} style={styles.paypalGradient}>
                            <View style={styles.paypalLogoRow}>
                                <FontAwesome5 name="paypal" size={32} color="#009cde" />
                                <View style={styles.paypalTextBlock}>
                                    <Text style={styles.paypalTitle}>Pago con PayPal</Text>
                                    <Text style={styles.paypalSub}>Compra garantizada por PayPal</Text>
                                </View>
                            </View>
                            <Text style={styles.paypalDesc}>
                                Serás redirigido a la ventana segura de PayPal para autorizar el cargo de <Text style={{ color: '#009cde', fontWeight: 'bold' }}>{price}</Text>.
                            </Text>
                        </LinearGradient>
                    </View>
                )}

                {/* Pay Button */}
                <TouchableOpacity
                    onPress={handlePayment}
                    disabled={isLoading}
                    activeOpacity={0.85}
                    style={{ marginTop: 30 }}
                >
                    <LinearGradient
                        colors={isLoading ? ['#2a2a2a', '#1a1a1a'] : ['#63ff15', '#4acc10']}
                        style={styles.payBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#63ff15" size="small" />
                        ) : (
                            <>
                                <Text style={[styles.payBtnText, isLoading && { color: '#666' }]}>
                                    {isTrial ? 'ACTIVAR MES GRATIS' : 'CONFIRMAR PAGO'}
                                </Text>
                                <View style={styles.payBtnArrow}>
                                    <Ionicons name="arrow-forward" size={16} color="black" />
                                </View>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.footerRow}>
                        <Ionicons name="lock-closed" size={11} color="#444" />
                        <Text style={styles.footerText}>Pago 100% seguro · Cancela cuando quieras</Text>
                    </View>
                    <View style={styles.footerRow}>
                        <Ionicons name="document-text-outline" size={11} color="#444" />
                        <Text style={styles.footerText}>Al confirmar aceptas los Términos de Servicio</Text>
                    </View>
                </View>

            </ScrollView>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={() => setAlert({ ...alert, visible: false })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 14,
    },
    backBtn: {},
    backBtnInner: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.5,
    },
    headerSub: {
        fontSize: 11,
        color: '#555',
        marginTop: 1,
    },
    secureChip: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#63ff1515',
        borderWidth: 1,
        borderColor: '#63ff1530',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    secureChipText: {
        color: '#63ff15',
        fontSize: 11,
        fontWeight: '700',
    },

    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    // Summary Card
    summaryCard: {
        borderRadius: 22,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#1e1e1e',
    },
    summaryCardBorder: {
        padding: 20,
    },
    summaryTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    summaryLabel: {
        color: '#555',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    planBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    planBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    planRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    planIconBox: {
        width: 58,
        height: 58,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 3,
    },
    planPrice: {
        fontSize: 22,
        fontWeight: '900',
    },
    planPriceSuffix: {
        color: '#666',
        fontSize: 13,
        marginLeft: 4,
    },
    trialNotice: {
        color: '#666',
        fontSize: 11,
        marginTop: 3,
    },
    divider: {
        height: 1,
        backgroundColor: '#1a1a1a',
        marginVertical: 16,
    },
    planFeatureRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    planFeatureChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ffffff08',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    planFeatureChipText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Section Title
    sectionTitle: {
        color: 'white',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 14,
    },

    // Method Selector
    methodsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    methodBtnWrapper: {
        flex: 1,
    },
    methodBtn: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 6,
        position: 'relative',
    },
    methodIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    methodLabel: {
        color: '#777',
        fontSize: 12,
        fontWeight: '700',
    },
    methodSublabel: {
        color: '#555',
        fontSize: 10,
    },
    methodActiveDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 7,
        height: 7,
        borderRadius: 4,
    },

    // Info Box (Stripe/Mastercard)
    infoBox: {
        backgroundColor: '#0e0e0e',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1e1e1e',
        padding: 20,
        gap: 14,
    },
    infoBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBoxTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    infoBoxSub: {
        color: '#63ff15',
        fontSize: 11,
        marginTop: 2,
    },
    infoBoxDesc: {
        color: '#666',
        fontSize: 13,
        lineHeight: 20,
    },
    infoBoxBadges: {
        flexDirection: 'row',
        gap: 8,
    },
    infoBadge: {
        backgroundColor: '#ffffff08',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#222',
    },
    infoBadgeText: {
        color: '#555',
        fontSize: 10,
        fontWeight: '600',
    },

    // PayPal Box
    paypalBox: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#009cde30',
    },
    paypalGradient: {
        padding: 22,
        gap: 14,
    },
    paypalLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    paypalTextBlock: {
        flex: 1,
    },
    paypalTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
    },
    paypalSub: {
        color: '#009cde',
        fontSize: 11,
        marginTop: 2,
    },
    paypalDesc: {
        color: '#888',
        fontSize: 13,
        lineHeight: 20,
    },

    // Pay Button
    payBtn: {
        height: 58,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    payBtnText: {
        color: 'black',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    },
    payBtnArrow: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },

    // Footer
    footer: {
        marginTop: 20,
        gap: 6,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
    },
    footerText: {
        color: '#444',
        fontSize: 11,
    },

    // Success Screen
    successBg: {
        flex: 1,
        justifyContent: 'center',
    },
    successParticles: {
        ...StyleSheet.absoluteFillObject,
    },
    particle: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#63ff15',
    },
    successContent: {
        paddingHorizontal: 30,
        alignItems: 'center',
    },
    successGlowRing: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#63ff1530',
        marginBottom: 28,
    },
    successGlowRingInner: {
        width: 130,
        height: 130,
        borderRadius: 65,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successBadge: {
        color: '#63ff15',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 3,
        marginBottom: 10,
    },
    successTitle: {
        color: 'white',
        fontSize: 26,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: 14,
    },
    successDesc: {
        color: '#777',
        textAlign: 'center',
        lineHeight: 22,
        fontSize: 14,
        marginBottom: 28,
    },
    successFeatures: {
        width: '100%',
        backgroundColor: '#0e0e0e',
        borderRadius: 16,
        padding: 16,
        gap: 10,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#1e1e1e',
    },
    successFeatureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    successFeatureText: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '500',
    },
    successBtn: {
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
        elevation: 8,
    },
    successBtnText: {
        color: 'black',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
