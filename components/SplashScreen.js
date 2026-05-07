import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Text, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const HEX_SIZE = 30;
const COLS = Math.ceil(width / (HEX_SIZE * 1.5)) + 2;
const ROWS = Math.ceil(height / (HEX_SIZE * 0.866)) + 2;

export default function SplashScreen({ onFinish }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const loadingBarAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const gridOpacity = useRef(new Animated.Value(0)).current;

    const hexOpacities = useRef(
        Array.from({ length: 6 }, () => new Animated.Value(0))
    ).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(gridOpacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.back(0.3)),
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 15,
                    friction: 6,
                    useNativeDriver: true,
                }),
            ]),
            Animated.stagger(200, hexOpacities.map(anim =>
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                })
            )),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.08,
                        duration: 1200,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin),
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1200,
                        useNativeDriver: true,
                        easing: Easing.inOut(Easing.sin),
                    }),
                ]),
                { iterations: 2 }
            ),
            Animated.timing(loadingBarAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: false,
                easing: Easing.inOut(Easing.cubic),
            }),
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.ease),
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1.4,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.ease),
                }),
            ]),
        ]).start(() => {
            if (onFinish) onFinish();
        });
    }, []);

    const loadingBarWidth = loadingBarAnim.interpolate({
        inputRange: [0, 0.3, 0.7, 1],
        outputRange: ['0%', '25%', '70%', '100%'],
    });

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const hexPositions = [
        { x: '15%', y: '20%', size: 1.0, delay: 0 },
        { x: '55%', y: '15%', size: 0.7, delay: 1 },
        { x: '80%', y: '35%', size: 1.2, delay: 2 },
        { x: '30%', y: '55%', size: 0.8, delay: 3 },
        { x: '70%', y: '65%', size: 1.1, delay: 4 },
        { x: '45%', y: '80%', size: 0.6, delay: 5 },
    ];

    return (
        <View style={styles.container}>
            {/* Animated hex grid background */}
            <Animated.View style={[styles.hexGrid, { opacity: gridOpacity }]}>
                {Array.from({ length: ROWS }).map((_, row) =>
                    Array.from({ length: COLS }).map((_, col) => {
                        const offsetX = row % 2 === 0 ? 0 : HEX_SIZE * 0.75;
                        return (
                            <View
                                key={`${row}-${col}`}
                                style={[
                                    styles.hexCell,
                                    {
                                        left: col * HEX_SIZE * 1.5 + offsetX,
                                        top: row * HEX_SIZE * 0.866,
                                        opacity: 0.04 + ((row + col) % 3) * 0.02,
                                    },
                                ]}
                            />
                        );
                    })
                )}
            </Animated.View>

            {/* Floating hex particles */}
            {hexPositions.map((hex, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.hexParticle,
                        {
                            left: hex.x,
                            top: hex.y,
                            opacity: hexOpacities[i],
                            transform: [
                                { scale: hex.size * 0.6 },
                            ],
                            borderColor: `rgba(99,255,21,${0.15 + i * 0.04})`,
                        },
                    ]}
                />
            ))}

            {/* Scanline overlay */}
            <View style={styles.scanlineOverlay} />

            {/* Logo Container */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
                    },
                ]}
            >
                {/* Outer glow ring */}
                <Animated.View style={[styles.outerGlowRing, { opacity: fadeAnim }]} />

                {/* Inner glow circle */}
                <Animated.View style={[styles.glowCircle, { opacity: Animated.multiply(fadeAnim, 0.6) }]} />

                {/* Logo Box with gradient border */}
                <LinearGradient
                    colors={['rgba(99,255,21,0.25)', 'rgba(0,209,255,0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.logoBox}
                >
                    <View style={styles.logoInner}>
                        <Text style={styles.logoText}>N</Text>
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Brand name */}
            <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.brandName}>NEXUS</Text>
                <View style={styles.brandAccent}>
                    <View style={styles.accentLineLeft} />
                    <Text style={styles.brandSub}>ATHLETICS</Text>
                    <View style={styles.accentLineRight} />
                </View>
            </Animated.View>

            <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}> 
                Entrenamiento con IA
            </Animated.Text>

            {/* Loading Bar */}
            <View style={styles.loadingBarContainer}>
                <LinearGradient
                    colors={['#63ff15', '#00D1FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loadingBarTrack}
                >
                    <Animated.View style={[styles.loadingBar, { width: loadingBarWidth }]} />
                </LinearGradient>
            </View>

            <Text style={styles.versionText}>NEXUS PERFORMANCE SYSTEM</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    hexGrid: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    hexCell: {
        position: 'absolute',
        width: HEX_SIZE,
        height: HEX_SIZE * 0.866,
        backgroundColor: '#63ff15',
        transform: [{ rotate: '90deg' }],
    },
    hexParticle: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 2,
        transform: [{ rotate: '45deg' }],
    },
    scanlineOverlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.03,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    outerGlowRing: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
    },
    glowCircle: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#63ff15',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 80,
        elevation: 25,
    },
    logoBox: {
        width: 140,
        height: 140,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(99,255,21,0.8)',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 40,
        elevation: 20,
    },
    logoInner: {
        width: 120,
        height: 120,
        borderRadius: 28,
        backgroundColor: '#0A0A0A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.2)',
    },
    logoText: {
        fontSize: 64,
        fontWeight: '900',
        color: '#63ff15',
        letterSpacing: 2,
        textShadowColor: 'rgba(99,255,21,0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    brandName: {
        fontSize: 36,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 12,
        marginBottom: 8,
        textShadowColor: 'rgba(99,255,21,0.3)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    brandAccent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        gap: 10,
    },
    accentLineLeft: {
        width: 30,
        height: 1,
        backgroundColor: 'rgba(99,255,21,0.5)',
    },
    accentLineRight: {
        width: 30,
        height: 1,
        backgroundColor: 'rgba(99,255,21,0.5)',
    },
    brandSub: {
        fontSize: 11,
        color: '#63ff15',
        fontWeight: '700',
        letterSpacing: 4,
    },
    subtitle: {
        fontSize: 13,
        color: '#8A8A92',
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 80,
    },
    loadingBarContainer: {
        position: 'absolute',
        bottom: 100,
        width: '60%',
        height: 3,
        backgroundColor: 'rgba(99,255,21,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBarTrack: {
        flex: 1,
        borderRadius: 2,
    },
    loadingBar: {
        height: '100%',
        backgroundColor: '#63ff15',
        borderRadius: 2,
    },
    versionText: {
        position: 'absolute',
        bottom: 40,
        fontSize: 10,
        color: '#52525B',
        fontWeight: '700',
        letterSpacing: 1.2,
    },
});
