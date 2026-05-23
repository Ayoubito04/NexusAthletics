import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Config from '../constants/Config';
import NexusAlert from '../components/NexusAlert';

const BACKEND_URL = Config.BACKEND_URL;

const PLAN_STEPS = [
    'Analizando tu perfil atlético...',
    'Diseñando periodización inteligente...',
    'Calculando volumen y cargas...',
    'Seleccionando ejercicios óptimos...',
    'Ajustando macros y nutrición...',
    'Preparando tu plan maestro...',
];

const PlanGeneratingScreen = ({ isUltimate }) => {
    const [stepIdx, setStepIdx] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const barAnim = useRef(new Animated.Value(0)).current;
    const pulse1 = useRef(new Animated.Value(1)).current;
    const pulse2 = useRef(new Animated.Value(1)).current;
    const pulse3 = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0.4)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const color = isUltimate ? '#FFD700' : '#63ff15';

    useEffect(() => {
        Animated.timing(barAnim, {
            toValue: 1,
            duration: PLAN_STEPS.length * 4000,
            useNativeDriver: false,
        }).start();

        const interval = setInterval(() => {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
            setStepIdx(i => (i + 1) % PLAN_STEPS.length);
        }, 3500);

        const createPulse = (anim, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: 1.4, duration: 1200, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                ])
            ).start();
        };
        createPulse(pulse1, 0);
        createPulse(pulse2, 400);
        createPulse(pulse3, 800);

        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
                Animated.timing(glowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
            ])
        ).start();

        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
        ).start();

        return () => clearInterval(interval);
    }, []);

    const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
        <View style={{ flex: 1, backgroundColor: '#050508', alignItems: 'center', justifyContent: 'center' }}>
            {/* Corner decorations */}
            <View style={{ position: 'absolute', top: 48, left: 24, width: 28, height: 28, borderTopWidth: 2, borderLeftWidth: 2, borderColor: color, opacity: 0.5 }} />
            <View style={{ position: 'absolute', top: 48, right: 24, width: 28, height: 28, borderTopWidth: 2, borderRightWidth: 2, borderColor: color, opacity: 0.5 }} />
            <View style={{ position: 'absolute', bottom: 56, left: 24, width: 28, height: 28, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: color, opacity: 0.5 }} />
            <View style={{ position: 'absolute', bottom: 56, right: 24, width: 28, height: 28, borderBottomWidth: 2, borderRightWidth: 2, borderColor: color, opacity: 0.5 }} />

            {/* Central rings + icon */}
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 200, height: 200, marginBottom: 44 }}>
                <Animated.View style={{
                    position: 'absolute', width: 180, height: 180, borderRadius: 90,
                    borderWidth: 1.5, borderColor: color,
                    opacity: pulse1.interpolate({ inputRange: [1, 1.4], outputRange: [0.35, 0] }),
                    transform: [{ scale: pulse1 }],
                }} />
                <Animated.View style={{
                    position: 'absolute', width: 148, height: 148, borderRadius: 74,
                    borderWidth: 1, borderColor: color,
                    opacity: pulse2.interpolate({ inputRange: [1, 1.4], outputRange: [0.45, 0] }),
                    transform: [{ scale: pulse2 }],
                }} />
                <Animated.View style={{
                    position: 'absolute', width: 116, height: 116, borderRadius: 58,
                    borderWidth: 1, borderColor: color,
                    opacity: pulse3.interpolate({ inputRange: [1, 1.4], outputRange: [0.55, 0] }),
                    transform: [{ scale: pulse3 }],
                }} />

                {/* Rotating dashed ring */}
                <Animated.View style={{
                    position: 'absolute', width: 100, height: 100, borderRadius: 50,
                    borderWidth: 2, borderColor: color,
                    borderStyle: 'dashed',
                    transform: [{ rotate }],
                }} />

                {/* Icon with glow */}
                <Animated.View style={{
                    width: 76, height: 76, borderRadius: 38,
                    backgroundColor: `${color}12`,
                    borderWidth: 2, borderColor: color,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: color,
                    shadowOpacity: glowAnim,
                    shadowRadius: 24,
                    elevation: 12,
                }}>
                    <Ionicons name={isUltimate ? 'trophy' : 'sparkles'} size={32} color={color} />
                </Animated.View>
            </View>

            {/* Title */}
            <Text style={{
                color,
                fontSize: 18,
                fontWeight: '900',
                letterSpacing: 2,
                textAlign: 'center',
                textShadowColor: color,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 14,
                marginBottom: 6,
                paddingHorizontal: 24,
            }}>
                {isUltimate ? '👑 GENERANDO MESOCICLO ULTIMATE' : '⚡ GENERANDO PLAN ÉLITE'}
            </Text>

            {/* Step counter */}
            <Text style={{ color: '#444', fontSize: 11, letterSpacing: 2, marginBottom: 28, fontWeight: '700' }}>
                {stepIdx + 1} / {PLAN_STEPS.length}
            </Text>

            {/* Animated step text */}
            <Animated.Text style={{
                color: '#777',
                fontSize: 14,
                textAlign: 'center',
                opacity: fadeAnim,
                paddingHorizontal: 48,
                lineHeight: 22,
                fontWeight: '500',
            }}>
                {PLAN_STEPS[stepIdx]}
            </Animated.Text>

            {/* Bottom progress bar */}
            <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 3, backgroundColor: '#111',
            }}>
                <Animated.View style={{
                    height: 3, backgroundColor: color, width: barWidth,
                    shadowColor: color, shadowOpacity: 0.9, shadowRadius: 6,
                }} />
            </View>
        </View>
    );
};

export default function NexusIA() {
    const navigation = useNavigation();

    const [user, setUser] = useState(null);
    const [generandoPlan, setGenerandoPlan] = useState(false);
    const [modalOnboarding, setModalOnboarding] = useState(false);

    // Plan config
    const [objetivoPlan, setObjetivoPlan] = useState('Ganar Músculo');
    const [nivelPlan, setNivelPlan] = useState('Intermedio');
    const [diasPlan, setDiasPlan] = useState('4');
    const [prefAlimenticia, setPrefAlimenticia] = useState('Alta Proteína');
    const [metodologia, setMetodologia] = useState('IA Decide por Mí');
    const [equipamiento, setEquipamiento] = useState('Gimnasio Completo');
    const [prioridad, setPrioridad] = useState('Equilibrado');
    const [duracion, setDuracion] = useState('60-90 min');

    // Ultimate exclusive
    const [periodi, setPeriodi] = useState('Lineal (Clásica)');
    const [tecnicas, setTecnicas] = useState([]);
    const [semanasMeso, setSemanasMeso] = useState('8');
    const [horasSueno, setHorasSueno] = useState('7-8h');
    const [nivelEstres, setNivelEstres] = useState('Moderado');
    const [lesiones, setLesiones] = useState('');

    // Onboarding
    const [obPeso, setObPeso] = useState('');
    const [obAltura, setObAltura] = useState('');
    const [obEdad, setObEdad] = useState('');
    const [obGenero, setObGenero] = useState('Hombre');

    // Alert
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: 'OK', cancelText: 'Cancelar' });

    const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'OK', cancelText = 'Cancelar') => {
        setAlert({
            visible: true, title, message, type,
            onConfirm: () => { if (onConfirm) onConfirm(); setAlert(a => ({ ...a, visible: false })); },
            onCancel: onCancel ? () => { onCancel(); setAlert(a => ({ ...a, visible: false })); } : null,
            confirmText, cancelText,
        });
    };

    useEffect(() => {
        AsyncStorage.getItem('user').then(u => { if (u) setUser(JSON.parse(u)); });
    }, []);

    const profileIsIncomplete = () => !user?.peso || !user?.altura || !user?.edad;

    const isUltimate = user?.plan === 'Ultimate';

    const handleSaveOnboarding = async () => {
        if (!obPeso || !obAltura || !obEdad) {
            showAlert("Faltan datos", "Por favor rellena todos los campos.", "error");
            return;
        }
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/user/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ peso: parseFloat(obPeso), altura: parseFloat(obAltura), edad: parseInt(obEdad), genero: obGenero }),
            });
            if (res.ok) {
                const updated = await res.json();
                setUser(updated);
                await AsyncStorage.setItem('user', JSON.stringify(updated));
            }
        } catch (_) {}
        setModalOnboarding(false);
    };

    const handleGenerarPlanVisual = async () => {
        if (!user || user.plan === 'Gratis') {
            showAlert("Mejora tu plan", "La generación de planes Élite es exclusiva para usuarios Pro y Ultimate.", "info", () => navigation.navigate('PlanesPago'));
            return;
        }
        if (profileIsIncomplete()) {
            setObPeso(user?.peso?.toString() || '');
            setObAltura(user?.altura?.toString() || '');
            setObEdad(user?.edad?.toString() || '');
            setModalOnboarding(true);
            return;
        }
        const token = await AsyncStorage.getItem('token');
        setGenerandoPlan(true);
        try {
            const body = isUltimate
                ? {
                    details: `OBJETIVO: ${objetivoPlan}. NIVEL: ${nivelPlan}. DÍAS/SEMANA: ${diasPlan}. DIETA: ${prefAlimenticia}. METODOLOGÍA: ${metodologia}. EQUIPAMIENTO: ${equipamiento}. PRIORIDAD: ${prioridad}. DURACIÓN: ${duracion}.`,
                    lesiones, horasSueno, nivelEstres,
                    semanas: parseInt(semanasMeso),
                    periodi, tecnicas,
                }
                : {
                    details: `OBJETIVO: ${objetivoPlan}. NIVEL: ${nivelPlan}. DÍAS/SEMANA: ${diasPlan}. DIETA: ${prefAlimenticia}. METODOLOGÍA: ${metodologia}. EQUIPAMIENTO: ${equipamiento}. PRIORIDAD: ${prioridad}. DURACIÓN: ${duracion}.`
                };

            const response = await fetch(`${BACKEND_URL}/generate-plan-interactive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Error del servidor (${response.status})`);
            }

            const planData = await response.json();
            setGenerandoPlan(false);
            navigation.navigate('ElitePlanScreen', { plan: planData });
        } catch (error) {
            showAlert("Error", error.message || "No se pudo generar la presentación interactiva.", "error");
            setGenerandoPlan(false);
        }
    };

    const descargarRutinaPDF = async () => {
        if (!user || user.plan === 'Gratis') {
            showAlert("Mejora tu plan", "La generación de rutinas en PDF es exclusiva para usuarios Pro y Ultimate.", "info", () => navigation.navigate('PlanesPago'));
            return;
        }
        if (profileIsIncomplete()) {
            setObPeso(user?.peso?.toString() || '');
            setObAltura(user?.altura?.toString() || '');
            setObEdad(user?.edad?.toString() || '');
            setModalOnboarding(true);
            return;
        }
        const token = await AsyncStorage.getItem('token');
        setGenerandoPlan(true);
        try {
            const response = await fetch(`${BACKEND_URL}/generate-pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    details: `OBJETIVO: ${objetivoPlan}. NIVEL: ${nivelPlan}. DÍAS/SEMANA: ${diasPlan}. DIETA: ${prefAlimenticia}. METODOLOGÍA: ${metodologia}. EQUIPAMIENTO: ${equipamiento}. PRIORIDAD: ${prioridad}. DURACIÓN: ${duracion}. Usuario: ${user.nombre} ${user.apellido}.`,
                    format: 'base64',
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al generar PDF');
            }
            const data = await response.json();
            if (!data.base64) throw new Error('El servidor no devolvió el PDF correctamente');

            const fileUri = FileSystem.documentDirectory + 'Plan_Entrenamiento_Nexus_AI.pdf';
            await FileSystem.writeAsStringAsync(fileUri, data.base64, { encoding: 'base64' });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri);
            } else {
                showAlert("Éxito", `PDF guardado en: ${fileUri}`, "success");
            }
        } catch (error) {
            showAlert("Error", error.message || "No se pudo generar el PDF", "error");
        } finally {
            setGenerandoPlan(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <LinearGradient
                    colors={['transparent', 'rgba(99,255,21,0.4)', 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1 }}
                />
                <View style={styles.headerTitleContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.headerTitle}>Nexus <Text style={styles.titleHighlight}>IA</Text></Text>
                        {user?.plan && (
                            <View style={[styles.planBadge, { borderColor: isUltimate ? '#FFD700' : '#63ff15', backgroundColor: isUltimate ? 'rgba(255,215,0,0.1)' : 'rgba(99,255,21,0.1)' }]}>
                                <Text style={[styles.planBadgeText, { color: isUltimate ? '#FFD700' : '#63ff15' }]}>{user.plan.toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.statusRow}>
                        <View style={styles.dot} />
                        <Text style={styles.statusText}>Generador de rutinas · IA activa</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('SavedElitePlans')} style={styles.headerActionBtn}>
                    <Ionicons name="folder-open-outline" size={20} color="#63ff15" />
                </TouchableOpacity>
            </View>

            {/* Generating overlay */}
            {generandoPlan && (
                <View style={StyleSheet.absoluteFill}>
                    <PlanGeneratingScreen isUltimate={isUltimate} />
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Pro vs Ultimate comparison */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    {/* PRO */}
                    <View style={{
                        flex: 1, borderRadius: 16, borderWidth: 2,
                        borderColor: user?.plan === 'Pro' ? '#63ff15' : '#222',
                        backgroundColor: user?.plan === 'Pro' ? 'rgba(99,255,21,0.06)' : '#111',
                        padding: 12,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Text style={{ fontSize: 14 }}>⚡</Text>
                            <Text style={{ color: '#63ff15', fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>PRO</Text>
                            {user?.plan === 'Pro' && <View style={{ backgroundColor: '#63ff15', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ color: '#000', fontSize: 9, fontWeight: '900' }}>TU PLAN</Text></View>}
                        </View>
                        {[
                            'Plan semanal completo',
                            'GIFs de cada ejercicio',
                            'Series × repeticiones',
                            'Macros personalizados',
                            'Sincroniza 12 semanas',
                        ].map((f, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                <Text style={{ color: '#63ff15', fontSize: 11 }}>✓</Text>
                                <Text style={{ color: '#ccc', fontSize: 11, flex: 1, lineHeight: 15 }}>{f}</Text>
                            </View>
                        ))}
                    </View>
                    {/* ULTIMATE */}
                    <View style={{
                        flex: 1, borderRadius: 16, borderWidth: 2,
                        borderColor: isUltimate ? '#FFD700' : '#222',
                        backgroundColor: isUltimate ? 'rgba(255,215,0,0.06)' : '#111',
                        padding: 12,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Text style={{ fontSize: 14 }}>👑</Text>
                            <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>ULTIMATE</Text>
                            {isUltimate && <View style={{ backgroundColor: '#FFD700', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ color: '#000', fontSize: 9, fontWeight: '900' }}>TU PLAN</Text></View>}
                        </View>
                        {[
                            '8-10 ejercicios/sesión',
                            'RIR + peso sugerido',
                            'Análisis 1RM real',
                            'Nutrición + timing',
                            'Suplementación',
                            'Periodización DUP',
                        ].map((f, i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                <Text style={{ color: '#FFD700', fontSize: 11 }}>✓</Text>
                                <Text style={{ color: '#ccc', fontSize: 11, flex: 1, lineHeight: 15 }}>{f}</Text>
                            </View>
                        ))}
                        {!isUltimate && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('PlanesPago')}
                                style={{ marginTop: 8, backgroundColor: '#FFD700', borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}
                            >
                                <Text style={{ color: '#000', fontWeight: '900', fontSize: 11 }}>MEJORAR →</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Objetivo */}
                <Text style={styles.labelPlan}>¿Cuál es tu objetivo principal?</Text>
                <View style={styles.optionsGrid}>
                    {['Ganar Músculo', 'Perder Grasa', 'Fuerza Pura', 'Resistencia'].map(opt => (
                        <TouchableOpacity key={opt} style={[styles.optBtn, objetivoPlan === opt && styles.optBtnSelected]} onPress={() => setObjetivoPlan(opt)}>
                            <Text style={[styles.optText, objetivoPlan === opt && styles.optTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Nivel */}
                <Text style={styles.labelPlan}>Tu nivel actual</Text>
                <View style={styles.optionsGrid}>
                    {['Principiante', 'Intermedio', 'Avanzado', 'Atleta'].map(opt => (
                        <TouchableOpacity key={opt} style={[styles.optBtn, nivelPlan === opt && styles.optBtnSelected]} onPress={() => setNivelPlan(opt)}>
                            <Text style={[styles.optText, nivelPlan === opt && styles.optTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Días */}
                <Text style={styles.labelPlan}>Días de entrenamiento por semana</Text>
                <View style={styles.optionsGrid}>
                    {['2', '3', '4', '5', '6'].map(opt => (
                        <TouchableOpacity key={opt} style={[styles.optBtn, diasPlan === opt && styles.optBtnSelected]} onPress={() => setDiasPlan(opt)}>
                            <Text style={[styles.optText, diasPlan === opt && styles.optTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Dieta */}
                <Text style={styles.labelPlan}>Preferencia Alimenticia</Text>
                <View style={styles.optionsGrid}>
                    {['Equilibrada', 'Alta Proteína', 'Vegana', 'Keto'].map(opt => (
                        <TouchableOpacity key={opt} style={[styles.optBtn, prefAlimenticia === opt && styles.optBtnSelected]} onPress={() => setPrefAlimenticia(opt)}>
                            <Text style={[styles.optText, prefAlimenticia === opt && styles.optTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Metodología */}
                <Text style={styles.labelPlan}>Metodología de Entrenamiento</Text>
                <View style={styles.optionsGrid}>
                    {['IA Decide por Mí', 'Push Pull Legs', 'Full Body', 'Arnold Split', 'Heavy Duty / Mentzer', 'Upper Lower', 'Bro Split', '5x5 StrongLifts', 'Calistenia', 'HIIT', 'Functional Training', 'Powerlifting', 'Hybrid Training'].map(opt => (
                        <TouchableOpacity key={opt} style={[styles.optBtn, metodologia === opt && styles.optBtnSelected]} onPress={() => setMetodologia(opt)}>
                            <Text style={[styles.optText, metodologia === opt && styles.optTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Equipamiento */}
                <Text style={styles.labelPlan}>Lugar y Equipamiento</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    {[{ label: '🏋️ Gimnasio', value: 'Gimnasio Completo' }, { label: '🏠 En Casa', value: 'Solo Peso Corporal' }].map(({ label, value }) => (
                        <TouchableOpacity key={value} style={[styles.optBtn, { flex: 1, paddingVertical: 12 }, equipamiento === value && styles.optBtnSelected]} onPress={() => setEquipamiento(value)}>
                            <Text style={[styles.optText, { fontSize: 13 }, equipamiento === value && styles.optTextSelected]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.optionsGrid}>
                    {['Sin Restricción', 'Mancuernas en Casa', 'Bandas Elásticas', 'Barras / Dominadas', 'Exterior / Parque'].map(opt => (
                        <TouchableOpacity key={opt} style={[styles.optBtn, equipamiento === opt && styles.optBtnSelected]} onPress={() => setEquipamiento(opt)}>
                            <Text style={[styles.optText, equipamiento === opt && styles.optTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Prioridad */}
                <Text style={styles.labelPlan}>Enfoque / Prioridad Muscular</Text>
                <View style={styles.optionsGrid}>
                    {['Equilibrado', 'Torso Potente', 'Piernas Estéticas', 'Espalda/V', 'Brazos Titanio'].map(opt => (
                        <TouchableOpacity key={opt} style={[styles.optBtn, prioridad === opt && styles.optBtnSelected]} onPress={() => setPrioridad(opt)}>
                            <Text style={[styles.optText, prioridad === opt && styles.optTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Duración */}
                <Text style={styles.labelPlan}>Duración de Sesión</Text>
                <View style={styles.optionsGrid}>
                    {['30-45 min', '45-60 min', '60-90 min', '2 horas+'].map(opt => (
                        <TouchableOpacity key={opt} style={[styles.optBtn, duracion === opt && styles.optBtnSelected]} onPress={() => setDuracion(opt)}>
                            <Text style={[styles.optText, duracion === opt && styles.optTextSelected]}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ULTIMATE EXCLUSIVE */}
                {isUltimate && (
                    <>
                        <View style={styles.ultimateDivider}>
                            <LinearGradient colors={['transparent', 'rgba(255,215,0,0.4)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ultimateLine} />
                            <Text style={styles.ultimateLabel}>⚡ ULTIMATE EXCLUSIVO</Text>
                            <LinearGradient colors={['transparent', 'rgba(255,215,0,0.4)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ultimateLine} />
                        </View>

                        <Text style={styles.labelPlan}>Periodización</Text>
                        <View style={styles.optionsGrid}>
                            {['Lineal (Clásica)', 'Ondulada Diaria (DUP)', 'Ondulada Semanal', 'Por Bloques (Conjugado)', 'Acumulación → Intensificación'].map(opt => (
                                <TouchableOpacity key={opt} style={[styles.optBtn, periodi === opt && styles.optBtnSelected]} onPress={() => setPeriodi(opt)}>
                                    <Text style={[styles.optText, periodi === opt && styles.optTextSelected]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.labelPlan}>Técnicas Avanzadas <Text style={{ color: '#555', fontSize: 11 }}>(múltiple)</Text></Text>
                        <View style={styles.optionsGrid}>
                            {['Drop Sets', 'Rest-Pause', 'Superseries', 'Series Gigantes', 'Preagotamiento', 'Cluster Sets', 'Myo-Reps', 'Pausa Isométrica'].map(opt => (
                                <TouchableOpacity key={opt} style={[styles.optBtn, tecnicas.includes(opt) && styles.optBtnSelected]} onPress={() => setTecnicas(prev => prev.includes(opt) ? prev.filter(t => t !== opt) : [...prev, opt])}>
                                    <Text style={[styles.optText, tecnicas.includes(opt) && styles.optTextSelected]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.labelPlan}>Duración del Mesociclo</Text>
                        <View style={styles.optionsGrid}>
                            {['4', '6', '8', '12'].map(opt => (
                                <TouchableOpacity key={opt} style={[styles.optBtn, semanasMeso === opt && styles.optBtnSelected]} onPress={() => setSemanasMeso(opt)}>
                                    <Text style={[styles.optText, semanasMeso === opt && styles.optTextSelected]}>{opt} semanas</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.labelPlan}>Horas de Sueño / Noche</Text>
                        <View style={styles.optionsGrid}>
                            {['5-6h', '7-8h', '8-9h', '+9h'].map(opt => (
                                <TouchableOpacity key={opt} style={[styles.optBtn, horasSueno === opt && styles.optBtnSelected]} onPress={() => setHorasSueno(opt)}>
                                    <Text style={[styles.optText, horasSueno === opt && styles.optTextSelected]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.labelPlan}>Nivel de Estrés Actual</Text>
                        <View style={styles.optionsGrid}>
                            {['Bajo', 'Moderado', 'Alto', 'Muy Alto'].map(opt => (
                                <TouchableOpacity key={opt} style={[styles.optBtn, nivelEstres === opt && styles.optBtnSelected]} onPress={() => setNivelEstres(opt)}>
                                    <Text style={[styles.optText, nivelEstres === opt && styles.optTextSelected]}>{opt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.labelPlan}>Lesiones o Restricciones <Text style={{ color: '#555', fontSize: 11 }}>(opcional)</Text></Text>
                        <TextInput
                            style={[styles.input, { marginBottom: 8 }]}
                            placeholder="Ej: rodilla derecha, lumbar..."
                            placeholderTextColor="#444"
                            value={lesiones}
                            onChangeText={setLesiones}
                        />
                    </>
                )}

                {/* Generate button */}
                <TouchableOpacity style={styles.generateFinalBtn} onPress={handleGenerarPlanVisual}>
                    <LinearGradient colors={['#63ff15', '#4ad912']} style={styles.gradientBtnPlan} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                        <Ionicons name="sparkles" size={20} color="black" style={{ marginRight: 8 }} />
                        <Text style={styles.btnTextBlack}>CREAR PRESENTACIÓN ÉLITE</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={descargarRutinaPDF} style={{ marginTop: 15, alignSelf: 'center' }}>
                    <Text style={{ color: '#666', fontSize: 13, textDecorationLine: 'underline' }}>O descargar como PDF clásico</Text>
                </TouchableOpacity>

                <View style={{ height: 60 }} />
            </ScrollView>

            {/* Onboarding Modal */}
            <Modal animationType="slide" transparent visible={modalOnboarding} onRequestClose={() => setModalOnboarding(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={styles.modalTitle}>Cuéntame sobre ti</Text>
                                <TouchableOpacity onPress={() => setModalOnboarding(false)}>
                                    <Ionicons name="close" size={28} color="white" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
                                <Text style={{ color: '#888', fontSize: 13, marginBottom: 20, lineHeight: 20 }}>
                                    Necesito conocerte un poco mejor para personalizar tu plan al máximo. Solo tarda 10 segundos.
                                </Text>
                                <Text style={styles.labelPlan}>Tu peso (kg)</Text>
                                <TextInput style={styles.input} value={obPeso} onChangeText={setObPeso} placeholder="Ej: 75" placeholderTextColor="#444" keyboardType="numeric" />
                                <Text style={styles.labelPlan}>Tu altura (cm)</Text>
                                <TextInput style={styles.input} value={obAltura} onChangeText={setObAltura} placeholder="Ej: 178" placeholderTextColor="#444" keyboardType="numeric" />
                                <Text style={styles.labelPlan}>Tu edad</Text>
                                <TextInput style={styles.input} value={obEdad} onChangeText={setObEdad} placeholder="Ej: 25" placeholderTextColor="#444" keyboardType="numeric" />
                                <Text style={styles.labelPlan}>Sexo</Text>
                                <View style={styles.optionsGrid}>
                                    {['Hombre', 'Mujer', 'Otro'].map(g => (
                                        <TouchableOpacity key={g} style={[styles.optBtn, obGenero === g && styles.optBtnSelected]} onPress={() => setObGenero(g)}>
                                            <Text style={[styles.optText, obGenero === g && styles.optTextSelected]}>{g}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity onPress={handleSaveOnboarding} style={{ marginTop: 24, borderRadius: 16, overflow: 'hidden' }}>
                                    <LinearGradient colors={['#63ff15', '#4ad912']} style={{ padding: 18, alignItems: 'center' }}>
                                        <Text style={{ color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 }}>CONTINUAR AL PLAN</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
                onCancel={alert.onCancel}
                confirmText={alert.confirmText}
                cancelText={alert.cancelText}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050508',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#050508',
        overflow: 'hidden',
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    titleHighlight: {
        color: '#63ff15',
    },
    headerActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    planBadge: {
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    planBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#63ff15',
        marginRight: 6,
        shadowColor: '#63ff15',
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 2,
    },
    statusText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },
    labelPlan: {
        color: '#63ff15',
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 20,
        marginBottom: 12,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optBtn: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        minWidth: '45%',
        alignItems: 'center',
    },
    optBtnSelected: {
        backgroundColor: 'rgba(99, 255, 21, 0.15)',
        borderColor: '#63ff15',
    },
    optText: {
        color: '#888',
        fontWeight: '600',
        fontSize: 14,
    },
    optTextSelected: {
        color: '#63ff15',
    },
    input: {
        backgroundColor: '#111',
        borderWidth: 1.5,
        borderColor: '#2a2a2a',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 13,
        color: '#fff',
        fontSize: 14,
        marginBottom: 4,
    },
    ultimateDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginVertical: 20,
    },
    ultimateLine: {
        flex: 1,
        height: 1,
    },
    ultimateLabel: {
        color: '#FFD700',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    generateFinalBtn: {
        marginTop: 35,
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    gradientBtnPlan: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
    },
    btnTextBlack: {
        color: 'black',
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0a0a0a',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        borderTopWidth: 2,
        borderTopColor: '#63ff15',
        width: '100%',
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
    },
});
