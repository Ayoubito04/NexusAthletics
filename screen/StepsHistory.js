import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;
const { width } = Dimensions.get('window');

export default function StepsHistory() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [weeklyData, setWeeklyData] = useState([]);
    const [monthlyTotal, setMonthlyTotal] = useState(0);
    const [weeklyAverage, setWeeklyAverage] = useState(0);
    const [bestDay, setBestDay] = useState({ steps: 0, date: '' });

    // Animaciones
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const statsScale1 = useRef(new Animated.Value(0.8)).current;
    const statsScale2 = useRef(new Animated.Value(0.8)).current;
    const barAnimations = useRef([]).current;

    useEffect(() => {
        loadHistoryData();
    }, []);

    useEffect(() => {
        if (!loading) {
            // Animación de entrada
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(statsScale1, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    delay: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(statsScale2, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    delay: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Animar las barras del gráfico
            if (barAnimations.length > 0) {
                Animated.stagger(80, barAnimations.map(anim =>
                    Animated.spring(anim, {
                        toValue: 1,
                        friction: 8,
                        tension: 40,
                        useNativeDriver: false,
                    })
                )).start();
            }
        }
    }, [loading]);

    const loadHistoryData = async () => {
        try {
            // Generar datos de los últimos 7 días desde AsyncStorage
            const last7Days = [];
            const today = new Date();

            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateString = date.toDateString();

                // Intentar cargar datos históricos (si los guardamos)
                const stored = await AsyncStorage.getItem(`steps_${dateString}`);
                const steps = stored ? JSON.parse(stored).steps : 0;

                last7Days.push({
                    date: dateString,
                    dayName: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][date.getDay()],
                    steps: steps,
                    fullDate: date
                });

                // Crear animación para cada barra
                barAnimations.push(new Animated.Value(0));
            }

            setWeeklyData(last7Days);

            // Calcular estadísticas
            const totalSteps = last7Days.reduce((sum, day) => sum + day.steps, 0);
            const avg = Math.round(totalSteps / 7);
            setWeeklyAverage(avg);
            setMonthlyTotal(totalSteps);

            // Encontrar el mejor día
            const best = last7Days.reduce((max, day) =>
                day.steps > max.steps ? day : max
                , { steps: 0, date: '' });
            setBestDay(best);

        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const maxSteps = Math.max(...weeklyData.map(d => d.steps), 1000);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={['#0a0a0a', '#050505']} style={StyleSheet.absoluteFill} />
                <View style={styles.loadingContainer}>
                    <View style={styles.loadingCircle}>
                        <LinearGradient
                            colors={['#63ff15', '#00D1FF']}
                            style={styles.loadingGradient}
                        >
                            <ActivityIndicator size="large" color="#000" />
                        </LinearGradient>
                    </View>
                    <Text style={styles.loadingText}>Analizando tu progreso...</Text>
                    <Text style={styles.loadingSubtext}>Cargando historial de pasos</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Background con gradiente mejorado */}
            <LinearGradient
                colors={['#0f0f0f', '#050505', '#000000']}
                style={StyleSheet.absoluteFill}
                locations={[0, 0.5, 1]}
            />

            {/* Header mejorado */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <LinearGradient
                        colors={['#1a1a1a', '#111']}
                        style={styles.backBtnGradient}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </LinearGradient>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Historial de Pasos</Text>
                    <Text style={styles.headerSubtitle}>Últimos 7 días</Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>
            </Animated.View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Estadísticas Principales con animación */}
                <Animated.View style={[styles.statsRow, {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                }]}>
                    <Animated.View style={[styles.statsCard, { transform: [{ scale: statsScale1 }] }]}>
                        <LinearGradient
                            colors={['rgba(99,255,21,0.15)', 'rgba(0,209,255,0.05)']}
                            style={StyleSheet.absoluteFill}
                            borderRadius={24}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <View style={styles.statsIconBox}>
                            <LinearGradient
                                colors={['#63ff15', '#4dd10e']}
                                style={styles.statsIconGradient}
                            >
                                <Ionicons name="analytics" size={24} color="#000" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.statsValue}>{weeklyAverage.toLocaleString()}</Text>
                        <Text style={styles.statsLabel}>Promedio Semanal</Text>
                        <View style={styles.statsProgress}>
                            <View style={[styles.statsProgressBar, { width: `${(weeklyAverage / 10000) * 100}%` }]}>
                                <LinearGradient
                                    colors={['#63ff15', '#00D1FF']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View style={[styles.statsCard, { transform: [{ scale: statsScale2 }] }]}>
                        <LinearGradient
                            colors={['rgba(255,215,0,0.15)', 'rgba(255,107,53,0.05)']}
                            style={StyleSheet.absoluteFill}
                            borderRadius={24}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <View style={styles.statsIconBox}>
                            <LinearGradient
                                colors={['#FFD700', '#FFA500']}
                                style={styles.statsIconGradient}
                            >
                                <Ionicons name="trophy" size={24} color="#000" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.statsValue}>{bestDay.steps.toLocaleString()}</Text>
                        <Text style={styles.statsLabel}>Mejor Día</Text>
                        <View style={styles.statsProgress}>
                            <View style={[styles.statsProgressBar, { width: `${(bestDay.steps / 15000) * 100}%` }]}>
                                <LinearGradient
                                    colors={['#FFD700', '#FFA500']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </View>
                        </View>
                    </Animated.View>
                </Animated.View>

                {/* Total semanal destacado */}
                <Animated.View style={[styles.totalCard, { opacity: fadeAnim }]}>
                    <LinearGradient
                        colors={['#1a1a1a', '#0d0d0d']}
                        style={StyleSheet.absoluteFill}
                        borderRadius={20}
                    />
                    <View style={styles.totalLeft}>
                        <Ionicons name="footsteps" size={32} color="#007AFF" />
                        <View style={styles.totalInfo}>
                            <Text style={styles.totalLabel}>Total Semanal</Text>
                            <Text style={styles.totalValue}>{monthlyTotal.toLocaleString()} pasos</Text>
                        </View>
                    </View>
                    <View style={styles.totalBadge}>
                        <MaterialCommunityIcons name="fire" size={20} color="#FF6B35" />
                    </View>
                </Animated.View>

                {/* Gráfico de Barras mejorado */}
                <Animated.View style={[styles.chartContainer, { opacity: fadeAnim }]}>
                    <LinearGradient
                        colors={['#1a1a1a', '#111111']}
                        style={StyleSheet.absoluteFill}
                        borderRadius={28}
                    />
                    <View style={styles.chartHeader}>
                        <View>
                            <Text style={styles.chartTitle}>Progreso Semanal</Text>
                            <Text style={styles.chartSubtitle}>Actividad diaria</Text>
                        </View>
                        <View style={styles.chartBadge}>
                            <View style={styles.chartBadgeDot} />
                            <Text style={styles.chartBadgeText}>ACTIVO</Text>
                        </View>
                    </View>

                    <View style={styles.chartArea}>
                        {weeklyData.map((day, index) => {
                            const heightPercent = (day.steps / maxSteps) * 100;
                            const isToday = index === 6;
                            const isBestDay = day.steps === bestDay.steps && day.steps > 0;

                            return (
                                <View key={index} style={styles.barWrapper}>
                                    <View style={styles.barTrack}>
                                        <Animated.View
                                            style={[
                                                styles.barFill,
                                                {
                                                    height: barAnimations[index] ? barAnimations[index].interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: ['0%', `${heightPercent}%`]
                                                    }) : `${heightPercent}%`
                                                }
                                            ]}
                                        >
                                            <LinearGradient
                                                colors={isBestDay ? ['#FFD700', '#FFA500'] : isToday ? ['#63ff15', '#00D1FF'] : ['#007AFF', '#0056D2']}
                                                style={StyleSheet.absoluteFill}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 0, y: 1 }}
                                            />
                                            {heightPercent > 30 && (
                                                <View style={styles.barGlow} />
                                            )}
                                        </Animated.View>
                                    </View>
                                    <Text style={[styles.dayLabel, (isToday || isBestDay) && { color: isToday ? '#63ff15' : '#FFD700', fontWeight: '900' }]}>
                                        {day.dayName}
                                    </Text>
                                    {day.steps > 0 && (
                                        <Text style={[styles.stepsLabel, isToday && { color: '#63ff15' }]}>
                                            {(day.steps / 1000).toFixed(1)}k
                                        </Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.chartLegend}>
                        <View style={styles.legendItem}>
                            <LinearGradient colors={['#007AFF', '#0056D2']} style={styles.legendDot} />
                            <Text style={styles.legendText}>Histórico</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <LinearGradient colors={['#63ff15', '#00D1FF']} style={styles.legendDot} />
                            <Text style={styles.legendText}>Hoy</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.legendDot} />
                            <Text style={styles.legendText}>Récord</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Listado de Días mejorado */}
                <Animated.View style={[styles.daysList, { opacity: fadeAnim }]}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>Detalle Diario</Text>
                        <Text style={styles.listSubtitle}>{weeklyData.length} registros</Text>
                    </View>
                    {weeklyData.slice().reverse().map((day, index) => {
                        const isToday = index === 0;
                        const goalReached = day.steps >= 10000;
                        return (
                            <View key={index} style={[styles.dayItem, isToday && styles.dayItemToday]}>
                                <LinearGradient
                                    colors={isToday ? ['rgba(99,255,21,0.1)', 'rgba(0,0,0,0.5)'] : ['#111', '#0a0a0a']}
                                    style={StyleSheet.absoluteFill}
                                    borderRadius={18}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                                <View style={styles.dayItemLeft}>
                                    <View style={[
                                        styles.dayIconBox,
                                        goalReached && styles.dayIconBoxActive
                                    ]}>
                                        {goalReached ? (
                                            <Ionicons name="checkmark-circle" size={24} color="#63ff15" />
                                        ) : (
                                            <Ionicons name="footsteps" size={20} color="#666" />
                                        )}
                                    </View>
                                    <View>
                                        <Text style={[styles.dayItemDate, isToday && { color: '#63ff15' }]}>
                                            {isToday ? 'Hoy' : day.fullDate.toLocaleDateString('es-ES', { weekday: 'long' })}
                                        </Text>
                                        <Text style={styles.dayItemDateFull}>
                                            {day.fullDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                                        </Text>
                                        <View style={styles.dayItemBadge}>
                                            <View style={[styles.dayItemBadgeDot, goalReached && { backgroundColor: '#63ff15' }]} />
                                            <Text style={[styles.dayItemSubtext, goalReached && { color: '#63ff15' }]}>
                                                {day.steps > 10000 ? '¡Meta Alcanzada!' : day.steps > 5000 ? 'Buen progreso' : 'Continúa así'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.dayItemRight}>
                                    <Text style={[styles.dayItemSteps, isToday && { color: '#63ff15' }]}>
                                        {day.steps.toLocaleString()}
                                    </Text>
                                    <Text style={styles.dayItemLabel}>pasos</Text>
                                    <Text style={styles.dayItemCalories}>~{Math.round(day.steps * 0.04)} kcal</Text>
                                </View>
                            </View>
                        );
                    })}
                </Animated.View>

                {/* Motivación mejorada */}
                <Animated.View style={[styles.motivationBox, { opacity: fadeAnim }]}>
                    <LinearGradient
                        colors={['rgba(99,255,21,0.15)', 'rgba(0,209,255,0.05)']}
                        style={StyleSheet.absoluteFill}
                        borderRadius={24}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.motivationIconBox}>
                        <LinearGradient
                            colors={['#63ff15', '#00D1FF']}
                            style={styles.motivationIconGradient}
                        >
                            <MaterialCommunityIcons name="lightning-bolt" size={28} color="#000" />
                        </LinearGradient>
                    </View>
                    <View style={styles.motivationContent}>
                        <Text style={styles.motivationTitle}>Mensaje Motivacional</Text>
                        <Text style={styles.motivationText}>
                            {weeklyAverage > 8000 ?
                                "¡Increíble consistencia! Estás en el camino correcto hacia tus objetivos." :
                                weeklyAverage > 5000 ?
                                    "¡Buen trabajo! Intenta aumentar un poco más cada día para mejores resultados." :
                                    "Cada paso cuenta en tu viaje. ¡Vamos por más logros!"
                            }
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    // Loading Styles
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    loadingCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        overflow: 'hidden',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    loadingGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    loadingSubtext: {
        color: '#666',
        fontSize: 13,
        fontWeight: '600',
    },
    // Header Styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    backBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    headerRight: {
        width: 48,
        alignItems: 'flex-end',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,0,0,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,0,0,0.3)',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF0000',
    },
    liveText: {
        fontSize: 9,
        color: '#FF0000',
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    // Content
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    // Stats Cards
    statsRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    statsCard: {
        flex: 1,
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
    },
    statsIconBox: {
        marginBottom: 12,
    },
    statsIconGradient: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsValue: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -1,
    },
    statsLabel: {
        fontSize: 11,
        color: '#888',
        marginTop: 6,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statsProgress: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 2,
        marginTop: 12,
        overflow: 'hidden',
    },
    statsProgressBar: {
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
    },
    // Total Card
    totalCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
    },
    totalLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    totalInfo: {
        flex: 1,
    },
    totalLabel: {
        fontSize: 11,
        color: '#666',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -0.5,
    },
    totalBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255,107,53,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Chart
    chartContainer: {
        borderRadius: 28,
        padding: 24,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -0.5,
    },
    chartSubtitle: {
        fontSize: 11,
        color: '#666',
        fontWeight: '600',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chartBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(99,255,21,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
    },
    chartBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#63ff15',
    },
    chartBadgeText: {
        fontSize: 10,
        color: '#63ff15',
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    chartArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 180,
        paddingHorizontal: 5,
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    barTrack: {
        width: 20,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        justifyContent: 'flex-end',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    barFill: {
        width: '100%',
        borderRadius: 14,
        position: 'relative',
        overflow: 'hidden',
    },
    barGlow: {
        position: 'absolute',
        top: 8,
        left: '50%',
        marginLeft: -3,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    dayLabel: {
        fontSize: 11,
        color: '#666',
        fontWeight: '800',
        marginTop: 10,
        textTransform: 'uppercase',
    },
    stepsLabel: {
        fontSize: 10,
        color: '#444',
        marginTop: 4,
        fontWeight: '700',
    },
    chartLegend: {
        flexDirection: 'row',
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 20,
        justifyContent: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 11,
        color: '#888',
        fontWeight: '700',
    },
    // Days List
    daysList: {
        marginBottom: 20,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    listTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    listSubtitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#444',
    },
    dayItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
    },
    dayItemToday: {
        borderWidth: 2,
        borderColor: 'rgba(99,255,21,0.3)',
    },
    dayItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    dayIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dayIconBoxActive: {
        backgroundColor: 'rgba(99,255,21,0.1)',
        borderColor: 'rgba(99,255,21,0.2)',
    },
    dayItemDate: {
        fontSize: 15,
        fontWeight: '800',
        color: 'white',
        textTransform: 'capitalize',
        letterSpacing: -0.3,
    },
    dayItemDateFull: {
        fontSize: 11,
        color: '#666',
        fontWeight: '600',
        marginTop: 2,
        textTransform: 'capitalize',
    },
    dayItemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    dayItemBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#444',
    },
    dayItemSubtext: {
        fontSize: 11,
        color: '#666',
        fontWeight: '600',
    },
    dayItemRight: {
        alignItems: 'flex-end',
    },
    dayItemSteps: {
        fontSize: 22,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -0.5,
    },
    dayItemLabel: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    dayItemCalories: {
        fontSize: 10,
        color: '#FF6B35',
        marginTop: 4,
        fontWeight: '700',
    },
    // Motivation
    motivationBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
        overflow: 'hidden',
        marginBottom: 10,
    },
    motivationIconBox: {
        marginTop: 2,
    },
    motivationIconGradient: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    motivationContent: {
        flex: 1,
    },
    motivationTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: 'white',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    motivationText: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 22,
        fontWeight: '500',
    },
});
