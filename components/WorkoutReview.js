import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

export default function WorkoutReview({ visible, workoutData, onConfirm }) {
    const [loading, setLoading] = useState(true);
    const [reviewData, setReviewData] = useState(null);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        if (visible && workoutData) {
            getAIReview();
        }
    }, [visible]);

    const getAIReview = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${Config.BACKEND_URL}/activities/review-workout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sessionData: workoutData.sessionData,
                    duration: workoutData.duration,
                    totalExercises: workoutData.exercises
                })
            });

            const data = await response.json();
            setReviewData(data);

            // Actualizar scores en AsyncStorage
            if (data.muscleRankings) {
                await updateMuscleScores(data.muscleRankings);
            }

            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true
            }).start();
        } catch (error) {
            console.error("Error al obtener reseña:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateMuscleScores = async (newRankings) => {
        try {
            const savedScores = await AsyncStorage.getItem('muscle_scores');
            let currentScores = savedScores ? JSON.parse(savedScores) : {};

            newRankings.forEach(item => {
                const key = item.muscle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                // Tomar el puntaje de la IA como el nuevo estado o hacer un promedio/subida
                currentScores[key] = item.score;
            });

            await AsyncStorage.setItem('muscle_scores', JSON.stringify(currentScores));
        } catch (e) {
            console.log("Error updating scores:", e);
        }
    };

    const getRankColor = (rank) => {
        switch (rank) {
            case 'Maestro': return '#ff00ff';
            case 'Diamante': return '#63ff15';
            case 'Platino': return '#E5E4E2';
            case 'Oro': return '#FFD700';
            case 'Plata': return '#C0C0C0';
            default: return '#CD7F32'; // Bronce
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <LinearGradient
                    colors={['#0a0a0a', '#000']}
                    style={styles.container}
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#63ff15" />
                            <Text style={styles.loadingText}>Nexus IA analizando tu desempeño...</Text>
                        </View>
                    ) : (
                        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.header}>
                                    <View style={styles.iaBadge}>
                                        <MaterialCommunityIcons name="robot" size={20} color="#63ff15" />
                                        <Text style={styles.iaBadgeText}>NEXUS IA REVIEW</Text>
                                    </View>
                                    <Text style={styles.title}>Análisis de Sesión</Text>
                                </View>

                                <View style={styles.reviewCard}>
                                    <View style={styles.quoteIcon}>
                                        <Ionicons name="quote" size={24} color="#63ff1520" />
                                    </View>
                                    <Text style={styles.reviewText}>{reviewData?.review}</Text>
                                </View>

                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="trending-up" size={18} color="#63ff15" />
                                        <Text style={styles.sectionTitle}>PUNTOS FUERTES</Text>
                                    </View>
                                    <View style={styles.pointsGrid}>
                                        {reviewData?.strongPoints?.map((p, i) => (
                                            <View key={i} style={styles.pointItem}>
                                                <Ionicons name="checkmark-circle" size={16} color="#63ff15" />
                                                <Text style={styles.pointText}>{p}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="warning-outline" size={18} color="#FF6B6B" />
                                        <Text style={[styles.sectionTitle, { color: '#FF6B6B' }]}>ÁREAS DE MEJORA</Text>
                                    </View>
                                    <View style={styles.pointsGrid}>
                                        {reviewData?.weakPoints?.map((p, i) => (
                                            <View key={i} style={styles.pointItem}>
                                                <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                                                <Text style={styles.pointText}>{p}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Ionicons name="trophy-outline" size={18} color="#FFD700" />
                                        <Text style={[styles.sectionTitle, { color: '#FFD700' }]}>RANKINGS ACTUALIZADOS</Text>
                                    </View>
                                    <View style={styles.rankingsList}>
                                        {reviewData?.muscleRankings?.map((r, i) => (
                                            <View key={i} style={styles.rankItem}>
                                                <View style={styles.rankMuscleInfo}>
                                                    <Text style={styles.rankMuscleName}>{r.muscle}</Text>
                                                    <Text style={[styles.rankCategory, { color: getRankColor(r.rank) }]}>{r.rank}</Text>
                                                </View>
                                                <View style={styles.rankBarBg}>
                                                    <LinearGradient
                                                        colors={[getRankColor(r.rank), '#000']}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={[styles.rankBarFill, { width: `${r.score}%` }]}
                                                    />
                                                </View>
                                                <Text style={styles.rankScore}>{r.score} pts</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
                                    <LinearGradient
                                        colors={['#63ff15', '#4ad912']}
                                        style={styles.confirmGradient}
                                    >
                                        <Text style={styles.confirmText}>CONTINUAR</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </ScrollView>
                        </Animated.View>
                    )}
                </LinearGradient>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '90%',
        height: '80%',
        borderRadius: 30,
        padding: 25,
        borderWidth: 1,
        borderColor: '#222',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#888',
        marginTop: 20,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    header: {
        marginBottom: 25,
    },
    iaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(99,255,21,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    iaBadgeText: {
        color: '#63ff15',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    title: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '900',
    },
    reviewCard: {
        backgroundColor: '#121212',
        padding: 20,
        borderRadius: 20,
        marginBottom: 25,
        borderLeftWidth: 3,
        borderLeftColor: '#63ff15',
    },
    quoteIcon: {
        position: 'absolute',
        top: 10,
        right: 15,
    },
    reviewText: {
        color: '#E4E4E7',
        fontSize: 15,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 15,
    },
    sectionTitle: {
        color: '#63ff15',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    pointsGrid: {
        gap: 10,
    },
    pointItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#111',
        padding: 12,
        borderRadius: 12,
    },
    pointText: {
        color: '#A1A1AA',
        fontSize: 13,
        fontWeight: '600',
    },
    rankingsList: {
        gap: 15,
    },
    rankItem: {
        backgroundColor: '#111',
        padding: 15,
        borderRadius: 15,
    },
    rankMuscleInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    rankMuscleName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    rankCategory: {
        fontSize: 11,
        fontWeight: '900',
    },
    rankBarBg: {
        height: 6,
        backgroundColor: '#222',
        borderRadius: 3,
        overflow: 'hidden',
    },
    rankBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    rankScore: {
        marginTop: 5,
        color: '#444',
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'right',
    },
    confirmBtn: {
        marginTop: 10,
        borderRadius: 15,
        overflow: 'hidden',
    },
    confirmGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    confirmText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
