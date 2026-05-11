import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NexusAlert from '../components/NexusAlert';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;
const { width } = Dimensions.get('window');

// ─── Muscle change color ──────────────────────────────────────────────────────
function changeColor(pct) {
    if (pct >= 25) return '#63ff15';
    if (pct >= 18) return '#FFD700';
    if (pct >= 11) return '#ff8c00';
    if (pct >= 5)  return '#ff4444';
    return '#333';
}

// ─── Animated score ring ──────────────────────────────────────────────────────
function ScoreRing({ score, nivel }) {
    const anim = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: score, duration: 1500, useNativeDriver: false }).start();
        Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])).start();
    }, [score]);

    const ringColor = score >= 80 ? '#63ff15' : score >= 60 ? '#FFD700' : score >= 40 ? '#ff8c00' : '#ff4444';

    return (
        <Animated.View style={[sStyles.ringWrap, { transform: [{ scale: pulse }] }]}>
            <LinearGradient colors={[ringColor + '33', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={999} />
            <View style={[sStyles.ring, { borderColor: ringColor }]}>
                <LinearGradient colors={[ringColor + '20', '#0a0a0a']} style={StyleSheet.absoluteFill} borderRadius={999} />
                <Animated.Text style={[sStyles.scoreNum, { color: ringColor }]}>
                    {anim.interpolate({ inputRange: [0, 100], outputRange: ['0', '100'] }).toString()
                        .replace(/.*/, () => score)}
                </Animated.Text>
                <Text style={sStyles.scoreLabel}>{nivel}</Text>
            </View>
        </Animated.View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DigitalTwin() {
    const navigation = useNavigation();
    const [loading, setLoading]       = useState(false);
    const [data, setData]             = useState(null);
    const [horizon, setHorizon]       = useState('3');
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const showAlert = (title, message, type = 'info', onConfirm = null) => setAlert({
        visible: true, title, message, type,
        onConfirm: () => { if (onConfirm) onConfirm(); setAlert(p => ({ ...p, visible: false })); },
    });

    useEffect(() => { loadAndGenerate(); }, []);

    const loadAndGenerate = async () => {
        setLoading(true);
        try {
            const token   = await AsyncStorage.getItem('token');
            const history = await AsyncStorage.getItem('body_scan_history');
            const scans   = history ? JSON.parse(history) : [];

            const latestScan = scans.length > 0 ? scans[0] : null;

            const res = await fetch(`${BACKEND_URL}/user/digital-twin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ scanData: latestScan, scanHistory: scans }),
            });
            const json = await res.json();
            if (!res.ok) {
                showAlert('Error', json.error || 'No se pudo generar el Digital Twin', 'error');
                return;
            }
            setData(json);
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        } catch (_) {
            showAlert('Error', 'Error de conexión con el servidor', 'error');
        } finally {
            setLoading(false);
        }
    };


    const proj = data ? (horizon === '3' ? data.proyeccion3Meses : data.proyeccion12Meses) : null;
    const changes = proj?.cambiosMasculares || data?.proyeccion3Meses?.cambiosMasculares || {};
    const genetic = data?.geneticPotential;

    const MUSCLE_LABELS = { pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', piernas: 'Piernas', abdomen: 'Core' };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>DIGITAL TWIN</Text>
                    <Text style={styles.headerSub}>Evolución futura de tu físico</Text>
                </View>
                <View style={styles.ultimateBadge}>
                    <Ionicons name="school" size={14} color="#000" />
                    <Text style={styles.ultimateText}>ULTIMATE</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#FFD700" />
                    <Text style={styles.loadingTitle}>Analizando tu genética...</Text>
                    <Text style={styles.loadingSubtitle}>La IA está calculando tu evolución y generando tu imagen futura — puede tardar hasta 30 segundos</Text>
                </View>
            ) : !data ? (
                <View style={styles.loadingBox}>
                    <Ionicons name="alert-circle-outline" size={48} color="#ff4444" />
                    <Text style={[styles.loadingTitle, { color: '#ff4444' }]}>No disponible</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadAndGenerate}>
                        <Text style={styles.retryText}>REINTENTAR</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <Animated.ScrollView style={{ opacity: fadeAnim }} contentContainerStyle={styles.content}>

                    {/* ── Genetic Potential ── */}
                    <View style={styles.card}>
                        <LinearGradient colors={['#1a1200', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={18} />
                        <Text style={styles.cardTitle}>POTENCIAL GENÉTICO</Text>
                        <View style={styles.geneticRow}>
                            <ScoreRing score={genetic?.score || 0} nivel={genetic?.nivel || '—'} />
                            <View style={styles.geneticInfo}>
                                <Text style={styles.somatotipo}>{genetic?.somatotipo}</Text>
                                <Text style={styles.geneticDesc}>{genetic?.descripcion}</Text>
                                <View style={styles.tagRow}>
                                    {(genetic?.ventajas || []).slice(0, 2).map((v, i) => (
                                        <View key={i} style={styles.tagGreen}>
                                            <Text style={styles.tagText}>✓ {v}</Text>
                                        </View>
                                    ))}
                                    {(genetic?.limitantes || []).slice(0, 1).map((l, i) => (
                                        <View key={i} style={styles.tagRed}>
                                            <Text style={[styles.tagText, { color: '#ff6666' }]}>↑ {l}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* ── Physique Projection Card ── */}
                    {proj && (
                        <View style={styles.projCard}>
                            <LinearGradient colors={['#001a0a', '#0a0a0a']} style={StyleSheet.absoluteFill} borderRadius={18} />
                            <View style={styles.projCardHeader}>
                                <MaterialCommunityIcons name="human" size={16} color="#63ff15" />
                                <Text style={styles.projCardTitle}>TU FÍSICO PROYECTADO</Text>
                                <View style={styles.projAiBadge}>
                                    <Ionicons name="analytics" size={10} color="#000" />
                                    <Text style={styles.projAiText}>IA</Text>
                                </View>
                            </View>
                            <Text style={styles.projCardSub}>En {horizon} meses con constancia máxima</Text>

                            <View style={styles.projCenter}>
                                <LinearGradient colors={['#63ff1520', '#63ff1505']} style={styles.projScoreCircle} borderRadius={999}>
                                    <Text style={styles.projScoreNum}>{proj.esteticaScore}</Text>
                                    <Text style={styles.projScoreUnit}>/10</Text>
                                    <Text style={styles.projScoreLabel}>ESTÉTICA</Text>
                                </LinearGradient>
                                <View style={styles.projRightCol}>
                                    <View style={styles.projShapeBadge}>
                                        <Text style={styles.projShapeText}>{proj.forma || '—'}</Text>
                                    </View>
                                    <View style={styles.projMetric}>
                                        <Text style={styles.projMetricVal}>{proj.pesoProyectado} kg</Text>
                                        <Text style={styles.projMetricLbl}>PESO OBJETIVO</Text>
                                    </View>
                                    <View style={styles.projMetric}>
                                        <Text style={[styles.projMetricVal, { color: '#ff8c00' }]}>{proj.grasaProyectada}</Text>
                                        <Text style={styles.projMetricLbl}>GRASA CORPORAL</Text>
                                    </View>
                                    <View style={styles.projMetric}>
                                        <Text style={[styles.projMetricVal, { color: '#A259FF' }]}>+{proj.musculoGanado} kg</Text>
                                        <Text style={styles.projMetricLbl}>MÚSCULO GANADO</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* ── Horizon tabs ── */}
                    <View style={styles.tabRow}>
                        {['3', '12'].map(h => (
                            <TouchableOpacity
                                key={h}
                                style={[styles.tab, horizon === h && styles.tabActive]}
                                onPress={() => setHorizon(h)}
                            >
                                <Text style={[styles.tabText, horizon === h && styles.tabTextActive]}>
                                    {h} MESES
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Projection stats ── */}
                    {proj && (
                        <View style={styles.statsGrid}>
                            <View style={[styles.statCard, { borderColor: '#63ff15' }]}>
                                <Text style={styles.statLabel}>PESO</Text>
                                <Text style={[styles.statValue, { color: '#63ff15' }]}>{proj.pesoProyectado} kg</Text>
                                <Text style={styles.statDelta}>
                                    {data.currentWeight ? `${proj.pesoProyectado > data.currentWeight ? '+' : ''}${(proj.pesoProyectado - data.currentWeight).toFixed(1)} kg` : '—'}
                                </Text>
                            </View>
                            <View style={[styles.statCard, { borderColor: '#ff8c00' }]}>
                                <Text style={styles.statLabel}>GRASA</Text>
                                <Text style={[styles.statValue, { color: '#ff8c00' }]}>{proj.grasaProyectada}</Text>
                                <Text style={styles.statDelta}>objetivo</Text>
                            </View>
                            <View style={[styles.statCard, { borderColor: '#A259FF' }]}>
                                <Text style={styles.statLabel}>MÚSCULO</Text>
                                <Text style={[styles.statValue, { color: '#A259FF' }]}>+{proj.musculoGanado} kg</Text>
                                <Text style={styles.statDelta}>ganancia</Text>
                            </View>
                            <View style={[styles.statCard, { borderColor: '#FFD700' }]}>
                                <Text style={styles.statLabel}>ESTÉTICA</Text>
                                <Text style={[styles.statValue, { color: '#FFD700' }]}>{proj.esteticaScore}/10</Text>
                                <Text style={styles.statDelta}>{proj.forma}</Text>
                            </View>
                        </View>
                    )}

                    {/* ── Muscle changes ── */}
                    {Object.keys(changes).length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>CAMBIOS MUSCULARES PROYECTADOS</Text>
                            {Object.entries(changes).map(([k, pct]) => {
                                const color = changeColor(pct);
                                return (
                                    <View key={k} style={{ marginBottom: 10 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ color: '#bbb', fontSize: 12, fontWeight: '700' }}>{MUSCLE_LABELS[k] || k}</Text>
                                            <Text style={{ color, fontSize: 12, fontWeight: '900' }}>{pct >= 5 ? `+${pct}%` : 'sin cambio'}</Text>
                                        </View>
                                        <View style={{ height: 5, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                                            <View style={{ width: `${Math.min(pct * 2, 100)}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* ── AI Narrative ── */}
                    {proj?.descripcion && (
                        <View style={styles.narrativeCard}>
                            <LinearGradient colors={['#0d1a0d', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={18} />
                            <View style={styles.narrativeHeader}>
                                <MaterialCommunityIcons name="dna" size={20} color="#63ff15" />
                                <Text style={styles.narrativeTitle}>
                                    TU FÍSICO EN {horizon} MESES
                                </Text>
                            </View>
                            <Text style={styles.narrativeText}>{proj.descripcion}</Text>
                        </View>
                    )}

                    {/* ── Personal message ── */}
                    {data.mensajePersonal && (
                        <View style={styles.messageCard}>
                            <LinearGradient colors={['#FFD70015', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={18} />
                            <Ionicons name="flash" size={20} color="#FFD700" />
                            <Text style={styles.messageText}>{data.mensajePersonal}</Text>
                        </View>
                    )}

                    {/* ── Consistency tip ── */}
                    <View style={styles.tipCard}>
                        <Text style={styles.tipLabel}>DÍAS/SEMANA RECOMENDADOS</Text>
                        <View style={styles.daysRow}>
                            {Array.from({ length: 7 }, (_, i) => (
                                <View key={i} style={[
                                    styles.dayDot,
                                    i < (data.diasRecomendados || 4) && styles.dayDotOn,
                                ]}>
                                    <Text style={styles.dayDotText}>{['L','M','X','J','V','S','D'][i]}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={styles.tipNote}>
                            Con {data.diasRecomendados || 4} días/semana de constancia total se logran las proyecciones anteriores
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.regenerateBtn} onPress={loadAndGenerate}>
                        <Ionicons name="refresh" size={16} color="#000" />
                        <Text style={styles.regenerateBtnText}>REGENERAR ANÁLISIS</Text>
                    </TouchableOpacity>

                </Animated.ScrollView>
            )}

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


// ─── Score ring styles ────────────────────────────────────────────────────────
const sStyles = StyleSheet.create({
    ringWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', borderRadius: 55, overflow: 'hidden' },
    ring:     { width: 95, height: 95, borderRadius: 47.5, borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    scoreNum: { fontSize: 28, fontWeight: '900' },
    scoreLabel: { color: '#888', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: '#0A0A0A' },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
    backBtn:     { padding: 4 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    headerSub:   { color: '#555', fontSize: 11, marginTop: 1 },
    ultimateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    ultimateText:  { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    loadingBox:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
    loadingTitle:    { color: '#FFD700', fontSize: 18, fontWeight: '800', textAlign: 'center' },
    loadingSubtitle: { color: '#555', fontSize: 13, textAlign: 'center', lineHeight: 20 },
    retryBtn:        { backgroundColor: '#1a1a1a', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: '#333' },
    retryText:       { color: '#63ff15', fontWeight: '800', letterSpacing: 1 },

    content: { padding: 16, paddingBottom: 40, gap: 16 },

    card:      { backgroundColor: '#111', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#1e1e1e', overflow: 'hidden' },
    cardTitle: { color: '#555', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 },

    geneticRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    geneticInfo: { flex: 1, gap: 6 },
    somatotipo:  { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    geneticDesc: { color: '#aaa', fontSize: 12, lineHeight: 18 },
    tagRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    tagGreen:    { backgroundColor: '#63ff1515', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#63ff1540' },
    tagRed:      { backgroundColor: '#ff444415', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#ff444440' },
    tagText:     { color: '#63ff15', fontSize: 10, fontWeight: '700' },

    tabRow:      { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 4, gap: 4 },
    tab:         { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
    tabActive:   { backgroundColor: '#63ff15' },
    tabText:     { color: '#444', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    tabTextActive: { color: '#000' },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard:  { flex: 1, minWidth: (width - 52) / 2, backgroundColor: '#111', borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'center', gap: 2 },
    statLabel: { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    statValue: { fontSize: 22, fontWeight: '900' },
    statDelta: { color: '#555', fontSize: 11 },

    narrativeCard:   { backgroundColor: '#0d1a0d', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#63ff1530', overflow: 'hidden' },
    narrativeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    narrativeTitle:  { color: '#63ff15', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    narrativeText:   { color: '#ccc', fontSize: 14, lineHeight: 22 },

    messageCard:  { backgroundColor: '#1a1400', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#FFD70030', flexDirection: 'row', alignItems: 'flex-start', gap: 12, overflow: 'hidden' },
    messageText:  { color: '#ddd', fontSize: 14, lineHeight: 22, flex: 1, fontStyle: 'italic' },

    tipCard:   { backgroundColor: '#111', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#1e1e1e', gap: 12 },
    tipLabel:  { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
    daysRow:   { flexDirection: 'row', gap: 8 },
    dayDot:    { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#222' },
    dayDotOn:  { backgroundColor: '#63ff1522', borderColor: '#63ff15' },
    dayDotText: { color: '#555', fontSize: 10, fontWeight: '800' },
    tipNote:   { color: '#555', fontSize: 12, lineHeight: 18 },

    regenerateBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD700', borderRadius: 12, paddingVertical: 14, gap: 8, marginTop: 4 },
    regenerateBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

    projCard:       { backgroundColor: '#0a120a', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#63ff1530', overflow: 'hidden', gap: 8 },
    projCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    projCardTitle:  { color: '#63ff15', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, flex: 1 },
    projAiBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#63ff15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    projAiText:     { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    projCardSub:    { color: '#555', fontSize: 12 },
    projCenter:     { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
    projScoreCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#63ff1560' },
    projScoreNum:   { color: '#63ff15', fontSize: 32, fontWeight: '900', lineHeight: 36 },
    projScoreUnit:  { color: '#63ff1580', fontSize: 13, fontWeight: '700' },
    projScoreLabel: { color: '#555', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
    projRightCol:   { flex: 1, gap: 8 },
    projShapeBadge: { backgroundColor: '#FFD70015', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#FFD70040', alignSelf: 'flex-start' },
    projShapeText:  { color: '#FFD700', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    projMetric:     { gap: 1 },
    projMetricVal:  { color: '#63ff15', fontSize: 15, fontWeight: '900' },
    projMetricLbl:  { color: '#444', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
});
