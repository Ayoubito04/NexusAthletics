import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Animated, Easing } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

export default function StepCounter() {
    const [currentSteps, setCurrentSteps] = useState(0);
    const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
    const [dailyGoal] = useState(10000);
    const [subscription, setSubscription] = useState(null);

    // Animaciones mejoradas
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        initPedometer();
        loadTodaySteps();

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, []);

    // Animación del progreso
    useEffect(() => {
        const progress = Math.min((currentSteps / dailyGoal) * 100, 100);
        Animated.spring(progressAnim, {
            toValue: progress,
            friction: 8,
            tension: 40,
            useNativeDriver: false,
        }).start();
    }, [currentSteps]);

    // Guardar pasos cada minuto
    useEffect(() => {
        const interval = setInterval(() => {
            saveTodaySteps();
            syncWithBackend();
        }, 60000);

        return () => clearInterval(interval);
    }, [currentSteps]);

    // Animación de pulso continuo mejorada
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.03,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                })
            ])
        ).start();

        // Rotación sutil
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 20000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const loadTodaySteps = async () => {
        try {
            const today = new Date().toDateString();
            const stored = await AsyncStorage.getItem('steps_data');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.date === today) {
                    setCurrentSteps(data.steps);
                } else {
                    await AsyncStorage.setItem('steps_data', JSON.stringify({
                        date: today,
                        steps: 0
                    }));
                    setCurrentSteps(0);
                }
            }
        } catch (error) {
            // Silent error handling
        }
    };

    const saveTodaySteps = async () => {
        try {
            const today = new Date().toDateString();
            await AsyncStorage.setItem('steps_data', JSON.stringify({
                date: today,
                steps: currentSteps
            }));
        } catch (error) {
            // Silent error handling
        }
    };

    const syncWithBackend = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            await fetch(`${BACKEND_URL}/user/sync-steps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    steps: currentSteps,
                    date: new Date().toISOString()
                })
            });
        } catch (error) {
            // Silent error handling
        }
    };

    const initPedometer = async () => {
        const isAvailable = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(String(isAvailable));

        if (isAvailable) {
            const sub = Pedometer.watchStepCount(result => {
                setCurrentSteps(prev => {
                    const newTotal = prev + result.steps;
                    
                    // Animación al detectar pasos
                    Animated.sequence([
                        Animated.timing(scaleAnim, { toValue: 1.15, duration: 100, useNativeDriver: true }),
                        Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
                    ]).start();

                    return newTotal;
                });
            });

            setSubscription(sub);
        }
    };

    const progress = (currentSteps / dailyGoal) * 100;
    const progressClamped = Math.min(progress, 100);

    const calories = Math.round(currentSteps * 0.04);
    const distance = (currentSteps * 0.0008).toFixed(2);
    const minutes = Math.round(currentSteps * 0.01);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    if (isPedometerAvailable === 'false') {
        return (
            <View style={styles.errorContainer}>
                <LinearGradient
                    colors={['#1a0505', '#0a0a0a']}
                    style={StyleSheet.absoluteFill}
                />
                <Ionicons name="alert-circle" size={50} color="#ff4d4d" />
                <Text style={styles.errorTitle}>Pedómetro No Disponible</Text>
                <Text style={styles.errorText}>Este dispositivo no soporta el contador de pasos</Text>
            </View>
        );
    }

    if (isPedometerAvailable === 'checking') {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient
                    colors={['#1a1a1a', '#0d0d0d']}
                    style={StyleSheet.absoluteFill}
                />
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <MaterialCommunityIcons name="loading" size={40} color="#63ff15" />
                </Animated.View>
                <Text style={styles.loadingText}>Iniciando Pedómetro...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0f0f0f', '#050505']}
                style={StyleSheet.absoluteFill}
            />
            
            {/* Header con efecto glass */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <LinearGradient
                        colors={['#63ff15', '#4dd10e']}
                        style={styles.iconGradient}
                    >
                        <Ionicons name="footsteps" size={22} color="black" />
                    </LinearGradient>
                    <View>
                        <Text style={styles.title}>Contador de Pasos</Text>
                        <Text style={styles.subtitle}>Seguimiento Automático</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.syncBadge} 
                    onPress={() => { syncWithBackend(); saveTodaySteps(); }}
                    activeOpacity={0.7}
                    data-testid="sync-steps-btn"
                >
                    <Ionicons name="cloud-done" size={16} color="#63ff15" />
                </TouchableOpacity>
            </View>

            {/* Círculo de progreso premium */}
            <View style={styles.circleContainer}>
                <Animated.View style={[styles.outerCircle, { transform: [{ scale: pulseAnim }] }]}>
                    {/* Glow effect */}
                    <LinearGradient
                        colors={progressClamped >= 100 ? ['rgba(255,215,0,0.15)', 'transparent'] : ['rgba(99,255,21,0.1)', 'transparent']}
                        style={styles.glowEffect}
                    />
                    
                    {/* Anillo de progreso animado */}
                    <View style={styles.progressRing}>
                        <Animated.View 
                            style={[
                                styles.progressFill,
                                {
                                    height: progressAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    }),
                                    backgroundColor: progressClamped >= 100 ? '#FFD700' : '#63ff15',
                                    opacity: 0.25,
                                }
                            ]}
                        />
                    </View>

                    {/* Contenido central */}
                    <Animated.View style={[styles.innerCircle, { transform: [{ scale: scaleAnim }] }]}>
                        <Text style={styles.stepsNumber}>{currentSteps.toLocaleString()}</Text>
                        <Text style={styles.stepsLabel}>pasos</Text>
                        <View style={styles.goalBadge}>
                            <Ionicons name="flag" size={11} color="#888" />
                            <Text style={styles.goalText}>{dailyGoal.toLocaleString()}</Text>
                        </View>
                    </Animated.View>
                </Animated.View>
            </View>

            {/* Barra de progreso premium */}
            <View style={styles.progressSection}>
                <View style={styles.progressInfo}>
                    <Text style={styles.progressLabel}>Progreso Diario</Text>
                    <Text style={[styles.progressPercent, progressClamped >= 100 && { color: '#FFD700' }]}>
                        {Math.round(progress)}%
                    </Text>
                </View>
                <View style={styles.progressBarContainer}>
                    <Animated.View 
                        style={[
                            styles.progressBarFill, 
                            { 
                                width: progressAnim.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={progressClamped >= 100 ? ['#FFD700', '#FFA500'] : ['#63ff15', '#00D1FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>
                {progressClamped >= 100 && (
                    <View style={styles.completeBadge}>
                        <Ionicons name="trophy" size={16} color="#FFD700" />
                        <Text style={styles.completeText}>¡Meta Alcanzada!</Text>
                    </View>
                )}
            </View>

            {/* Stats Grid mejorado */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,107,53,0.15)' }]}>
                        <Ionicons name="flame" size={24} color="#ff6b35" />
                    </View>
                    <Text style={styles.statValue}>{calories}</Text>
                    <Text style={styles.statLabel}>Calorías</Text>
                </View>

                <View style={styles.statCard}>
                    <View style={[styles.statIconCircle, { backgroundColor: 'rgba(0,209,255,0.15)' }]}>
                        <Ionicons name="navigate" size={24} color="#00D1FF" />
                    </View>
                    <Text style={styles.statValue}>{distance}</Text>
                    <Text style={styles.statLabel}>Kilómetros</Text>
                </View>

                <View style={styles.statCard}>
                    <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
                        <Ionicons name="time" size={24} color="#FFD700" />
                    </View>
                    <Text style={styles.statValue}>{minutes}</Text>
                    <Text style={styles.statLabel}>Minutos</Text>
                </View>
            </View>

            {/* Botón de sincronización premium */}
            <TouchableOpacity
                style={styles.syncButton}
                onPress={() => {
                    syncWithBackend();
                    saveTodaySteps();
                    Animated.sequence([
                        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
                        Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
                    ]).start();
                }}
                activeOpacity={0.8}
                data-testid="sync-now-btn"
            >
                <LinearGradient
                    colors={['#63ff15', '#4dd10e']}
                    style={styles.syncButtonGradient}
                >
                    <Ionicons name="cloud-upload" size={20} color="black" />
                    <Text style={styles.syncButtonText}>SINCRONIZAR AHORA</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        padding: 24,
        marginVertical: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    iconGradient: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: 'white',
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    subtitle: {
        color: '#52525B',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    syncBadge: {
        backgroundColor: 'rgba(99,255,21,0.1)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
    },
    circleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 16,
    },
    outerCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0a0a0a',
    },
    glowEffect: {
        position: 'absolute',
        width: '150%',
        height: '150%',
        borderRadius: 200,
    },
    progressRing: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        overflow: 'hidden',
    },
    progressFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    innerCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#050505',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    stepsNumber: {
        fontSize: 36,
        fontWeight: '900',
        color: '#63ff15',
        letterSpacing: -1,
    },
    stepsLabel: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    goalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    goalText: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '700',
    },
    progressSection: {
        marginBottom: 24,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressLabel: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    progressPercent: {
        color: '#63ff15',
        fontSize: 15,
        fontWeight: '900',
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 8,
        overflow: 'hidden',
    },
    completeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        backgroundColor: 'rgba(255,215,0,0.1)',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.2)',
    },
    completeText: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 10,
        color: '#52525B',
        marginTop: 4,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    syncButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    syncButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 10,
    },
    syncButtonText: {
        color: 'black',
        fontWeight: '800',
        fontSize: 13,
        letterSpacing: 0.5,
    },
    errorContainer: {
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        gap: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,77,77,0.2)',
        overflow: 'hidden',
    },
    errorTitle: {
        color: '#ff4d4d',
        fontSize: 17,
        fontWeight: '800',
    },
    errorText: {
        color: '#ff4d4d',
        fontSize: 13,
        textAlign: 'center',
        opacity: 0.7,
    },
    loadingContainer: {
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        gap: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    loadingText: {
        color: '#71717A',
        fontSize: 13,
        fontWeight: '600',
    },
});
