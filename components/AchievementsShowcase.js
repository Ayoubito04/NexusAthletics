import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ACHIEVEMENTS = [
    {
        id: 'welcome',
        title: 'Recién Llegado',
        icon: 'hand-wave',
        iconType: 'MaterialCommunityIcons',
        color: '#63ff15',
        check: (user) => !!user.id,
        description: 'Te uniste a la comunidad de Nexus Athletics.'
    },
    {
        id: 'walker',
        title: 'Caminante Pro',
        icon: 'footsteps',
        iconType: 'Ionicons',
        color: '#00D1FF',
        check: (user) => (user.healthSteps || 0) >= 5000,
        description: 'Has superado los 5,000 pasos en un solo día.'
    },
    {
        id: 'ai_user',
        title: 'IA Friend',
        icon: 'robot',
        iconType: 'MaterialCommunityIcons',
        color: '#A259FF',
        check: (user) => (user.mensajesHoy || 0) > 0,
        description: 'Has consultado a Nexus AI para mejorar tu entrenamiento.'
    },
    {
        id: 'premium',
        title: 'Atleta Elite',
        icon: 'crown',
        iconType: 'MaterialCommunityIcons',
        color: '#FFD700',
        check: (user) => user.plan !== 'Gratis',
        description: 'Suscrito a un plan de alto rendimiento.'
    },
    {
        id: 'explorer',
        title: 'Explorador',
        icon: 'map-marker-distance',
        iconType: 'MaterialCommunityIcons',
        color: '#FF6B6B',
        check: (user) => user.activities && user.activities.length > 0,
        description: 'Completaste tu primera ruta GPS externa.'
    },
    {
        id: 'fit',
        title: 'Bio-Sincro',
        icon: 'heart-pulse',
        iconType: 'MaterialCommunityIcons',
        color: '#0ce810',
        check: (user) => user.healthSynced,
        description: 'Sincronizaste tus datos biométricos con Nexus.'
    }
];

export default function AchievementsShowcase({ user }) {
    if (!user) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Mis Trofeos Nexus</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
            >
                {ACHIEVEMENTS.map((achievement) => {
                    const isUnlocked = achievement.check(user);
                    return (
                        <View key={achievement.id} style={styles.badgeWrapper}>
                            <View style={[
                                styles.badgeCircle,
                                isUnlocked ? { borderColor: achievement.color } : styles.lockedBadge
                            ]}>
                                {isUnlocked && (
                                    <LinearGradient
                                        colors={[achievement.color + '30', 'transparent']}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                {achievement.iconType === 'Ionicons' ? (
                                    <Ionicons
                                        name={achievement.icon}
                                        size={30}
                                        color={isUnlocked ? achievement.color : '#333'}
                                    />
                                ) : (
                                    <MaterialCommunityIcons
                                        name={achievement.icon}
                                        size={30}
                                        color={isUnlocked ? achievement.color : '#333'}
                                    />
                                )}
                                {!isUnlocked && (
                                    <View style={styles.lockOverlay}>
                                        <Ionicons name="lock-closed" size={12} color="#444" />
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.badgeTitle, isUnlocked ? { color: 'white' } : { color: '#444' }]}>
                                {achievement.title}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 20,
    },
    sectionTitle: {
        color: '#444',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 15,
        marginLeft: 5,
        letterSpacing: 1,
    },
    scrollContainer: {
        paddingRight: 20,
    },
    badgeWrapper: {
        alignItems: 'center',
        marginRight: 20,
        width: 80,
    },
    badgeCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        position: 'relative',
        overflow: 'hidden'
    },
    lockedBadge: {
        borderColor: '#222',
        backgroundColor: '#0a0a0a',
    },
    badgeTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    lockOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#1a1a1a',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#000'
    }
});
