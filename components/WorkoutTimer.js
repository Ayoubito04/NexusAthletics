import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity,
    Animated, Vibration, Modal, FlatList, TextInput,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const REST_DEFAULT = 90;

// Inicializa las filas de series para un ejercicio
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

export default function WorkoutTimer({ visible, exercises = [], onClose, onComplete }) {
    const [exIdx, setExIdx] = useState(0);
    const [setsData, setSetsData] = useState([]);
    const [totalSecs, setTotalSecs] = useState(0);
    const [restSecs, setRestSecs] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const [allResults, setAllResults] = useState([]);

    const restProgress = useRef(new Animated.Value(0)).current;
    const restAnim = useRef(null);
    const totalRef = useRef(null);
    const restRef = useRef(null);

    const ex = exercises[exIdx];

    // Init sets when exercise changes
    useEffect(() => {
        if (ex) setSetsData(initSets(ex));
        setIsResting(false);
        clearInterval(restRef.current);
        restProgress.setValue(0);
    }, [exIdx, exercises]);

    // Total workout timer
    useEffect(() => {
        if (!visible) return;
        totalRef.current = setInterval(() => setTotalSecs(s => s + 1), 1000);
        return () => clearInterval(totalRef.current);
    }, [visible]);

    // Rest countdown
    useEffect(() => {
        clearInterval(restRef.current);
        if (!isResting) { restProgress.setValue(0); return; }

        restProgress.setValue(1);
        restAnim.current = Animated.timing(restProgress, {
            toValue: 0, duration: REST_DEFAULT * 1000, useNativeDriver: false,
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
                setTimeout(() => {
                    setExIdx(i => i + 1);
                    Vibration.vibrate([0, 80, 40, 80]);
                }, 300);
            } else {
                setTimeout(() => finishWorkout(newResults), 400);
            }
        } else {
            setRestSecs(REST_DEFAULT);
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

    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const restBarWidth = restProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    if (!visible || !ex) return null;

    const completedCount = setsData.filter(s => s.done).length;

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={s.container}>
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

                {/* ── EXERCISE NAV DOTS ── */}
                {exercises.length > 1 && (
                    <View style={s.navDots}>
                        {exercises.map((_, i) => {
                            const allDone = i < exIdx;
                            const active = i === exIdx;
                            return (
                                <TouchableOpacity key={i} onPress={() => setExIdx(i)}>
                                    <View style={[s.navDot, allDone && s.navDotDone, active && s.navDotActive]} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* ── EXERCISE NAME ── */}
                <View style={s.exInfo}>
                    <Text style={s.exName} numberOfLines={1}>{ex.name}</Text>
                    <View style={s.exMeta}>
                        <Text style={s.exMuscle}>{ex.muscle || 'General'}</Text>
                        <View style={s.exBadge}>
                            <Text style={s.exBadgeText}>{completedCount}/{setsData.length} series</Text>
                        </View>
                    </View>
                </View>

                {/* ── TABLA DE SERIES ── */}
                <View style={s.tableHeader}>
                    <Text style={[s.colHead, { width: 32 }]}>SET</Text>
                    <Text style={[s.colHead, { flex: 1, textAlign: 'center' }]}>KG</Text>
                    <Text style={[s.colHead, { width: 12, textAlign: 'center', color: 'transparent' }]}>×</Text>
                    <Text style={[s.colHead, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                    <View style={{ width: 52 }} />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
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
                                <Text style={s.restLabel}>DESCANSO</Text>
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
                {item.done
                    ? <Ionicons name="checkmark" size={20} color="#000" />
                    : <Ionicons name="checkmark" size={20} color="#2a2a2a" />
                }
            </TouchableOpacity>
        </Animated.View>
    );
});

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },

    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    iconBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#111', justifyContent: 'center', alignItems: 'center',
    },
    headerMid: { alignItems: 'center' },
    timerText: { color: '#fff', fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
    exCounter: { color: '#444', fontSize: 11, fontWeight: '700', marginTop: 2 },

    navDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 16 },
    navDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1f1f1f' },
    navDotActive: { width: 20, backgroundColor: '#63ff15' },
    navDotDone: { backgroundColor: '#2a4a1a' },

    exInfo: { paddingHorizontal: 20, marginBottom: 20 },
    exName: { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 30, marginBottom: 6 },
    exMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    exMuscle: { color: '#555', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    exBadge: { backgroundColor: 'rgba(99,255,21,0.08)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    exBadgeText: { color: '#63ff15', fontSize: 11, fontWeight: '900' },

    tableHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, marginBottom: 8,
    },
    colHead: { color: '#333', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    setList: { paddingHorizontal: 20, paddingBottom: 20 },

    setRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#111', borderRadius: 16,
        paddingVertical: 10, paddingHorizontal: 14,
        marginBottom: 8, gap: 8,
        borderWidth: 1, borderColor: '#1a1a1a',
    },
    setRowDone: { backgroundColor: '#0d160d', borderColor: '#1a2f1a' },
    setNum: { width: 24, color: '#555', fontSize: 14, fontWeight: '900', textAlign: 'center' },
    setNumDone: { color: '#2a4a1a' },

    numInput: {
        flex: 1, backgroundColor: '#161616', borderRadius: 12,
        paddingVertical: 10, paddingHorizontal: 6,
        borderWidth: 1, borderColor: '#1f1f1f', alignItems: 'center',
    },
    numInputDone: { backgroundColor: '#0d160d', borderColor: '#1a2f1a' },
    numText: {
        color: '#fff', fontSize: 20, fontWeight: '900',
        textAlign: 'center', width: '100%',
    },
    multiply: { color: '#333', fontSize: 16, fontWeight: '900', width: 12, textAlign: 'center' },

    checkBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#161616', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#222',
    },
    checkBtnDone: { backgroundColor: '#63ff15', borderColor: '#63ff15' },

    addSetBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 14, marginTop: 4,
        borderRadius: 14, borderWidth: 1, borderColor: '#1a1a1a',
        borderStyle: 'dashed',
    },
    addSetText: { color: '#444', fontSize: 13, fontWeight: '700' },

    restBanner: {
        backgroundColor: '#0d160d',
        borderTopWidth: 1, borderTopColor: 'rgba(99,255,21,0.15)',
    },
    restRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
    },
    restLabel: { color: '#555', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2 },
    restTime: { color: '#fff', fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
    skipBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(99,255,21,0.08)', paddingHorizontal: 16,
        paddingVertical: 10, borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(99,255,21,0.15)',
    },
    skipText: { color: '#63ff15', fontSize: 12, fontWeight: '900' },
    restBarBg: { height: 3, backgroundColor: '#000' },
    restBarFill: { height: 3, backgroundColor: '#63ff15' },
});
