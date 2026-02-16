import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LoadingScreen() {
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1.2,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 0.8,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();

        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 3000,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const opacity = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
    });

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            <View style={styles.centerContent}>
                <Animated.View
                    style={[
                        styles.outerRing,
                        {
                            transform: [{ rotate: rotation }, { scale: scaleAnim }],
                            opacity: opacity,
                        },
                    ]}
                />
                
                <Animated.View
                    style={[
                        styles.middleRing,
                        {
                            transform: [{ rotate: rotation }, { scale: scaleAnim }],
                            opacity: opacity,
                        },
                    ]}
                />
                
                <Animated.View
                    style={[
                        styles.innerCircle,
                        {
                            opacity: opacity,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                />
                
                <Animated.Text
                    style={[
                        styles.logoText,
                        {
                            opacity: opacity,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    N
                </Animated.Text>
            </View>

            <Animated.View style={[styles.loadingBar, { opacity }]}>
                <Animated.View
                    style={[
                        styles.loadingBarFill,
                        {
                            transform: [{ scaleX: scaleAnim }],
                        },
                    ]}
                />
            </Animated.View>
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
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 60,
    },
    outerRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 3,
        borderColor: '#63ff15',
        borderStyle: 'solid',
    },
    middleRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: '#0ce810',
        borderStyle: 'dashed',
    },
    innerCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#63ff15',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    logoText: {
        position: 'absolute',
        fontSize: 56,
        fontWeight: '900',
        color: '#000',
    },
    loadingBar: {
        position: 'absolute',
        bottom: 80,
        width: width * 0.6,
        height: 4,
        backgroundColor: '#1a1a1a',
        borderRadius: 2,
        overflow: 'hidden',
    },
    loadingBarFill: {
        width: '100%',
        height: '100%',
        backgroundColor: '#63ff15',
        borderRadius: 2,
    },
});
