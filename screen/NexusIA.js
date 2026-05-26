import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, TextInput, Dimensions, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Config from '../constants/Config';
import NexusAlert from '../components/NexusAlert';
import { useTheme } from '../context/ThemeContext';

const BACKEND_URL = Config.BACKEND_URL;
const { width: SW, height: SH } = Dimensions.get('window');
const PLAN_STEPS = [
    'Analizando tu perfil atletico...',
    'Disenando periodizacion inteligente...',
    'Calculando volumen y cargas...',
    'Seleccionando ejercicios optimos...',
    'Ajustando macros y nutricion...',
    'Preparando tu plan maestro...',
];
const DIAS_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const LOAD_PARTICLES = Array.from({ length: 18 }, (_, i) => ({
    id: i, x: Math.random() * SW, y: Math.random() * SH,
    size: 2 + Math.random() * 3, duration: 3000 + Math.random() * 4000,
    delay: Math.random() * 2000, opacity: 0.2 + Math.random() * 0.5,
}));

const LoadParticle = ({ config, color }) => {
    const ty = useRef(new Animated.Value(0)).current;
    const op = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.delay(config.delay),
            Animated.parallel([
                Animated.timing(op, { toValue: config.opacity, duration: 800, useNativeDriver: true }),
                Animated.timing(ty, { toValue: -30, duration: config.duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            ]),
            Animated.parallel([
                Animated.timing(op, { toValue: 0, duration: 800, useNativeDriver: true }),
                Animated.timing(ty, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
        ])).start();
    }, []);
    return <Animated.View style={{ position: 'absolute', left: config.x, top: config.y, width: config.size, height: config.size, borderRadius: config.size / 2, backgroundColor: color, opacity: op, transform: [{ translateY: ty }] }} />;
};

const LoadGlowRing = ({ size, delay, duration, baseOpacity, color }) => {
    const scale = useRef(new Animated.Value(0.6)).current;
    const op = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
                Animated.timing(scale, { toValue: 1, duration, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
                Animated.sequence([
                    Animated.timing(op, { toValue: baseOpacity, duration: duration * 0.3, useNativeDriver: true }),
                    Animated.timing(op, { toValue: 0, duration: duration * 0.7, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
                ]),
            ]),
            Animated.timing(scale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ])).start();
    }, []);
    return <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: color, opacity: op, transform: [{ scale }] }} />;
};

const PlanGeneratingScreen = ({ isUltimate }) => {
    const color = isUltimate ? '#FFD700' : '#63ff15';
    const color2 = isUltimate ? '#FFA500' : '#00D1FF';
    const rgb = isUltimate ? '255,215,0' : '99,255,21';
    const barW = useRef(new Animated.Value(0)).current;
    const barGlow = useRef(new Animated.Value(0)).current;
    const stepFade = useRef(new Animated.Value(1)).current;
    const pulseLogo = useRef(new Animated.Value(1)).current;
    const glowOp = useRef(new Animated.Value(0)).current;
    const [stepIdx, setStepIdx] = useState(0);
    const [count, setCount] = useState(0);

    useEffect(() => {
        Animated.timing(barW, { toValue: 1, duration: PLAN_STEPS.length * 4200, useNativeDriver: false, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94) }).start();
        Animated.loop(Animated.sequence([
            Animated.timing(barGlow, { toValue: 1, duration: 600, useNativeDriver: false }),
            Animated.timing(barGlow, { toValue: 0.4, duration: 600, useNativeDriver: false }),
        ])).start();
        Animated.loop(Animated.sequence([
            Animated.timing(pulseLogo, { toValue: 1.06, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            Animated.timing(pulseLogo, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])).start();
        Animated.loop(Animated.sequence([
            Animated.timing(glowOp, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(glowOp, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
        ])).start();
        const stepInt = setInterval(() => {
            Animated.sequence([
                Animated.timing(stepFade, { toValue: 0, duration: 280, useNativeDriver: true }),
                Animated.timing(stepFade, { toValue: 1, duration: 280, useNativeDriver: true }),
            ]).start();
            setStepIdx(i => (i + 1) % PLAN_STEPS.length);
        }, 3500);
        const countInt = setInterval(() => setCount(c => c + Math.floor(Math.random() * 47 + 8)), 180);
        return () => { clearInterval(stepInt); clearInterval(countInt); };
    }, []);

    const barWidth = barW.interpolate({ inputRange: [0, 0.15, 0.5, 0.85, 1], outputRange: ['0%', '12%', '55%', '85%', '100%'] });
    const barShimmerOp = barGlow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

    return (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#050508', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {LOAD_PARTICLES.map(p => <LoadParticle key={p.id} config={p} color={color} />)}
            <View style={{ position: 'absolute', top: 48, left: 24, width: 40, height: 40, borderTopWidth: 2, borderLeftWidth: 2, borderColor: `rgba(${rgb},0.3)` }} />
            <View style={{ position: 'absolute', top: 48, right: 24, width: 40, height: 40, borderTopWidth: 2, borderRightWidth: 2, borderColor: `rgba(${rgb},0.3)` }} />
            <View style={{ position: 'absolute', bottom: 48, left: 24, width: 40, height: 40, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: `rgba(${rgb},0.3)` }} />
            <View style={{ position: 'absolute', bottom: 48, right: 24, width: 40, height: 40, borderBottomWidth: 2, borderRightWidth: 2, borderColor: `rgba(${rgb},0.3)` }} />

            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
                <LoadGlowRing size={320} delay={0}    duration={2200} baseOpacity={0.25} color={color} />
                <LoadGlowRing size={260} delay={700}  duration={2200} baseOpacity={0.35} color={color} />
                <LoadGlowRing size={200} delay={1400} duration={2200} baseOpacity={0.45} color={color} />
                <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: color, opacity: 0.08, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 100 }} />
                <Animated.View style={{ transform: [{ scale: pulseLogo }] }}>
                    <LinearGradient colors={[color, color2, color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ width: 144, height: 144, borderRadius: 38, padding: 2, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 30, elevation: 20 }}>
                        <LinearGradient colors={['#111111', '#0A0A0A']} style={{ flex: 1, borderRadius: 36, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <Text style={{ fontSize: 68, fontWeight: '900', color, letterSpacing: 2, textShadowColor: color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 24 }}>N</Text>
                            <View style={{ position: 'absolute', bottom: 22, width: '60%', height: 1, backgroundColor: `rgba(${rgb},0.25)` }} />
                            <View style={{ position: 'absolute', right: 22, height: '60%', width: 1, backgroundColor: `rgba(${rgb},0.25)` }} />
                        </LinearGradient>
                    </LinearGradient>
                </Animated.View>
            </View>

            <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 10, textShadowColor: `rgba(${rgb},0.4)`, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16, marginBottom: 6 }}>NEXUS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <View style={{ width: 28, height: 1, backgroundColor: color, opacity: 0.6 }} />
                <Text style={{ fontSize: 11, fontWeight: '800', color, letterSpacing: 5 }}>AI ENGINE</Text>
                <View style={{ width: 28, height: 1, backgroundColor: color, opacity: 0.6 }} />
            </View>
            <Animated.Text style={{ fontSize: 11, color: '#71717A', fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase', opacity: stepFade, paddingHorizontal: 40, textAlign: 'center', marginBottom: 6 }}>
                {PLAN_STEPS[stepIdx]}
            </Animated.Text>
            <Text style={{ fontSize: 10, color: `rgba(${rgb},0.5)`, letterSpacing: 2 }}>{count.toLocaleString()} VARIABLES</Text>

            <View style={{ position: 'absolute', bottom: 100, width: '70%', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
                    <Text style={{ fontSize: 9, color: '#52525B', fontWeight: '700', letterSpacing: 2 }}>{isUltimate ? 'GENERANDO PLAN ULTIMATE' : 'GENERANDO PLAN ELITE'}</Text>
                </View>
                <View style={{ width: '100%', height: 4, backgroundColor: `rgba(${rgb},0.08)`, borderRadius: 4, overflow: 'hidden', borderWidth: 0.5, borderColor: `rgba(${rgb},0.12)` }}>
                    <Animated.View style={{ height: '100%', borderRadius: 4, overflow: 'hidden', width: barWidth, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 }}>
                        <LinearGradient colors={[color, color2, color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2, opacity: barShimmerOp }} />
                        <View style={{ position: 'absolute', right: -2, top: '50%', marginTop: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6 }} />
                    </Animated.View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {[0, 0.33, 0.66].map((t, i) => (
                        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowRadius: 4, elevation: 4, backgroundColor: barW.interpolate({ inputRange: [t, t + 0.01], outputRange: [`rgba(${rgb},0.2)`, color], extrapolate: 'clamp' }) }} />
                    ))}
                </View>
            </View>
        </View>
    );
};


const Row = ({ label, options, value, onChange, color }) => {
    const activeColor = color || '#63ff15';
    return (
        <View style={styles.rowBlock}>
            <Text style={styles.rowLabel}>{label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {options.map(opt => {
                    const active = value === opt;
                    return (
                        <TouchableOpacity key={opt} onPress={() => onChange(opt)}
                            style={[styles.chip, active && { backgroundColor: activeColor, borderColor: activeColor }]}>
                            <Text style={[styles.chipText, active && { color: '#0A0A0A', fontWeight: '700' }]}>{opt}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

export default function NexusIA() {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const [generandoPlan, setGenerandoPlan] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [diasDisponibles, setDiasDisponibles] = useState([0, 2, 4]);
    const [objetivoPlan, setObjetivoPlan] = useState('Ganar Musculo');
    const [nivelPlan, setNivelPlan] = useState('Intermedio');
    const [prefAlimenticia, setPrefAlimenticia] = useState('Equilibrada');
    const [metodologia, setMetodologia] = useState('Arnold Split');
    const [prioridad, setPrioridad] = useState('Equilibrado');
    const [duracion, setDuracion] = useState('90 min');
    const [equipamiento, setEquipamiento] = useState('Sin Restriccion');
    const [periodi, setPeriodi] = useState('Lineal (Clasica)');
    const [tecnicas, setTecnicas] = useState([]);
    const [lesiones, setLesiones] = useState('');
    const [horasSueno, setHorasSueno] = useState('7-8h');
    const [nivelEstres, setNivelEstres] = useState('Moderado');
    const semanasMeso = '4';
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

    const showAlert = (title, message, type = 'info', onConfirm = null) => {
        setAlert({ visible: true, title, message, type, onConfirm: () => { if (onConfirm) onConfirm(); setAlert(p => ({ ...p, visible: false })); } });
    };

    useEffect(() => {
        AsyncStorage.getItem('user').then(u => { if (u) setUser(JSON.parse(u)); });
    }, []);

    const toggleDia = (offset) =>
        setDiasDisponibles(prev => prev.includes(offset) ? prev.filter(d => d !== offset) : [...prev, offset]);

    const toggleTecnica = (t) =>
        setTecnicas(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

    const handleGenerarPlanVisual = async () => {
        if (!user || user.plan === 'Gratis') {
            showAlert('Mejora tu plan', 'La generacion de planes Elite es exclusiva para usuarios Pro y Ultimate.', 'info', () => navigation.navigate('PlanesPago'));
            return;
        }
        if (diasDisponibles.length === 0) {
            showAlert('Selecciona dias', 'Elige al menos un dia disponible para entrenar.', 'warning');
            return;
        }
        const token = await AsyncStorage.getItem('token');
        setCargando(true);
        setGenerandoPlan(true);
        const sortedDias = [...diasDisponibles].sort((a, b) => a - b);
        const esUltimate = user.plan === 'Ultimate';
        const details = 'OBJETIVO: ' + objetivoPlan + '. NIVEL: ' + nivelPlan + '. D\u00CDAS/SEMANA: ' + sortedDias.length + '. DIETA: ' + prefAlimenticia + '. METODOLOG\u00CDA: ' + metodologia + '. EQUIPAMIENTO: ' + equipamiento + '. PRIORIDAD: ' + prioridad + '. DURACI\u00D3N: ' + duracion + '.';
        const body = esUltimate
            ? { details, lesiones, horasSueno, nivelEstres, semanas: parseInt(semanasMeso), periodi, tecnicas }
            : { details };
        try {
            const response = await fetch(BACKEND_URL + '/generate-plan-interactive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Error del servidor (' + response.status + ')');
            }
            const planData = await response.json();
            setCargando(false);
            setGenerandoPlan(false);
            navigation.navigate('ElitePlanScreen', { plan: planData, diasDisponibles: sortedDias });
        } catch (error) {
            showAlert('Error', error.message || 'No se pudo generar el plan.', 'error');
            setCargando(false);
            setGenerandoPlan(false);
        }
    };

    const descargarRutinaPDF = async () => {
        if (!user || user.plan === 'Gratis') {
            showAlert('Mejora tu plan', 'La generacion de PDF es exclusiva para usuarios Pro y Ultimate.', 'info', () => navigation.navigate('PlanesPago'));
            return;
        }
        if (diasDisponibles.length === 0) {
            showAlert('Selecciona dias', 'Elige al menos un dia disponible.', 'warning');
            return;
        }
        const token = await AsyncStorage.getItem('token');
        setCargando(true);
        try {
            const response = await fetch(BACKEND_URL + '/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({
                    details: 'OBJETIVO: ' + objetivoPlan + '. NIVEL: ' + nivelPlan + '. D\u00CDAS/SEMANA: ' + diasDisponibles.length + '. DIETA: ' + prefAlimenticia + '. METODOLOG\u00CDA: ' + metodologia + '. EQUIPAMIENTO: ' + equipamiento + '. PRIORIDAD: ' + prioridad + '. DURACI\u00D3N: ' + duracion + '. Usuario: ' + user.nombre + ' ' + user.apellido + '.',
                    format: 'base64',
                }),
            });
            if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Error al generar PDF'); }
            const data = await response.json();
            if (!data.base64) throw new Error('El servidor no devolvio el PDF correctamente');
            const fileUri = FileSystem.documentDirectory + 'Plan_Nexus_AI.pdf';
            await FileSystem.writeAsStringAsync(fileUri, data.base64, { encoding: 'base64' });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) { await Sharing.shareAsync(fileUri); }
            else { showAlert('Exito', 'PDF guardado en: ' + fileUri, 'success'); }
        } catch (error) {
            showAlert('Error', error.message || 'No se pudo generar el PDF', 'error');
        } finally { setCargando(false); }
    };

    const isUltimate = user?.plan === 'Ultimate';
    const isPro = user?.plan === 'Pro';
    const planColor = isUltimate ? '#FFD700' : '#63ff15';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            <NexusAlert
                visible={alert.visible} title={alert.title} message={alert.message}
                type={alert.type} onConfirm={alert.onConfirm}
                onCancel={() => setAlert(p => ({ ...p, visible: false }))}
            />

            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <LinearGradient colors={['#63ff15', '#00D1FF']} style={styles.headerDot} />
                    <Text style={[styles.headerTitle, { color: theme.text }]}>NEXUS IA</Text>
                </View>
                {user?.plan && (
                    <View style={[styles.planBadge, { borderColor: planColor }]}>
                        <Text style={[styles.planBadgeText, { color: planColor }]}>
                            {isUltimate ? 'ULTIMATE' : isPro ? 'PRO' : 'GRATIS'}
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                <View style={[styles.section, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>DIAS DISPONIBLES</Text>
                    <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>Selecciona los dias que puedes entrenar</Text>
                    <View style={styles.diasRow}>
                        {DIAS_LABELS.map((label, idx) => {
                            const active = diasDisponibles.includes(idx);
                            const activeColor = idx >= 5 ? '#FFA500' : '#63ff15';
                            return (
                                <TouchableOpacity key={idx} onPress={() => toggleDia(idx)}
                                    style={[styles.diaBtn, active && { backgroundColor: activeColor, borderColor: activeColor }]}>
                                    <Text style={[styles.diaBtnText, active && { color: '#0A0A0A', fontWeight: '800' }]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <Text style={[styles.diasCount, { color: planColor }]}>
                        {diasDisponibles.length} dia{diasDisponibles.length !== 1 ? 's' : ''} seleccionado{diasDisponibles.length !== 1 ? 's' : ''}
                    </Text>
                </View>

                <View style={[styles.section, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>CONFIGURACION</Text>
                    <Row label="Objetivo" options={['Ganar Musculo', 'Perder Grasa', 'Fuerza Maxima', 'Resistencia', 'Definicion', 'Bienestar']} value={objetivoPlan} onChange={setObjetivoPlan} />
                    <Row label="Nivel" options={['Principiante', 'Intermedio', 'Avanzado', 'Elite']} value={nivelPlan} onChange={setNivelPlan} />
                    <Row label="Alimentacion" options={['Equilibrada', 'Vegana', 'Vegetariana', 'Sin Gluten', 'Keto', 'Carnivora']} value={prefAlimenticia} onChange={setPrefAlimenticia} />
                    <Row label="Metodologia" options={['Arnold Split', 'PPL', 'Full Body', 'Upper/Lower', 'HIIT', 'Functional']} value={metodologia} onChange={setMetodologia} />
                    <Row label="Equipamiento" options={['Sin Restriccion', 'Gimnasio Completo', 'Casa/Mancuernas', 'Peso Corporal', 'Bandas Elasticas']} value={equipamiento} onChange={setEquipamiento} />
                    <Row label="Prioridad Muscular" options={['Equilibrado', 'Pecho/Espalda', 'Piernas', 'Hombros/Brazos', 'Core', 'Gluteos']} value={prioridad} onChange={setPrioridad} />
                    <Row label="Duracion sesion" options={['45 min', '60 min', '75 min', '90 min', '120 min']} value={duracion} onChange={setDuracion} />
                </View>

                {isUltimate && (
                    <View style={[styles.section, styles.ultimateSection]}>
                        <Text style={[styles.sectionTitle, { color: '#FFD700' }]}>ULTIMATE EXCLUSIVO</Text>
                        <Text style={[styles.sectionSub, { color: '#aaa' }]}>Personalizacion avanzada de elite</Text>
                        <Row label="Periodizacion" options={['Lineal (Clasica)', 'Ondulada Diaria', 'Ondulada Semanal', 'Por Bloques']} value={periodi} onChange={setPeriodi} color="#FFD700" />
                        <Row label="Horas de sueno" options={['<6h', '6-7h', '7-8h', '>8h']} value={horasSueno} onChange={setHorasSueno} color="#FFD700" />
                        <Row label="Nivel de estres" options={['Bajo', 'Moderado', 'Alto', 'Muy Alto']} value={nivelEstres} onChange={setNivelEstres} color="#FFD700" />
                        <View style={styles.rowBlock}>
                            <Text style={styles.rowLabel}>Tecnicas avanzadas</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                {['Drop Sets', 'Super Sets', 'Rest-Pause', 'Myo-Reps', 'Cluster Sets', 'Tempo'].map(t => {
                                    const active = tecnicas.includes(t);
                                    return (
                                        <TouchableOpacity key={t} onPress={() => toggleTecnica(t)}
                                            style={[styles.chip, active && { backgroundColor: '#FFD700', borderColor: '#FFD700' }]}>
                                            <Text style={[styles.chipText, active && { color: '#0A0A0A', fontWeight: '700' }]}>{t}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                        <View style={styles.rowBlock}>
                            <Text style={styles.rowLabel}>Lesiones / limitaciones</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Ej: rodilla derecha, espalda baja..."
                                placeholderTextColor="#555"
                                value={lesiones}
                                onChangeText={setLesiones}
                                multiline
                            />
                        </View>
                    </View>
                )}

                <View style={styles.btnContainer}>
                    <TouchableOpacity onPress={handleGenerarPlanVisual} disabled={cargando} activeOpacity={0.85}>
                        <LinearGradient
                            colors={isUltimate ? ['#FFD700', '#FFA500'] : ['#63ff15', '#00D1FF']}
                            style={styles.btnPrimary}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            {cargando
                                ? <ActivityIndicator color="#0A0A0A" />
                                : <><Ionicons name="flash" size={18} color="#0A0A0A" /><Text style={styles.btnPrimaryText}>CREAR PRESENTACION ELITE</Text></>
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={descargarRutinaPDF} disabled={cargando} style={styles.btnSecondary}>
                        <Ionicons name="document-text-outline" size={16} color="#888" />
                        <Text style={styles.btnSecondaryText}>O descargar como PDF clasico</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {generandoPlan && <PlanGeneratingScreen isUltimate={isUltimate} />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(99,255,21,0.1)' },
    headerDot: { width: 8, height: 8, borderRadius: 4 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
    planBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    planBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
    section: { marginHorizontal: 16, marginTop: 20, backgroundColor: '#111', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    ultimateSection: { borderColor: 'rgba(255,215,0,0.2)' },
    sectionTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
    sectionSub: { color: '#666', fontSize: 12, marginBottom: 12 },
    diasRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
    diaBtn: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
    diaBtnText: { color: '#888', fontSize: 13, fontWeight: '700' },
    diasCount: { marginTop: 10, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    rowBlock: { marginTop: 14 },
    rowLabel: { color: '#aaa', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
    chipText: { color: '#888', fontSize: 12, fontWeight: '600' },
    textInput: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 12, color: '#fff', fontSize: 14 },
    btnContainer: { marginHorizontal: 16, marginTop: 24, gap: 12 },
    btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
    btnPrimaryText: { color: '#0A0A0A', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
    btnSecondaryText: { color: '#888', fontSize: 13 },
});
