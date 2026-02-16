import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Text } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onFinish }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
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
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
                { iterations: 2 }
            ),
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1.5,
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
        outputRange: [0.5, 1],
    });

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.glowCircle,
                        {
                            opacity: glowOpacity,
                        },
                    ]}
                />
                <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>NEXUS</Text>
                </View>
            </Animated.View>

            <Animated.Text
                style={[
                    styles.tagline,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                Tu entrenador personal con IA
            </Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowCircle: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: '#63ff15',
        opacity: 0.3,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 50,
        elevation: 20,
    },
    logoCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#63ff15',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 5,
        borderColor: '#0ce810',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 30,
        elevation: 15,
    },
    logoText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 2,
    },
    tagline: {
        marginTop: 40,
        fontSize: 16,
        color: '#888',
        fontWeight: '600',
        letterSpacing: 1,
    },
});
