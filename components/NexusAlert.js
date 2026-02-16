import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const NexusAlert = ({ visible, title, message, type = 'info', onConfirm, onCancel, confirmText = 'ACEPTAR', cancelText = 'CANCELAR' }) => {
    const scaleValue = React.useRef(new Animated.Value(0)).current;
    const opacityValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleValue, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 8,
                    tension: 50
                }),
                Animated.timing(opacityValue, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                })
            ]).start();
        } else {
            scaleValue.setValue(0);
            opacityValue.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    const getColors = () => {
        switch (type) {
            case 'success': return {
                primary: '#63ff15',
                gradient: ['rgba(99, 255, 21, 0.2)', 'rgba(99, 255, 21, 0.05)'],
                icon: 'checkmark-done-circle'
            };
            case 'error': return {
                primary: '#ff4d4d',
                gradient: ['rgba(255, 77, 77, 0.2)', 'rgba(255, 77, 77, 0.05)'],
                icon: 'alert-circle'
            };
            case 'warning': return {
                primary: '#ffcc00',
                gradient: ['rgba(255, 204, 0, 0.2)', 'rgba(255, 204, 0, 0.05)'],
                icon: 'warning'
            };
            default: return {
                primary: '#00ccff',
                gradient: ['rgba(0, 204, 255, 0.2)', 'rgba(0, 204, 255, 0.05)'],
                icon: 'information-circle'
            };
        }
    };

    const config = getColors();

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityValue }]}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                </Animated.View>

                <Animated.View style={[
                    styles.alertBox,
                    { transform: [{ scale: scaleValue }], opacity: opacityValue, borderColor: config.primary + '40' }
                ]}>
                    <LinearGradient
                        colors={config.gradient}
                        style={styles.topBar}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    >
                        <View style={[styles.iconContainer, { shadowColor: config.primary }]}>
                            <Ionicons name={config.icon} size={48} color={config.primary} />
                        </View>
                    </LinearGradient>

                    <View style={styles.content}>
                        <Text style={styles.title}>{title.toUpperCase()}</Text>
                        <Text style={styles.message}>{message}</Text>
                    </View>

                    <View style={styles.footer}>
                        {onCancel && (
                            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                                <Text style={styles.cancelText}>{cancelText}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={onConfirm}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[config.primary, config.primary === '#63ff15' ? '#4ad912' : config.primary + 'dd']}
                                style={styles.confirmGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={[styles.confirmText, { color: type === 'error' || type === 'info' ? 'white' : 'black' }]}>
                                    {confirmText}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertBox: {
        width: width * 0.88,
        backgroundColor: '#0d0d0d',
        borderRadius: 35,
        overflow: 'hidden',
        borderWidth: 1.5,
        elevation: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    topBar: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    content: {
        paddingHorizontal: 25,
        paddingTop: 10,
        paddingBottom: 25,
        alignItems: 'center',
    },
    title: {
        color: 'white',
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 1.5,
    },
    message: {
        color: '#888',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 25,
        gap: 12,
    },
    confirmBtn: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        overflow: 'hidden',
    },
    confirmGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmText: {
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    },
    cancelBtn: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111',
    },
    cancelText: {
        color: '#666',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    }
});

export default NexusAlert;
