import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Dimensions, Modal, TextInput, Platform, FlatList } from 'react-native';
import NexusAlert from '../components/NexusAlert';
import WorkoutTimer from '../components/WorkoutTimer';
import WorkoutReview from '../components/WorkoutReview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

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

    // WorkoutTimer states
    const [timerVisible, setTimerVisible] = useState(false);
    const [workoutExercises, setWorkoutExercises] = useState([]);

    // Review states
    const [reviewVisible, setReviewVisible] = useState(false);
    const [sessionDataForReview, setSessionDataForReview] = useState(null);

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

    const removeRoutine = async (key) => {
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
        if (existing) {
            setCustomTitle(existing.title);
            setSelectedExercises(existing.exercises || []);
        } else {
            setCustomTitle('');
            setSelectedExercises([]);
        }
        setModalVisible(true);
    };

    // Abrir WorkoutTimer para un día con rutina
    const startWorkout = (key) => {
        const routine = assignedRoutines[key];
        if (!routine) {
            showAlert("Sin Rutina", "Asigna una rutina a este día primero", "warning");
            return;
        }

        // Convertir la rutina en ejercicios para el timer
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

        // Marcar el día como completado (esto se puede hacer antes o después de la review)
        const todayKey = new Date().toISOString().split('T')[0];
        await toggleDayCompletion(todayKey);
    };

    const handleReviewConfirm = () => {
        setReviewVisible(false);
        setSessionDataForReview(null);
    };

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

            days.push(
                <TouchableOpacity
                    key={i}
                    style={[styles.dayCell, isCompleted && styles.completedDay, isToday && styles.todayDay]}
                    onPress={() => openDayPicker(key)}
                    onLongPress={() => removeRoutine(key)}
                >
                    <Text style={[styles.dayText, isCompleted && styles.completedDayText, isToday && { color: '#63ff15' }]}>{i}</Text>
                    {routine && (
                        <View style={styles.routineIndicator}>
                            <Ionicons name={routine.isElite ? "sparkles" : "person"} size={8} color={isCompleted ? "black" : "#63ff15"} />
                        </View>
                    )}
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.calendarGrid}>
                <View style={styles.weekRow}>{headers}</View>
                <View style={styles.daysGrid}>{days}</View>
            </View>
        );
    };

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

                    return (
                        <View key={i} style={[styles.weekRowItem, isToday && styles.todayRow, routine?.isElite && styles.eliteRow]}>
                            <TouchableOpacity style={styles.weekDateBox} onPress={() => openDayPicker(key)}>
                                <Text style={styles.weekDayName}>{d.toLocaleString('es-ES', { weekday: 'short' }).toUpperCase()}</Text>
                                <Text style={styles.weekDayNum}>{d.getDate()}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.weekInfo} onPress={() => openDayPicker(key)}>
                                {routine ? (
                                    <>
                                        <Text style={styles.weekRoutineName}>{routine.title}</Text>
                                        <Text style={styles.weekSubText}>{routine.isElite ? 'PLAN IA (Propagado)' : 'MANUAL'}</Text>
                                    </>
                                ) : (
                                    <Text style={styles.noRoutineText}>Toque para asignar manual</Text>
                                )}
                            </TouchableOpacity>
                            <View style={styles.weekActions}>
                                {routine && (
                                    <>
                                        <TouchableOpacity onPress={() => startWorkout(key)} style={styles.playBtn}>
                                            <Ionicons name="play-circle" size={28} color="#63ff15" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => removeRoutine(key)}>
                                            <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
                                        </TouchableOpacity>
                                    </>
                                )}
                                <TouchableOpacity onPress={() => toggleDayCompletion(key)}>
                                    <Ionicons name={isCompleted ? "checkmark-circle" : "ellipse-outline"} size={28} color={isCompleted ? "#63ff15" : "#333"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#050505', '#000']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color="white" /></TouchableOpacity>
                <View style={styles.modeToggle}>
                    <TouchableOpacity style={[styles.mBtn, viewMode === 'month' && styles.mBtnActive]} onPress={() => setViewMode('month')}>
                        <Text style={[styles.mText, viewMode === 'month' && styles.mTextActive]}>Mes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.mBtn, viewMode === 'week' && styles.mBtnActive]} onPress={() => setViewMode('week')}>
                        <Text style={[styles.mText, viewMode === 'week' && styles.mTextActive]}>Semana</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => {
                        const d = new Date(currentDate);
                        viewMode === 'month' ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7);
                        setCurrentDate(d);
                    }}><Ionicons name="chevron-back" size={24} color="#63ff15" /></TouchableOpacity>
                    <Text style={styles.navTitle}>
                        {viewMode === 'month'
                            ? currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()
                            : 'CONTROL SEMANAL'
                        }
                    </Text>
                    <TouchableOpacity onPress={() => {
                        const d = new Date(currentDate);
                        viewMode === 'month' ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7);
                        setCurrentDate(d);
                    }}><Ionicons name="chevron-forward" size={24} color="#63ff15" /></TouchableOpacity>
                </View>

                {viewMode === 'month' ? renderMonthView() : renderWeekView()}

                <View style={styles.guideCard}>
                    <Text style={styles.guideT}>Gestión Nexus:</Text>
                    <Text style={styles.guideS}>• Pulsa una fecha para crear/editar manual.{"\n"}• Mantén pulsado (o papelera) para deshacer rutina.{"\n"}• Sincroniza planes Élite para propagar semanas enteras.</Text>
                </View>
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHead}>
                            <Text style={styles.modalTitle}>Editor de Sesión</Text>
                            <TouchableOpacity onPress={resetModal}><Ionicons name="close-circle" size={30} color="#444" /></TouchableOpacity>
                        </View>
                        <Text style={styles.label}>TÍTULO MANUAL</Text>
                        <TextInput style={styles.input} placeholder="Ej: FullBody Casa" placeholderTextColor="#444" value={customTitle} onChangeText={setCustomTitle} />

                        <TouchableOpacity style={styles.saveMain} onPress={assignRoutine}>
                            <Text style={styles.saveText}>FIJAR RUTINA MANUAL</Text>
                        </TouchableOpacity>
                        <Text style={styles.hintText}>*Asignar una rutina manual sobrescribe el plan de la IA para este día específico.</Text>
                    </View>
                </View>
            </Modal>

            {showAnimation && (
                <View style={styles.animOverlay}>
                    <LinearGradient colors={['rgba(99,255,21,0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
                        <Text style={styles.animT}>¡PROGRESS SAVED!</Text>
                        <MaterialCommunityIcons name="flash-circle" size={100} color="#63ff15" />
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
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
    modeToggle: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 12, padding: 3, width: 140 },
    mBtn: { flex: 1, paddingVertical: 5, alignItems: 'center', borderRadius: 10 },
    mBtnActive: { backgroundColor: '#63ff15' },
    mText: { color: '#444', fontSize: 11, fontWeight: '800' },
    mTextActive: { color: 'black' },
    scrollContent: { padding: 20 },
    monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    navTitle: { color: 'white', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    calendarGrid: { backgroundColor: '#111', borderRadius: 25, padding: 15, borderWidth: 1, borderColor: '#222' },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    dayHeader: { color: '#333', fontWeight: 'bold', width: (width - 110) / 7, textAlign: 'center', fontSize: 11 },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: (width - 110) / 7, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderRadius: 12, backgroundColor: '#0a0a0a', margin: 2 },
    dayText: { color: 'white', fontWeight: '800', fontSize: 14 },
    completedDay: { backgroundColor: '#63ff15' },
    completedDayText: { color: 'black' },
    todayDay: { borderWidth: 1, borderColor: '#63ff1540' },
    routineIndicator: { position: 'absolute', bottom: 4 },
    weekContainer: { gap: 10 },
    weekRowItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 15, borderRadius: 25, borderWidth: 1, borderColor: '#1a1a1a' },
    eliteRow: { borderLeftWidth: 4, borderLeftColor: '#63ff15' },
    todayRow: { borderColor: '#63ff1540' },
    weekDateBox: { width: 45, height: 45, backgroundColor: '#000', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    weekDayName: { color: '#444', fontSize: 9, fontWeight: '900' },
    weekDayNum: { color: 'white', fontSize: 18, fontWeight: '900' },
    weekInfo: { flex: 1 },
    weekRoutineName: { color: 'white', fontSize: 15, fontWeight: '900' },
    weekSubText: { color: '#63ff15', fontSize: 9, fontWeight: 'bold', marginTop: 2, letterSpacing: 0.5 },
    noRoutineText: { color: '#333', fontSize: 12, fontStyle: 'italic' },
    weekActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    playBtn: { marginRight: 5 },
    guideCard: { marginTop: 30, backgroundColor: '#080808', padding: 20, borderRadius: 20, borderStyle: 'dotted', borderWidth: 1, borderColor: '#222' },
    guideT: { color: '#63ff15', fontSize: 10, fontWeight: '900', marginBottom: 8 },
    guideS: { color: '#444', fontSize: 11, lineHeight: 18 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#111', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, height: height * 0.5 },
    modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
    label: { color: '#444', fontSize: 10, fontWeight: '900', marginBottom: 10 },
    input: { backgroundColor: '#0a0a0a', padding: 18, borderRadius: 15, color: 'white', marginBottom: 20, borderWidth: 1, borderColor: '#222' },
    saveMain: { backgroundColor: '#63ff15', padding: 20, borderRadius: 18, alignItems: 'center' },
    saveText: { color: 'black', fontWeight: '900', fontSize: 16 },
    hintText: { color: '#333', fontSize: 10, marginTop: 15, textAlign: 'center' },
    animOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    animT: { color: '#63ff15', fontSize: 24, fontWeight: '900' }
});
