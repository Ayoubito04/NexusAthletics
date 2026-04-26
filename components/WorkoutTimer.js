import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity,
    Animated, Vibration, Modal, FlatList, TextInput,
    KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGifUrl, nameToImgKey } from '../utils/exerciseMedia';
import Config from '../constants/Config';

const GIF_CACHE_KEY = 'nexus_exercise_gifs_v1';
const BACKEND_URL = Config.BACKEND_URL;

// Descanso adaptativo según fase del mesociclo
const REST_BY_FASE = {
    'Deload': 60,
    'Acumulación': 90,
    'Intensificación': 120,
    'Peak': 150,
    'Fuerza': 150,
};
const REST_DEFAULT = 90;

const getRestTime = (workoutMeta) => {
    if (!workoutMeta?.isUltimate || !workoutMeta?.fase) return REST_DEFAULT;
    return REST_BY_FASE[workoutMeta.fase] ?? REST_DEFAULT;
};

const FASE_COLORS = {
    'Acumulación': '#3b82f6',
    'Intensificación': '#f97316',
    'Peak': '#ef4444',
    'Deload': '#22c55e',
    'Fuerza': '#a855f7',
};

function initSets(ex) {
    const count = ex?.sets || 3;
    const targetReps = ex?.reps?.toString().split('-')[0] || '12';
    const targetWeight = ex?.weight ? ex.weight.toString() : '';
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        weight: targetWeight,
        reps: targetReps,
        done: false,
    }));
}

// ── GIF PANEL ─────────────────────────────────────────────────────────
const ExerciseGifPanel = React.memo(({ ex }) => {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [gifUrl, setGifUrl] = useState(null);
    const name = ex?.name || '';

    useEffect(() => {
        setExpanded(false);
        setLoading(true);
        (async () => {
            try {
                let apiGifs = {};
                const cached = await AsyncStorage.getItem(GIF_CACHE_KEY);
                if (cached) apiGifs = JSON.parse(cached);
                if (Object.keys(apiGifs).length === 0) {
                    const res = await fetch(`${BACKEND_URL}/exercises/gifs`);
                    if (res.ok) {
                        apiGifs = await res.json();
                        await AsyncStorage.setItem(GIF_CACHE_KEY, JSON.stringify(apiGifs));
                    }
                }
                const key = ex?.imgKey || nameToImgKey(name);
                if (key && apiGifs[key]) {
                    setGifUrl(`${BACKEND_URL}/exercises/gif/${apiGifs[key]}`);
                    return;
                }
            } catch (_) {}
            setGifUrl(getGifUrl(ex));
        })();
    }, [name]);

    if (!gifUrl) return null;

    return (
        <View style={s.gifPanel}>
            <TouchableOpacity style={s.gifToggle} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
                <Ionicons name={expanded ? 'chevron-up-circle-outline' : 'play-circle-outline'} size={16} color="#63ff15" />
                <Text style={s.gifToggleText}>{expanded ? 'Ocultar' : 'Cómo hacerlo'}</Text>
            </TouchableOpacity>
            {expanded && (
                <View style={s.gifBox}>
                    {loading && <View style={s.gifLoaderBox}><ActivityIndicator color="#63ff15" size="small" /></View>}
                    <Image
                        source={{ uri: gifUrl }}
                        style={[s.gifImage, loading && { height: 0 }]}
                        resizeMode="contain"
                        onLoad={() => setLoading(false)}
                        onError={() => setLoading(false)}
                    />
                </View>
            )}
        </View>
    );
});

// ── BRIEFING PRE-ENTRENAMIENTO (Ultimate) ─────────────────────────────
function WorkoutBriefing({ workoutMeta, exercises, onStart }) {
    const faseColor = FASE_COLORS[workoutMeta?.fase] || '#FFD700';

    const getRpeDescription = (rpe) => {
        const n = parseInt(rpe);
        if (n >= 9) return 'Esfuerzo máximo — cerca del fallo';
        if (n >= 8) return 'Muy duro — 1-2 reps en el tanque';
        if (n >= 7) return 'Duro — 2-3 reps en el tanque';
        return 'Moderado — buena energía residual';
    };

    const getFaseTip = (fase) => {
        switch (fase) {
            case 'Acumulación':    return 'Semana de volumen. Prioriza la técnica y acumula trabajo.';
            case 'Intensificación': return 'Semana de intensidad. Más peso, menos reps. Exígete.';
            case 'Peak':           return 'Semana pico. Máximo rendimiento. Descansa bien post-sesión.';
            case 'Deload':         return 'Semana de descarga. Reduce carga un 40%. Recuperación activa.';
            default:               return 'Ejecuta cada serie con máxima calidad técnica.';
        }
    };

    const restTime = getRestTime(workoutMeta);

    return (
        <SafeAreaView style={s.container}>
            <ScrollView contentContainerStyle={s.briefingScroll} showsVerticalScrollIndicator={false}>

                {/* Header dorado */}
                <LinearGradient colors={['rgba(255,215,0,0.15)', 'transparent']} style={s.briefingHeader}>
                    <View style={s.briefingTitleRow}>
                        <Ionicons name="sparkles" size={20} color="#FFD700" />
                        <Text style={s.briefingTitle}>BRIEFING ULTIMATE</Text>
                        {workoutMeta?.semanaNum && (
                            <View style={s.weekPill}>
                                <Text style={s.weekPillText}>SEM {workoutMeta.semanaNum}</Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>

                {/* Fase actual */}
                {workoutMeta?.fase && (
                    <View style={[s.briefingCard, { borderColor: faseColor + '40' }]}>
                        <View style={[s.faseDot, { backgroundColor: faseColor }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={[s.briefingCardLabel, { color: faseColor }]}>FASE ACTUAL</Text>
                            <Text style={s.briefingCardValue}>{workoutMeta.fase}</Text>
                            <Text style={s.briefingCardDesc}>{getFaseTip(workoutMeta.fase)}</Text>
                        </View>
                    </View>
                )}

                {/* RPE objetivo */}
                {workoutMeta?.rpe && (
                    <View style={[s.briefingCard, { borderColor: '#ffffff15' }]}>
                        <View style={s.rpeCircle}>
                            <Text style={s.rpeNumber}>{workoutMeta.rpe}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.briefingCardLabel, { color: '#fff' }]}>RPE OBJETIVO</Text>
                            <Text style={s.briefingCardDesc}>{getRpeDescription(workoutMeta.rpe)}</Text>
                        </View>
                    </View>
                )}

                {/* Descanso adaptativo */}
                <View style={[s.briefingCard, { borderColor: '#63ff1520' }]}>
                    <Ionicons name="timer-outline" size={28} color="#63ff15" style={{ marginRight: 14 }} />
                    <View style={{ flex: 1 }}>
                        <Text style={[s.briefingCardLabel, { color: '#63ff15' }]}>DESCANSO ENTRE SERIES</Text>
                        <Text style={s.briefingCardValue}>{restTime}s</Text>
                        <Text style={s.briefingCardDesc}>Ajustado automáticamente a la fase {workoutMeta?.fase || ''}</Text>
                    </View>
                </View>

                {/* Pre-workout nutrition */}
                {workoutMeta?.preWorkout && (
                    <View style={[s.briefingCard, { borderColor: '#f9731620' }]}>
                        <Ionicons name="nutrition-outline" size={28} color="#f97316" style={{ marginRight: 14 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={[s.briefingCardLabel, { color: '#f97316' }]}>PRE-ENTRENO</Text>
                            <Text style={s.briefingCardDesc}>{workoutMeta.preWorkout}</Text>
                        </View>
                    </View>
                )}

                {/* Lista de ejercicios */}
                <Text style={s.briefingExTitle}>HOY ({exercises.length} ejercicios)</Text>
                {exercises.map((ex, i) => (
                    <View key={i} style={s.briefingExRow}>
                        <Text style={s.briefingExNum}>{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={s.briefingExName}>{ex.name}</Text>
                            <Text style={s.briefingExMeta}>
                                {ex.sets} series · {ex.reps} reps
                                {ex.pesoSugerido ? ` · ${ex.pesoSugerido}` : ''}
                                {ex.rir ? ` · RIR ${ex.rir}` : ''}
                            </Text>
                            {ex.tecnica && (
                                <View style={s.briefingTecnicaPill}>
                                    <Text style={s.briefingTecnicaText}>{ex.tecnica}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={s.startBtn} onPress={onStart}>
                    <LinearGradient colors={['#FFD700', '#FFA500']} style={s.startBtnGrad}>
                        <Ionicons name="play" size={20} color="black" />
                        <Text style={s.startBtnText}>EMPEZAR ENTRENAMIENTO</Text>
                    </LinearGradient>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function WorkoutTimer({ visible, exercises = [], workoutMeta, onClose, onComplete }) {
    const [phase, setPhase] = useState('briefing'); // 'briefing' | 'workout'
    const [exIdx, setExIdx] = useState(0);
    const [setsData, setSetsData] = useState([]);
    const [totalSecs, setTotalSecs] = useState(0);
    const [restSecs, setRestSecs] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const [allResults, setAllResults] = useState([]);

    const restDuration = getRestTime(workoutMeta);
    const restProgress = useRef(new Animated.Value(0)).current;
    const restAnim = useRef(null);
    const totalRef = useRef(null);
    const restRef = useRef(null);

    const ex = exercises[exIdx];
    const isUltimate = workoutMeta?.isUltimate;
    const faseColor = FASE_COLORS[workoutMeta?.fase] || '#FFD700';

    // Reset cuando se abre el modal
    useEffect(() => {
        if (visible) {
            setPhase(isUltimate ? 'briefing' : 'workout');
            setExIdx(0);
            setAllResults([]);
            setTotalSecs(0);
            setIsResting(false);
        }
    }, [visible]);

    useEffect(() => {
        if (ex) setSetsData(initSets(ex));
        setIsResting(false);
        clearInterval(restRef.current);
        restProgress.setValue(0);
    }, [exIdx, exercises]);

    useEffect(() => {
        if (phase !== 'workout') { clearInterval(totalRef.current); return; }
        totalRef.current = setInterval(() => setTotalSecs(s => s + 1), 1000);
        return () => clearInterval(totalRef.current);
    }, [phase]);

    useEffect(() => {
        clearInterval(restRef.current);
        if (!isResting) { restProgress.setValue(0); return; }

        restProgress.setValue(1);
        restAnim.current = Animated.timing(restProgress, {
            toValue: 0, duration: restDuration * 1000, useNativeDriver: false,
        });
        restAnim.current.start();

        restRef.current = setInterval(() => {
            setRestSecs(s => {
                if (s <= 1) { finishRest(); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(restRef.current);
    }, [isResting]);

    const playSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
                { shouldPlay: true }
            );
            await sound.playAsync();
        } catch (_) {}
    };

    const finishRest = () => {
        clearInterval(restRef.current);
        restAnim.current?.stop();
        restProgress.setValue(0);
        Vibration.vibrate([0, 150, 80, 150]);
        playSound();
        setIsResting(false);
    };

    const completeSet = (idx) => {
        const set = setsData[idx];
        if (set.done) return;

        const updated = setsData.map((s, i) => i === idx ? { ...s, done: true } : s);
        setSetsData(updated);
        Vibration.vibrate(60);

        const result = {
            exerciseName: ex.name, muscle: ex.muscle,
            set: idx + 1,
            weight: parseFloat(set.weight) || 0,
            reps: parseInt(set.reps) || 0,
        };
        const newResults = [...allResults, result];
        setAllResults(newResults);

        const allDone = updated.every(s => s.done);
        if (allDone) {
            if (exIdx < exercises.length - 1) {
                setTimeout(() => { setExIdx(i => i + 1); Vibration.vibrate([0, 80, 40, 80]); }, 300);
            } else {
                setTimeout(() => finishWorkout(newResults), 400);
            }
        } else {
            setRestSecs(restDuration);
            setIsResting(true);
        }
    };

    const finishWorkout = (results) => {
        clearInterval(totalRef.current);
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
        playSound();
        onComplete?.({ duration: totalSecs, exercises: exercises.length, sessionData: results || allResults });
    };

    const updateSet = (idx, field, val) => {
        setSetsData(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    };

    const addSet = () => {
        const last = setsData[setsData.length - 1];
        setSetsData(prev => [...prev, { id: prev.length, weight: last?.weight || '', reps: last?.reps || '10', done: false }]);
    };

    const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    const restBarWidth = restProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    if (!visible) return null;

    // ── BRIEFING ─────────────────────────────────────────────────────
    if (phase === 'briefing') {
        return (
            <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
                <WorkoutBriefing
                    workoutMeta={workoutMeta}
                    exercises={exercises}
                    onStart={() => setPhase('workout')}
                />
            </Modal>
        );
    }

    if (!ex) return null;

    const completedCount = setsData.filter(s => s.done).length;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={s.container}>

                {/* ── PHASE BANNER (Ultimate only) ── */}
                {isUltimate && workoutMeta?.fase && (
                    <View style={[s.phaseBanner, { backgroundColor: faseColor + '18', borderBottomColor: faseColor + '30' }]}>
                        <View style={[s.phaseDot, { backgroundColor: faseColor }]} />
                        <Text style={[s.phaseText, { color: faseColor }]}>{workoutMeta.fase}</Text>
                        {workoutMeta?.rpe && (
                            <View style={[s.rpePill, { borderColor: faseColor + '50' }]}>
                                <Text style={[s.rpeText, { color: faseColor }]}>RPE {workoutMeta.rpe}</Text>
                            </View>
                        )}
                        <Text style={s.phaseRestHint}>{restDuration}s descanso</Text>
                    </View>
                )}

                {/* ── HEADER ── */}
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.iconBtn}>
                        <Ionicons name="close" size={22} color="#555" />
                    </TouchableOpacity>
                    <View style={s.headerMid}>
                        <Text style={s.timerText}>{fmt(totalSecs)}</Text>
                        <Text style={s.exCounter}>{exIdx + 1} / {exercises.length} ejercicios</Text>
                    </View>
                    <TouchableOpacity
                        style={s.iconBtn}
                        onPress={() => exIdx < exercises.length - 1 ? setExIdx(i => i + 1) : finishWorkout()}
                    >
                        <Ionicons name="chevron-forward" size={22} color="#555" />
                    </TouchableOpacity>
                </View>

                {/* ── NAV DOTS ── */}
                {exercises.length > 1 && (
                    <View style={s.navDots}>
                        {exercises.map((_, i) => (
                            <TouchableOpacity key={i} onPress={() => setExIdx(i)}>
                                <View style={[s.navDot, i < exIdx && s.navDotDone, i === exIdx && s.navDotActive]} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ── EXERCISE NAME + ULTIMATE HINTS ── */}
                <View style={s.exInfo}>
                    <Text style={s.exName} numberOfLines={1}>{ex.name}</Text>
                    <View style={s.exMeta}>
                        <Text style={s.exMuscle}>{ex.muscle || 'General'}</Text>
                        <View style={s.exBadge}>
                            <Text style={s.exBadgeText}>{completedCount}/{setsData.length} series</Text>
                        </View>
                    </View>

                    {/* Hints Ultimate: peso sugerido + RIR */}
                    {isUltimate && (ex.pesoSugerido || ex.rir) && (
                        <View style={s.ultimateHints}>
                            {ex.pesoSugerido && (
                                <View style={s.hintChip}>
                                    <Ionicons name="barbell-outline" size={11} color="#FFD700" />
                                    <Text style={s.hintText}>{ex.pesoSugerido}</Text>
                                </View>
                            )}
                            {ex.rir && (
                                <View style={s.hintChip}>
                                    <Ionicons name="speedometer-outline" size={11} color="#FFD700" />
                                    <Text style={s.hintText}>RIR {ex.rir}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Técnica especial */}
                    {isUltimate && ex.tecnica && (
                        <View style={s.tecnicaBanner}>
                            <Ionicons name="flash" size={12} color="#FFD700" />
                            <Text style={s.tecnicaText}>{ex.tecnica}</Text>
                        </View>
                    )}

                    {/* Nota del ejercicio */}
                    {isUltimate && ex.nota && (
                        <Text style={s.notaText}>💬 {ex.nota}</Text>
                    )}
                </View>

                {/* ── GIF ── */}
                <ExerciseGifPanel key={ex.name} ex={ex} />

                {/* ── TABLE HEADER ── */}
                <View style={s.tableHeader}>
                    <Text style={[s.colHead, { width: 32 }]}>SET</Text>
                    <Text style={[s.colHead, { flex: 1, textAlign: 'center' }]}>KG</Text>
                    <Text style={[s.colHead, { width: 12, textAlign: 'center', color: 'transparent' }]}>×</Text>
                    <Text style={[s.colHead, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                    <View style={{ width: 52 }} />
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <FlatList
                        data={setsData}
                        keyExtractor={(_, i) => i.toString()}
                        contentContainerStyle={s.setList}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item, index }) => (
                            <SetRow
                                item={item}
                                index={index}
                                onComplete={() => completeSet(index)}
                                onChangeWeight={v => updateSet(index, 'weight', v)}
                                onChangeReps={v => updateSet(index, 'reps', v)}
                            />
                        )}
                        ListFooterComponent={
                            <TouchableOpacity style={s.addSetBtn} onPress={addSet}>
                                <Ionicons name="add" size={16} color="#555" />
                                <Text style={s.addSetText}>Añadir serie</Text>
                            </TouchableOpacity>
                        }
                    />
                </KeyboardAvoidingView>

                {/* ── REST BANNER ── */}
                {isResting && (
                    <View style={s.restBanner}>
                        <View style={s.restRow}>
                            <View>
                                <Text style={s.restLabel}>
                                    DESCANSO{isUltimate && workoutMeta?.fase ? ` · ${workoutMeta.fase.toUpperCase()}` : ''}
                                </Text>
                                <Text style={s.restTime}>{fmt(restSecs)}</Text>
                            </View>
                            <TouchableOpacity style={s.skipBtn} onPress={finishRest}>
                                <Text style={s.skipText}>SALTAR</Text>
                                <Ionicons name="play-forward-outline" size={14} color="#63ff15" />
                            </TouchableOpacity>
                        </View>
                        <View style={s.restBarBg}>
                            <Animated.View style={[s.restBarFill, { width: restBarWidth }]} />
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}

// ── SET ROW ───────────────────────────────────────────────────────────
const SetRow = React.memo(({ item, index, onComplete, onChangeWeight, onChangeReps }) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const handleComplete = () => {
        if (item.done) return;
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
        onComplete();
    };

    return (
        <Animated.View style={[s.setRow, item.done && s.setRowDone, { opacity: fadeAnim }]}>
            <Text style={[s.setNum, item.done && s.setNumDone]}>{index + 1}</Text>
            <View style={[s.numInput, item.done && s.numInputDone]}>
                <TextInput
                    style={s.numText}
                    value={item.weight}
                    onChangeText={onChangeWeight}
                    keyboardType="numeric"
                    selectTextOnFocus
                    editable={!item.done}
                    placeholder="—"
                    placeholderTextColor="#333"
                />
            </View>
            <Text style={s.multiply}>×</Text>
            <View style={[s.numInput, item.done && s.numInputDone]}>
                <TextInput
                    style={s.numText}
                    value={item.reps}
                    onChangeText={onChangeReps}
                    keyboardType="numeric"
                    selectTextOnFocus
                    editable={!item.done}
                    placeholder="—"
                    placeholderTextColor="#333"
                />
            </View>
            <TouchableOpacity style={[s.checkBtn, item.done && s.checkBtnDone]} onPress={handleComplete}>
                <Ionicons name="checkmark" size={20} color={item.done ? '#000' : '#2a2a2a'} />
            </TouchableOpacity>
        </Animated.View>
    );
});

// ── STYLES ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },

    // Briefing
    briefingScroll: { padding: 20, paddingBottom: 40 },
    briefingHeader: { borderRadius: 16, padding: 16, marginBottom: 16 },
    briefingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    briefingTitle: { color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 2, flex: 1 },
    weekPill: { backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
    weekPillText: { color: '#FFD700', fontSize: 10, fontWeight: '900' },
    briefingCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#111', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
    faseDot: { width: 10, height: 10, borderRadius: 5, marginRight: 14, marginTop: 4 },
    briefingCardLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
    briefingCardValue: { color: 'white', fontSize: 20, fontWeight: '900', marginBottom: 4 },
    briefingCardDesc: { color: '#888', fontSize: 12, lineHeight: 17 },
    rpeCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 2, borderColor: '#333' },
    rpeNumber: { color: 'white', fontSize: 22, fontWeight: '900' },
    briefingExTitle: { color: '#444', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10, marginTop: 4 },
    briefingExRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#111', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1a1a1a', gap: 12 },
    briefingExNum: { color: '#555', fontSize: 13, fontWeight: '900', width: 20, paddingTop: 2 },
    briefingExName: { color: 'white', fontSize: 14, fontWeight: '700', marginBottom: 3 },
    briefingExMeta: { color: '#666', fontSize: 11 },
    briefingTecnicaPill: { backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 5, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)' },
    briefingTecnicaText: { color: '#FFD700', fontSize: 10, fontWeight: '900' },
    startBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 20 },
    startBtnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
    startBtnText: { color: 'black', fontWeight: '900', fontSize: 16 },

    // Phase banner
    phaseBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
    phaseDot: { width: 8, height: 8, borderRadius: 4 },
    phaseText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, flex: 1 },
    rpePill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    rpeText: { fontSize: 10, fontWeight: '900' },
    phaseRestHint: { color: '#444', fontSize: 10, fontWeight: '700' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
    headerMid: { alignItems: 'center' },
    timerText: { color: '#fff', fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
    exCounter: { color: '#444', fontSize: 11, fontWeight: '700', marginTop: 2 },

    // Nav dots
    navDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 16 },
    navDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1f1f1f' },
    navDotActive: { width: 20, backgroundColor: '#63ff15' },
    navDotDone: { backgroundColor: '#2a4a1a' },

    // Exercise info
    exInfo: { paddingHorizontal: 20, marginBottom: 12 },
    exName: { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 30, marginBottom: 6 },
    exMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    exMuscle: { color: '#555', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    exBadge: { backgroundColor: 'rgba(99,255,21,0.08)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    exBadgeText: { color: '#63ff15', fontSize: 11, fontWeight: '900' },

    // Ultimate hints
    ultimateHints: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    hintChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,215,0,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
    hintText: { color: '#FFD700', fontSize: 11, fontWeight: '700' },
    tecnicaBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,215,0,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)', marginBottom: 6, alignSelf: 'flex-start' },
    tecnicaText: { color: '#FFD700', fontSize: 11, fontWeight: '900' },
    notaText: { color: '#666', fontSize: 11, fontStyle: 'italic', lineHeight: 16 },

    // GIF panel
    gifPanel: { marginHorizontal: 20, marginBottom: 14 },
    gifToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(99,255,21,0.12)' },
    gifToggleText: { color: '#63ff15', fontSize: 13, fontWeight: '700' },
    gifBox: { marginTop: 6, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: '#1a1a1a', alignItems: 'center' },
    gifLoaderBox: { paddingVertical: 32, alignItems: 'center' },
    gifImage: { width: '100%', height: 220 },

    // Table
    tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 },
    colHead: { color: '#333', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    setList: { paddingHorizontal: 20, paddingBottom: 20 },

    setRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8, gap: 8, borderWidth: 1, borderColor: '#1a1a1a' },
    setRowDone: { backgroundColor: '#0d160d', borderColor: '#1a2f1a' },
    setNum: { width: 24, color: '#555', fontSize: 14, fontWeight: '900', textAlign: 'center' },
    setNumDone: { color: '#2a4a1a' },
    numInput: { flex: 1, backgroundColor: '#161616', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, borderWidth: 1, borderColor: '#1f1f1f', alignItems: 'center' },
    numInputDone: { backgroundColor: '#0d160d', borderColor: '#1a2f1a' },
    numText: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', width: '100%' },
    multiply: { color: '#333', fontSize: 16, fontWeight: '900', width: 12, textAlign: 'center' },
    checkBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#161616', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#222' },
    checkBtnDone: { backgroundColor: '#63ff15', borderColor: '#63ff15' },

    addSetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4, borderRadius: 14, borderWidth: 1, borderColor: '#1a1a1a', borderStyle: 'dashed' },
    addSetText: { color: '#444', fontSize: 13, fontWeight: '700' },

    // Rest banner
    restBanner: { backgroundColor: '#0d160d', borderTopWidth: 1, borderTopColor: 'rgba(99,255,21,0.15)' },
    restRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
    restLabel: { color: '#555', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2 },
    restTime: { color: '#fff', fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
    skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,255,21,0.08)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99,255,21,0.15)' },
    skipText: { color: '#63ff15', fontSize: 12, fontWeight: '900' },
    restBarBg: { height: 3, backgroundColor: '#000' },
    restBarFill: { height: 3, backgroundColor: '#63ff15' },
});
