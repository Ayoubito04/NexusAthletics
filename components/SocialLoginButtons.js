/**
 * SocialLoginButtons - Botones de login social mejorados
 * Caracteristicas:
 * - Accesibilidad WCAG 2.1 AA
 * - Estados de loading especificos por proveedor
 * - Touch targets de 44x44px minimo
 * - Indicadores visuales de progreso
 * - Soporte para screen readers
 */

import React, { useState, useRef } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Text,
    ActivityIndicator,
    Animated,
    Easing,
    AccessibilityInfo,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { OAuthLoadingStates, OAuthLoadingMessages } from '../services/OAuthService';

// Configuracion de proveedores
const PROVIDERS = {
    google: {
        name: 'Google',
        icon: 'logo-google',
        color: '#EA4335',
        bgColor: 'rgba(234, 67, 53, 0.1)',
        borderColor: 'rgba(234, 67, 53, 0.3)',
        accessibilityLabel: 'Iniciar sesion con Google',
        accessibilityHint: 'Abre la ventana de inicio de sesion de Google',
    },
    facebook: {
        name: 'Facebook',
        icon: 'logo-facebook',
        color: '#1877F2',
        bgColor: 'rgba(24, 119, 242, 0.1)',
        borderColor: 'rgba(24, 119, 242, 0.3)',
        accessibilityLabel: 'Iniciar sesion con Facebook',
        accessibilityHint: 'Abre la ventana de inicio de sesion de Facebook',
    },
    instagram: {
        name: 'Instagram',
        icon: 'logo-instagram',
        color: '#E4405F',
        bgColor: 'rgba(228, 64, 95, 0.1)',
        borderColor: 'rgba(228, 64, 95, 0.3)',
        accessibilityLabel: 'Iniciar sesion con Instagram',
        accessibilityHint: 'Abre la ventana de inicio de sesion de Instagram',
    },
};

// Animacion de pulso para el boton activo
const PulseIndicator = ({ color }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scaleAnim, {
                        toValue: 1.3,
                        duration: 800,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.ease),
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.ease),
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0.6,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.pulseIndicator,
                {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim,
                    backgroundColor: color,
                }
            ]}
        />
    );
};

// Skeleton loader para los botones
const SkeletonButton = () => (
    <View style={styles.skeletonContainer}>
        <View style={styles.skeletonButton}>
            <View style={styles.skeletonIcon} />
        </View>
    </View>
);

// Boton individual de login social
const SocialButton = ({
    provider,
    onPress,
    disabled,
    isLoading,
    loadingState,
    loadingMessage,
    showLabels,
    size,
}) => {
    const config = PROVIDERS[provider];
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress(provider);
    };

    const isThisProviderLoading = isLoading && loadingState !== OAuthLoadingStates.IDLE;
    const showPulse = isThisProviderLoading && loadingState !== OAuthLoadingStates.ERROR;

    // Accesibilidad: anunciar cambio de estado
    React.useEffect(() => {
        if (isThisProviderLoading && loadingMessage) {
            AccessibilityInfo.announceForAccessibility(loadingMessage);
        }
    }, [isThisProviderLoading, loadingMessage]);

    const buttonSize = size === 'large' ? styles.buttonLarge : styles.buttonNormal;
    const iconSize = size === 'large' ? 24 : 20;

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={[
                    styles.socialBtn,
                    buttonSize,
                    {
                        backgroundColor: config.bgColor,
                        borderColor: focused ? config.color : config.borderColor,
                    },
                    disabled && styles.socialBtnDisabled,
                ]}
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || isThisProviderLoading}
                activeOpacity={0.8}
                accessible={true}
                accessibilityLabel={config.accessibilityLabel}
                accessibilityHint={config.accessibilityHint}
                accessibilityRole="button"
                accessibilityState={{
                    disabled: disabled || isThisProviderLoading,
                    busy: isThisProviderLoading,
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            >
                {/* Indicador de carga con pulso */}
                {showPulse && <PulseIndicator color={config.color} />}

                {/* Icono del proveedor */}
                {isThisProviderLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={config.color} />
                    </View>
                ) : (
                    <Ionicons
                        name={config.icon}
                        size={iconSize}
                        color={config.color}
                    />
                )}

                {/* Label opcional */}
                {showLabels && (
                    <Text
                        style={[styles.buttonLabel, { color: config.color }]}
                        accessibilityElementsHidden={true}
                    >
                        {config.name}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Mensaje de estado de carga */}
            {isThisProviderLoading && loadingMessage && showLabels && (
                <Text style={styles.loadingMessage} accessibilityLiveRegion="polite">
                    {loadingMessage}
                </Text>
            )}
        </Animated.View>
    );
};

// Componente principal
const SocialLoginButtons = ({
    onLogin,
    disabled = false,
    isLoading = false,
    loadingState = OAuthLoadingStates.IDLE,
    loadingMessage = '',
    showLabels = false,
    size = 'normal',
    providers = ['google', 'facebook', 'instagram'],
    containerStyle,
    onError,
}) => {
    const [currentProvider, setCurrentProvider] = useState(null);

    // Determinar cual proveedor esta cargando
    const getProviderLoadingState = (providerKey) => {
        if (!isLoading || currentProvider !== providerKey) {
            return OAuthLoadingStates.IDLE;
        }
        return loadingState;
    };

    const handleProviderPress = async (provider) => {
        setCurrentProvider(provider);
        try {
            await onLogin(provider);
        } catch (error) {
            if (onError) {
                onError(provider, error);
            }
        } finally {
            setCurrentProvider(null);
        }
    };

    return (
        <View style={[styles.container, containerStyle]} accessible={true} accessibilityRole="none">
            {/* Skip link para navegacion por teclado */}
            {Platform.OS === 'web' && (
                <View style={styles.skipLinkContainer}>
                    <TouchableOpacity
                        style={styles.skipLink}
                        accessibilityRole="link"
                        accessibilityLabel="Saltar inicio de sesion social"
                    >
                        <Text style={styles.skipLinkText}>Saltar</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Divider */}
            <View style={styles.dividerContainer} accessibilityRole="none">
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText} accessibilityRole="text">
                    O continua con
                </Text>
                <View style={styles.dividerLine} />
            </View>

            {/* Botones sociales */}
            <View
                style={styles.buttonsContainer}
                accessible={true}
                accessibilityRole="toolbar"
                accessibilityLabel="Opciones de inicio de sesion social"
            >
                {isLoading && loadingState === OAuthLoadingStates.IDLE ? (
                    // Mostrar skeletons durante carga inicial
                    <>
                        <SkeletonButton />
                        <SkeletonButton />
                        <SkeletonButton />
                    </>
                ) : (
                    providers.map((providerKey) => (
                        <SocialButton
                            key={providerKey}
                            provider={providerKey}
                            onPress={handleProviderPress}
                            disabled={disabled}
                            isLoading={currentProvider === providerKey}
                            loadingState={getProviderLoadingState(providerKey)}
                            loadingMessage={currentProvider === providerKey ? loadingMessage : ''}
                            showLabels={showLabels}
                            size={size}
                        />
                    ))
                )}
            </View>

            {/* Indicador de progreso general */}
            {isLoading && loadingState !== OAuthLoadingStates.IDLE && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${getProgressPercentage(loadingState)}%`,
                                    backgroundColor: '#63ff15',
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText} accessibilityLiveRegion="polite">
                        {loadingMessage}
                    </Text>
                </View>
            )}
        </View>
    );
};

// Helper para calcular progreso
const getProgressPercentage = (state) => {
    const states = {
        [OAuthLoadingStates.IDLE]: 0,
        [OAuthLoadingStates.INITIALIZING]: 20,
        [OAuthLoadingStates.REQUESTING_PERMISSIONS]: 40,
        [OAuthLoadingStates.AUTHENTICATING]: 60,
        [OAuthLoadingStates.SYNCING_WITH_BACKEND]: 80,
        [OAuthLoadingStates.COMPLETING]: 95,
        [OAuthLoadingStates.SUCCESS]: 100,
        [OAuthLoadingStates.ERROR]: 0,
    };
    return states[state] || 0;
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#27272A',
    },
    dividerText: {
        color: '#52525B',
        marginHorizontal: 14,
        fontSize: 12,
        fontWeight: '600',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    socialBtn: {
        flex: 1,
        height: 52,
        minWidth: 44, // Touch target minimo WCAG 2.1
        minHeight: 44, // Touch target minimo WCAG 2.1
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    buttonNormal: {
        height: 52,
        paddingHorizontal: 16,
    },
    buttonLarge: {
        height: 56,
        paddingHorizontal: 20,
    },
    socialBtnDisabled: {
        opacity: 0.5,
    },
    loadingContainer: {
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    loadingMessage: {
        fontSize: 11,
        color: '#71717A',
        textAlign: 'center',
        marginTop: 8,
    },
    pulseIndicator: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    progressContainer: {
        marginTop: 16,
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: '#27272A',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressText: {
        color: '#71717A',
        fontSize: 12,
        marginTop: 8,
    },
    skipLinkContainer: {
        position: 'absolute',
        left: -9999,
        top: 0,
    },
    skipLink: {
        padding: 8,
        backgroundColor: '#121212',
        borderRadius: 4,
    },
    skipLinkText: {
        color: '#63ff15',
        fontSize: 12,
    },
    skeletonContainer: {
        flex: 1,
    },
    skeletonButton: {
        height: 52,
        borderRadius: 12,
        backgroundColor: '#18181B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    skeletonIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#27272A',
    },
});

export default SocialLoginButtons;
export { SocialButton, PROVIDERS };