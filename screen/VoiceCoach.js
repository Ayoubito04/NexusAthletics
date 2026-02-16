import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Animated,
    Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import NexusAlert from '../components/NexusAlert';

const BACKEND_URL = Config.BACKEND_URL;

export default function VoiceCoach() {
    const navigation = useNavigation();

    // Estados principales
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [messages, setMessages] = useState([]);
    const [recording, setRecording] = useState(null);
    const [user, setUser] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);

    // Animaciones
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const waveAnims = useRef([...Array(5)].map(() => new Animated.Value(0.3))).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef();

    // Alert State
    const [alert, setAlert] = useState({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    const showAlert = (title, message, type = 'info', onConfirm = null) => {
        setAlert({
            visible: true,
            title,
            message,
            type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setAlert(prev => ({ ...prev, visible: false }));
            }
        });
    };

    useEffect(() => {
        loadUser();
        configurarAudio();

        // Animación de entrada
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Mensaje de bienvenida
        setTimeout(() => {
            const welcomeMsg = "Hola! Soy tu entrenador personal con IA. Mantén presionado el botón para hablarme y suéltalo cuando termines.";
            setMessages([{ text: welcomeMsg, sender: 'ai', timestamp: new Date() }]);
            speak(welcomeMsg);
        }, 800);

        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
            Speech.stop();
        };
    }, []);

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            // Silent
        }
    };

    const configurarAudio = async () => {
        try {
            const { granted } = await Audio.requestPermissionsAsync();
            setHasPermission(granted);
            if (granted) {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });
            }
        } catch (error) {
            showAlert('Error', 'No se pudieron configurar los permisos de audio', 'error');
        }
    };

    // Animación de pulso para botón de grabación
    useEffect(() => {
        if (isRecording) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            Animated.spring(pulseAnim, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
            }).start();
        }
    }, [isRecording]);

    // Animación de ondas cuando habla la IA
    useEffect(() => {
        if (isSpeaking) {
            waveAnims.forEach((anim, i) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 0.8 + Math.random() * 0.5,
                            duration: 200 + i * 50,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0.3,
                            duration: 200 + i * 50,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            });
        } else {
            waveAnims.forEach(anim => {
                Animated.timing(anim, {
                    toValue: 0.3,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            });
        }
    }, [isSpeaking]);

    const startRecording = async () => {
        if (!hasPermission) {
            showAlert('Permiso denegado', 'Se necesita permiso para usar el micrófono', 'warning');
            return;
        }

        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(recording);
            setIsRecording(true);
        } catch (error) {
            showAlert('Error', 'No se pudo iniciar la grabación', 'error');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            if (uri) {
                await transcribeAndProcess(uri);
            }
        } catch (error) {
            showAlert('Error', 'Error al procesar la grabación', 'error');
        }
    };

    const transcribeAndProcess = async (audioUri) => {
        setIsProcessing(true);

        try {
            const token = await AsyncStorage.getItem('token');

            setMessages(prev => [...prev, {
                text: '🎤 Procesando...',
                sender: 'user',
                timestamp: new Date()
            }]);

            const formData = new FormData();
            const uriParts = audioUri.split('/');
            const fileName = uriParts[uriParts.length - 1];

            formData.append('audio', {
                uri: audioUri,
                type: 'audio/m4a',
                name: fileName || 'recording.m4a',
            });

            const response = await fetch(`${BACKEND_URL}/voice/transcribe`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (data.transcription) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        text: data.transcription,
                        sender: 'user',
                        timestamp: new Date()
                    };
                    return newMessages;
                });

                if (data.aiResponse) {
                    setMessages(prev => [...prev, {
                        text: data.aiResponse,
                        sender: 'ai',
                        timestamp: new Date()
                    }]);

                    await speak(data.aiResponse);
                }
            } else if (data.error) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        text: data.message || 'No se pudo procesar el audio',
                        sender: 'ai',
                        timestamp: new Date()
                    };
                    return newMessages;
                });
            }
        } catch (error) {
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                    text: 'Error de conexión. Inténtalo de nuevo.',
                    sender: 'ai',
                    timestamp: new Date()
                };
                return newMessages;
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const speak = async (text) => {
        try {
            await Speech.stop();
            setIsSpeaking(true);

            await Speech.speak(text, {
                language: 'es-ES',
                pitch: 1.0,
                rate: 0.95,
                onDone: () => setIsSpeaking(false),
                onError: () => setIsSpeaking(false)
            });
        } catch (error) {
            setIsSpeaking(false);
        }
    };

    const stopSpeaking = () => {
        Speech.stop();
        setIsSpeaking(false);
    };

    const clearConversation = () => {
        setMessages([]);
        speak("¿En qué puedo ayudarte con tu entrenamiento?");
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#0a0a0a', '#050505']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backBtn}
                    activeOpacity={0.7}
                    data-testid="back-btn"
                >
                    <Ionicons name="arrow-back" size={22} color="#63ff15" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Entrenador de Voz</Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, (isSpeaking || isRecording) && styles.statusDotActive]} />
                        <Text style={styles.statusText}>
                            {isSpeaking ? 'Hablando...' : isRecording ? 'Escuchando...' : 'Listo'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity 
                    onPress={clearConversation} 
                    style={styles.clearBtn}
                    activeOpacity={0.7}
                    data-testid="clear-btn"
                >
                    <Ionicons name="refresh" size={20} color="#63ff15" />
                </TouchableOpacity>
            </Animated.View>

            {/* Chat Messages */}
            <ScrollView
                ref={scrollRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.messageBubble,
                            msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
                            { opacity: fadeAnim }
                        ]}
                    >
                        {msg.sender === 'ai' && (
                            <View style={styles.aiIcon}>
                                <MaterialCommunityIcons name="robot" size={16} color="#63ff15" />
                            </View>
                        )}
                        <View style={[
                            styles.messageContent,
                            msg.sender === 'user' && styles.userMessageContent
                        ]}>
                            <Text style={[
                                styles.messageText,
                                msg.sender === 'user' ? styles.userText : styles.aiText
                            ]}>
                                {msg.text}
                            </Text>
                        </View>
                    </Animated.View>
                ))}

                {isProcessing && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#63ff15" />
                        <Text style={styles.loadingText}>Analizando...</Text>
                    </View>
                )}
            </ScrollView>

            {/* Control Central */}
            <View style={styles.controlsContainer}>
                {/* Visualización de ondas */}
                {isSpeaking && (
                    <View style={styles.waveContainer}>
                        {waveAnims.map((anim, i) => (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.waveBars,
                                    {
                                        transform: [{ scaleY: anim }],
                                        height: 24 + i * 4,
                                    }
                                ]}
                            />
                        ))}
                    </View>
                )}

                {/* Botón de grabación */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                        style={[
                            styles.recordButton,
                            isRecording && styles.recordButtonActive
                        ]}
                        onPressIn={startRecording}
                        onPressOut={stopRecording}
                        disabled={isProcessing || isSpeaking}
                        activeOpacity={0.9}
                        data-testid="record-btn"
                    >
                        <LinearGradient
                            colors={isRecording ? ['#ff4d4d', '#ff1a1a'] : ['#63ff15', '#4ad912']}
                            style={styles.recordButtonGradient}
                        >
                            <Ionicons
                                name={isRecording ? "mic" : "mic-outline"}
                                size={36}
                                color={isRecording ? "white" : "black"}
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                <Text style={styles.instructionText}>
                    {isRecording
                        ? "Suelta para procesar"
                        : isProcessing
                            ? "Procesando..."
                            : isSpeaking
                                ? "Te estoy hablando..."
                                : "Mantén presionado para hablar"}
                </Text>

                {isSpeaking && (
                    <TouchableOpacity
                        style={styles.stopSpeakingBtn}
                        onPress={stopSpeaking}
                        activeOpacity={0.7}
                        data-testid="stop-speaking-btn"
                    >
                        <Ionicons name="stop-circle" size={20} color="#ff4d4d" />
                        <Text style={styles.stopSpeakingText}>Detener</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Tips */}
            <View style={styles.tipsContainer}>
                <View style={styles.tipRow}>
                    <Ionicons name="bulb" size={14} color="#FFD700" />
                    <Text style={styles.tipText}>Habla claro y pregunta sobre ejercicios o técnica</Text>
                </View>
            </View>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
                confirmText="ACEPTAR"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(99,255,21,0.1)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: 'white',
        letterSpacing: -0.3,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#3F3F46',
    },
    statusDotActive: {
        backgroundColor: '#63ff15',
    },
    statusText: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '600',
    },
    clearBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 20,
        paddingBottom: 20,
    },
    messageBubble: {
        marginBottom: 14,
        maxWidth: '85%',
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    userBubble: {
        alignSelf: 'flex-end',
    },
    aiBubble: {
        alignSelf: 'flex-start',
    },
    aiIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: 'rgba(99,255,21,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    messageContent: {
        flex: 1,
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#121212',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    userMessageContent: {
        backgroundColor: '#63ff15',
        borderColor: 'transparent',
    },
    userText: {
        color: 'black',
        fontWeight: '600',
    },
    aiText: {
        color: '#E4E4E7',
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
    },
    loadingText: {
        color: '#71717A',
        fontSize: 13,
        fontWeight: '600',
    },
    controlsContainer: {
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(99,255,21,0.1)',
    },
    waveContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginBottom: 20,
        height: 40,
    },
    waveBars: {
        width: 4,
        backgroundColor: '#63ff15',
        borderRadius: 2,
    },
    recordButton: {
        width: 88,
        height: 88,
        borderRadius: 44,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    recordButtonActive: {
        shadowColor: '#ff4d4d',
    },
    recordButtonGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionText: {
        marginTop: 18,
        fontSize: 13,
        color: '#71717A',
        fontWeight: '600',
        textAlign: 'center',
    },
    stopSpeakingBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,77,77,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,77,77,0.2)',
    },
    stopSpeakingText: {
        color: '#ff4d4d',
        fontSize: 13,
        fontWeight: '700',
    },
    tipsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,215,0,0.05)',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.1)',
    },
    tipText: {
        fontSize: 12,
        color: '#A1A1AA',
        flex: 1,
    },
});
