/**
 * Skeleton Loaders para pantallas de autenticacion
 * Proporciona placeholders visuales durante la carga
 * Implementa animaciones de pulso para mejor UX
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    Easing,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Componente base de skeleton con animacion shimmer
const SkeletonBox = ({ width, height, borderRadius = 8, style }) => {
    const shimmerValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
                Animated.timing(shimmerValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.ease),
                }),
            ])
        ).start();
    }, []);

    const opacity = shimmerValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeletonBase,
                {
                    width,
                    height,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
};

// Skeleton para el logo/header
const HeaderSkeleton = () => (
    <View style={styles.headerContainer}>
        <SkeletonBox width={80} height={80} borderRadius={20} />
        <View style={styles.headerTextContainer}>
            <SkeletonBox width={120} height={28} borderRadius={4} style={styles.marginBottom} />
            <SkeletonBox width={100} height={14} borderRadius={4} />
        </View>
    </View>
);

// Skeleton para campo de input
const InputSkeleton = ({ label = true }) => (
    <View style={styles.inputContainer}>
        {label && <SkeletonBox width={60} height={11} borderRadius={4} style={styles.labelSkeleton} />}
        <SkeletonBox width="100%" height={52} borderRadius={12} />
    </View>
);

// Skeleton para boton principal
const ButtonSkeleton = ({ height = 54, text = 'ENTRAR' }) => (
    <View style={styles.buttonContainer}>
        <SkeletonBox width="100%" height={height} borderRadius={12} />
    </View>
);

// Skeleton para boton social
const SocialButtonSkeleton = ({ count = 3 }) => (
    <View style={styles.socialContainer}>
        {Array.from({ length: count }).map((_, index) => (
            <View key={index} style={styles.socialButton}>
                <SkeletonBox width="100%" height={50} borderRadius={12} />
            </View>
        ))}
    </View>
);

// Skeleton completo para pantalla de Login
const LoginSkeleton = () => (
    <View style={styles.container}>
        <HeaderSkeleton />

        <View style={styles.cardContainer}>
            <View style={styles.card}>
                <SkeletonBox width={200} height={22} borderRadius={4} style={styles.titleSkeleton} />

                <InputSkeleton />
                <InputSkeleton />

                <ButtonSkeleton />

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine}>
                        <SkeletonBox width="100%" height={1} borderRadius={0} />
                    </View>
                    <SkeletonBox width={100} height={12} borderRadius={4} style={styles.dividerText} />
                    <View style={styles.dividerLine}>
                        <SkeletonBox width="100%" height={1} borderRadius={0} />
                    </View>
                </View>

                <SocialButtonSkeleton />

                <View style={styles.footerContainer}>
                    <SkeletonBox width={180} height={14} borderRadius={4} />
                </View>
            </View>
        </View>
    </View>
);

// Skeleton completo para pantalla de Registro
const RegisterSkeleton = () => (
    <View style={styles.container}>
        <View style={styles.registerHeader}>
            <SkeletonBox width={200} height={34} borderRadius={4} style={styles.marginBottom} />
            <SkeletonBox width={250} height={14} borderRadius={4} />
        </View>

        <View style={styles.cardContainer}>
            <View style={styles.card}>
                <InputSkeleton />
                <InputSkeleton />
                <InputSkeleton />
                <InputSkeleton />
                <InputSkeleton label={false} />

                <ButtonSkeleton text="REGISTRARSE" />

                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine}>
                        <SkeletonBox width="100%" height={1} borderRadius={0} />
                    </View>
                    <SkeletonBox width={120} height={12} borderRadius={4} style={styles.dividerText} />
                    <View style={styles.dividerLine}>
                        <SkeletonBox width="100%" height={1} borderRadius={0} />
                    </View>
                </View>

                <SocialButtonSkeleton />

                <View style={styles.footerContainer}>
                    <SkeletonBox width={200} height={14} borderRadius={4} />
                </View>
            </View>
        </View>
    </View>
);

// Skeleton para pantalla de verificacion 2FA
const VerificationSkeleton = () => (
    <View style={styles.container}>
        <View style={styles.verificationContainer}>
            <SkeletonBox width={80} height={80} borderRadius={40} style={styles.marginBottom} />

            <SkeletonBox width={200} height={24} borderRadius={4} style={styles.marginBottom} />
            <SkeletonBox width={280} height={14} borderRadius={4} style={styles.marginBottom} />

            <View style={styles.codeContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                    <SkeletonBox key={index} width={45} height={55} borderRadius={12} style={styles.codeBox} />
                ))}
            </View>

            <ButtonSkeleton text="VERIFICAR" />

            <SkeletonBox width={150} height={14} borderRadius={4} style={styles.resendLink} />
        </View>
    </View>
);

// Skeleton para perfil/configuracion
const ProfileSkeleton = () => (
    <View style={styles.container}>
        <View style={styles.profileHeader}>
            <SkeletonBox width={100} height={100} borderRadius={50} style={styles.marginBottom} />
            <SkeletonBox width={150} height={24} borderRadius={4} style={styles.marginBottom} />
            <SkeletonBox width={120} height={16} borderRadius={4} />
        </View>

        <View style={styles.settingsContainer}>
            {Array.from({ length: 5 }).map((_, index) => (
                <View key={index} style={styles.settingItem}>
                    <View style={styles.settingLeft}>
                        <SkeletonBox width={24} height={24} borderRadius={12} />
                        <SkeletonBox width={150} height={16} borderRadius={4} style={styles.settingText} />
                    </View>
                    <SkeletonBox width={50} height={26} borderRadius={13} />
                </View>
            ))}
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0A0A',
        padding: 24,
        paddingTop: 40,
    },
    skeletonBase: {
        backgroundColor: '#27272A',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 36,
    },
    headerTextContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    cardContainer: {
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#121212',
        borderRadius: 24,
        padding: 28,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    inputContainer: {
        marginBottom: 18,
    },
    labelSkeleton: {
        marginBottom: 8,
        marginLeft: 4,
    },
    buttonContainer: {
        marginTop: 8,
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    socialButton: {
        flex: 1,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
    },
    dividerText: {
        marginHorizontal: 14,
    },
    footerContainer: {
        marginTop: 28,
        alignItems: 'center',
    },
    marginBottom: {
        marginBottom: 6,
    },
    titleSkeleton: {
        alignSelf: 'center',
        marginBottom: 24,
    },
    registerHeader: {
        alignItems: 'center',
        marginBottom: 30,
        paddingTop: 20,
    },
    verificationContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 30,
        width: '100%',
        maxWidth: 320,
    },
    codeBox: {
        marginHorizontal: 5,
    },
    resendLink: {
        marginTop: 20,
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    settingsContainer: {
        paddingHorizontal: 20,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingText: {
        marginLeft: 12,
    },
});

export {
    SkeletonBox,
    HeaderSkeleton,
    InputSkeleton,
    ButtonSkeleton,
    SocialButtonSkeleton,
    LoginSkeleton,
    RegisterSkeleton,
    VerificationSkeleton,
    ProfileSkeleton,
};

export default {
    Login: LoginSkeleton,
    Register: RegisterSkeleton,
    Verification: VerificationSkeleton,
    Profile: ProfileSkeleton,
};