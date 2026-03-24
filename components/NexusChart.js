import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function NexusChart({ data }) {
    // Si no hay datos, usamos placeholders para no romper la UI
    const chartData = data && data.length > 0 ? data : [
        { dayName: 'L', calories: 400 },
        { dayName: 'M', calories: 700 },
        { dayName: 'X', calories: 450 },
        { dayName: 'J', calories: 900 },
        { dayName: 'V', calories: 650 },
        { dayName: 'S', calories: 300 },
        { dayName: 'D', calories: 850 }
    ];

    // Encontrar el valor máximo para escalar las barras
    const maxVal = Math.max(...chartData.map(d => d.calories), 100);

    // Animaciones para cada barra
    const animations = useRef(chartData.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // Animación escalonada (stagger) para las barras
        Animated.stagger(100, animations.map(anim =>
            Animated.spring(anim, {
                toValue: 1,
                friction: 8,
                useNativeDriver: false // Altura no soporta native driver
            })
        )).start();
    }, [chartData]);

    return (
        <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Consumo Calórico Semanal</Text>
                <View style={[styles.badge, { backgroundColor: '#63ff1520' }]}>
                    <Text style={styles.badgeText}>Real-Time</Text>
                </View>
            </View>

            <View style={styles.barsArea}>
                {chartData.map((day, index) => {
                    const heightPercent = (day.calories / maxVal) * 100;

                    return (
                        <View key={index} style={styles.barWrapper}>
                            <View style={styles.barTrack}>
                                <Animated.View
                                    style={[
                                        styles.barFill,
                                        {
                                            height: animations[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', `${heightPercent}%`]
                                            })
                                        }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={index === chartData.length - 1 ? ['#63ff15', '#4ad912'] : ['#007AFF', '#00D1FF']}
                                        style={StyleSheet.absoluteFill}
                                        borderRadius={10}
                                    />
                                    {heightPercent > 30 && (
                                        <View style={styles.dot} />
                                    )}
                                </Animated.View>
                            </View>
                            <Text style={styles.dayText}>{day.dayName}</Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.footer}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
                    <Text style={styles.legendText}>Histórico</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#63ff15' }]} />
                    <Text style={styles.legendText}>Hoy</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    chartContainer: {
        backgroundColor: '#111',
        borderRadius: 25,
        padding: 20,
        marginTop: 25,
        borderWidth: 1,
        borderColor: '#161616',
        width: '100%',
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    chartTitle: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#63ff15',
        fontSize: 10,
        fontWeight: 'bold',
    },
    barsArea: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 140,
        paddingHorizontal: 5,
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
    },
    barTrack: {
        width: 14,
        height: '100%',
        backgroundColor: '#0a0a0a',
        borderRadius: 10,
        justifyContent: 'flex-end',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1a1a1a'
    },
    barFill: {
        width: '100%',
        borderRadius: 10,
        position: 'relative'
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.7)',
        position: 'absolute',
        top: 6,
        alignSelf: 'center'
    },
    dayText: {
        color: '#444',
        fontSize: 10,
        fontWeight: '800',
        marginTop: 10,
    },
    footer: {
        flexDirection: 'row',
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.03)',
        gap: 20,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: '#666',
        fontSize: 10,
        fontWeight: '600',
    }
});
