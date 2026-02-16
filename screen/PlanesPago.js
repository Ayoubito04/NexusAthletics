import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NexusAlert from '../components/NexusAlert';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

export default function PlanesPago() {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    // NexusAlert State
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    const showAlert = (title, message, type = 'info', onConfirm = null) => {
        setAlert({
            visible: true,
            title,
            message,
            type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setAlert(prev => ({ ...prev, visible: false }));
            }
        });
    };

    useEffect(() => {
        const loadUser = async () => {
            const userData = await AsyncStorage.getItem('user');
            const userToken = await AsyncStorage.getItem('token');
            if (userData) setUser(JSON.parse(userData));
            if (userToken) setToken(userToken);
        };
        loadUser();
    }, []);

    const calcularDescuento = () => {
        if (!user) return 0;
        const count = user.invitacionesExitosas || 0;
        return Math.min(count * 15, 45); // Max 45%
    };

    const handleSelectPlan = async (planNombre, precioOriginal) => {
        if (!user || !token) {
            showAlert("Acceso Denegado", "Inicia sesión para cambiar de plan", "error", () => navigation.navigate('Login'));
            return;
        }

        const planSimplificado = planNombre.includes('Gratis') ? 'Gratis' : planNombre.includes('Pro') ? 'Pro' : 'Ultimate';

        if (user.role === 'ADMIN' || planSimplificado === 'Gratis') {
            await updatePlanDirectly(planSimplificado);
        } else {
            const dsc = planSimplificado === 'Pro' ? calcularDescuento() : 0;
            const finalPrice = precioOriginal * (1 - dsc / 100);

            const isTrialAvailable = planSimplificado === 'Pro' && !user?.haUsadoTrial;

            navigation.navigate('Checkout', {
                plan: planNombre,
                price: isTrialAvailable ? '0.00€' : finalPrice.toFixed(2) + '€',
                isTrial: isTrialAvailable,
                originalPrice: finalPrice.toFixed(2) + '€'
            });
        }
    };

    const updatePlanDirectly = async (plan) => {
        try {
            const response = await fetch(`${BACKEND_URL}/update-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan })
            });
            const updatedUser = await response.json();
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            showAlert("Éxito", `✨ ¡Felicidades! Ahora estás en el plan ${updatedUser.plan}`, "success", () => navigation.navigate('Home'));
        } catch (error) {
            showAlert("Error", "No se pudo actualizar el plan", "error");
        }
    };

    const handleFreeTrial = async () => {
        if (user.haUsadoTrial) {
            showAlert("Aviso", "Ya has utilizado tu mes de prueba anteriormente.", "warning");
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/plans/start-trial`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                showAlert("¡Prueba Activada!", "Ahora tienes 1 mes de Plan Pro gratis. ¡Aprovéchalo!", "success", () => navigation.navigate('Home'));
            } else {
                showAlert("Error", data.error, "error");
            }
        } catch (error) {
            showAlert("Error", "Error de conexión", "error");
        }
    };

    const onInvite = async () => {
        try {
            await Share.share({
                message: `¡Únete a Nexus Athletics AI y entrena con el mejor Coach de IA! Usa mi código de invitación: ${user.referralCode} para obtener beneficios mutuos. Descarga la app ahora.`,
            });
        } catch (error) {
            console.log(error.message);
        }
    };

    const planes = [
        {
            key: 'Gratis',
            nombre: 'Plan Básico (Gratis)',
            precio: '0€',
            val: 0,
            color: '#888',
            icono: 'leaf-outline',
            caracteristicas: [
                'Nexus Bio-Scanner Ilimitado',
                'Nexus Vision (Análisis Corporal)',
                'Rutas GPS Ilimitadas',
                'Consultas IA Ilimitadas 🤖',
                'Contador de Hidratación'
            ]
        },
        {
            key: 'Pro',
            nombre: 'Plan Pro (Científico)',
            precio: '4.99€/mes',
            val: 4.99,
            color: '#63ff15',
            icono: 'flask-outline',
            caracteristicas: [
                'Generación de Rutinas Canvas IA Ilimitadas',
                'IA Nivel Master Fisiología (Gemini Pro)',
                'Acceso total a Nexus Vault',
                'Presentaciones Élite (Descargables)',
                'Optimización de Macronutrientes por IA',
                'Sin anuncios y Soporte Prioritario'
            ],
            recommended: true,
            trial: true
        },
        {
            key: 'Ultimate',
            nombre: 'Plan Ultimate (Doctorado)',
            precio: '9.99€/mes',
            val: 9.99,
            color: '#ff4d4d',
            icono: 'school-outline',
            caracteristicas: [
                'Todo lo del Plan Pro',
                'Bio-optimización de Longevidad',
                'Monitorización Médica IA 24/7',
                'Análisis de Analíticas Avanzado',
                'Invitaciones VIP a Eventos'
            ]
        }
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
                {user && (
                    <View style={styles.promoCard}>
                        <View style={styles.promoInfo}>
                            <Text style={styles.promoTitle}>Programa de Invitados</Text>
                            <Text style={styles.promoText}>Invita a amigos y obtén hasta un <Text style={{ color: '#63ff15', fontWeight: 'bold' }}>45% de descuento</Text> en el Plan Pro.</Text>
                            <View style={styles.referralBox}>
                                <Text style={styles.refCode}>{user.referralCode}</Text>
                                <TouchableOpacity style={styles.inviteBtn} onPress={onInvite}>
                                    <Text style={styles.inviteBtnText}>INVITAR AMIGOS</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.promoStatus}>Amigos invitados: {user.invitacionesExitosas}/3 ({calcularDescuento()}% de descuento actual)</Text>
                        </View>
                    </View>
                )}

                {planes.map((p, index) => {
                    const dsc = (p.key === 'Pro' ? calcularDescuento() : 0);
                    const precioFinal = p.val * (1 - dsc / 100);
                    const isCurrentPlan = user?.plan === p.key;
                    const isIncluded = user?.plan === 'Ultimate' && p.key === 'Pro';
                    const showAsSubscribed = isCurrentPlan || isIncluded;

                    return (
                        <View key={index} style={[
                            styles.card,
                            p.recommended && styles.cardRecomendada,
                            showAsSubscribed && styles.currentPlanCard
                        ]}>
                            {isCurrentPlan && (
                                <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>TU PLAN ACTUAL</Text></View>
                            )}
                            {isIncluded && (
                                <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>INCLUIDO EN ULTIMATE</Text></View>
                            )}
                            {p.recommended && !showAsSubscribed && (
                                <View style={styles.badge}><Text style={styles.badgeText}>EL MÁS POPULAR</Text></View>
                            )}
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: p.color + '20' }]}>
                                    <Ionicons name={p.icono} size={32} color={p.color} />
                                </View>
                                <View>
                                    <Text style={styles.planName}>{p.nombre}</Text>
                                    {dsc > 0 ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={[styles.planPrice, { textDecorationLine: 'line-through', fontSize: 13 }]}>{p.precio}</Text>
                                            <Text style={[styles.planPrice, { color: '#63ff15', marginLeft: 8 }]}>{precioFinal.toFixed(2)}€/mes</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.planPrice}>{p.precio}</Text>
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

                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[
                                        styles.selectBtn,
                                        { backgroundColor: showAsSubscribed ? '#222' : p.color, flex: 1 },
                                        showAsSubscribed && { borderWidth: 1, borderColor: '#333' }
                                    ]}
                                    onPress={() => !showAsSubscribed && handleSelectPlan(p.nombre, p.val)}
                                    disabled={showAsSubscribed}
                                >
                                    <Text style={[
                                        styles.selectBtnText,
                                        { color: showAsSubscribed ? '#666' : 'black' }
                                    ]}>
                                        {showAsSubscribed
                                            ? 'SUSCRITO'
                                            : (p.key === 'Pro' && !user?.haUsadoTrial)
                                                ? 'PRUEBA UN MES GRATIS'
                                                : 'SUSCRIBIRSE'}
                                    </Text>
                                </TouchableOpacity>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    scrollContent: { padding: 20 },
    promoCard: {
        backgroundColor: '#161616',
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#222',
    },
    promoTitle: { color: 'white', fontSize: 18, fontWeight: '900', marginBottom: 10 },
    promoText: { color: '#888', fontSize: 13, lineHeight: 20, marginBottom: 15 },
    referralBox: {
        flexDirection: 'row',
        backgroundColor: '#000',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    refCode: { color: '#63ff15', fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
    inviteBtn: { backgroundColor: '#63ff15', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
    inviteBtnText: { color: 'black', fontSize: 11, fontWeight: 'bold' },
    promoStatus: { color: '#555', fontSize: 11, textTransform: 'uppercase' },
    card: { backgroundColor: '#111', borderRadius: 25, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#222' },
    cardRecomendada: { borderColor: '#63ff15', borderWidth: 2 },
    currentPlanCard: { borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, opacity: 0.9 },
    badge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#63ff15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    badgeText: { color: 'black', fontSize: 10, fontWeight: 'bold' },
    currentBadge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#444' },
    currentBadgeText: { color: '#666', fontSize: 10, fontWeight: 'bold' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    planName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    planPrice: { color: '#aaa', fontSize: 16 },
    divider: { height: 1, backgroundColor: '#222', marginBottom: 20 },
    featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    featureText: { color: '#ddd', marginLeft: 10, fontSize: 14 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    selectBtn: { height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    selectBtnText: { color: 'black', fontWeight: '900' },
    trialBtn: { flex: 0.8, height: 50, borderRadius: 15, borderWidth: 1, borderColor: '#63ff15', justifyContent: 'center', alignItems: 'center' },
    trialBtnText: { color: '#63ff15', fontWeight: 'bold', fontSize: 12 }
});
