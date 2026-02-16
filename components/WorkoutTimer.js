import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Vibration, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

/**
 * WorkoutTimer - Componente inspirado en Symmetry
 * Maneja cronómetro de ejercicios con descansos automáticos entre series
 */
export default function WorkoutTimer({ visible, exercises = [], onClose, onComplete }) {
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const [isResting, setIsResting] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Estados para tracking de datos
    const [currentReps, setCurrentReps] = useState('');
    const [currentWeight, setCurrentWeight] = useState('');
    const [sessionResults, setSessionResults] = useState([]);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const currentExercise = exercises[currentExerciseIndex];
    const restDuration = currentExercise?.restTime || 60; // Segundos de descanso por defecto
    const sets = currentExercise?.sets || 3;

    // Inicializar inputs cuando cambia el ejercicio
    useEffect(() => {
        if (currentExercise) {
            setCurrentReps(currentExercise.reps?.toString().split('-')[0] || '12');
            setCurrentWeight('');
        }
    }, [currentExerciseIndex]);

    // Sonido de finalización
    const playSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
                { shouldPlay: true }
            );
            await sound.playAsync();
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    };

    // Animación de pulso
    useEffect(() => {
        if (isResting && isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isResting, isActive]);

    // Timer principal
    useEffect(() => {
        let interval = null;

        if (isActive && !isPaused) {
            interval = setInterval(() => {
                setSeconds(s => {
                    // Modo descanso (cuenta regresiva)
                    if (isResting) {
                        if (s <= 1) {
                            handleRestComplete();
                            return 0;
                        }
                        return s - 1;
                    }
                    // Modo ejercicio (cuenta progresiva)
                    return s + 1;
                });
            }, 1000);
        } else {
            clearInterval(interval);
        }

        return () => clearInterval(interval);
    }, [isActive, isPaused, isResting]);

    // Completar descanso
    const handleRestComplete = () => {
        Vibration.vibrate([0, 200, 100, 200]);
        playSound();
        setIsResting(false);
        setSeconds(0);
    };

    // Completar serie con guardado de datos
    const completeSet = () => {
        const setInfo = {
            exerciseIndex: currentExerciseIndex,
            exerciseName: currentExercise.name,
            muscle: currentExercise.muscle,
            set: currentSet,
            reps: parseInt(currentReps) || 0,
            weight: parseFloat(currentWeight) || 0,
            time: seconds
        };

        setSessionResults(prev => [...prev, setInfo]);

        if (currentSet < sets) {
            // Ir al siguiente set
            setCurrentSet(currentSet + 1);
            setIsResting(true);
            setSeconds(restDuration);
            Vibration.vibrate(100);
            // Mantener el peso pero resetear reps si quieres o dejarlas
        } else {
            // Ejercicio completado, ir al siguiente
            nextExercise();
        }
    };

    // Siguiente ejercicio
    const nextExercise = () => {
        if (currentExerciseIndex < exercises.length - 1) {
            setCurrentExerciseIndex(currentExerciseIndex + 1);
            setCurrentSet(1);
            setSeconds(0);
            setIsResting(false);
            Vibration.vibrate([0, 100, 50, 100]);
        } else {
            // Workout completado
            handleWorkoutComplete();
        }
    };

    // Completar entrenamiento
    const handleWorkoutComplete = () => {
        setIsActive(false);
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
        playSound();
        if (onComplete) {
            onComplete({
                duration: seconds,
                exercises: exercises.length,
                completedSets: currentSet,
                sessionData: sessionResults // Pasar todos los datos recolectados
            });
        }
    };

    // Formatear tiempo
    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Controles
    const handleStartPause = () => {
        if (!isActive) {
            setIsActive(true);
            setIsPaused(false);
        } else {
            setIsPaused(!isPaused);
        }
    };

    const handleReset = () => {
        setIsActive(false);
        setIsPaused(false);
        setSeconds(0);
        setCurrentSet(1);
        setIsResting(false);
        setSessionResults([]);
    };

    if (!visible || !currentExercise) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <LinearGradient
                colors={['#0a0a0a', '#000']}
                style={styles.container}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color="#888" />
                    </TouchableOpacity>
                    <Text style={styles.progressText}>
                        {currentExerciseIndex + 1} / {exercises.length} EJERCICIOS
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Exercise Info */}
                        <View style={styles.exerciseCard}>
                            <LinearGradient
                                colors={['#1a1a1a', '#111']}
                                style={styles.exerciseGradient}
                            >
                                <MaterialCommunityIcons
                                    name="weight-lifter"
                                    size={48}
                                    color="#63ff15"
                                />
                                <Text style={styles.exerciseName}>{currentExercise.name}</Text>
                                <Text style={styles.exerciseTarget}>
                                    {currentExercise.muscle || 'Todo el cuerpo'}
                                </Text>
                            </LinearGradient>
                        </View>

                        {/* Set Indicator */}
                        <View style={styles.setsContainer}>
                            <Text style={styles.setsLabel}>SERIE ACTUAL</Text>
                            <View style={styles.setsDots}>
                                {[...Array(sets)].map((_, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.setDot,
                                            index < currentSet && styles.setDotCompleted,
                                            index === currentSet - 1 && styles.setDotActive
                                        ]}
                                    >
                                        <Text style={[
                                            styles.setDotText,
                                            index < currentSet && styles.setDotTextCompleted
                                        ]}>
                                            {index + 1}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Timer Display */}
                        <Animated.View style={[
                            styles.timerCircle,
                            { transform: [{ scale: pulseAnim }] }
                        ]}>
                            <LinearGradient
                                colors={isResting ? ['#ff6b35', '#ff4500'] : ['#63ff15', '#4ad912']}
                                style={styles.timerGradient}
                            >
                                <View style={styles.timerInner}>
                                    <Text style={styles.timerLabel}>
                                        {isResting ? '⏸ DESCANSO' : '⏱ EJERCICIO'}
                                    </Text>
                                    <Text style={styles.timerValue}>
                                        {formatTime(seconds)}
                                    </Text>
                                    {isResting && (
                                        <Text style={styles.restInfo}>
                                            Prepárate para la siguiente serie
                                        </Text>
                                    )}
                                </View>
                            </LinearGradient>
                        </Animated.View>

                        {/* DATA LOGGING SECTION (Solo si no está descansando o si es la serie actual) */}
                        {!isResting && isActive && (
                            <View style={styles.loggingCard}>
                                <Text style={styles.loggingLabel}>REGISTRO DE SERIE {currentSet}</Text>
                                <View style={styles.loggingRow}>
                                    <View style={styles.logInputGroup}>
                                        <Text style={styles.logInputLabel}>PESO (KG)</Text>
                                        <TextInput
                                            style={styles.logInput}
                                            value={currentWeight}
                                            onChangeText={setCurrentWeight}
                                            placeholder="0"
                                            placeholderTextColor="#444"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={styles.logInputGroup}>
                                        <Text style={styles.logInputLabel}>REPS</Text>
                                        <TextInput
                                            style={styles.logInput}
                                            value={currentReps}
                                            onChangeText={setCurrentReps}
                                            placeholder="0"
                                            placeholderTextColor="#444"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Exercise Details */}
                        <View style={styles.detailsCard}>
                            <View style={styles.detailRow}>
                                <Ionicons name="repeat" size={20} color="#63ff15" />
                                <Text style={styles.detailLabel}>Objetivo Reps</Text>
                                <Text style={styles.detailValue}>{currentExercise.reps || '12-15'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Ionicons name="pause-circle" size={20} color="#ff6b35" />
                                <Text style={styles.detailLabel}>Descanso</Text>
                                <Text style={styles.detailValue}>{restDuration}s</Text>
                            </View>
                        </View>

                        {/* Controls */}
                        <View style={styles.controls}>
                            <TouchableOpacity
                                style={styles.mainButton}
                                onPress={handleStartPause}
                            >
                                <LinearGradient
                                    colors={['#63ff15', '#4ad912']}
                                    style={styles.mainButtonGradient}
                                >
                                    <Ionicons
                                        name={!isActive ? "play" : isPaused ? "play" : "pause"}
                                        size={32}
                                        color="#000"
                                    />
                                    <Text style={styles.mainButtonText}>
                                        {!isActive ? 'EMPEZAR' : isPaused ? 'REANUDAR' : 'PAUSAR'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.secondaryControls}>
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={handleReset}
                                >
                                    <Ionicons name="refresh" size={24} color="#888" />
                                    <Text style={styles.secondaryButtonText}>Reiniciar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={completeSet}
                                    disabled={!isActive || isResting}
                                >
                                    <Ionicons name="checkmark-circle" size={24} color="#63ff15" />
                                    <Text style={styles.secondaryButtonText}>Serie Completa</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={nextExercise}
                                >
                                    <Ionicons name="play-skip-forward" size={24} color="#888" />
                                    <Text style={styles.secondaryButtonText}>Siguiente</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    exerciseCard: {
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 30,
    },
    exerciseGradient: {
        padding: 30,
        alignItems: 'center',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#222',
    },
    exerciseName: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        marginTop: 15,
        textAlign: 'center',
    },
    exerciseTarget: {
        color: '#63ff15',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    setsContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    setsLabel: {
        color: '#666',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 15,
    },
    setsDots: {
        flexDirection: 'row',
        gap: 12,
    },
    setDot: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1a1a1a',
        borderWidth: 2,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    setDotActive: {
        borderColor: '#63ff15',
        backgroundColor: '#1a1a1a',
    },
    setDotCompleted: {
        backgroundColor: '#63ff15',
        borderColor: '#63ff15',
    },
    setDotText: {
        color: '#666',
        fontSize: 18,
        fontWeight: '900',
    },
    setDotTextCompleted: {
        color: '#000',
    },
    timerCircle: {
        width: 280,
        height: 280,
        borderRadius: 140,
        alignSelf: 'center',
        marginVertical: 30,
    },
    timerGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 140,
        padding: 8,
    },
    timerInner: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        borderRadius: 132,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerLabel: {
        color: '#888',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 10,
    },
    timerValue: {
        color: '#fff',
        fontSize: 64,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    restInfo: {
        color: '#666',
        fontSize: 12,
        marginTop: 10,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    loggingCard: {
        backgroundColor: 'rgba(99,255,21,0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
    },
    loggingLabel: {
        color: '#63ff15',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 15,
        textAlign: 'center',
    },
    loggingRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 15,
    },
    logInputGroup: {
        flex: 1,
        alignItems: 'center',
    },
    logInputLabel: {
        color: '#444',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 8,
    },
    logInput: {
        backgroundColor: '#111',
        width: '100%',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 12,
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    detailsCard: {
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 20,
        gap: 15,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#222',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailLabel: {
        flex: 1,
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
    },
    detailValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '900',
    },
    controls: {
        gap: 20,
    },
    mainButton: {
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    mainButtonGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 22,
    },
    mainButtonText: {
        color: '#000',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    secondaryControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 18,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
        gap: 6,
    },
    secondaryButtonText: {
        color: '#888',
        fontSize: 11,
        fontWeight: '700',
    },
});
