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

const PlanGeneratingScreen = ({ isUltimate, onCancel }) => {
    const [stepIdx, setStepIdx] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const barAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim2 = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0.4)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;
    const mountAnim = useRef(new Animated.Value(0)).current;

    const color = isUltimate ? '#FFD700' : '#63ff15';

    useEffect(() => {
        // Mount fade-in
        Animated.timing(mountAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

        // Progress bar (linear, not looped)
        Animated.timing(barAnim, {
            toValue: 1, duration: PLAN_STEPS.length * 4000, useNativeDriver: false,
        }).start();

        // Step cycling
        const interval = setInterval(() => {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
            setStepIdx(i => (i + 1) % PLAN_STEPS.length);
        }, 3500);

        // Fast rotating arc
        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 1600, useNativeDriver: true })
        ).start();

        // Slow counter-rotating arc
        Animated.loop(
            Animated.timing(rotateAnim2, { toValue: 1, duration: 4000, useNativeDriver: true })
        ).start();

        // Inner glow breathe
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
                Animated.timing(glowAnim, { toValue: 0.25, duration: 1400, useNativeDriver: false }),
            ])
        ).start();

        // Subtle scale breathe for bg glow
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.05, duration: 2200, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 0.96, duration: 2200, useNativeDriver: true }),
            ])
        ).start();

        return () => clearInterval(interval);
    }, []);

    const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    const rotate1 = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const rotate2 = rotateAnim2.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
    const percent = Math.round((stepIdx / PLAN_STEPS.length) * 100);

    return (
        <Animated.View style={{ flex: 1, backgroundColor: '#050508', alignItems: 'center', justifyContent: 'center', opacity: mountAnim }}>

            {/* Radial background glow */}
            <Animated.View style={{
                position: 'absolute',
                width: 380, height: 380, borderRadius: 190,
                backgroundColor: `${color}07`,
                transform: [{ scale: scaleAnim }],
            }} />

            {/* Top label */}
            <Text style={{ position: 'absolute', top: 58, color: '#1e1e1e', fontSize: 10, fontWeight: '900', letterSpacing: 5 }}>
                NEXUS ATHLETICS
            </Text>

            {/* Corner brackets */}
            <View style={{ position: 'absolute', top: 44, left: 20, width: 22, height: 22, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: `${color}50` }} />
            <View style={{ position: 'absolute', top: 44, right: 20, width: 22, height: 22, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: `${color}50` }} />
            <View style={{ position: 'absolute', bottom: 24, left: 20, width: 22, height: 22, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: `${color}50` }} />
            <View style={{ position: 'absolute', bottom: 24, right: 20, width: 22, height: 22, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: `${color}50` }} />

            {/* Circular spinner */}
            <View style={{ width: 230, height: 230, alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>

                {/* Static track ring */}
                <View style={{
                    position: 'absolute', width: 210, height: 210, borderRadius: 105,
                    borderWidth: 1, borderColor: '#141414',
                }} />

                {/* Fast arc — 3/4 circle */}
                <Animated.View style={{
                    position: 'absolute', width: 210, height: 210, borderRadius: 105,
                    borderWidth: 2.5,
                    borderTopColor: color,
                    borderRightColor: color,
                    borderBottomColor: `${color}30`,
                    borderLeftColor: 'transparent',
                    transform: [{ rotate: rotate1 }],
                    shadowColor: color, shadowOpacity: 0.6, shadowRadius: 8,
                }} />

                {/* Slow counter arc — thin accent */}
                <Animated.View style={{
                    position: 'absolute', width: 188, height: 188, borderRadius: 94,
                    borderWidth: 1,
                    borderTopColor: 'transparent',
                    borderRightColor: `${color}50`,
                    borderBottomColor: `${color}50`,
                    borderLeftColor: 'transparent',
                    transform: [{ rotate: rotate2 }],
                }} />

                {/* Inner circle with percentage */}
                <Animated.View style={{
                    width: 158, height: 158, borderRadius: 79,
                    backgroundColor: '#080810',
                    borderWidth: 1, borderColor: `${color}18`,
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: color,
                    shadowOpacity: glowAnim,
                    shadowRadius: 22,
                }}>
                    <Text style={{
                        color,
                        fontSize: 52,
                        fontWeight: '900',
                        lineHeight: 56,
                        textShadowColor: color,
                        textShadowOffset: { width: 0, height: 0 },
                        textShadowRadius: 10,
                    }}>{percent}</Text>
                    <Text style={{ color: '#333', fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>%</Text>
                </Animated.View>
            </View>

            {/* Title block */}
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 6 }}>
                    {isUltimate ? 'GENERANDO' : 'CREANDO'}
                </Text>
                <Text style={{
                    color,
                    fontSize: 19,
                    fontWeight: '900',
                    letterSpacing: 1.5,
                    textShadowColor: color,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                }}>
                    {isUltimate ? '👑 MESOCICLO ULTIMATE' : '⚡ PLAN ÉLITE PRO'}
                </Text>
            </View>

            {/* Step text */}
            <Animated.Text style={{
                color: '#555',
                fontSize: 13,
                textAlign: 'center',
                opacity: fadeAnim,
                paddingHorizontal: 52,
                lineHeight: 21,
                fontWeight: '500',
                marginBottom: 24,
            }}>
                {PLAN_STEPS[stepIdx]}
            </Animated.Text>

            {/* Step dots */}
            <View style={{ flexDirection: 'row', gap: 5 }}>
                {PLAN_STEPS.map((_, i) => (
                    <View key={i} style={{
                        width: i === stepIdx ? 18 : 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: i === stepIdx ? color : '#1e1e1e',
                    }} />
                ))}
            </View>

            {/* Cancel button */}
            <TouchableOpacity
                onPress={onCancel}
                style={{
                    position: 'absolute', bottom: 40,
                    paddingHorizontal: 32, paddingVertical: 12,
                    borderRadius: 24, borderWidth: 1,
                    borderColor: '#2a2a2a',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                }}
            >
                <Text style={{ color: '#444', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>
                    CANCELAR
                </Text>
            </TouchableOpacity>

            {/* Bottom progress bar */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#111' }}>
                <Animated.View style={{
                    height: 2, backgroundColor: color, width: barWidth,
                    shadowColor: color, shadowOpacity: 1, shadowRadius: 6,
                }} />
            </View>
        </Animated.View>
    );
};

export default function NexusIA() {
    const navigation = useNavigation();

    const [user, setUser] = useState(null);
    const [generandoPlan, setGenerandoPlan] = useState(false);
    const [modalOnboarding, setModalOnboarding] = useState(false);
    const abortControllerRef = useRef(null);

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
    const [semanasMeso] = useState('4');
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
        const controller = new AbortController();
        abortControllerRef.current = controller;
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
                signal: controller.signal,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Error del servidor (${response.status})`);
            }

            const planData = await response.json();
            setGenerandoPlan(false);
            navigation.navigate('ElitePlanScreen', { plan: planData });
        } catch (error) {
            if (error.name === 'AbortError') {
                setGenerandoPlan(false);
                return;
            }
            showAlert("Error", error.message || "No se pudo generar la presentación interactiva.", "error");
            setGenerandoPlan(false);
        } finally {
            abortControllerRef.current = null;
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
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050508' }]}>
                    <PlanGeneratingScreen
                        isUltimate={isUltimate}
                        onCancel={() => abortControllerRef.current?.abort()}
                    />
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
