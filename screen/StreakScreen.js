import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

export default function StreakScreen() {
    const navigation = useNavigation();
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [weeklyActivity, setWeeklyActivity] = useState([]);

    // Animaciones
    const flameAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadStreakData();
        startFlameAnimation();

        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
        }).start();
    }, []);

    const startFlameAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(flameAnim, {
                    toValue: 1.2,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(flameAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                })
            ])
        ).start();
    };

    const loadStreakData = async () => {
        try {
            // Cargar racha actual
            const streakData = await AsyncStorage.getItem('streak_data');
            if (streakData) {
                const data = JSON.parse(streakData);
                setStreak(data.current || 0);
                setBestStreak(data.best || 0);
            }

            // Generar datos de actividad semanal
            const last7Days = [];
            const today = new Date();

            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateString = date.toDateString();

                // Verificar si hubo actividad ese día
                const activityData = await AsyncStorage.getItem(`steps_${dateString}`);
                const hasActivity = activityData ? JSON.parse(activityData).steps > 1000 : false;

                last7Days.push({
                    date: dateString,
                    dayName: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][date.getDay()],
                    active: hasActivity,
                    isToday: i === 0
                });
            }

            setWeeklyActivity(last7Days);
        } catch (error) {
            console.error('Error loading streak:', error);
        }
    };

    const getStreakLevel = () => {
        if (streak >= 30) return { level: 'Leyenda', color: '#FFD700', icon: 'trophy' };
        if (streak >= 14) return { level: 'Maestro', color: '#FF6B35', icon: 'medal' };
        if (streak >= 7) return { level: 'Avanzado', color: '#00D1FF', icon: 'star' };
        if (streak >= 3) return { level: 'Iniciado', color: '#63ff15', icon: 'flame' };
        return { level: 'Novato', color: '#888', icon: 'footsteps' };
    };

    const level = getStreakLevel();

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0a0a0a', '#050505']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mi Racha</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Llama Principal con Animación */}
                <Animated.View style={[styles.streakCard, { transform: [{ scale: scaleAnim }] }]}>
                    <LinearGradient
                        colors={['#1a1a1a', '#0d0d0d']}
                        style={StyleSheet.absoluteFill}
                        borderRadius={30}
                    />

                    <Animated.View style={[styles.flameContainer, { transform: [{ scale: flameAnim }] }]}>
                        <LinearGradient
                            colors={['rgba(255,107,53,0.2)', 'transparent']}
                            style={styles.flameGlow}
                        />
                        <MaterialCommunityIcons name="fire" size={100} color="#FF6B35" />
                    </Animated.View>

                    <Text style={styles.streakNumber}>{streak}</Text>
                    <Text style={styles.streakLabel}>DÍAS CONSECUTIVOS</Text>

                    <View style={[styles.levelBadge, { backgroundColor: level.color + '20', borderColor: level.color + '40' }]}>
                        <Ionicons name={level.icon} size={16} color={level.color} />
                        <Text style={[styles.levelText, { color: level.color }]}>{level.level}</Text>
                    </View>
                </Animated.View>

                {/* Mejor Racha */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <LinearGradient colors={['#111', '#0a0a0a']} style={StyleSheet.absoluteFill} borderRadius={20} />
                        <Ionicons name="trophy" size={32} color="#FFD700" />
                        <Text style={styles.statValue}>{bestStreak}</Text>
                        <Text style={styles.statLabel}>Mejor Racha</Text>
                    </View>
                    <View style={styles.statCard}>
                        <LinearGradient colors={['#111', '#0a0a0a']} style={StyleSheet.absoluteFill} borderRadius={20} />
                        <MaterialCommunityIcons name="target" size={32} color="#63ff15" />
                        <Text style={styles.statValue}>{Math.max(0, 30 - streak)}</Text>
                        <Text style={styles.statLabel}>Para Leyenda</Text>
                    </View>
                </View>

                {/* Progreso de la Semana */}
                <View style={styles.weeklyCard}>
                    <Text style={styles.weeklyTitle}>Actividad de Esta Semana</Text>

                    <View style={styles.daysRow}>
                        {weeklyActivity.map((day, index) => (
                            <View key={index} style={styles.dayCircleWrapper}>
                                <View style={[
                                    styles.dayCircle,
                                    day.active && styles.dayCircleActive,
                                    day.isToday && styles.dayCircleToday
                                ]}>
                                    {day.active && (
                                        <Ionicons
                                            name="checkmark"
                                            size={16}
                                            color={day.isToday ? "#000" : "#63ff15"}
                                        />
                                    )}
                                </View>
                                <Text style={[
                                    styles.dayName,
                                    day.isToday && styles.dayNameToday
                                ]}>{day.dayName}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Motivación */}
                <View style={styles.motivationCard}>
                    <LinearGradient
                        colors={['rgba(255,107,53,0.1)', 'transparent']}
                        style={StyleSheet.absoluteFill}
                        borderRadius={20}
                    />
                    <MaterialCommunityIcons name="lightning-bolt" size={32} color="#FF6B35" />
                    <View style={styles.motivationTextContainer}>
                        <Text style={styles.motivationTitle}>
                            {streak === 0 ? '¡Empieza Hoy!' : streak < 7 ? '¡Sigue Así!' : '¡Imparable!'}
                        </Text>
                        <Text style={styles.motivationText}>
                            {streak === 0
                                ? 'Registra una actividad hoy para iniciar tu racha.'
                                : streak < 7
                                    ? `Llevas ${streak} días seguidos. Solo ${7 - streak} días más para nivel Avanzado.`
                                    : streak < 30
                                        ? `¡Increíble consistencia! ${30 - streak} días más y serás Leyenda.`
                                        : '¡Has alcanzado el nivel máximo! Eres una verdadera inspiración.'
                            }
                        </Text>
                    </View>
                </View>

                {/* Próximos Hitos */}
                <View style={styles.milestonesCard}>
                    <Text style={styles.milestonesTitle}>Próximos Hitos</Text>

                    {[
                        { days: 3, title: 'Iniciado', reward: 'Badge Bronce', unlocked: streak >= 3 },
                        { days: 7, title: 'Avanzado', reward: 'Badge Plata', unlocked: streak >= 7 },
                        { days: 14, title: 'Maestro', reward: 'Badge Oro', unlocked: streak >= 14 },
                        { days: 30, title: 'Leyenda', reward: 'Badge Diamante', unlocked: streak >= 30 },
                    ].map((milestone, index) => (
                        <View key={index} style={styles.milestoneItem}>
                            <View style={[
                                styles.milestoneIcon,
                                milestone.unlocked && { backgroundColor: '#63ff1520', borderColor: '#63ff15' }
                            ]}>
                                <Ionicons
                                    name={milestone.unlocked ? "checkmark-circle" : "lock-closed"}
                                    size={24}
                                    color={milestone.unlocked ? "#63ff15" : "#444"}
                                />
                            </View>
                            <View style={styles.milestoneInfo}>
                                <Text style={[styles.milestoneTitle, milestone.unlocked && { color: '#fff' }]}>
                                    {milestone.days} Días - {milestone.title}
                                </Text>
                                <Text style={styles.milestoneReward}>{milestone.reward}</Text>
                            </View>
                            {milestone.unlocked && (
                                <View style={styles.unlockedBadge}>
                                    <Text style={styles.unlockedText}>✓</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: 'white',
    },
    content: {
        padding: 20,
        paddingTop: 0,
    },
    streakCard: {
        padding: 40,
        borderRadius: 30,
        alignItems: 'center',
        marginBottom: 25,
        borderWidth: 2,
        borderColor: '#FF6B3520',
        overflow: 'hidden',
    },
    flameContainer: {
        marginBottom: 20,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flameGlow: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    streakNumber: {
        fontSize: 72,
        fontWeight: '900',
        color: '#FF6B35',
        letterSpacing: -3,
        marginBottom: 8,
    },
    streakLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 20,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 2,
    },
    levelText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 25,
    },
    statCard: {
        flex: 1,
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#161616',
        overflow: 'hidden',
    },
    statValue: {
        fontSize: 32,
        fontWeight: '900',
        color: 'white',
        marginTop: 12,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
        fontWeight: '700',
    },
    weeklyCard: {
        backgroundColor: '#111',
        padding: 24,
        borderRadius: 25,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#161616',
    },
    weeklyTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 20,
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayCircleWrapper: {
        alignItems: 'center',
    },
    dayCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#0a0a0a',
        borderWidth: 2,
        borderColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    dayCircle Active: {
        backgroundColor: '#63ff1515',
        borderColor: '#63ff15',
    },
    dayCircleToday: {
        backgroundColor: '#63ff15',
        borderColor: '#4dd10e',
    },
    dayName: {
        fontSize: 11,
        color: '#666',
        fontWeight: '700',
    },
    dayNameToday: {
        color: '#63ff15',
        fontWeight: '900',
    },
    motivationCard: {
        flexDirection: 'row',
        padding: 24,
        borderRadius: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,107,53,0.2)',
        overflow: 'hidden',
        gap: 16,
    },
    motivationTextContainer: {
        flex: 1,
    },
    motivationTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FF6B35',
        marginBottom: 6,
    },
    motivationText: {
        fontSize: 13,
        color: '#ddd',
        lineHeight: 20,
    },
    milestonesCard: {
        backgroundColor: '#111',
        padding: 24,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#161616',
    },
    milestonesTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 20,
    },
    milestoneItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
        gap: 16,
    },
    milestoneIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#0a0a0a',
        borderWidth: 2,
        borderColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
    },
    milestoneInfo: {
        flex: 1,
    },
    milestoneTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#666',
        marginBottom: 4,
    },
    milestoneReward: {
        fontSize: 12,
        color: '#444',
        fontWeight: '600',
    },
    unlockedBadge: {
        backgroundColor: '#63ff15',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unlockedText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
    },
});
