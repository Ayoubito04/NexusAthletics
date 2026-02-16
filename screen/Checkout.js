import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator, Image } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NexusAlert from '../components/NexusAlert';

const BACKEND_URL = Config.BACKEND_URL;

export default function Checkout() {
    const navigation = useNavigation();
    const route = useRoute();
    const { plan, price, isTrial, originalPrice } = route.params || { plan: 'Pro', price: '4.99€', isTrial: false, originalPrice: '4.99€' };

    const [isSuccess, setIsSuccess] = useState(false);
    const [method, setMethod] = useState('stripe');
    const [isLoading, setIsLoading] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    // NexusAlert State
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

    const showAlert = (title, message, type = 'info') => {
        setAlert({ visible: true, title, message, type });
    };

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

                const { clientSecret, error } = data;
                if (error) throw new Error(error);

                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: clientSecret,
                    merchantDisplayName: 'Nexus Athletics AI',
                    appearance: {
                        colors: { primary: '#63ff15', background: '#0a0a0a', componentBackground: '#111111', text: '#ffffff' }
                    }
                });

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
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            const endpoint = isTrial ? '/plans/start-trial' : (method === 'paypal' ? '/payments/paypal-success' : '/update-plan');
            const body = isTrial
                ? {}
                : (method === 'paypal'
                    ? { plan, orderID: `PAY-NEXUS-${Math.random().toString(36).substr(2, 9).toUpperCase()}` }
                    : { plan: plan.includes('Ultimate') ? 'Ultimate' : 'Pro' });

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
            <SafeAreaView style={[styles.container, styles.centered]}>
                <View style={styles.successCard}>
                    <View style={styles.successIconBox}>
                        <Ionicons name="checkmark-done-circle" size={100} color="#63ff15" />
                    </View>
                    <Text style={styles.successTitle}>¡BIENVENIDO AL NIVEL {plan.toUpperCase()}!</Text>
                    <Text style={styles.successDesc}>
                        {isTrial
                            ? `Tu mes de prueba ha sido activado. Disfruta de todas las ventajas Pro sin coste durante 30 días.`
                            : "Tu suscripción ha sido procesada con éxito. Nexus AI ya te está preparando algo especial."}
                    </Text>
                    <TouchableOpacity style={styles.finishBtn} onPress={() => navigation.navigate('Home')}>
                        <Text style={styles.finishBtnText}>EMPEZAR AHORA</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Finalizar Compra</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Plan Seleccionado</Text>
                    <View style={styles.planRow}>
                        <View style={[styles.planIcon, { backgroundColor: plan.includes('Ultimate') ? '#ff4d4d20' : '#63ff1520' }]}>
                            <Ionicons name={plan.includes('Ultimate') ? "diamond" : "star"} size={24} color={plan.includes('Ultimate') ? "#ff4d4d" : "#63ff15"} />
                        </View>
                        <View>
                            <Text style={styles.planName}>{plan}</Text>
                            <Text style={styles.planPrice}>{price} {isTrial ? '(Mes de Prueba)' : '/mes'}</Text>
                            {isTrial && <Text style={styles.trialNotice}>Luego {originalPrice}/mes</Text>}
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Método de Pago</Text>

                <View style={styles.methodsGrid}>
                    <TouchableOpacity
                        style={[styles.methodBtn, method === 'stripe' && styles.methodBtnActive]}
                        onPress={() => setMethod('stripe')}
                    >
                        <FontAwesome5 name="stripe" size={24} color={method === 'stripe' ? "#635bff" : "#555"} />
                        <Text style={[styles.methodText, method === 'stripe' && styles.methodTextActive]}>Stripe (Recomendado)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.methodBtn, method === 'paypal' && styles.methodBtnActive]}
                        onPress={() => setMethod('paypal')}
                    >
                        <FontAwesome5 name="paypal" size={24} color={method === 'paypal' ? "#003087" : "#555"} />
                        <Text style={[styles.methodText, method === 'paypal' && styles.methodTextActive]}>PayPal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.methodBtn, method === 'mastercard' && styles.methodBtnActive]}
                        onPress={() => setMethod('mastercard')}
                    >
                        <FontAwesome5 name="cc-mastercard" size={24} color={method === 'mastercard' ? "#eb001b" : "#555"} />
                        <Text style={[styles.methodText, method === 'mastercard' && styles.methodTextActive]}>MasterCard</Text>
                    </TouchableOpacity>
                </View>

                {(method === 'stripe' || method === 'mastercard') ? (
                    <View style={styles.secureBanner}>
                        <Ionicons name="shield-checkmark" size={40} color="#63ff15" />
                        <Text style={styles.secureBannerTitle}>Pago Seguro vía {method === 'stripe' ? 'Stripe' : 'MasterCard'}</Text>
                        <Text style={styles.secureBannerDesc}>
                            {method === 'stripe'
                                ? "Al pulsar el botón inferior, se abrirá la pasarela segura de Stripe para completar tu suscripción."
                                : "Tu tarjeta MasterCard será procesada de forma segura a través de encriptación bancaria de alta gama."}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.paypalBox}>
                        <Ionicons name="logo-paypal" size={40} color="#003087" />
                        <Text style={styles.paypalInfo}>Serás redirigido a la ventana segura de PayPal para autorizar el cargo de {price}.</Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.payBtn, isLoading && { opacity: 0.7 }]}
                    onPress={handlePayment}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <>
                            <Text style={styles.payBtnText}>CONTINUAR CON EL PAGO</Text>
                            <Ionicons name="arrow-forward" size={20} color="black" style={{ marginLeft: 10 }} />
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.secureBox}>
                    <Ionicons name="lock-closed" size={12} color="#666" />
                    <Text style={styles.secureText}>Pago 100% seguro y encriptado</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    backBtn: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    content: {
        padding: 20,
    },
    summaryCard: {
        backgroundColor: '#161616',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: 30,
    },
    summaryLabel: {
        color: '#666',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 15,
    },
    planRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    planIcon: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    planName: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    planPrice: {
        color: '#aaa',
        fontSize: 14,
    },
    trialNotice: {
        color: '#63ff15',
        fontSize: 11,
        fontStyle: 'italic',
        marginTop: 2,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    methodsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 30,
    },
    methodBtn: {
        flex: 1,
        backgroundColor: '#111',
        height: 80,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    },
    methodBtnActive: {
        borderColor: '#0ce810',
        backgroundColor: '#0ce81005',
    },
    methodText: {
        color: '#666',
        fontSize: 11,
        fontWeight: 'bold',
    },
    methodTextActive: {
        color: 'white',
    },
    cardForm: {
        gap: 15,
    },
    inputLabel: {
        color: '#888',
        fontSize: 12,
        marginBottom: 5,
    },
    input: {
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#222',
        borderRadius: 12,
        height: 50,
        paddingHorizontal: 15,
        color: 'white',
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#222',
        borderRadius: 12,
        height: 50,
    },
    row: {
        flexDirection: 'row',
    },
    paypalBox: {
        backgroundColor: '#111',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#333',
    },
    paypalInfo: {
        color: '#888',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 15,
        lineHeight: 20,
    },
    payBtn: {
        backgroundColor: '#0ce810',
        height: 60,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
        shadowColor: '#0ce810',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
    },
    payBtnText: {
        color: 'black',
        fontSize: 16,
        fontWeight: '900',
    },
    secureBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 5,
    },
    secureText: {
        color: '#666',
        fontSize: 12,
    },
    centered: { justifyContent: 'center', alignItems: 'center' },
    successCard: { padding: 30, alignItems: 'center', textAlign: 'center' },
    successIconBox: { marginBottom: 30 },
    successTitle: { color: 'white', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
    successDesc: { color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
    finishBtn: { backgroundColor: '#63ff15', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 20 },
    finishBtnText: { color: 'black', fontWeight: 'bold', fontSize: 16 },
    secureBanner: { backgroundColor: '#111', padding: 25, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#222', marginBottom: 20 },
    secureBannerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
    secureBannerDesc: { color: '#888', textAlign: 'center', fontSize: 13, lineHeight: 20 }
});
