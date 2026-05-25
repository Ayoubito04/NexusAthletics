import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        icon: 'flash',
        iconColor: '#63ff15',
        title: 'BIENVENIDO A NEXUS',
        subtitle: 'Tu entrenador de IA personal. Diseñado para atletas que quieren resultados reales.',
        accent: ['#63ff15', '#00D1FF'],
    },
    {
        id: '2',
        icon: 'sparkles',
        iconColor: '#00D1FF',
        title: 'NEXUS IA',
        subtitle: 'Genera rutinas personalizadas con inteligencia artificial en segundos. Sin límites en Pro y Ultimate.',
        accent: ['#00D1FF', '#63ff15'],
    },
    {
        id: '3',
        icon: 'calendar',
        iconColor: '#63ff15',
        title: 'SEGUIMIENTO TOTAL',
        subtitle: 'Programa tus entrenos, analiza tu progreso y bate tus récords personales cada semana.',
        accent: ['#63ff15', '#FFD700'],
    },
    {
        id: '4',
        icon: 'people',
        iconColor: '#FF6B35',
        title: 'COMUNIDAD NEXUS',
        subtitle: 'Compite en rankings globales, comparte tus logros y conecta con atletas de todo el mundo.',
        accent: ['#FF6B35', '#63ff15'],
    },
];

const PARTICLES = [
    { top: '8%', left: '12%', size: 3, opacity: 0.4 },
    { top: '15%', left: '78%', size: 2, opacity: 0.3 },
    { top: '25%', left: '55%', size: 4, opacity: 0.25 },
    { top: '35%', left: '22%', size: 2, opacity: 0.35 },
    { top: '50%', left: '88%', size: 3, opacity: 0.2 },
    { top: '60%', left: '5%', size: 2, opacity: 0.3 },
    { top: '70%', left: '45%', size: 4, opacity: 0.15 },
    { top: '80%', left: '70%', size: 3, opacity: 0.25 },
    { top: '90%', left: '30%', size: 2, opacity: 0.2 },
];

export default function OnboardingScreen() {
    const navigation = useNavigation();
    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            handleFinish();
        }
    };

    const handleSkip = async () => {
        await handleFinish();
    };

    const handleFinish = async () => {
        await AsyncStorage.setItem('onboardingCompleted', 'true');
        navigation.replace('WelcomePlans');
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const renderSlide = ({ item, index }) => (
        <View style={styles.slide}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Icon area */}
            <View style={styles.iconWrapper}>
                <LinearGradient
                    colors={[`${item.iconColor}22`, `${item.iconColor}08`, 'transparent']}
                    style={styles.iconGlow}
                />
                <LinearGradient
                    colors={item.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconBorder}
                >
                    <View style={styles.iconInner}>
                        <Ionicons name={item.icon} size={56} color={item.iconColor} />
                    </View>
                </LinearGradient>
            </View>

            {/* Step indicator */}
            <Text style={styles.stepLabel}>0{index + 1} / 0{SLIDES.length}</Text>

            {/* Text */}
            <Text style={[styles.title, { color: index === 1 ? '#00D1FF' : index === 3 ? '#FF6B35' : '#fff' }]}>
                {item.title}
            </Text>
            <View style={[styles.titleUnderline, { backgroundColor: item.iconColor }]} />
            <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
    );

    const isLast = currentIndex === SLIDES.length - 1;

    return (
        <SafeAreaView style={styles.container}>
            {/* Static particles */}
            {PARTICLES.map((p, i) => (
                <View
                    key={i}
                    style={{
                        position: 'absolute',
                        top: p.top,
                        left: p.left,
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size / 2,
                        backgroundColor: '#63ff15',
                        opacity: p.opacity,
                    }}
                />
            ))}

            {/* Logo top */}
            <View style={styles.topBar}>
                <View style={styles.logoChip}>
                    <Text style={styles.logoText}>N</Text>
                </View>
                {!isLast && (
                    <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Saltar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderSlide}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                style={styles.flatList}
            />

            {/* Dots */}
            <View style={styles.dotsRow}>
                {SLIDES.map((_, i) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                    const dotWidth = scrollX.interpolate({
                        inputRange,
                        outputRange: [8, 24, 8],
                        extrapolate: 'clamp',
                    });
                    const dotOpacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp',
                    });
                    return (
                        <Animated.View
                            key={i}
                            style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
                        />
                    );
                })}
            </View>

            {/* Button */}
            <View style={styles.btnWrapper}>
                <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.btn}>
                    <LinearGradient
                        colors={['#63ff15', '#00D1FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.btnGradient}
                    >
                        <Text style={styles.btnText}>
                            {isLast ? 'EMPEZAR' : 'SIGUIENTE'}
                        </Text>
                        <Ionicons
                            name={isLast ? 'rocket-outline' : 'arrow-forward'}
                            size={18}
                            color="#000"
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050508',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 4,
    },
    logoChip: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#111',
        borderWidth: 1.5,
        borderColor: 'rgba(99,255,21,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#63ff15',
        fontSize: 18,
        fontWeight: '900',
    },
    skipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    skipText: {
        color: '#555',
        fontSize: 13,
        fontWeight: '600',
    },
    flatList: {
        flex: 1,
    },
    slide: {
        width,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    corner: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderColor: 'rgba(99,255,21,0.2)',
    },
    cornerTL: { top: 16, left: 16, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
    cornerTR: { top: 16, right: 16, borderTopWidth: 1.5, borderRightWidth: 1.5 },
    cornerBL: { bottom: 80, left: 16, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
    cornerBR: { bottom: 80, right: 16, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 36,
    },
    iconGlow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    iconBorder: {
        width: 120,
        height: 120,
        borderRadius: 34,
        padding: 2,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    iconInner: {
        flex: 1,
        borderRadius: 32,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepLabel: {
        color: 'rgba(99,255,21,0.4)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 3,
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 12,
    },
    titleUnderline: {
        width: 40,
        height: 2,
        borderRadius: 1,
        marginBottom: 20,
        opacity: 0.8,
    },
    subtitle: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 16,
    },
    dot: {
        height: 4,
        borderRadius: 2,
        backgroundColor: '#63ff15',
    },
    btnWrapper: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    btn: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    btnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    btnText: {
        color: '#000',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
