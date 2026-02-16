import React from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * Sistema de Rankings Musculares inspirado en Symmetry
 * Categorías: Bronce, Plata, Oro, Platino, Diamante, Maestro
 */

const RANK_TIERS = {
    BRONCE: {
        name: 'Bronce',
        color: '#CD7F32',
        gradient: ['#CD7F32', '#8B4513'],
        min: 0,
        max: 20,
        icon: 'shield-outline'
    },
    PLATA: {
        name: 'Plata',
        color: '#C0C0C0',
        gradient: ['#E8E8E8', '#A8A8A8'],
        min: 21,
        max: 40,
        icon: 'shield'
    },
    ORO: {
        name: 'Oro',
        color: '#FFD700',
        gradient: ['#FFD700', '#FFA500'],
        min: 41,
        max: 60,
        icon: 'shield-star-outline'
    },
    PLATINO: {
        name: 'Platino',
        color: '#E5E4E2',
        gradient: ['#E5E4E2', '#B4C7DC'],
        min: 61,
        max: 80,
        icon: 'shield-star'
    },
    DIAMANTE: {
        name: 'Diamante',
        color: '#63ff15',
        gradient: ['#63ff15', '#4ad912'],
        min: 81,
        max: 95,
        icon: 'shield-crown-outline'
    },
    MAESTRO: {
        name: 'Maestro',
        color: '#ff00ff',
        gradient: ['#ff00ff', '#8b00ff'],
        min: 96,
        max: 100,
        icon: 'shield-crown'
    }
};

const MUSCLE_GROUPS = [
    { id: 'pecho', name: 'Pecho', icon: 'arm-flex', iconLib: 'MaterialCommunityIcons' },
    { id: 'espalda', name: 'Espalda', icon: 'human-handsup', iconLib: 'MaterialCommunityIcons' },
    { id: 'biceps', name: 'Bíceps', icon: 'arm-flex-outline', iconLib: 'MaterialCommunityIcons' },
    { id: 'triceps', name: 'Tríceps', icon: 'arm-flex', iconLib: 'MaterialCommunityIcons' },
    { id: 'hombros', name: 'Hombros', icon: 'weight-lifter', iconLib: 'MaterialCommunityIcons' },
    { id: 'piernas', name: 'Piernas', icon: 'run-fast', iconLib: 'MaterialCommunityIcons' },
    { id: 'abdomen', name: 'Abdomen', icon: 'alpha-a-circle-outline', iconLib: 'MaterialCommunityIcons' },
    { id: 'gluteos', name: 'Glúteos', icon: 'human', iconLib: 'MaterialCommunityIcons' },
];

// Calcular rango basado en puntuación (0-100)
const getRankFromScore = (score) => {
    for (const [key, tier] of Object.entries(RANK_TIERS)) {
        if (score >= tier.min && score <= tier.max) {
            return tier;
        }
    }
    return RANK_TIERS.BRONCE;
};

// Componente individual de ranking muscular
const MuscleRankCard = ({ muscle, score = 0 }) => {
    const rank = getRankFromScore(score);
    const progress = ((score - rank.min) / (rank.max - rank.min)) * 100;

    return (
        <View style={styles.muscleCard}>
            <LinearGradient
                colors={['#1a1a1a', '#111']}
                style={styles.cardGradient}
            >
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.muscleInfo}>
                        <MaterialCommunityIcons
                            name={muscle.icon}
                            size={28}
                            color={rank.color}
                        />
                        <View style={styles.muscleText}>
                            <Text style={styles.muscleName}>{muscle.name}</Text>
                            <Text style={styles.muscleScore}>{score} / 100 pts</Text>
                        </View>
                    </View>

                    {/* Rank Badge */}
                    <View style={styles.rankBadge}>
                        <LinearGradient
                            colors={rank.gradient}
                            style={styles.rankGradient}
                        >
                            <MaterialCommunityIcons
                                name={rank.icon}
                                size={20}
                                color="#000"
                            />
                            <Text style={styles.rankName}>{rank.name}</Text>
                        </LinearGradient>
                    </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <LinearGradient
                            colors={rank.gradient}
                            style={[styles.progressBarFill, { width: `${progress}%` }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {Math.round(progress)}% al siguiente rango
                    </Text>
                </View>

                {/* Next Rank Info */}
                {score < 100 && (
                    <View style={styles.nextRankInfo}>
                        <Text style={styles.nextRankText}>
                            {rank.max - score} pts para {
                                Object.values(RANK_TIERS).find(t => t.min > score)?.name || 'Máximo'
                            }
                        </Text>
                    </View>
                )}
            </LinearGradient>
        </View>
    );
};

// Componente principal de rankings
export default function MuscleRanking({ muscleScores = {} }) {
    // Si no hay datos, usar valores por defecto de ejemplo
    const defaultScores = {
        pecho: 45,
        espalda: 62,
        biceps: 78,
        triceps: 55,
        hombros: 42,
        piernas: 88,
        abdomen: 35,
        gluteos: 70,
    };

    const scores = Object.keys(muscleScores).length > 0 ? muscleScores : defaultScores;

    // Calcular puntuación general
    const overallScore = Math.round(
        Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length
    );
    const overallRank = getRankFromScore(overallScore);

    return (
        <View style={styles.container}>
            {/* Overall Score Card */}
            <View style={styles.overallCard}>
                <LinearGradient
                    colors={overallRank.gradient}
                    style={styles.overallGradient}
                >
                    <View style={styles.overallContent}>
                        <MaterialCommunityIcons
                            name="trophy"
                            size={48}
                            color="#000"
                        />
                        <View style={styles.overallText}>
                            <Text style={styles.overallLabel}>RANGO GENERAL</Text>
                            <Text style={styles.overallRank}>{overallRank.name}</Text>
                            <Text style={styles.overallScore}>{overallScore} / 100</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* Muscle Group Rankings */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={styles.sectionTitle}>GRUPOS MUSCULARES</Text>
                {MUSCLE_GROUPS.map(muscle => (
                    <MuscleRankCard
                        key={muscle.id}
                        muscle={muscle}
                        score={scores[muscle.id] || 0}
                    />
                ))}

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <MaterialCommunityIcons name="information-outline" size={20} color="#63ff15" />
                    <Text style={styles.infoText}>
                        Las puntuaciones se calculan basándose en tu progreso, volumen de entrenamiento
                        y consistencia. Sigue trabajando para desbloquear rangos superiores.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overallCard: {
        marginHorizontal: 20,
        marginVertical: 20,
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    overallGradient: {
        padding: 25,
    },
    overallContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    overallText: {
        flex: 1,
    },
    overallLabel: {
        color: '#000',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 2,
        opacity: 0.7,
    },
    overallRank: {
        color: '#000',
        fontSize: 32,
        fontWeight: '900',
        marginTop: 5,
    },
    overallScore: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
        opacity: 0.8,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        color: '#63ff15',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 20,
        marginTop: 10,
    },
    muscleCard: {
        marginBottom: 15,
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardGradient: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    muscleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    muscleText: {
        flex: 1,
    },
    muscleName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
    },
    muscleScore: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    rankBadge: {
        borderRadius: 15,
        overflow: 'hidden',
    },
    rankGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    rankName: {
        color: '#000',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    progressContainer: {
        gap: 8,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#0a0a0a',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        color: '#666',
        fontSize: 11,
        fontWeight: '600',
    },
    nextRankInfo: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#222',
    },
    nextRankText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    infoCard: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 20,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    infoText: {
        flex: 1,
        color: '#888',
        fontSize: 13,
        lineHeight: 20,
    },
});
