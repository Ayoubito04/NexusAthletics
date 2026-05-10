import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
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

// ─── Heatmap color by % gain ─────────────────────────────────────────────────
function heatColors(pct) {
    if (pct >= 25) return ['#63ff15', '#2a8000'];
    if (pct >= 18) return ['#FFD700', '#996600'];
    if (pct >= 11) return ['#ff8c00', '#7a3a00'];
    if (pct >= 5)  return ['#ff4444', '#8a0000'];
    return ['#2a2a2a', '#1a1a1a'];
}

// ─── Heatmap body visual ─────────────────────────────────────────────────────
function BodyHeatmap({ changes = {}, view }) {
    const m = changes;

    const Zone = ({ muscle, style, label, showLabel }) => {
        const pct = m[muscle] || 0;
        return (
            <View style={[bStyles.zone, style]}>
                <LinearGradient colors={heatColors(pct)} style={StyleSheet.absoluteFill} borderRadius={style?.borderRadius ?? 10} />
                {showLabel && pct >= 5 && (
                    <Text style={bStyles.zoneLabel}>+{pct}%</Text>
                )}
            </View>
        );
    };

    if (view === 'front') return (
        <View style={bStyles.body}>
            {/* Head */}
            <View style={bStyles.head} />
            {/* Shoulders row */}
            <View style={bStyles.row}>
                <Zone muscle="hombros" style={bStyles.shoulder} showLabel />
                <View style={bStyles.neck} />
                <Zone muscle="hombros" style={bStyles.shoulder} />
            </View>
            {/* Chest + biceps row */}
            <View style={bStyles.row}>
                <Zone muscle="biceps" style={bStyles.arm} showLabel />
                <Zone muscle="pecho" style={bStyles.chest} showLabel />
                <Zone muscle="biceps" style={bStyles.arm} />
            </View>
            {/* Forearms + abs row */}
            <View style={bStyles.row}>
                <Zone muscle="triceps" style={bStyles.forearm} />
                <Zone muscle="abdomen" style={bStyles.abs} showLabel />
                <Zone muscle="triceps" style={bStyles.forearm} showLabel />
            </View>
            {/* Legs */}
            <View style={bStyles.row}>
                <Zone muscle="piernas" style={bStyles.leg} showLabel />
                <View style={{ width: 14 }} />
                <Zone muscle="piernas" style={bStyles.leg} />
            </View>
            {/* Calves */}
            <View style={bStyles.row}>
                <Zone muscle="piernas" style={bStyles.calf} />
                <View style={{ width: 14 }} />
                <Zone muscle="piernas" style={bStyles.calf} />
            </View>
        </View>
    );

    return (
        <View style={bStyles.body}>
            <View style={bStyles.head} />
            <View style={bStyles.row}>
                <Zone muscle="hombros" style={bStyles.shoulder} showLabel />
                <View style={bStyles.neck} />
                <Zone muscle="hombros" style={bStyles.shoulder} />
            </View>
            <View style={bStyles.row}>
                <Zone muscle="triceps" style={bStyles.arm} showLabel />
                <Zone muscle="espalda" style={[bStyles.chest, { height: 60 }]} showLabel />
                <Zone muscle="triceps" style={bStyles.arm} />
            </View>
            <View style={bStyles.row}>
                <Zone muscle="biceps" style={bStyles.forearm} />
                <Zone muscle="espalda" style={[bStyles.abs, { height: 50 }]} />
                <Zone muscle="biceps" style={bStyles.forearm} showLabel />
            </View>
            <View style={bStyles.row}>
                <Zone muscle="piernas" style={bStyles.leg} showLabel />
                <View style={{ width: 14 }} />
                <Zone muscle="piernas" style={bStyles.leg} />
            </View>
            <View style={bStyles.row}>
                <Zone muscle="piernas" style={bStyles.calf} />
                <View style={{ width: 14 }} />
                <Zone muscle="piernas" style={bStyles.calf} />
            </View>
        </View>
    );
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

// ─── Legend item ──────────────────────────────────────────────────────────────
function LegendItem({ pct, label }) {
    return (
        <View style={styles.legendRow}>
            <LinearGradient colors={heatColors(pct)} style={styles.legendDot} borderRadius={4} />
            <Text style={styles.legendText}>{pct >= 5 ? `+${pct}%` : '~'}</Text>
            <Text style={styles.legendMuscle}>{label}</Text>
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function DigitalTwin() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [data, setData]       = useState(null);
    const [horizon, setHorizon] = useState('3'); // '3' | '12'
    const [bodyView, setBodyView] = useState('front');
    const [ghostMode, setGhostMode] = useState(false);
    const [scanHistory, setScanHistory] = useState([]);
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
            setScanHistory(scans);

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

    // Ghost comparison: diff between latest scan and oldest scan
    const ghostDiff = ghostMode && scanHistory.length >= 2
        ? (() => {
            const latest = scanHistory[0]?.ranking_muscular || {};
            const oldest = scanHistory[scanHistory.length - 1]?.ranking_muscular || {};
            return Object.keys(latest).reduce((acc, k) => {
                acc[k] = (latest[k] || 0) - (oldest[k] || 0);
                return acc;
            }, {});
          })()
        : null;

    const displayChanges = ghostDiff || changes;

    const renderMuscleLabel = (key) => ({
        pecho: 'Pecho', espalda: 'Espalda', hombros: 'Hombros',
        biceps: 'Bíceps', triceps: 'Tríceps', piernas: 'Piernas', abdomen: 'Core',
    }[key] || key);

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
                    <Text style={styles.loadingSubtitle}>La IA está calculando tu evolución física basada en tus datos reales</Text>
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

                    {/* ── Body Heatmap ── */}
                    <View style={styles.card}>
                        <View style={styles.heatmapHeader}>
                            <Text style={styles.cardTitle}>MAPA DE EVOLUCIÓN MUSCULAR</Text>
                            {scanHistory.length >= 2 && (
                                <TouchableOpacity
                                    style={[styles.ghostToggle, ghostMode && styles.ghostToggleOn]}
                                    onPress={() => setGhostMode(g => !g)}
                                >
                                    <MaterialCommunityIcons name="ghost" size={14} color={ghostMode ? '#000' : '#A259FF'} />
                                    <Text style={[styles.ghostText, ghostMode && { color: '#000' }]}>GHOST</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {ghostMode && (
                            <Text style={styles.ghostCaption}>
                                Comparando tu primer escaneo vs el más reciente
                            </Text>
                        )}

                        {/* Front / Back tabs */}
                        <View style={[styles.tabRow, { marginBottom: 16 }]}>
                            {['front', 'back'].map(v => (
                                <TouchableOpacity
                                    key={v}
                                    style={[styles.tab, bodyView === v && styles.tabActive]}
                                    onPress={() => setBodyView(v)}
                                >
                                    <Text style={[styles.tabText, bodyView === v && styles.tabTextActive]}>
                                        {v === 'front' ? 'FRONTAL' : 'POSTERIOR'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.heatmapContainer}>
                            {/* Body diagram */}
                            <BodyHeatmap changes={displayChanges} view={bodyView} />

                            {/* Muscle legend */}
                            <View style={styles.legend}>
                                {Object.entries(displayChanges).map(([k, v]) => (
                                    <LegendItem key={k} pct={v} label={renderMuscleLabel(k)} />
                                ))}
                            </View>
                        </View>

                        {/* Color scale */}
                        <View style={styles.scaleRow}>
                            <Text style={styles.scaleText}>Sin cambio</Text>
                            <LinearGradient
                                colors={['#2a2a2a', '#ff4444', '#ff8c00', '#FFD700', '#63ff15']}
                                style={styles.scaleBar}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            />
                            <Text style={styles.scaleText}>Máximo</Text>
                        </View>
                    </View>

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

// ─── Body styles ──────────────────────────────────────────────────────────────
const bStyles = StyleSheet.create({
    body:      { alignItems: 'center', gap: 4, paddingVertical: 8 },
    head:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#222', marginBottom: 2 },
    neck:      { width: 20, height: 24, backgroundColor: '#1a1a1a', borderRadius: 4 },
    row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    shoulder:  { width: 44, height: 28, borderRadius: 14 },
    chest:     { width: 64, height: 48, borderRadius: 10 },
    arm:       { width: 28, height: 48, borderRadius: 10 },
    forearm:   { width: 24, height: 36, borderRadius: 8 },
    abs:       { width: 64, height: 36, borderRadius: 8 },
    leg:       { width: 44, height: 60, borderRadius: 14 },
    calf:      { width: 34, height: 40, borderRadius: 14 },
    zoneLabel: { color: '#fff', fontSize: 8, fontWeight: '800', textAlign: 'center', marginTop: 4 },
});

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

    heatmapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
    ghostToggle:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a0a2a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#A259FF55' },
    ghostToggleOn: { backgroundColor: '#A259FF' },
    ghostText:     { color: '#A259FF', fontSize: 10, fontWeight: '800' },
    ghostCaption:  { color: '#666', fontSize: 11, marginBottom: 8, fontStyle: 'italic' },

    heatmapContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    legend: { flex: 1, gap: 7, paddingLeft: 16, justifyContent: 'center' },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 20, height: 12 },
    legendText: { color: '#63ff15', fontSize: 11, fontWeight: '800', width: 36 },
    legendMuscle: { color: '#aaa', fontSize: 11 },

    scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    scaleBar: { flex: 1, height: 6, borderRadius: 3 },
    scaleText: { color: '#444', fontSize: 9, fontWeight: '600' },

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
});
