import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, TouchableOpacity, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function AchievementUnlockedModal({ visible, achievement, onClose }) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Animación de entrada
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(glowAnim, {
                            toValue: 1,
                            duration: 1500,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(glowAnim, {
                            toValue: 0,
                            duration: 1500,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ])
                ),
                Animated.loop(
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    })
                ),
            ]).start();
        } else {
            scaleAnim.setValue(0);
            glowAnim.setValue(0);
            rotateAnim.setValue(0);
        }
    }, [visible]);

    if (!achievement) return null;

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.8],
    });

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Círculos de fondo girando */}
                <Animated.View
                    style={[
                        styles.backgroundCircle,
                        {
                            transform: [{ rotate: rotation }],
                            opacity: 0.1,
                        },
                    ]}
                />

                <Animated.View
                    style={[
                        styles.contentContainer,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['#0a0a0a', '#111']}
                        style={styles.modalContent}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.sparkleRow}>
                                <Ionicons name="sparkles" size={16} color="#FFD700" />
                                <Text style={styles.unlockText}>¡LOGRO DESBLOQUEADO!</Text>
                                <Ionicons name="sparkles" size={16} color="#FFD700" />
                            </View>
                        </View>

                        {/* Medalla con glow */}
                        <View style={styles.badgeContainer}>
                            <Animated.View
                                style={[
                                    styles.glowCircle,
                                    {
                                        backgroundColor: achievement.color || '#63ff15',
                                        opacity: glowOpacity,
                                    },
                                ]}
                            />
                            <View
                                style={[
                                    styles.badgeCircle,
                                    { borderColor: achievement.color || '#63ff15' },
                                ]}
                            >
                                <LinearGradient
                                    colors={[achievement.color + '30', 'transparent']}
                                    style={StyleSheet.absoluteFill}
                                />
                                {achievement.iconType === 'Ionicons' ? (
                                    <Ionicons
                                        name={achievement.icon}
                                        size={60}
                                        color={achievement.color || '#63ff15'}
                                    />
                                ) : (
                                    <MaterialCommunityIcons
                                        name={achievement.icon}
                                        size={60}
                                        color={achievement.color || '#63ff15'}
                                    />
                                )}
                            </View>
                        </View>

                        {/* Título y Descripción */}
                        <Text style={styles.title}>{achievement.title}</Text>
                        <Text style={styles.description}>{achievement.description}</Text>

                        {/* Botón de cerrar */}
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[achievement.color || '#63ff15', (achievement.color || '#63ff15') + 'CC']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.closeButtonGradient}
                            >
                                <Text style={styles.closeButtonText}>¡INCREÍBLE!</Text>
                                <Ionicons name="checkmark-circle" size={20} color="#000" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Footer motivacional */}
                        <Text style={styles.footerText}>Sigue así, atleta. El límite no existe.</Text>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backgroundCircle: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        borderWidth: 2,
        borderColor: '#63ff15',
    },
    contentContainer: {
        width: '85%',
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(99, 255, 21, 0.3)',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    modalContent: {
        padding: 30,
        alignItems: 'center',
    },
    header: {
        marginBottom: 20,
    },
    sparkleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    unlockText: {
        color: '#FFD700',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    badgeContainer: {
        position: 'relative',
        marginVertical: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glowCircle: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        opacity: 0.3,
    },
    badgeCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: 'white',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 1,
    },
    description: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    closeButton: {
        width: '100%',
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 15,
    },
    closeButtonGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    closeButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    footerText: {
        fontSize: 11,
        color: '#444',
        fontStyle: 'italic',
        textAlign: 'center',
    },
});
