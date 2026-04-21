import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Dimensions, Modal, TextInput, Platform, FlatList } from 'react-native';
import NexusAlert from '../components/NexusAlert';
import WorkoutTimer from '../components/WorkoutTimer';
import WorkoutReview from '../components/WorkoutReview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

const { width, height } = Dimensions.get('window');

const QUICK_EXERCISES = [
    { name: 'Sentadillas', muscle: 'Piernas', reps: 12, sets: 3, weight: 0 },
    { name: 'Press Banca', muscle: 'Pecho', reps: 10, sets: 4, weight: 0 },
    { name: 'Peso Muerto', muscle: 'Espalda', reps: 8, sets: 3, weight: 0 },
    { name: 'Press Militar', muscle: 'Hombros', reps: 10, sets: 3, weight: 0 },
    { name: 'Dominadas', muscle: 'Espalda', reps: 10, sets: 3, weight: 0 },
    { name: 'Zancadas', muscle: 'Piernas', reps: 12, sets: 3, weight: 0 },
    { name: 'Plancha', muscle: 'Core', reps: 60, sets: 3, weight: 0 },
    { name: 'Bíceps Curls', muscle: 'Brazos', reps: 12, sets: 3, weight: 0 },
];

const FASE_COLORS = {
    'Acumulación': '#3b82f6',
    'Intensificación': '#f59e0b',
    'Peak': '#ef4444',
    'Deload': '#22c55e',
};

const FASE_SHORT = {
    'Acumulación': 'ACU',
    'Intensificación': 'INT',
    'Peak': 'PKA',
    'Deload': 'DEL',
};

/**
 * TrainingCalendar Component
 * Enhanced UI with Elite Cyberpunk aesthetics, Ultimate mesocycle support, and improved accessibility.
 */
export default function TrainingCalendar({ navigation }) {
    const [viewMode, setViewMode] = useState('month');
    const [completedDays, setCompletedDays] = useState([]);
    const [assignedRoutines, setAssignedRoutines] = useState({});
    const [currentDate, setCurrentDate] = useState(new Date());
    const [streak, setStreak] = useState(0);
    const [showAnimation, setShowAnimation] = useState(false);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDateKey, setSelectedDateKey] = useState(null);
    const [customTitle, setCustomTitle] = useState('');
    const [selectedExercises, setSelectedExercises] = useState([]);

    // Day detail modal for Elite/Ultimate days (read-only)
    const [dayDetailRoutine, setDayDetailRoutine] = useState(null);

    // WorkoutTimer states
    const [timerVisible, setTimerVisible] = useState(false);
    const [workoutExercises, setWorkoutExercises] = useState([]);

    // Review states
    const [reviewVisible, setReviewVisible] = useState(false);
    const [sessionDataForReview, setSessionDataForReview] = useState(null);

    // Copy/Paste State
    const [copiedRoutine, setCopiedRoutine] = useState(null);

    // NexusAlert State
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: 'ACEPTAR' });

    const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'ACEPTAR') => {
        setAlert({
            visible: true,
            title,
            message,
            type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setAlert(prev => ({ ...prev, visible: false }));
            },
            onCancel: onCancel ? () => {
                onCancel();
                setAlert(prev => ({ ...prev, visible: false }));
            } : null,
            confirmText
        });
    };

    const pulseAnim = new Animated.Value(1);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const savedDays = await AsyncStorage.getItem('completed_days');
            if (savedDays) setCompletedDays(JSON.parse(savedDays));
            const savedRoutines = await AsyncStorage.getItem('assigned_routines');
            if (savedRoutines) setAssignedRoutines(JSON.parse(savedRoutines));
            const savedStreak = await AsyncStorage.getItem('streak_count');
            if (savedStreak) setStreak(parseInt(savedStreak));
        } catch (e) { console.log(e); }
    };

    const resetModal = () => {
        setModalVisible(false);
        setCustomTitle('');
        setSelectedExercises([]);
    };

    const assignRoutine = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newRoutines = { ...assignedRoutines };
        newRoutines[selectedDateKey] = {
            title: customTitle || 'Sesión Manual',
            exercises: [...selectedExercises],
            isElite: false // Manual override
        };
        setAssignedRoutines(newRoutines);
        await AsyncStorage.setItem('assigned_routines', JSON.stringify(newRoutines));
        resetModal();
    };

    const copyRoutine = (key) => {
        const routine = assignedRoutines[key];
        if (routine) {
            setCopiedRoutine(JSON.parse(JSON.stringify(routine)));
            Haptics.selectionAsync();
            showAlert("Copiado", "Rutina copiada. Ahora selecciona un día vacío para pegarla.", "info");
        }
    };

    const pasteRoutine = async (key) => {
        if (!copiedRoutine) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newRoutines = { ...assignedRoutines };
        newRoutines[key] = { ...copiedRoutine };
        setAssignedRoutines(newRoutines);
        await AsyncStorage.setItem('assigned_routines', JSON.stringify(newRoutines));
        showAlert("Pegado", "Rutina aplicada correctamente.", "info");
    };

    const removeRoutine = async (key) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showAlert(
            "Deshacer Rutina",
            "¿Quieres borrar esta rutina del calendario? Esto también quitará cualquier plan de la IA en este día.",
            "warning",
            async () => {
                const newRoutines = { ...assignedRoutines };
                delete newRoutines[key];
                setAssignedRoutines(newRoutines);
                await AsyncStorage.setItem('assigned_routines', JSON.stringify(newRoutines));
            },
            () => { },
            "BORRAR"
        );
    };

    const toggleDayCompletion = async (dayKey) => {
        if (!assignedRoutines[dayKey]) return;
        let newList = [...completedDays];
        const index = newList.indexOf(dayKey);
        if (index > -1) {
            newList.splice(index, 1);
        } else {
            newList.push(dayKey);
            triggerStreakAnimation();
        }
        setCompletedDays(newList);
        await AsyncStorage.setItem('completed_days', JSON.stringify(newList));

        const todayKey = new Date().toISOString().split('T')[0];
        if (dayKey === todayKey && index === -1) {
            const newStreak = streak + 1;
            setStreak(newStreak);
            await AsyncStorage.setItem('streak_count', newStreak.toString());
        }
    };

    const triggerStreakAnimation = () => {
        setShowAnimation(true);
        Animated.sequence([
            Animated.spring(pulseAnim, { toValue: 1.5, friction: 3, useNativeDriver: true }),
            Animated.spring(pulseAnim, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start(() => setTimeout(() => setShowAnimation(false), 2000));
    };

    const openDayPicker = (key) => {
        setSelectedDateKey(key);
        const existing = assignedRoutines[key];
        if (existing && existing.isElite) {
            // Elite/Ultimate days → open read-only detail sheet
            setDayDetailRoutine(existing);
            return;
        }
        if (existing) {
            setCustomTitle(existing.title);
            setSelectedExercises(existing.exercises || []);
        } else {
            setCustomTitle('');
            setSelectedExercises([]);
        }
        setModalVisible(true);
    };

    const startWorkout = (key) => {
        const routine = assignedRoutines[key];
        if (!routine) {
            showAlert("Sin Rutina", "Asigna una rutina a este día primero", "warning");
            return;
        }

        const exercises = routine.exercises && routine.exercises.length > 0
            ? routine.exercises
            : [
                { name: routine.title || 'Entrenamiento', muscle: 'General', sets: 3, reps: '12-15', restTime: 60 },
                { name: 'Press Banca', muscle: 'Pecho', sets: 4, reps: '8-10', restTime: 90 },
                { name: 'Dominadas', muscle: 'Espalda', sets: 3, reps: '10-12', restTime: 90 },
                { name: 'Sentadillas', muscle: 'Piernas', sets: 4, reps: '12-15', restTime: 120 },
            ];

        setWorkoutExercises(exercises);
        setTimerVisible(true);
    };

    const handleWorkoutComplete = async (stats) => {
        setTimerVisible(false);
        setSessionDataForReview(stats);
        setReviewVisible(true);

        const todayKey = new Date().toISOString().split('T')[0];
        await toggleDayCompletion(todayKey);

        // Sync workout sets to backend for strength tracking & rankings
        try {
            const token = await AsyncStorage.getItem('token');
            if (token && workoutExercises.length > 0) {
                await fetch(`${BACKEND_URL}/strength/log`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        exercises: workoutExercises,
                        duration: stats?.duration || null
                    })
                });
            }
        } catch (_) {
            // Silently fail — local data is already saved
        }
    };

    const handleReviewConfirm = () => {
        setReviewVisible(false);
        setSessionDataForReview(null);
    };

    // ─── Stats bar helpers ───────────────────────────────────────────────────
    const getMonthStats = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const todayKey = new Date().toISOString().split('T')[0];

        let planned = 0;
        let completed = 0;

        Object.keys(assignedRoutines).forEach(key => {
            const d = new Date(key);
            if (d.getFullYear() === year && d.getMonth() === month) {
                planned++;
                if (completedDays.includes(key)) completed++;
            }
        });

        return { planned, completed, streak };
    };

    const renderStatBar = () => {
        const { planned, completed, streak: currentStreak } = getMonthStats();
        return (
            <View style={styles.statBar}>
                <View style={styles.statCard}>
                    <Text style={styles.statVal}>{planned}</Text>
                    <Text style={styles.statLabel}>PLANIFICADOS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                    <Text style={[styles.statVal, { color: '#63ff15' }]}>{completed}</Text>
                    <Text style={styles.statLabel}>COMPLETADOS</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                    <Text style={[styles.statVal, { color: '#FFD700' }]}>{currentStreak}</Text>
                    <Text style={styles.statLabel}>RACHA 🔥</Text>
                </View>
            </View>
        );
    };

    // ─── Month View ──────────────────────────────────────────────────────────
    const renderMonthView = () => {
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
        const days = [];
        const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

        const headers = dayNames.map(d => <Text key={d} style={styles.dayHeader}>{d}</Text>);

        for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) {
            days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            const key = date.toISOString().split('T')[0];
            const isCompleted = completedDays.includes(key);
            const routine = assignedRoutines[key];
            const isToday = key === new Date().toISOString().split('T')[0];

            let accessibilityLabel = `${i} de ${currentDate.toLocaleString('es-ES', { month: 'long' })}`;
            if (isToday) accessibilityLabel += ", hoy";
            if (routine) accessibilityLabel += `, rutina: ${routine.title}`;
            if (isCompleted) accessibilityLabel += ", completado";

            const isUltimate = routine?.isUltimate;
            const faseColor = isUltimate ? (FASE_COLORS[routine.fase] || '#FFD700') : null;

            days.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.dayCell,
                        isCompleted && styles.completedDay,
                        isToday && styles.todayDay,
                        isUltimate && { borderLeftWidth: 2, borderLeftColor: '#FFD700' },
                    ]}
                    onPress={() => openDayPicker(key)}
                    onLongPress={() => removeRoutine(key)}
                    accessibilityLabel={accessibilityLabel}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                >
                    <Text style={[styles.dayText, isCompleted && styles.completedDayText, isToday && { color: '#63ff15' }]}>{i}</Text>
                    {routine && (
                        <>
                            <View style={styles.routineIndicator}>
                                {isUltimate
                                    ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFD700' }} />
                                    : <Ionicons name="sparkles" size={8} color={isCompleted ? "black" : "#63ff15"} />
                                }
                            </View>
                            {isUltimate && FASE_SHORT[routine.fase] && (
                                <Text style={{ fontSize: 7, color: faseColor, fontWeight: '900', marginTop: 1 }}>
                                    {FASE_SHORT[routine.fase]}
                                </Text>
                            )}
                        </>
                    )}
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.calendarGrid}>
                <View style={styles.weekRow}>{headers}</View>
                <View style={[styles.daysGrid, { opacity: 1 }]}>{days}</View>
            </View>
        );
    };

    // ─── Week View ───────────────────────────────────────────────────────────
    const renderWeekView = () => {
        const start = new Date(currentDate);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(start.setDate(diff));

        return (
            <View style={styles.weekContainer}>
                {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + i);
                    const key = d.toISOString().split('T')[0];
                    const isCompleted = completedDays.includes(key);
                    const routine = assignedRoutines[key];
                    const isToday = key === new Date().toISOString().split('T')[0];
                    const isUltimate = routine?.isUltimate;
                    const isElitePro = routine?.isElite && !isUltimate;
                    const faseColor = isUltimate ? (FASE_COLORS[routine.fase] || '#FFD700') : null;

                    return (
                        <View
                            key={i}
                            style={[
                                styles.weekRowItem,
                                isToday && styles.todayRow,
                                isUltimate && styles.ultimateRow,
                                isElitePro && styles.eliteRow,
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.weekDateBox}
                                onPress={() => openDayPicker(key)}
                                accessibilityLabel={`Día ${d.getDate()}, ${d.toLocaleString('es-ES', { weekday: 'long' })}`}
                                accessibilityRole="button"
                            >
                                <Text style={styles.weekDayName}>{d.toLocaleString('es-ES', { weekday: 'short' }).toUpperCase()}</Text>
                                <Text style={styles.weekDayNum}>{d.getDate()}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.weekInfo}
                                onPress={() => openDayPicker(key)}
                                accessibilityLabel={routine ? `Rutina: ${routine.title}` : "Sin rutina, pulse para asignar"}
                                accessibilityRole="button"
                            >
                                {routine ? (
                                    isUltimate ? (
                                        <>
                                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }} numberOfLines={1}>{routine.title}</Text>
                                            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                                {routine.fase ? (
                                                    <View style={{ backgroundColor: faseColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{FASE_SHORT[routine.fase] || routine.fase}</Text>
                                                    </View>
                                                ) : null}
                                                {routine.rpe != null ? (
                                                    <View style={{ backgroundColor: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#333' }}>
                                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>RPE {routine.rpe}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                            <Text style={{ color: '#888', fontSize: 11, marginTop: 3 }}>
                                                {routine.exercises?.length || 0} ejercicios
                                            </Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{routine.title}</Text>
                                            <Text style={styles.weekSubText}>⚡ PLAN PRO</Text>
                                            <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                                                {routine.exercises?.length || 0} ejercicios
                                            </Text>
                                        </>
                                    )
                                ) : (
                                    <Text style={styles.noRoutineText}>Toque para asignar</Text>
                                )}
                            </TouchableOpacity>
                            <View style={styles.weekActions}>
                                {routine ? (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => copyRoutine(key)}
                                            accessibilityLabel="Copiar rutina"
                                            accessibilityRole="button"
                                        >
                                            <Ionicons name="copy-outline" size={22} color="#00F0FF" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => startWorkout(key)}
                                            style={styles.playBtn}
                                            accessibilityLabel="Iniciar entrenamiento"
                                            accessibilityRole="button"
                                        >
                                            <Ionicons name="play-circle" size={32} color={isUltimate ? '#FFD700' : '#63ff15'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => removeRoutine(key)}
                                            accessibilityLabel="Eliminar rutina"
                                            accessibilityRole="button"
                                        >
                                            <Ionicons name="trash-outline" size={22} color="#ff4d4d" />
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    copiedRoutine && (
                                        <TouchableOpacity
                                            onPress={() => pasteRoutine(key)}
                                            accessibilityLabel="Pegar rutina"
                                            accessibilityRole="button"
                                            style={styles.pasteBtn}
                                        >
                                            <Ionicons name="clipboard-outline" size={28} color="#63ff15" />
                                        </TouchableOpacity>
                                    )
                                )}
                                <TouchableOpacity
                                    onPress={() => toggleDayCompletion(key)}
                                    accessibilityLabel={isCompleted ? "Marcar como no completado" : "Marcar como completado"}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: isCompleted }}
                                >
                                    <Ionicons name={isCompleted ? "checkmark-circle" : "ellipse-outline"} size={32} color={isCompleted ? "#63ff15" : "#333"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    // ─── Day Detail Modal (Elite / Ultimate — read-only) ─────────────────────
    const dayDetailVisible = !!dayDetailRoutine;
    const detailIsUltimate = dayDetailRoutine?.isUltimate;
    const detailFaseColor = detailIsUltimate ? (FASE_COLORS[dayDetailRoutine?.fase] || '#FFD700') : '#63ff15';

    const renderDayDetailModal = () => (
        <Modal visible={dayDetailVisible} transparent animationType="slide" onRequestClose={() => setDayDetailRoutine(null)}>
            <View style={styles.modalOverlay}>
                <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[styles.modalContent, { borderTopColor: detailIsUltimate ? '#FFD700' : '#63ff15', borderTopWidth: 2 }]}>
                    <View style={styles.modalBar} />

                    {/* Header */}
                    <View style={styles.modalHead}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={[styles.modalTitle, { fontSize: 20, color: detailIsUltimate ? '#FFD700' : '#63ff15' }]} numberOfLines={2}>
                                {dayDetailRoutine?.title}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setDayDetailRoutine(null)} accessibilityLabel="Cerrar" accessibilityRole="button">
                            <Ionicons name="close-circle" size={32} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {/* Ultimate badges row */}
                    {detailIsUltimate && (
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                            {dayDetailRoutine.fase ? (
                                <View style={{ backgroundColor: detailFaseColor, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 }}>
                                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{dayDetailRoutine.fase}</Text>
                                </View>
                            ) : null}
                            {dayDetailRoutine.semanaNum != null ? (
                                <View style={{ backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#333' }}>
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Semana {dayDetailRoutine.semanaNum}</Text>
                                </View>
                            ) : null}
                            {dayDetailRoutine.rpe != null ? (
                                <View style={{ backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: detailFaseColor }}>
                                    <Text style={{ color: detailFaseColor, fontWeight: '900', fontSize: 12 }}>RPE {dayDetailRoutine.rpe}</Text>
                                </View>
                            ) : null}
                        </View>
                    )}

                    {/* Exercise list */}
                    <Text style={[styles.label, { marginBottom: 8 }]}>EJERCICIOS ({(dayDetailRoutine?.exercises || []).length})</Text>
                    <ScrollView style={{ flex: 1, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
                        {(dayDetailRoutine?.exercises || []).map((ex, idx) => (
                            <View key={idx} style={styles.detailExItem}>
                                <Text style={styles.detailExName} numberOfLines={2}>{ex.name}</Text>
                                <View style={[styles.detailExBadge, { backgroundColor: detailIsUltimate ? 'rgba(255,215,0,0.12)' : 'rgba(99,255,21,0.12)', borderColor: detailIsUltimate ? 'rgba(255,215,0,0.35)' : 'rgba(99,255,21,0.35)' }]}>
                                    <Text style={{ color: detailIsUltimate ? '#FFD700' : '#63ff15', fontSize: 13, fontWeight: '900' }}>
                                        {ex.sets}×{ex.reps}
                                    </Text>
                                </View>
                            </View>
                        ))}
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    {/* Start workout CTA */}
                    <TouchableOpacity
                        style={styles.saveMain}
                        onPress={() => {
                            setDayDetailRoutine(null);
                            startWorkout(selectedDateKey);
                        }}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={detailIsUltimate ? ['#FFD700', '#b8860b'] : ['#63ff15', '#4cc910']}
                            style={styles.saveGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.saveText}>INICIAR ENTRENAMIENTO</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Delete link */}
                    <TouchableOpacity
                        style={{ alignItems: 'center', marginTop: 14 }}
                        onPress={() => {
                            setDayDetailRoutine(null);
                            removeRoutine(selectedDateKey);
                        }}
                    >
                        <Text style={{ color: '#ff4d4d', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>ELIMINAR DEL CALENDARIO</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#0A0A0A', '#121212', '#0A0A0A']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    accessibilityLabel="Atrás"
                    accessibilityRole="button"
                >
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <BlurView intensity={30} tint="dark" style={styles.headerGlass}>
                    <View style={styles.modeToggle}>
                        <TouchableOpacity
                            style={[styles.mBtn, viewMode === 'month' && styles.mBtnActive]}
                            onPress={() => setViewMode('month')}
                            accessibilityLabel="Vista mensual"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.mText, viewMode === 'month' && styles.mTextActive]}>Mes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.mBtn, viewMode === 'week' && styles.mBtnActive]}
                            onPress={() => setViewMode('week')}
                            accessibilityLabel="Vista semanal"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.mText, viewMode === 'week' && styles.mTextActive]}>Semana</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.monthNav}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const d = new Date(currentDate);
                            viewMode === 'month' ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7);
                            setCurrentDate(d);
                        }}
                        accessibilityLabel="Anterior"
                        accessibilityRole="button"
                    >
                        <Ionicons name="chevron-back" size={24} color="#63ff15" />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>
                        {viewMode === 'month'
                            ? currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()
                            : 'CONTROL SEMANAL'
                        }
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const d = new Date(currentDate);
                            viewMode === 'month' ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7);
                            setCurrentDate(d);
                        }}
                        accessibilityLabel="Siguiente"
                        accessibilityRole="button"
                    >
                        <Ionicons name="chevron-forward" size={24} color="#63ff15" />
                    </TouchableOpacity>
                </View>

                {renderStatBar()}

                {viewMode === 'month' ? renderMonthView() : renderWeekView()}

                <BlurView intensity={20} tint="dark" style={styles.guideCardBlur}>
                    <View style={styles.guideCard}>
                        <Text style={styles.guideT}>GESTOR NEXUS ELITE</Text>
                        <Text style={styles.guideS}>
                            • <Text style={{ color: '#63ff15' }}>Pulsa</Text> una fecha para ver/editar sesión.{"\n"}
                            • <Text style={{ color: '#ff4d4d' }}>Manten pulsado</Text> para eliminar rutina.{"\n"}
                            • <Text style={{ color: '#FFD700' }}>Días Ultimate</Text> muestran fase y RPE del mesociclo.
                        </Text>
                    </View>
                </BlurView>
            </ScrollView>

            {/* Manual edit modal (non-Elite days only) */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalBar} />
                        <View style={styles.modalHead}>
                            <Text style={styles.modalTitle}>Editor de Sesión</Text>
                            <TouchableOpacity onPress={resetModal} accessibilityLabel="Cerrar" accessibilityRole="button">
                                <Ionicons name="close-circle" size={32} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>TÍTULO DE LA SESIÓN</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Powerlifting Day"
                            placeholderTextColor="#52525B"
                            value={customTitle}
                            onChangeText={setCustomTitle}
                        />

                        <View style={styles.quickLibSection}>
                            <Text style={styles.label}>BIBLIOTECA RÁPIDA</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickLib}>
                                {QUICK_EXERCISES.map((ex, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.quickChip}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSelectedExercises([...selectedExercises, { ...ex }]);
                                        }}
                                    >
                                        <Text style={styles.quickChipText}>{ex.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.exerciseSection}>
                            <View style={styles.exerciseHeader}>
                                <Text style={styles.label}>EJERCICIOS ({selectedExercises.length})</Text>
                                <TouchableOpacity
                                    style={styles.addExerciseBtn}
                                    onPress={() => {
                                        setSelectedExercises([...selectedExercises, {
                                            name: '',
                                            sets: 3,
                                            reps: 12,
                                            weight: 0,
                                            muscle: 'General'
                                        }]);
                                    }}
                                >
                                    <Ionicons name="add-circle" size={24} color="#63ff15" />
                                    <Text style={styles.addExerciseText}>AÑADIR</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.exerciseList} nestedScrollEnabled={true}>
                                {selectedExercises.map((ex, idx) => (
                                    <View key={idx} style={styles.exerciseItem}>
                                        <View style={styles.exRow}>
                                            <TextInput
                                                style={[styles.exInput, { flex: 2 }]}
                                                placeholder="Ejercicio"
                                                placeholderTextColor="#444"
                                                value={ex.name}
                                                onChangeText={(val) => {
                                                    const updated = [...selectedExercises];
                                                    updated[idx].name = val;
                                                    setSelectedExercises(updated);
                                                }}
                                            />
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const updated = selectedExercises.filter((_, i) => i !== idx);
                                                    setSelectedExercises(updated);
                                                }}
                                            >
                                                <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.exDetailsRow}>
                                            <View style={styles.exDetailGroup}>
                                                <Text style={styles.exDetailLabel}>SETS</Text>
                                                <TextInput
                                                    style={styles.exDetailInput}
                                                    keyboardType="numeric"
                                                    value={ex.sets ? ex.sets.toString() : '0'}
                                                    onChangeText={(val) => {
                                                        const updated = [...selectedExercises];
                                                        updated[idx].sets = parseInt(val) || 0;
                                                        setSelectedExercises(updated);
                                                    }}
                                                />
                                            </View>
                                            <View style={styles.exDetailGroup}>
                                                <Text style={styles.exDetailLabel}>REPS</Text>
                                                <TextInput
                                                    style={styles.exDetailInput}
                                                    keyboardType="numeric"
                                                    value={ex.reps ? ex.reps.toString() : '0'}
                                                    onChangeText={(val) => {
                                                        const updated = [...selectedExercises];
                                                        updated[idx].reps = parseInt(val) || 0;
                                                        setSelectedExercises(updated);
                                                    }}
                                                />
                                            </View>
                                            <View style={styles.exDetailGroup}>
                                                <Text style={styles.exDetailLabel}>KG</Text>
                                                <TextInput
                                                    style={styles.exDetailInput}
                                                    keyboardType="numeric"
                                                    value={ex.weight ? ex.weight.toString() : '0'}
                                                    onChangeText={(val) => {
                                                        const updated = [...selectedExercises];
                                                        updated[idx].weight = parseFloat(val) || 0;
                                                        setSelectedExercises(updated);
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity style={styles.saveMain} onPress={assignRoutine} activeOpacity={0.8}>
                            <LinearGradient
                                colors={['#63ff15', '#4cc910']}
                                style={styles.saveGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.saveText}>ASIGNAR RUTINA</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.hintText}>* Las rutinas manuales tienen prioridad sobre los planes generados por IA.</Text>
                    </View>
                </View>
            </Modal>

            {/* Day detail bottom sheet (Elite/Ultimate) */}
            {renderDayDetailModal()}

            {showAnimation && (
                <View style={styles.animOverlay}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
                        <Text style={styles.animT}>STATUS: SYNCED</Text>
                        <MaterialCommunityIcons name="shield-check-outline" size={120} color="#63ff15" />
                        <Text style={styles.animSub}>OBJETIVO LOGRADO</Text>
                    </Animated.View>
                </View>
            )}

            <WorkoutTimer
                visible={timerVisible}
                exercises={workoutExercises}
                onClose={() => setTimerVisible(false)}
                onComplete={handleWorkoutComplete}
            />

            <WorkoutReview
                visible={reviewVisible}
                workoutData={sessionDataForReview}
                onConfirm={handleReviewConfirm}
            />

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
                onCancel={alert.onCancel}
                confirmText={alert.confirmText}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 70,
        zIndex: 10
    },
    headerGlass: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(20,20,20,0.4)',
        padding: 4,
        width: 150
    },
    mBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12 },
    mBtnActive: { backgroundColor: '#63ff15', elevation: 10, shadowColor: '#63ff15', shadowOpacity: 0.4, shadowRadius: 10 },
    mText: { color: '#A1A1AA', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    mTextActive: { color: '#000' },
    scrollContent: { padding: 24, paddingBottom: 100 },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    navTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },

    // Stat bar
    statBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(18,18,18,0.9)',
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    statVal: { color: '#fff', fontSize: 22, fontWeight: '900' },
    statLabel: { color: '#555', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
    statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 8 },

    calendarGrid: {
        backgroundColor: 'rgba(18,18,18,0.8)',
        borderRadius: 30,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 20
    },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    dayHeader: { color: '#52525B', fontWeight: '900', width: (width - 110) / 7, textAlign: 'center', fontSize: 12 },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: {
        width: (width - 130) / 7,
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderRadius: 16,
        backgroundColor: '#111',
        margin: 3,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)'
    },
    dayText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
    completedDay: { backgroundColor: '#63ff15', borderColor: '#63ff15' },
    completedDayText: { color: '#000' },
    todayDay: {
        borderWidth: 1.5,
        borderColor: '#63ff15',
        backgroundColor: 'rgba(99,255,21,0.1)',
        shadowColor: '#63ff15',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5
    },
    routineIndicator: { position: 'absolute', bottom: 6 },
    weekContainer: { gap: 16 },
    weekRowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(18,18,18,0.8)',
        padding: 18,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    eliteRow: { borderLeftWidth: 5, borderLeftColor: '#63ff15', shadowColor: '#63ff15', shadowOpacity: 0.15, shadowRadius: 10 },
    ultimateRow: { borderLeftWidth: 5, borderLeftColor: '#FFD700', shadowColor: '#FFD700', shadowOpacity: 0.15, shadowRadius: 10 },
    todayRow: { borderColor: 'rgba(99,255,21,0.3)', backgroundColor: 'rgba(99,255,21,0.03)' },
    weekDateBox: {
        width: 55,
        height: 55,
        backgroundColor: '#000',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    weekDayName: { color: '#A1A1AA', fontSize: 10, fontWeight: '900' },
    weekDayNum: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
    weekInfo: { flex: 1 },
    weekRoutineName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
    weekSubText: { color: '#63ff15', fontSize: 10, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
    noRoutineText: { color: '#52525B', fontSize: 13, fontStyle: 'italic' },
    weekActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    playBtn: { marginRight: 5 },
    guideCardBlur: { marginTop: 40, borderRadius: 25, overflow: 'hidden' },
    guideCard: {
        backgroundColor: 'rgba(10,10,10,0.6)',
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderStyle: 'dashed'
    },
    guideT: { color: '#63ff15', fontSize: 12, fontWeight: '900', marginBottom: 12, letterSpacing: 2 },
    guideS: { color: '#A1A1AA', fontSize: 12, lineHeight: 22, fontWeight: '500' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#0A0A0A',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        paddingTop: 15,
        height: height * 0.8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    modalBar: { width: 40, height: 5, backgroundColor: '#333', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
    modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
    label: { color: '#63ff15', fontSize: 11, fontWeight: '900', marginBottom: 12, letterSpacing: 1.5 },
    input: {
        backgroundColor: '#121212',
        padding: 15,
        borderRadius: 15,
        color: '#FFFFFF',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        fontSize: 16
    },
    quickLibSection: { marginBottom: 20 },
    quickLib: { flexDirection: 'row', marginTop: 5 },
    quickChip: {
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    quickChipText: { color: '#63ff15', fontSize: 12, fontWeight: '700' },
    exerciseSection: { flex: 1, marginBottom: 20 },
    exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    addExerciseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(99,255,21,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    addExerciseText: { color: '#63ff15', fontSize: 10, fontWeight: '900' },
    exerciseList: {
        backgroundColor: '#0f0f0f',
        borderRadius: 20,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    exerciseItem: {
        backgroundColor: '#161616',
        borderRadius: 15,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    exRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 },
    exInput: { color: '#fff', fontSize: 14, fontWeight: '700', paddingVertical: 5 },
    exDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    exDetailGroup: { flex: 1, alignItems: 'center' },
    exDetailLabel: { color: '#444', fontSize: 9, fontWeight: '900', marginBottom: 4 },
    exDetailInput: {
        backgroundColor: '#0a0a0a',
        width: '100%',
        paddingVertical: 6,
        borderRadius: 10,
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    pasteBtn: { marginRight: 10, opacity: 0.9 },
    saveMain: { borderRadius: 20, overflow: 'hidden', elevation: 15, shadowColor: '#63ff15', shadowOpacity: 0.3, shadowRadius: 15 },
    saveGradient: { padding: 18, alignItems: 'center' },
    saveText: { color: '#000', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
    hintText: { color: '#52525B', fontSize: 11, marginTop: 15, textAlign: 'center', lineHeight: 18 },
    animOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    animT: { color: '#63ff15', fontSize: 28, fontWeight: '900', letterSpacing: 4, marginBottom: 20 },
    animSub: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 2, marginTop: 15 },

    // Day detail modal exercise rows
    detailExItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#161616',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    detailExName: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1, marginRight: 10 },
    detailExBadge: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
    },
});
