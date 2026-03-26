import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const loadingBarAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            // Entrada - aparición del logo
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 20,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]),
            // Pulso del logo
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
                { iterations: 2 }
            ),
            // Barra de carga animada
            Animated.timing(loadingBarAnim, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: false,
            }),
            // Salida - desvanecimiento
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1.3,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            if (onFinish) onFinish();
        });
    }, []);

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 0.8],
    });

    const loadingBarWidth = loadingBarAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            {/* Fondo con líneas decorativas */}
            <View style={styles.backgroundLines}>
                <View style={[styles.line, { top: '20%' }]} />
                <View style={[styles.line, { top: '40%' }]} />
                <View style={[styles.line, { top: '60%' }]} />
                <View style={[styles.line, { top: '80%' }]} />
            </View>

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
                {/* Glow effect */}
                <Animated.View
                    style={[
                        styles.glowCircle,
                        {
                            opacity: glowOpacity,
                        },
                    ]}
                />

                {/* Logo Box */}
                <LinearGradient
                    colors={['rgba(99,255,21,0.2)', 'rgba(99,255,21,0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.logoBox}
                >
                    <Text style={styles.logoText}>N</Text>
                </LinearGradient>
            </Animated.View>

            {/* Tagline */}
            <Animated.Text
                style={[
                    styles.tagline,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                NEXUS FITNESS
            </Animated.Text>

            <Animated.Text
                style={[
                    styles.subtitle,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                Tu entrenador personal con IA
            </Animated.Text>

            {/* Loading Bar */}
            <View style={styles.loadingBarContainer}>
                <Animated.View
                    style={[
                        styles.loadingBar,
                        {
                            width: loadingBarWidth,
                        },
                    ]}
                />
            </View>

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
    backgroundLines: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    line: {
        position: 'absolute',
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(99,255,21,0.08)',
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 48,
    },
    glowCircle: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: '#63ff15',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 60,
        elevation: 25,
    },
    logoBox: {
        width: 180,
        height: 180,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#63ff15',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 15,
    },
    logoText: {
        fontSize: 80,
        fontWeight: '900',
        color: '#63ff15',
        letterSpacing: 2,
    },
    tagline: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 3,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: '#63ff15',
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 60,
    },
    loadingBarContainer: {
        position: 'absolute',
        bottom: 80,
        width: '70%',
        height: 3,
        backgroundColor: 'rgba(99,255,21,0.15)',
        borderRadius: 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.3)',
    },
    loadingBar: {
        height: '100%',
        backgroundColor: '#63ff15',
        borderRadius: 2,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 3,
    },
});
