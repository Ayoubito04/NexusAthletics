import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Vibration, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.55;
const RADIUS = CIRCLE_SIZE / 2 - 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TIME_OPTIONS = [45, 60, 90, 120, 180];

export default function RestTimerModal({ visible, onClose }) {
    const [selectedTime, setSelectedTime] = useState(90);
    const [timeLeft, setTimeLeft] = useState(90);
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const intervalRef = useRef(null);
    const progress = useAnimatedProgress(timeLeft, selectedTime);

    useEffect(() => {
        if (visible) {
            reset(selectedTime);
        } else {
            stopTimer();
        }
    }, [visible]);

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        setRunning(false);
                        setFinished(true);
                        Vibration.vibrate([0, 150, 80, 150, 80, 250]);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [running]);

    function reset(t) {
        clearInterval(intervalRef.current);
        setTimeLeft(t);
        setRunning(false);
        setFinished(false);
    }

    function stopTimer() {
        clearInterval(intervalRef.current);
        setRunning(false);
    }

    function selectTime(t) {
        setSelectedTime(t);
        reset(t);
    }

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>DESCANSO</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#888" />
                        </TouchableOpacity>
                    </View>

                    {/* Time selector chips */}
                    <View style={styles.chips}>
                        {TIME_OPTIONS.map(t => (
                            <TouchableOpacity
                                key={t}
                                onPress={() => selectTime(t)}
                                style={[styles.chip, selectedTime === t && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, selectedTime === t && styles.chipTextActive]}>
                                    {t}s
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Circle progress */}
                    <View style={styles.circleContainer}>
                        <Svg size={CIRCLE_SIZE} progress={progress} finished={finished} />
                        <View style={styles.countdownInner}>
                            {finished ? (
                                <Text style={styles.finishedText}>¡A POR{'\n'}ELLO!</Text>
                            ) : (
                                <Text style={styles.countdown}>{timeStr}</Text>
                            )}
                        </View>
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.resetBtn} onPress={() => reset(selectedTime)}>
                            <Ionicons name="refresh" size={20} color="#888" />
                            <Text style={styles.resetText}>Reiniciar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => { setRunning(r => !r); setFinished(false); }}>
                            <LinearGradient
                                colors={['#63ff15', '#4dd10e']}
                                style={styles.playBtn}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                <Ionicons
                                    name={running ? 'pause' : 'play'}
                                    size={28}
                                    color="#000"
                                />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.resetBtn} onPress={onClose}>
                            <Ionicons name="checkmark" size={20} color="#63ff15" />
                            <Text style={[styles.resetText, { color: '#63ff15' }]}>Listo</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function useAnimatedProgress(timeLeft, total) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const ratio = total > 0 ? (total - timeLeft) / total : 0;
        anim.setValue(ratio);
    }, [timeLeft, total]);
    return anim;
}

function Svg({ size, progress, finished }) {
    const strokeDashoffset = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [CIRCUMFERENCE, 0],
    });
    const strokeColor = finished ? '#63ff15' : '#63ff15';

    return (
        <View style={{ width: size, height: size, position: 'absolute' }}>
            {/* Background track */}
            <View style={[styles.trackCircle, {
                width: size, height: size, borderRadius: size / 2,
                borderColor: 'rgba(99,255,21,0.12)',
            }]} />
            {/* Animated progress using border trick */}
            <AnimatedBorder size={size} progress={progress} finished={finished} />
        </View>
    );
}

function AnimatedBorder({ size, progress, finished }) {
    const rotation = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });
    return (
        <Animated.View style={[{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 4,
            borderColor: 'transparent',
            borderTopColor: finished ? '#63ff15' : '#63ff15',
            transform: [{ rotate: rotation }],
        }]} />
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#121218',
        borderRadius: 24,
        padding: 24,
        width: width * 0.88,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 3,
    },
    closeBtn: {
        padding: 4,
    },
    chips: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 28,
    },
    chip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#1a1a24',
        borderWidth: 1,
        borderColor: '#333',
    },
    chipActive: {
        backgroundColor: 'rgba(99,255,21,0.15)',
        borderColor: '#63ff15',
    },
    chipText: {
        color: '#888',
        fontSize: 13,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#63ff15',
    },
    circleContainer: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    trackCircle: {
        position: 'absolute',
        borderWidth: 4,
    },
    countdownInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdown: {
        color: '#fff',
        fontSize: 52,
        fontWeight: '200',
        letterSpacing: 2,
    },
    finishedText: {
        color: '#63ff15',
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: 2,
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    playBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetBtn: {
        alignItems: 'center',
        gap: 4,
        width: 64,
    },
    resetText: {
        color: '#888',
        fontSize: 11,
        fontWeight: '600',
    },
});
