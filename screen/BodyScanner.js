import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, Image, ScrollView,
    ActivityIndicator, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = Config.BACKEND_URL;
const SCAN_HISTORY_KEY = 'body_scan_history';

// ─── Prompts por plan ────────────────────────────────────────────────────────

const PROMPT_GRATIS = `Analiza la composición muscular visible en esta foto. RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO, sin texto adicional.
Estructura exacta:
{
  "ranking_muscular": {
    "pecho": <0-100>,
    "espalda": <0-100>,
    "biceps": <0-100>,
    "triceps": <0-100>,
    "hombros": <0-100>,
    "piernas": <0-100>,
    "abdomen": <0-100>
  },
  "nivel": "Principiante|Intermedio|Avanzado|Elite",
  "musculos_fuertes": ["músculo más desarrollado", "segundo más desarrollado"],
  "musculos_debiles": ["músculo menos desarrollado", "segundo menos desarrollado"],
  "resumen": "Una frase motivadora y honesta sobre el físico"
}`;

const PROMPT_PRO = `Analiza el físico en esta foto con detalle atlético. RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO, sin texto adicional.
Estructura exacta:
{
  "ranking_muscular": {
    "pecho": <0-100>,
    "espalda": <0-100>,
    "biceps": <0-100>,
    "triceps": <0-100>,
    "hombros": <0-100>,
    "piernas": <0-100>,
    "abdomen": <0-100>
  },
  "nivel": "Principiante|Intermedio|Avanzado|Elite",
  "grasa_estimada": "X%",
  "forma_cuerpo": "V-Shape|X-Shape|Rectangular|Trapecio|Ectomorfo",
  "estetica_score": <1-10>,
  "proporciones": "Una frase describiendo la relación hombro-cintura-cadera",
  "puntos_fuertes": ["fortaleza 1", "fortaleza 2"],
  "puntos_mejorar": ["mejora 1", "mejora 2"],
  "musculos_fuertes": ["músculo 1", "músculo 2"],
  "musculos_debiles": ["músculo 1", "músculo 2"],
  "recomendacion": "Consejo específico de entrenamiento"
}`;

const PROMPT_ULTIMATE = `Analiza este físico como un coach de élite y crea un diagnóstico completo. RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO, sin texto adicional.
Estructura exacta:
{
  "ranking_muscular": {
    "pecho": <0-100>,
    "espalda": <0-100>,
    "biceps": <0-100>,
    "triceps": <0-100>,
    "hombros": <0-100>,
    "piernas": <0-100>,
    "abdomen": <0-100>
  },
  "nivel": "Principiante|Intermedio|Avanzado|Elite",
  "grasa_estimada": "X%",
  "forma_cuerpo": "V-Shape|X-Shape|Rectangular|Trapecio|Ectomorfo",
  "estetica_score": <1-10>,
  "proporciones": "Descripción de proporciones clave",
  "puntos_fuertes": ["fortaleza 1", "fortaleza 2"],
  "puntos_mejorar": ["mejora 1", "mejora 2"],
  "musculos_fuertes": ["músculo 1", "músculo 2"],
  "musculos_debiles": ["músculo 1", "músculo 2"],
  "recomendacion": "Consejo específico",
  "plan_recomendado": {
    "tipo": "Nombre del tipo de entrenamiento ideal",
    "frecuencia": "X días/semana",
    "duracion": "X semanas",
    "enfoque_principal": "Grupos musculares a priorizar",
    "descripcion": "2-3 frases explicando el plan ideal para este físico",
    "prompt_chat": "Frase exacta lista para copiar al chat: crea un plan de [tipo] de [duracion] semanas, [frecuencia], con énfasis en [enfoque], para un físico [nivel] con [forma_cuerpo]"
  }
}`;

// ─── Colores por plan ────────────────────────────────────────────────────────

const PLAN_CONFIG = {
    Gratis: { color: '#63ff15', label: 'ANÁLISIS BÁSICO', gradient: ['rgba(99,255,21,0.15)', 'transparent'] },
    Pro:    { color: '#00d4ff', label: 'ANÁLISIS PRO',    gradient: ['rgba(0,212,255,0.15)', 'transparent'] },
    Ultimate: { color: '#FFD700', label: 'ANÁLISIS ULTIMATE', gradient: ['rgba(255,215,0,0.2)', 'transparent'] },
};

// ─── Componente: barras musculares ───────────────────────────────────────────

function MuscleBars({ scores, planColor, prevScores }) {
    const muscles = [
        { key: 'pecho',    label: 'Pecho' },
        { key: 'espalda',  label: 'Espalda' },
        { key: 'hombros',  label: 'Hombros' },
        { key: 'biceps',   label: 'Bíceps' },
        { key: 'triceps',  label: 'Tríceps' },
        { key: 'piernas',  label: 'Piernas' },
        { key: 'abdomen',  label: 'Core' },
    ];

    const getTierLabel = (v) => {
        if (v >= 96) return 'MAESTRO';
        if (v >= 81) return 'DIAMANTE';
        if (v >= 61) return 'PLATINO';
        if (v >= 41) return 'ORO';
        if (v >= 21) return 'PLATA';
        return 'BRONCE';
    };

    return (
        <View style={{ gap: 10 }}>
            {muscles.map(({ key, label }) => {
                const val = scores?.[key] ?? 0;
                const prev = prevScores?.[key];
                const diff = prev !== undefined ? val - prev : null;
                return (
                    <View key={key}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: '#ccc', fontSize: 12, fontWeight: '700' }}>{label}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {diff !== null && (
                                    <Text style={{ fontSize: 10, fontWeight: '900', color: diff >= 0 ? '#63ff15' : '#ff4d4d' }}>
                                        {diff >= 0 ? `+${diff}` : diff}
                                    </Text>
                                )}
                                <Text style={{ color: planColor, fontSize: 11, fontWeight: '900' }}>{getTierLabel(val)}</Text>
                            </View>
                        </View>
                        <View style={{ height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{ width: `${val}%`, height: '100%', backgroundColor: planColor, borderRadius: 3 }} />
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function BodyScanner() {
    const navigation = useNavigation();
    const [image, setImage]       = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult]     = useState(null);
    const [userPlan, setUserPlan] = useState('Gratis');
    const [prevScan, setPrevScan] = useState(null);
    const [generandoPlan, setGenerandoPlan] = useState(false);

    useEffect(() => {
        loadUserAndHistory();
    }, []);

    const loadUserAndHistory = async () => {
        try {
            const raw = await AsyncStorage.getItem('user');
            if (raw) {
                const u = JSON.parse(raw);
                setUserPlan(u.plan || 'Gratis');
            }
            const histRaw = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
            if (histRaw) {
                const hist = JSON.parse(histRaw);
                if (hist.length > 0) setPrevScan(hist[hist.length - 1]);
            }
        } catch (_) {}
    };

    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [3, 4], quality: 0.5, base64: true,
        });
        if (!res.canceled) { setImage(res.assets[0]); setResult(null); }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara.'); return; }
        const res = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [3, 4], quality: 0.5, base64: true,
        });
        if (!res.canceled) { setImage(res.assets[0]); setResult(null); }
    };

    const getPrompt = (plan) => {
        if (plan === 'Ultimate') return PROMPT_ULTIMATE;
        if (plan === 'Pro') return PROMPT_PRO;
        return PROMPT_GRATIS;
    };

    const extractMuscleScores = async (parsed) => {
        if (!parsed?.ranking_muscular) return;
        const scores = { ...parsed.ranking_muscular };
        await AsyncStorage.setItem('muscle_scores', JSON.stringify(scores));
    };

    const saveScanToHistory = async (parsed) => {
        try {
            const histRaw = await AsyncStorage.getItem(SCAN_HISTORY_KEY);
            const hist = histRaw ? JSON.parse(histRaw) : [];
            const entry = {
                date: new Date().toLocaleDateString('es-ES'),
                timestamp: Date.now(),
                plan: userPlan,
                nivel: parsed.nivel,
                grasa_estimada: parsed.grasa_estimada,
                estetica_score: parsed.estetica_score,
                forma_cuerpo: parsed.forma_cuerpo,
                ranking_muscular: parsed.ranking_muscular,
            };
            hist.push(entry);
            if (hist.length > 20) hist.splice(0, hist.length - 20);
            await AsyncStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(hist));
            setPrevScan(entry);
        } catch (_) {}
    };

    const runScanner = async () => {
        if (!image) return;
        setAnalyzing(true);
        try {
            const token = await AsyncStorage.getItem('token');
            let imageData = image.base64;
            if (imageData && !imageData.startsWith('data:image')) {
                imageData = `data:image/jpeg;base64,${imageData}`;
            }

            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: getPrompt(userPlan), image: imageData })
            });

            const data = await response.json();
            if (response.ok) {
                try {
                    const clean = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(clean);
                    setResult(parsed);
                    await extractMuscleScores(parsed);
                    if (userPlan === 'Pro' || userPlan === 'Ultimate') {
                        await saveScanToHistory(parsed);
                    }
                } catch (_) {
                    setResult({ raw: data.text });
                }
            } else {
                Alert.alert('Error', data.error || 'No se pudo realizar el análisis.');
            }
        } catch (_) {
            Alert.alert('Error de conexión', 'Asegúrate de tener internet.');
        } finally {
            setAnalyzing(false);
        }
    };

    const generatePlanDirect = async (planRecomendado, scanResult) => {
        setGenerandoPlan(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const semanasNum = parseInt((planRecomendado.duracion || '8').replace(/\D/g, '')) || 8;
            const diasNum = parseInt((planRecomendado.frecuencia || '4').replace(/\D/g, '')) || 4;

            const details = [
                `OBJETIVO: ${planRecomendado.enfoque_principal}.`,
                `NIVEL: ${scanResult.nivel || 'Intermedio'}.`,
                `DÍAS/SEMANA: ${diasNum}.`,
                `METODOLOGÍA: ${planRecomendado.tipo}.`,
                `PRIORIDAD: ${planRecomendado.enfoque_principal}.`,
                `DURACIÓN: ${semanasNum} semanas.`,
                `FÍSICO: ${scanResult.forma_cuerpo || ''}, grasa estimada ${scanResult.grasa_estimada || ''}.`,
                `GRUPOS A POTENCIAR: ${(scanResult.musculos_debiles || []).join(', ')}.`,
            ].join(' ');

            const response = await fetch(`${BACKEND_URL}/generate-plan-interactive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    details,
                    semanas: semanasNum,
                    periodi: 'Ondulada Diaria (DUP)',
                    tecnicas: ['Drop Sets', 'Superseries'],
                    lesiones: '',
                    horasSueno: '7-8h',
                    nivelEstres: 'Moderado',
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}`);
            }
            navigation.navigate('ElitePlanScreen', { plan: data });
        } catch (e) {
            Alert.alert('Error', e.message || 'No se pudo generar el plan. Intenta de nuevo.');
        } finally {
            setGenerandoPlan(false);
        }
    };

    const cfg = PLAN_CONFIG[userPlan] || PLAN_CONFIG.Gratis;

    // ── Card contenedor ──────────────────────────────────────────────────────
    const Card = ({ title, icon, iconColor, children, style }) => (
        <View style={[styles.card, style]}>
            <View style={styles.cardHeader}>
                <Ionicons name={icon} size={18} color={iconColor || cfg.color} />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Nexus <Text style={{ color: cfg.color }}>Vision</Text></Text>
                </View>
                <View style={[styles.planBadge, { borderColor: cfg.color }]}>
                    <Text style={[styles.planBadgeText, { color: cfg.color }]}>{userPlan.toUpperCase()}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Intro */}
                {!result && (
                    <LinearGradient colors={cfg.gradient} style={styles.introBanner}>
                        <Text style={[styles.introLabel, { color: cfg.color }]}>{cfg.label}</Text>
                        <Text style={styles.introDesc}>{
                            userPlan === 'Ultimate'
                                ? 'Análisis físico completo + plan de entrenamiento personalizado por IA.'
                                : userPlan === 'Pro'
                                    ? 'Grasa corporal, forma del físico, puntuación estética y comparativa de progreso.'
                                    : 'Ranking de grupos musculares y puntuación para competir con tus amigos.'
                        }</Text>
                    </LinearGradient>
                )}

                {/* Scanner */}
                <View style={[styles.scannerBox, result && styles.scannerBoxSmall]}>
                    {image ? (
                        <View style={styles.previewWrap}>
                            <Image source={{ uri: image.uri }} style={styles.preview} />
                            {analyzing && <View style={styles.scanLine} />}
                        </View>
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="scan-outline" size={60} color={cfg.color} />
                            <Text style={styles.placeholderText}>ESPERANDO IMAGEN...</Text>
                        </View>
                    )}
                </View>

                {/* Controles */}
                {!result && (
                    <View style={styles.controls}>
                        {!image ? (
                            <>
                                <TouchableOpacity style={[styles.mainBtn, { backgroundColor: cfg.color }]} onPress={takePhoto}>
                                    <Ionicons name="camera" size={22} color="black" />
                                    <Text style={styles.mainBtnText}>CAPTURAR AHORA</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
                                    <Ionicons name="image" size={20} color="white" />
                                    <Text style={styles.secondaryBtnText}>Explorar Galería</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.trashBtn} onPress={() => setImage(null)} disabled={analyzing}>
                                    <Ionicons name="trash" size={20} color="#ff4d4d" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.scanBtn, { backgroundColor: cfg.color }, analyzing && styles.disabled]}
                                    onPress={runScanner}
                                    disabled={analyzing}
                                >
                                    {analyzing
                                        ? <ActivityIndicator color="black" />
                                        : <><Text style={styles.scanBtnText}>INICIAR ANÁLISIS BIO-IA</Text><Ionicons name="flask" size={18} color="black" /></>
                                    }
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* ── RESULTADOS ─────────────────────────────────────────── */}
                {result && !result.raw && (
                    <View style={styles.results}>

                        {/* Header de resultado */}
                        <View style={styles.resultHeader}>
                            <View>
                                <Text style={styles.resultSubtitle}>INFORME DE COMPOSICIÓN</Text>
                                <Text style={styles.resultLevel}>Nivel {result.nivel || '—'}</Text>
                            </View>
                            {(userPlan === 'Pro' || userPlan === 'Ultimate') && result.estetica_score && (
                                <View style={[styles.scoreBadge, { borderColor: cfg.color }]}>
                                    <Text style={[styles.scoreValue, { color: cfg.color }]}>{result.estetica_score}<Text style={{ fontSize: 14 }}>/10</Text></Text>
                                    <Text style={styles.scoreLabel}>ESTÉTICA</Text>
                                </View>
                            )}
                        </View>

                        {/* ── GRATIS + PRO + ULTIMATE: Ranking muscular ── */}
                        <Card title="Ranking Muscular" icon="barbell-outline">
                            <MuscleBars
                                scores={result.ranking_muscular}
                                planColor={cfg.color}
                                prevScores={prevScan?.ranking_muscular}
                            />
                            {prevScan && (
                                <Text style={styles.compareNote}>
                                    ↑ vs escáner del {prevScan.date}
                                </Text>
                            )}
                        </Card>

                        {/* Músculos fuertes / débiles */}
                        <View style={styles.row}>
                            <View style={[styles.halfCard, { borderColor: '#63ff15' }]}>
                                <Text style={[styles.halfTitle, { color: '#63ff15' }]}>MÁS FUERTES</Text>
                                {(result.musculos_fuertes || []).map((m, i) => (
                                    <Text key={i} style={styles.halfText}>• {m}</Text>
                                ))}
                            </View>
                            <View style={[styles.halfCard, { borderColor: '#ffa500' }]}>
                                <Text style={[styles.halfTitle, { color: '#ffa500' }]}>A MEJORAR</Text>
                                {(result.musculos_debiles || []).map((m, i) => (
                                    <Text key={i} style={styles.halfText}>• {m}</Text>
                                ))}
                            </View>
                        </View>

                        {/* Resumen / recomendación básica */}
                        {(result.resumen || result.recomendacion) && (
                            <Card title="Diagnóstico Nexus" icon="chatbubble-ellipses-outline">
                                <Text style={styles.recText}>{result.resumen || result.recomendacion}</Text>
                            </Card>
                        )}

                        {/* ── PRO + ULTIMATE: Grasa, forma, estética, proporciones ── */}
                        {(userPlan === 'Pro' || userPlan === 'Ultimate') && (
                            <>
                                <View style={styles.row}>
                                    {result.grasa_estimada && (
                                        <View style={[styles.metricCard, { borderColor: cfg.color }]}>
                                            <Text style={[styles.metricValue, { color: cfg.color }]}>{result.grasa_estimada}</Text>
                                            <Text style={styles.metricLabel}>GRASA CORPORAL</Text>
                                        </View>
                                    )}
                                    {result.forma_cuerpo && (
                                        <View style={[styles.metricCard, { borderColor: cfg.color }]}>
                                            <Text style={[styles.metricValue, { color: cfg.color, fontSize: 18 }]}>{result.forma_cuerpo}</Text>
                                            <Text style={styles.metricLabel}>TIPO FÍSICO</Text>
                                        </View>
                                    )}
                                </View>

                                {result.proporciones && (
                                    <Card title="Proporciones" icon="body-outline">
                                        <Text style={styles.recText}>{result.proporciones}</Text>
                                    </Card>
                                )}

                                {(result.puntos_fuertes?.length || result.puntos_mejorar?.length) && (
                                    <View style={styles.row}>
                                        <View style={[styles.halfCard, { borderColor: '#63ff15' }]}>
                                            <Text style={[styles.halfTitle, { color: '#63ff15' }]}>FORTALEZAS</Text>
                                            {(result.puntos_fuertes || []).map((p, i) => (
                                                <Text key={i} style={styles.halfText}>• {p}</Text>
                                            ))}
                                        </View>
                                        <View style={[styles.halfCard, { borderColor: '#ffa500' }]}>
                                            <Text style={[styles.halfTitle, { color: '#ffa500' }]}>CARENCIAS</Text>
                                            {(result.puntos_mejorar || []).map((p, i) => (
                                                <Text key={i} style={styles.halfText}>• {p}</Text>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </>
                        )}

                        {/* ── ULTIMATE: Plan personalizado ── */}
                        {userPlan === 'Ultimate' && result.plan_recomendado && (
                            <LinearGradient colors={['rgba(255,215,0,0.12)', 'rgba(255,215,0,0.04)']} style={styles.ultimateCard}>
                                <View style={styles.ultimateHeader}>
                                    <Ionicons name="sparkles" size={18} color="#FFD700" />
                                    <Text style={styles.ultimateTitle}>PLAN PERSONALIZADO IA</Text>
                                    <View style={styles.ultimatePill}>
                                        <Text style={styles.ultimatePillText}>ULTIMATE</Text>
                                    </View>
                                </View>

                                <View style={styles.planGrid}>
                                    <View style={styles.planItem}>
                                        <Text style={styles.planItemLabel}>TIPO</Text>
                                        <Text style={styles.planItemValue}>{result.plan_recomendado.tipo}</Text>
                                    </View>
                                    <View style={styles.planItem}>
                                        <Text style={styles.planItemLabel}>FRECUENCIA</Text>
                                        <Text style={styles.planItemValue}>{result.plan_recomendado.frecuencia}</Text>
                                    </View>
                                    <View style={styles.planItem}>
                                        <Text style={styles.planItemLabel}>DURACIÓN</Text>
                                        <Text style={styles.planItemValue}>{result.plan_recomendado.duracion}</Text>
                                    </View>
                                    <View style={styles.planItem}>
                                        <Text style={styles.planItemLabel}>FOCO</Text>
                                        <Text style={styles.planItemValue}>{result.plan_recomendado.enfoque_principal}</Text>
                                    </View>
                                </View>

                                <Text style={styles.planDesc}>{result.plan_recomendado.descripcion}</Text>

                                <TouchableOpacity
                                    style={styles.requestPlanBtn}
                                    onPress={() => generatePlanDirect(result.plan_recomendado, result)}
                                    disabled={generandoPlan}
                                >
                                    <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.requestPlanGrad}>
                                        {generandoPlan ? (
                                            <><ActivityIndicator color="black" size="small" /><Text style={styles.requestPlanText}>GENERANDO PLAN...</Text></>
                                        ) : (
                                            <><Ionicons name="sparkles" size={18} color="black" /><Text style={styles.requestPlanText}>GENERAR MI PLAN AHORA</Text><Ionicons name="arrow-forward" size={16} color="black" /></>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </LinearGradient>
                        )}

                        {/* ── Botones finales ── */}
                        <TouchableOpacity
                            style={[styles.rankingBtn, { backgroundColor: cfg.color }]}
                            onPress={() => navigation.navigate('MuscleRankings')}
                        >
                            <Text style={styles.rankingBtnText}>VER RANKING GLOBAL</Text>
                            <Ionicons name="trophy-outline" size={18} color="black" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.resetBtn} onPress={() => { setImage(null); setResult(null); }}>
                            <Text style={styles.resetBtnText}>NUEVO ESCÁNER</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Resultado en texto plano (fallback) */}
                {result?.raw && (
                    <View style={styles.results}>
                        <Card title="Análisis General" icon="document-text-outline">
                            <Text style={{ color: '#aaa', fontSize: 13, lineHeight: 20 }}>{result.raw}</Text>
                        </Card>
                        <TouchableOpacity style={styles.resetBtn} onPress={() => { setImage(null); setResult(null); }}>
                            <Text style={styles.resetBtnText}>NUEVO ESCÁNER</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.privacy}>
                    <Ionicons name="shield-checkmark" size={12} color="#333" />
                    <Text style={styles.privacyText}>CIFRADO DE EXTREMO A EXTREMO. TUS DATOS SON PRIVADOS.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, justifyContent: 'space-between' },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: 'white' },
    planBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    planBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    scrollContent: { padding: 20, paddingBottom: 50 },

    introBanner: { borderRadius: 18, padding: 18, marginBottom: 24 },
    introLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
    introDesc: { color: '#aaa', fontSize: 13, lineHeight: 19 },

    scannerBox: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#111', borderRadius: 24, borderWidth: 1, borderColor: '#222', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    scannerBoxSmall: { aspectRatio: 16 / 9, height: 180 },
    previewWrap: { width: '100%', height: '100%', position: 'relative' },
    preview: { width: '100%', height: '100%', resizeMode: 'cover' },
    scanLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: '#63ff15', shadowColor: '#63ff15', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 8 },
    placeholder: { alignItems: 'center', gap: 12 },
    placeholderText: { color: '#444', fontWeight: '900', letterSpacing: 2, fontSize: 12 },

    controls: { width: '100%' },
    mainBtn: { padding: 18, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 14 },
    mainBtnText: { color: 'black', fontWeight: '900', fontSize: 15 },
    secondaryBtn: { padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    secondaryBtnText: { color: 'white', fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 14 },
    trashBtn: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    scanBtn: { flex: 1, height: 58, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    scanBtnText: { color: 'black', fontWeight: '900', fontSize: 14 },
    disabled: { opacity: 0.5 },

    results: { gap: 16 },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    resultSubtitle: { color: '#555', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    resultLevel: { color: 'white', fontSize: 26, fontWeight: '900' },
    scoreBadge: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
    scoreValue: { fontSize: 24, fontWeight: '900' },
    scoreLabel: { color: '#666', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    card: { backgroundColor: '#111', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#222' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    cardTitle: { color: 'white', fontSize: 13, fontWeight: '900' },

    row: { flexDirection: 'row', gap: 12 },
    halfCard: { flex: 1, backgroundColor: '#111', borderRadius: 16, padding: 14, borderWidth: 1 },
    halfTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
    halfText: { color: '#bbb', fontSize: 11, marginBottom: 5, lineHeight: 16 },

    metricCard: { flex: 1, backgroundColor: '#111', borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'center' },
    metricValue: { fontSize: 22, fontWeight: '900' },
    metricLabel: { color: '#555', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },

    recText: { color: '#aaa', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
    compareNote: { color: '#444', fontSize: 10, fontWeight: '600', marginTop: 10, textAlign: 'right' },

    ultimateCard: { borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
    ultimateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    ultimateTitle: { color: '#FFD700', fontSize: 13, fontWeight: '900', flex: 1 },
    ultimatePill: { backgroundColor: '#FFD700', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    ultimatePillText: { color: 'black', fontSize: 9, fontWeight: '900' },
    planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    planItem: { width: '47%', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 10 },
    planItemLabel: { color: '#888', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    planItemValue: { color: 'white', fontSize: 12, fontWeight: '700' },
    planDesc: { color: '#ccc', fontSize: 12, lineHeight: 18, marginBottom: 16 },
    requestPlanBtn: { borderRadius: 14, overflow: 'hidden' },
    requestPlanGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, padding: 16 },
    requestPlanText: { color: 'black', fontWeight: '900', fontSize: 13 },

    rankingBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rankingBtnText: { color: 'black', fontWeight: '900', fontSize: 13 },
    resetBtn: { padding: 14, alignItems: 'center' },
    resetBtnText: { color: '#555', fontWeight: '900', fontSize: 12, letterSpacing: 1 },

    privacy: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
    privacyText: { color: '#333', fontSize: 9, fontWeight: '900' },
});
