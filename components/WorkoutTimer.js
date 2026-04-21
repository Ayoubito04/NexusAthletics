import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity,
    Animated, Vibration, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

export default function WorkoutTimer({ visible, exercises = [], onClose, onComplete }) {
    const [exIdx, setExIdx] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const [isResting, setIsResting] = useState(false);
    const [restSecs, setRestSecs] = useState(0);
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    // Historial de sets completados: { exIdx, set, weight, reps }[]
    const [setLog, setSetLog] = useState([]);
    // Todos los resultados para onComplete
    const [allResults, setAllResults] = useState([]);
    const [totalSecs, setTotalSecs] = useState(0);

    const restInterval = useRef(null);
    const totalInterval = useRef(null);
    const restBarAnim = useRef(new Animated.Value(1)).current;

    const ex = exercises[exIdx];
    const sets = ex?.sets || 3;
    const restDuration = ex?.restTime || 60;

    // Inicializar inputs al cambiar ejercicio
    useEffect(() => {
        if (!ex) return;
        const targetReps = ex.reps?.toString().split('-')[0] || '12';
        setReps(targetReps);
        setWeight(ex.weight ? ex.weight.toString() : '');
    }, [exIdx]);

    // Pre-rellenar peso del set anterior al mismo ejercicio
    useEffect(() => {
        if (currentSet > 1) {
            const prev = [...setLog].reverse().find(s => s.exIdx === exIdx);
            if (prev) {
                setWeight(prev.weight.toString());
                setReps(prev.reps.toString());
            }
        }
    }, [currentSet]);

    // Cronómetro total
    useEffect(() => {
        if (visible) {
            totalInterval.current = setInterval(() => setTotalSecs(s => s + 1), 1000);
        }
        return () => clearInterval(totalInterval.current);
    }, [visible]);

    // Timer de descanso
    useEffect(() => {
        clearInterval(restInterval.current);
        if (!isResting) return;

        restBarAnim.setValue(1);
        Animated.timing(restBarAnim, {
            toValue: 0,
            duration: restDuration * 1000,
            useNativeDriver: false,
        }).start();

        restInterval.current = setInterval(() => {
            setRestSecs(s => {
                if (s <= 1) {
                    clearInterval(restInterval.current);
                    finishRest();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);

        return () => clearInterval(restInterval.current);
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
        Vibration.vibrate([0, 200, 100, 200]);
        playSound();
        setIsResting(false);
        restBarAnim.setValue(1);
    };

    const skipRest = () => {
        clearInterval(restInterval.current);
        finishRest();
    };

    const completeSet = () => {
        const w = parseFloat(weight) || 0;
        const r = parseInt(reps) || 0;
        const entry = { exIdx, set: currentSet, weight: w, reps: r, exerciseName: ex.name, muscle: ex.muscle };
        const newLog = [...setLog, entry];
        setSetLog(newLog);
        setAllResults(prev => [...prev, entry]);
        Vibration.vibrate(80);

        if (currentSet < sets) {
            setCurrentSet(s => s + 1);
            setRestSecs(restDuration);
            setIsResting(true);
        } else {
            goNextExercise(newLog);
        }
    };

    const goNextExercise = (log) => {
        if (exIdx < exercises.length - 1) {
            setExIdx(i => i + 1);
            setCurrentSet(1);
            setIsResting(false);
            Vibration.vibrate([0, 100, 50, 100]);
        } else {
            finishWorkout(log);
        }
    };

    const finishWorkout = (log) => {
        clearInterval(totalInterval.current);
        clearInterval(restInterval.current);
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
        playSound();
        if (onComplete) {
            onComplete({
                duration: totalSecs,
                exercises: exercises.length,
                completedSets: (log || allResults).length,
                sessionData: log || allResults,
            });
        }
    };

    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const adjWeight = (delta) => setWeight(w => String(Math.max(0, Math.round(((parseFloat(w) || 0) + delta) * 4) / 4)));
    const adjReps = (delta) => setReps(r => String(Math.max(1, (parseInt(r) || 0) + delta)));

    // Sets de este ejercicio ya completados
    const doneSets = setLog.filter(s => s.exIdx === exIdx);

    if (!visible || !ex) return null;

    const barWidth = restBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>

                {/* ── HEADER ── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerProgress}>{exIdx + 1} / {exercises.length}</Text>
                        <Text style={styles.headerTime}>{fmt(totalSecs)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => goNextExercise()} style={styles.skipExBtn}>
                        <Ionicons name="play-skip-forward" size={20} color="#555" />
                    </TouchableOpacity>
                </View>

                {/* ── NOMBRE EJERCICIO ── */}
                <View style={styles.exHeader}>
                    <Text style={styles.exName} numberOfLines={1}>{ex.name}</Text>
                    <Text style={styles.exMuscle}>{ex.muscle || 'General'}</Text>
                </View>

                {/* ── DOTS DE SERIES ── */}
                <View style={styles.dotsRow}>
                    {[...Array(sets)].map((_, i) => {
                        const done = i < currentSet - 1 || (i === currentSet - 1 && isResting && currentSet > 1);
                        const active = i === currentSet - 1 && !isResting;
                        return (
                            <View key={i} style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                                {done
                                    ? <Ionicons name="checkmark" size={16} color="#000" />
                                    : <Text style={[styles.dotNum, active && styles.dotNumActive]}>{i + 1}</Text>
                                }
                            </View>
                        );
                    })}
                </View>

                {/* ── HISTORIAL DE SETS COMPLETADOS ── */}
                <View style={styles.logRow}>
                    {doneSets.length === 0
                        ? <Text style={styles.logEmpty}>Las series completadas aparecen aquí</Text>
                        : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {doneSets.map((s, i) => (
                                <View key={i} style={styles.logChip}>
                                    <Text style={styles.logChipLabel}>S{s.set}</Text>
                                    <Text style={styles.logChipVal}>{s.weight > 0 ? `${s.weight}kg` : 'PC'} × {s.reps}</Text>
                                </View>
                            ))}
                          </ScrollView>
                    }
                </View>

                {/* ── INPUTS PESO / REPS ── */}
                <View style={styles.inputsArea}>
                    {/* PESO */}
                    <View style={styles.inputBlock}>
                        <Text style={styles.inputLabel}>PESO (KG)</Text>
                        <View style={styles.inputRow}>
                            <TouchableOpacity style={styles.adjBtn} onPress={() => adjWeight(-2.5)}>
                                <Text style={styles.adjText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.inputVal}>{weight || '0'}</Text>
                            <TouchableOpacity style={styles.adjBtn} onPress={() => adjWeight(2.5)}>
                                <Text style={styles.adjText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputDivider} />

                    {/* REPS */}
                    <View style={styles.inputBlock}>
                        <Text style={styles.inputLabel}>REPS</Text>
                        <View style={styles.inputRow}>
                            <TouchableOpacity style={styles.adjBtn} onPress={() => adjReps(-1)}>
                                <Text style={styles.adjText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.inputVal}>{reps || '0'}</Text>
                            <TouchableOpacity style={styles.adjBtn} onPress={() => adjReps(1)}>
                                <Text style={styles.adjText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── BOTÓN PRINCIPAL ── */}
                <TouchableOpacity
                    style={[styles.mainBtn, isResting && styles.mainBtnDisabled]}
                    onPress={isResting ? null : completeSet}
                    activeOpacity={isResting ? 1 : 0.8}
                >
                    <LinearGradient
                        colors={isResting ? ['#1a1a1a', '#1a1a1a'] : ['#63ff15', '#4ad912']}
                        style={styles.mainBtnGrad}
                    >
                        <Ionicons name="checkmark-circle" size={28} color={isResting ? '#333' : '#000'} />
                        <Text style={[styles.mainBtnText, isResting && { color: '#333' }]}>
                            {isResting
                                ? 'DESCANSANDO...'
                                : currentSet < sets
                                    ? `SERIE ${currentSet} COMPLETADA`
                                    : 'ÚLTIMO SET — TERMINAR'
                            }
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* ── BANNER DE DESCANSO ── */}
                {isResting && (
                    <View style={styles.restBanner}>
                        <View style={styles.restBannerTop}>
                            <View style={styles.restLeft}>
                                <Text style={styles.restLabel}>DESCANSO</Text>
                                <Text style={styles.restTime}>{fmt(restSecs)}</Text>
                            </View>
                            <TouchableOpacity style={styles.skipBtn} onPress={skipRest}>
                                <Text style={styles.skipText}>SALTAR</Text>
                                <Ionicons name="play-forward" size={16} color="#63ff15" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.restBarBg}>
                            <Animated.View style={[styles.restBarFill, { width: barWidth }]} />
                        </View>
                    </View>
                )}

            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { alignItems: 'center' },
    headerProgress: { color: '#555', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    headerTime: { color: '#63ff15', fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
    skipExBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },

    // Exercise header
    exHeader: { paddingHorizontal: 24, marginBottom: 20 },
    exName: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 34 },
    exMuscle: { color: '#63ff15', fontSize: 13, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

    // Set dots
    dotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 24, marginBottom: 20 },
    dot: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#111', borderWidth: 2, borderColor: '#222', justifyContent: 'center', alignItems: 'center' },
    dotActive: { borderColor: '#63ff15', backgroundColor: 'rgba(99,255,21,0.08)' },
    dotDone: { backgroundColor: '#63ff15', borderColor: '#63ff15' },
    dotNum: { color: '#444', fontSize: 17, fontWeight: '900' },
    dotNumActive: { color: '#63ff15' },

    // Set log history
    logRow: { height: 44, paddingHorizontal: 24, marginBottom: 24, justifyContent: 'center' },
    logEmpty: { color: '#2a2a2a', fontSize: 12, fontStyle: 'italic' },
    logChip: { backgroundColor: '#161616', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
    logChipLabel: { color: '#555', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    logChipVal: { color: '#63ff15', fontSize: 13, fontWeight: '900', marginTop: 2 },

    // Inputs
    inputsArea: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#111', borderRadius: 24, borderWidth: 1, borderColor: '#1e1e1e', marginBottom: 24, flex: 1, maxHeight: 160 },
    inputBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
    inputDivider: { width: 1, backgroundColor: '#1e1e1e', marginVertical: 20 },
    inputLabel: { color: '#444', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    adjBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
    adjText: { color: '#63ff15', fontSize: 26, fontWeight: '900', lineHeight: 28 },
    inputVal: { color: '#fff', fontSize: 36, fontWeight: '900', minWidth: 60, textAlign: 'center', fontVariant: ['tabular-nums'] },

    // Main button
    mainBtn: { marginHorizontal: 20, borderRadius: 22, overflow: 'hidden', marginBottom: 12, elevation: 10, shadowColor: '#63ff15', shadowOpacity: 0.3, shadowRadius: 12 },
    mainBtnDisabled: { elevation: 0, shadowOpacity: 0 },
    mainBtnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 20 },
    mainBtnText: { color: '#000', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },

    // Rest banner
    restBanner: { marginHorizontal: 20, marginBottom: 10, backgroundColor: '#0d1a0d', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(99,255,21,0.2)', overflow: 'hidden' },
    restBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
    restLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    restLabel: { color: '#555', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    restTime: { color: '#fff', fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'] },
    skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,255,21,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    skipText: { color: '#63ff15', fontSize: 12, fontWeight: '900' },
    restBarBg: { height: 4, backgroundColor: '#0a0a0a' },
    restBarFill: { height: 4, backgroundColor: '#63ff15', borderRadius: 2 },
});
