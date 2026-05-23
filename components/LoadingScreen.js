import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Dimensions, Text, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const MESSAGES = [
    'INICIALIZANDO IA...',
    'CARGANDO DATOS...',
    'SINCRONIZANDO...',
    'PREPARANDO NEXUS...',
];

export default function LoadingScreen({ message, subMessage }) {
    const ring1Rot = useRef(new Animated.Value(0)).current;
    const ring2Rot = useRef(new Animated.Value(0)).current;
    const ring3Rot = useRef(new Animated.Value(0)).current;
    const glowPulse = useRef(new Animated.Value(0)).current;
    const scanLine = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const barProgress = useRef(new Animated.Value(0)).current;
    const shimmer = useRef(new Animated.Value(-1)).current;
    const dotsAnim = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];
    const cornerAnim = useRef(new Animated.Value(0)).current;

    const [msgIndex, setMsgIndex] = useState(0);
    const msgOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Logo entrance
        Animated.parallel([
            Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
            Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]).start();

        // Corner brackets
        Animated.timing(cornerAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

        // Ring 1 - clockwise fast
        Animated.loop(
            Animated.timing(ring1Rot, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })
        ).start();

        // Ring 2 - counter-clockwise slow
        Animated.loop(
            Animated.timing(ring2Rot, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })
        ).start();

        // Ring 3 - clockwise very slow
        Animated.loop(
            Animated.timing(ring3Rot, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
        ).start();

        // Glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowPulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(glowPulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();

        // Scan line vertical sweep
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanLine, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
                Animated.delay(600),
                Animated.timing(scanLine, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.delay(400),
            ])
        ).start();

        // Progress bar
        Animated.timing(barProgress, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start();

        // Shimmer
        Animated.loop(
            Animated.timing(shimmer, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: false })
        ).start();

        // Dots
        dotsAnim.forEach((dot, i) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 200),
                    Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
                    Animated.delay((dotsAnim.length - i - 1) * 200),
                ])
            ).start();
        });

        // Message cycling if no custom message is set
        if (!message) {
            const msgInterval = setInterval(() => {
                Animated.timing(msgOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                    setMsgIndex(prev => (prev + 1) % MESSAGES.length);
                    Animated.timing(msgOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
                });
            }, 1500);
            return () => clearInterval(msgInterval);
        }
    }, [message]);

    const ring1Rotate = ring1Rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const ring2Rotate = ring2Rot.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const ring3Rotate = ring3Rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
    const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] });

    const scanTranslate = scanLine.interpolate({ inputRange: [0, 1], outputRange: [-110, 110] });

    const barWidth = barProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    const shimmerPos = shimmer.interpolate({ inputRange: [0, 1], outputRange: ['-100%', '200%'] });

    const cornerSize = cornerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });

    return (
        <View style={styles.container}>
            {/* Background grid */}
            <View style={styles.grid} pointerEvents="none">
                {[...Array(8)].map((_, i) => (
                    <View key={`h${i}`} style={[styles.gridLineH, { top: `${i * 14}%` }]} />
                ))}
                {[...Array(6)].map((_, i) => (
                    <View key={`v${i}`} style={[styles.gridLineV, { left: `${i * 20}%` }]} />
                ))}
            </View>

            {/* Glow bg blob */}
            <Animated.View style={[styles.glowBlob, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

            <View style={styles.centerContent}>
                {/* Corner brackets */}
                <View style={styles.cornersWrapper} pointerEvents="none">
                    {[
                        { top: -2, left: -2, borderTopWidth: 2, borderLeftWidth: 2 },
                        { top: -2, right: -2, borderTopWidth: 2, borderRightWidth: 2 },
                        { bottom: -2, left: -2, borderBottomWidth: 2, borderLeftWidth: 2 },
                        { bottom: -2, right: -2, borderBottomWidth: 2, borderRightWidth: 2 },
                    ].map((corner, i) => (
                        <Animated.View
                            key={i}
                            style={[styles.corner, corner, { width: cornerSize, height: cornerSize }]}
                        />
                    ))}
                </View>

                {/* Outer dashed ring */}
                <Animated.View style={[styles.ring3, { transform: [{ rotate: ring3Rotate }] }]} />

                {/* Middle ring */}
                <Animated.View style={[styles.ring2, { transform: [{ rotate: ring2Rotate }] }]} />

                {/* Inner ring */}
                <Animated.View style={[styles.ring1, { transform: [{ rotate: ring1Rotate }] }]} />

                {/* Scan line */}
                <View style={styles.scanContainer} pointerEvents="none">
                    <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanTranslate }] }]} />
                </View>

                {/* Logo in squircle centerpiece matching splash screen */}
                <Animated.View style={[styles.logoBox, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
                    <LinearGradient
                        colors={['#63ff15', '#00D1FF', '#63ff15']}
                        style={styles.logoGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <LinearGradient
                            colors={['#111111', '#0A0A0A']}
                            style={styles.logoInnerBox}
                        >
                            <Text style={styles.logoLetter}>N</Text>
                            <View style={styles.logoAccentH} />
                            <View style={styles.logoAccentV} />
                        </LinearGradient>
                    </LinearGradient>
                </Animated.View>
            </View>

            {/* Brand name */}
            <Animated.View style={[styles.brandRow, { opacity: logoOpacity }]}>
                <Text style={styles.brandName}>NEXUS</Text>
                <Text style={styles.brandSub}>ATHLETICS AI</Text>
            </Animated.View>

            {/* Status message */}
            <View style={{ height: 40, justifyContent: 'center', alignItems: 'center' }}>
                <Animated.Text style={[styles.statusMsg, { opacity: msgOpacity }]}>
                    {message || MESSAGES[msgIndex]}
                </Animated.Text>
                {subMessage ? (
                    <Text style={styles.subMsg}>{subMessage.toUpperCase()}</Text>
                ) : null}
            </View>

            {/* Loading bar */}
            <View style={styles.barWrapper}>
                <View style={styles.barTrack}>
                    <Animated.View style={[styles.barFill, { width: barWidth }]}>
                        <Animated.View style={[styles.barShimmer, { left: shimmerPos }]} />
                    </Animated.View>
                    <View style={styles.barGlow} />
                </View>

                {/* Dots */}
                <View style={styles.dotsRow}>
                    {dotsAnim.map((dot, i) => {
                        const dotOpacity = dot.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
                        const dotScale = dot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
                        return (
                            <Animated.View
                                key={i}
                                style={[styles.dot, { opacity: dotOpacity, transform: [{ scale: dotScale }] }]}
                            />
                        );
                    })}
                </View>
            </View>

            {/* Bottom tag */}
            <Text style={styles.versionTag}>NEXUS PERFORMANCE SYSTEM</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050508',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Grid
    grid: {
        ...StyleSheet.absoluteFillObject,
    },
    gridLineH: {
        position: 'absolute',
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(99, 255, 21, 0.04)',
    },
    gridLineV: {
        position: 'absolute',
        height: '100%',
        width: 1,
        backgroundColor: 'rgba(99, 255, 21, 0.04)',
    },

    // Glow
    glowBlob: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(99, 255, 21, 0.05)',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 100,
    },

    // Center rings area
    centerContent: {
        width: 220,
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },

    // Corner brackets
    cornersWrapper: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    corner: {
        position: 'absolute',
        borderColor: 'rgba(99, 255, 21, 0.3)',
        borderWidth: 0,
    },

    // Rings
    ring3: {
        position: 'absolute',
        width: 210,
        height: 210,
        borderRadius: 105,
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.15)',
        borderStyle: 'dashed',
    },
    ring2: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 1.5,
        borderColor: 'rgba(99, 255, 21, 0.4)',
        borderTopColor: '#00D1FF',
        borderRightColor: 'rgba(0, 209, 255, 0.15)',
    },
    ring1: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 2,
        borderColor: '#63ff15',
        borderBottomColor: 'rgba(99, 255, 21, 0.2)',
        borderLeftColor: 'rgba(99, 255, 21, 0.2)',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },

    // Scan line
    scanContainer: {
        position: 'absolute',
        width: 120,
        height: 120,
        overflow: 'hidden',
        borderRadius: 60,
    },
    scanLine: {
        width: '100%',
        height: 2,
        backgroundColor: '#63ff1580',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 6,
    },

    // Logo
    logoBox: {
        zIndex: 5,
    },
    logoGradient: {
        width: 80,
        height: 80,
        borderRadius: 22,
        padding: 1.5,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 12,
    },
    logoInnerBox: {
        flex: 1,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logoLetter: {
        fontSize: 40,
        fontWeight: '900',
        color: '#63ff15',
        letterSpacing: -1,
        textShadowColor: 'rgba(99,255,21,0.8)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
    },
    logoAccentH: {
        position: 'absolute',
        bottom: 12,
        width: '60%',
        height: 1,
        backgroundColor: 'rgba(99,255,21,0.25)',
    },
    logoAccentV: {
        position: 'absolute',
        right: 12,
        height: '60%',
        width: 1,
        backgroundColor: 'rgba(99,255,21,0.25)',
    },

    // Brand
    brandRow: {
        alignItems: 'center',
        marginBottom: 8,
    },
    brandName: {
        fontSize: 32,
        fontWeight: '900',
        color: 'white',
        letterSpacing: 8,
    },
    brandSub: {
        fontSize: 11,
        fontWeight: '600',
        color: '#63ff15',
        letterSpacing: 5,
        marginTop: 2,
    },

    // Status
    statusMsg: {
        fontSize: 11,
        color: '#63ff15',
        letterSpacing: 2,
        fontWeight: '700',
        textAlign: 'center',
        textShadowColor: 'rgba(99,255,21,0.3)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6,
    },
    subMsg: {
        fontSize: 9,
        color: '#52525B',
        letterSpacing: 1.5,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },

    // Bar
    barWrapper: {
        alignItems: 'center',
        gap: 14,
        marginTop: 16,
    },
    barTrack: {
        width: width * 0.55,
        height: 3,
        backgroundColor: 'rgba(99,255,21,0.08)',
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 0.5,
        borderColor: 'rgba(99,255,21,0.12)',
    },
    barFill: {
        height: '100%',
        backgroundColor: '#63ff15',
        borderRadius: 3,
        overflow: 'hidden',
    },
    barShimmer: {
        position: 'absolute',
        top: 0,
        width: '40%',
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.4)',
        transform: [{ skewX: '-20deg' }],
    },
    barGlow: {
        position: 'absolute',
        top: -2,
        left: 0,
        right: 0,
        height: 7,
        borderRadius: 3,
        backgroundColor: 'transparent',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#63ff15',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },

    // Version
    versionTag: {
        position: 'absolute',
        bottom: 40,
        fontSize: 10,
        color: '#3F3F46',
        letterSpacing: 2,
        fontWeight: '700',
    },
});
