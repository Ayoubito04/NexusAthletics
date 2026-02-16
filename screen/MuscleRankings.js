import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MuscleRanking from '../components/MuscleRanking';

/**
 * Pantalla de Rankings Musculares
 * Muestra el progreso y nivel de cada grupo muscular
 */
export default function MuscleRankings({ navigation }) {
    const [muscleScores, setMuscleScores] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMuscleData();
    }, []);

    const loadMuscleData = async () => {
        try {
            // Intentar cargar datos guardados del usuario
            const savedScores = await AsyncStorage.getItem('muscle_scores');
            if (savedScores) {
                setMuscleScores(JSON.parse(savedScores));
            } else {
                // Si no hay datos, calcular basándose en actividades
                await calculateMuscleScores();
            }
        } catch (error) {
            console.error('Error loading muscle data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calcular puntuaciones basadas en historial de actividades
    const calculateMuscleScores = async () => {
        try {
            const activitiesData = await AsyncStorage.getItem('actividades');
            if (activitiesData) {
                const activities = JSON.parse(activitiesData);

                // Algoritmo simple: más actividad = mayor puntuación
                const scores = {
                    pecho: Math.min(100, activities.length * 5),
                    espalda: Math.min(100, activities.length * 4.5),
                    biceps: Math.min(100, activities.length * 4),
                    triceps: Math.min(100, activities.length * 4),
                    hombros: Math.min(100, activities.length * 3.5),
                    piernas: Math.min(100, activities.length * 6),
                    abdomen: Math.min(100, activities.length * 3),
                    gluteos: Math.min(100, activities.length * 5.5),
                };

                setMuscleScores(scores);
                await AsyncStorage.setItem('muscle_scores', JSON.stringify(scores));
            }
        } catch (error) {
            console.error('Error calculating scores:', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#0a0a0a', '#000']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={28} color="white" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>
                        Rankings <Text style={styles.headerHighlight}>Musculares</Text>
                    </Text>
                    <Text style={styles.headerSubtitle}>Tu progreso por grupos</Text>
                </View>
                <TouchableOpacity style={styles.infoBtn}>
                    <Ionicons name="information-circle-outline" size={24} color="#63ff15" />
                </TouchableOpacity>
            </View>

            {/* Rankings Component */}
            {!loading && <MuscleRanking muscleScores={muscleScores} />}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
    },
    headerHighlight: {
        color: '#63ff15',
    },
    headerSubtitle: {
        color: '#888',
        fontSize: 13,
        marginTop: 2,
    },
    infoBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 255, 21, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.2)',
    },
});
