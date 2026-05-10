import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ACHIEVEMENTS = [
    {
        id: 'welcome',
        title: 'Recién\nLlegado',
        icon: 'hand-wave',
        iconType: 'MaterialCommunityIcons',
        color: '#63ff15',
        check: (user) => !!user.id,
        description: 'Te uniste a la comunidad de Nexus Athletics.',
    },
    {
        id: 'ai_user',
        title: 'IA\nFriend',
        icon: 'robot',
        iconType: 'MaterialCommunityIcons',
        color: '#A259FF',
        check: (user) => (user.mensajesHoy || 0) > 0,
        description: 'Consultaste al entrenador IA.',
    },
    {
        id: 'premium',
        title: 'Atleta\nElite',
        icon: 'crown',
        iconType: 'MaterialCommunityIcons',
        color: '#FFD700',
        check: (user) => user.plan !== 'Gratis',
        description: 'Suscrito a un plan premium.',
    },
    {
        id: 'fit',
        title: 'Bio-\nSincro',
        icon: 'heart-pulse',
        iconType: 'MaterialCommunityIcons',
        color: '#0ce810',
        check: (user) => !!user.healthSynced,
        description: 'Sincronizaste tus datos biométricos.',
    },
];

export default function AchievementsShowcase({ user, onPressAll }) {
    if (!user) return null;

    const unlocked = ACHIEVEMENTS.filter(a => a.check(user));
    const total    = ACHIEVEMENTS.length;
    const count    = unlocked.length;
    const percent  = Math.round((count / total) * 100);

    const renderIcon = (a, isUnlocked) => {
        const iconColor = isUnlocked ? a.color : '#2a2a2a';
        return a.iconType === 'Ionicons'
            ? <Ionicons name={a.icon} size={26} color={iconColor} />
            : <MaterialCommunityIcons name={a.icon} size={26} color={iconColor} />;
    };

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.sectionLabel}>MIS LOGROS</Text>
                    <Text style={styles.countText}>
                        <Text style={styles.countHighlight}>{count}</Text>
                        <Text style={styles.countTotal}>/{total} desbloqueados</Text>
                    </Text>
                </View>
                <View style={[styles.percentBadge, count === total && styles.percentBadgeMax]}>
                    <Ionicons name="trophy" size={13} color={count === total ? '#000' : '#FFD700'} />
                    <Text style={[styles.percentText, count === total && { color: '#000' }]}>{percent}%</Text>
                </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>

            {/* Badge grid */}
            <View style={styles.grid}>
                {ACHIEVEMENTS.map((a) => {
                    const isUnlocked = a.check(user);
                    return (
                        <View key={a.id} style={styles.badgeWrapper}>
                            <View style={[
                                styles.badgeCircle,
                                isUnlocked
                                    ? { borderColor: a.color, backgroundColor: a.color + '12' }
                                    : styles.lockedBadge,
                            ]}>
                                {isUnlocked && (
                                    <LinearGradient
                                        colors={[a.color + '25', 'transparent']}
                                        style={StyleSheet.absoluteFill}
                                        borderRadius={40}
                                    />
                                )}
                                {renderIcon(a, isUnlocked)}
                                {!isUnlocked && (
                                    <View style={styles.lockOverlay}>
                                        <Ionicons name="lock-closed" size={10} color="#333" />
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.badgeTitle, { color: isUnlocked ? '#ccc' : '#333' }]}>
                                {a.title}
                            </Text>
                        </View>
                    );
                })}
            </View>

            {/* CTA */}
            {onPressAll && (
                <TouchableOpacity style={styles.cta} onPress={onPressAll} activeOpacity={0.7}>
                    <Ionicons name="medal-outline" size={16} color="#63ff15" />
                    <Text style={styles.ctaText}>Ver Sala de Trofeos</Text>
                    <Ionicons name="chevron-forward" size={16} color="#63ff15" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#0f0f0f',
        borderRadius: 18,
        padding: 18,
        marginVertical: 16,
        borderWidth: 1,
        borderColor: '#1e1e1e',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    sectionLabel: {
        color: '#444',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 3,
    },
    countText: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    countHighlight: {
        color: '#63ff15',
        fontSize: 22,
        fontWeight: '900',
    },
    countTotal: {
        color: '#555',
        fontSize: 13,
        fontWeight: '600',
    },
    percentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#1a1a00',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#FFD70033',
    },
    percentBadgeMax: {
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
    },
    percentText: {
        color: '#FFD700',
        fontSize: 13,
        fontWeight: '800',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#1a1a1a',
        borderRadius: 2,
        marginBottom: 18,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#63ff15',
        borderRadius: 2,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    badgeWrapper: {
        alignItems: 'center',
        width: '47%',
    },
    badgeCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 7,
        overflow: 'hidden',
    },
    lockedBadge: {
        borderColor: '#1e1e1e',
        backgroundColor: '#0a0a0a',
    },
    badgeTitle: {
        fontSize: 9,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 13,
        letterSpacing: 0.3,
    },
    lockOverlay: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#111',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: '#1a1a1a',
        paddingTop: 14,
    },
    ctaText: {
        color: '#63ff15',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
