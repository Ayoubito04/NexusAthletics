import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal, FlatList, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import Config from '../constants/Config';
import NexusAlert from '../components/NexusAlert';
import NativeAd from '../components/NativeAd';

const BACKEND_URL = Config.BACKEND_URL;

const MessageBubble = React.memo(({ item: m }) => (
    <View style={[styles.bubble, m.sender === 'usuario' ? styles.userBubble : styles.iaBubble]}>
        {m.sender === 'ia' && (
            <View style={styles.iaIconContainer}>
                <MaterialCommunityIcons name="robot" size={20} color="#63ff15" />
            </View>
        )}
        <View style={[styles.textWrapper, m.sender === 'usuario' && styles.userWrapper]}>
            {m.sender === 'usuario' && (
                <LinearGradient
                    colors={['#63ff15', '#4ad912']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            )}
            {m.image && (
                <View>
                    <Image source={{ uri: m.image }} style={styles.sentImage} />
                </View>
            )}
            <Text style={[styles.msgText, m.sender === 'usuario' ? styles.userText : styles.iaText]}>
                {m.text}
            </Text>
        </View>
    </View>
));

export default function EntrenadorIA() {
    const [mensajes, setMensajes] = useState([]);
    const [sesiones, setSesiones] = useState([]);
    const [sesionActual, setSesionActual] = useState(null);
    const [inputUsuario, setInputUsuario] = useState('');
    const [cargando, setCargando] = useState(false);
    const [user, setUser] = useState(null);
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [modalNuevaSesion, setModalNuevaSesion] = useState(false);
    const [modalConfigPlan, setModalConfigPlan] = useState(false);
    const [nuevoTitulo, setNuevoTitulo] = useState('');
    const [metodologia, setMetodologia] = useState('Arnold Split');
    const [intensidad, setIntensidad] = useState('Alta');
    const [prioridad, setPrioridad] = useState('Equilibrado');
    const [duracion, setDuracion] = useState('90 min');
    const [equipamiento, setEquipamiento] = useState('Gimnasio Completo');

    // Estados para la configuración del plan PDF
    const [objetivoPlan, setObjetivoPlan] = useState('Ganar Músculo');
    const [nivelPlan, setNivelPlan] = useState('Intermedio');
    const [diasPlan, setDiasPlan] = useState('4');
    const [prefAlimenticia, setPrefAlimenticia] = useState('Equilibrada');

    // NexusAlert State
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: 'ACEPTAR', cancelText: 'CANCELAR' });

    const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'ACEPTAR', cancelText = 'CANCELAR') => {
        setAlert({
            visible: true,
            title,
            message,
            type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setAlert(prev => ({ ...prev, visible: false }));
            },
            onCancel: onCancel ? () => {
                onCancel();
                setAlert(prev => ({ ...prev, visible: false }));
            } : null,
            confirmText,
            cancelText
        });
    };

    const sidebarAnim = useRef(new Animated.Value(-300)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    const navigation = useNavigation();
    const scrollRef = useRef();

    const toggleSidebar = (show) => {
        if (show) {
            setSidebarVisible(true);
            Animated.parallel([
                Animated.timing(sidebarAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(sidebarAnim, { toValue: -300, duration: 300, useNativeDriver: true }),
                Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => setSidebarVisible(false));
        }
    };

    useEffect(() => {
        const loadEverything = async () => {
            const userData = await AsyncStorage.getItem('user');
            const token = await AsyncStorage.getItem('token');

            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                loadSessions(token);
            }
        };
        loadEverything();
    }, []);

    const loadSessions = async (token) => {
        try {
            const response = await fetch(`${BACKEND_URL}/chat/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setSesiones(data);
                if (data.length > 0) {
                    // Cargar la sesión más reciente por defecto
                    seleccionarSesion(data[0].id, token);
                } else {
                    // Si no hay sesiones, dar bienvenida genérica
                    setMensajes([{ text: `Hola. Soy tu entrenador Élite de Nexus Athletics AI. Crea un nuevo chat para empezar tu entrenamiento personalizado.`, sender: 'ia' }]);
                }
            }
        } catch (error) {
            console.error("Error cargando sesiones:", error);
        }
    };

    const seleccionarSesion = async (sessionId, token) => {
        setSesionActual(sessionId);
        toggleSidebar(false);
        setCargando(true);
        try {
            const authToken = token || await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/chat/sessions/${sessionId}/messages`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const history = await response.json();

            if (Array.isArray(history) && history.length > 0) {
                setMensajes(history);
            } else {
                setMensajes([{ text: "¡Chat iniciado! ¿En qué puedo ayudarte con esta temática?", sender: 'ia' }]);
            }
        } catch (error) {
            console.error("Error cargando mensajes de sesión:", error);
            setMensajes([{ text: "Error al cargar el historial de esta sesión.", sender: 'ia' }]);
        } finally {
            setCargando(false);
        }
    };

    const handleCrearNuevaSesion = async () => {
        if (!nuevoTitulo.trim()) {
            showAlert("Campo Requerido", "Por favor ingresa un título para el chat.", "warning");
            return;
        }

        const token = await AsyncStorage.getItem('token');
        setCargando(true);
        try {
            const response = await fetch(`${BACKEND_URL}/chat/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: nuevoTitulo,
                    theme: metodologia, // Usamos la metodología como tema principal
                    config: {
                        metodologia: metodologia,
                        intensidad: intensidad,
                        prioridad: prioridad,
                        duracion: duracion
                    }
                })
            });
            const newSession = await response.json();
            if (newSession.id) {
                setSesiones(prev => [newSession, ...prev]);
                setSesionActual(newSession.id);
                setMensajes([{ text: `¡Nuevo chat iniciado: ${newSession.title}! Temática: ${newSession.theme || 'General'}. ¿Cómo empezamos?`, sender: 'ia' }]);
                setModalNuevaSesion(false);
                setNuevoTitulo('');
            }
        } catch (error) {
            console.error("Error creando sesión:", error);
            showAlert("Error", "No se pudo crear el nuevo chat.", "error");
        } finally {
            setCargando(false);
        }
    };

    const eliminarSesion = async (sessionId) => {
        showAlert(
            "Eliminar Chat",
            "¿Estás seguro de que quieres eliminar este historial? Esta acción no se puede deshacer.",
            "error",
            async () => {
                const token = await AsyncStorage.getItem('token');
                try {
                    await fetch(`${BACKEND_URL}/chat/sessions/${sessionId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setSesiones(prev => prev.filter(s => s.id !== sessionId));
                    if (sesionActual === sessionId) {
                        setSesionActual(null);
                        setMensajes([{ text: "Chat eliminado. Crea uno nuevo para continuar.", sender: 'ia' }]);
                    }
                } catch (error) {
                    console.error("Error eliminando sesión:", error);
                    showAlert("Error", "No se pudo eliminar el chat.", "error");
                }
            },
            () => { },
            "ELIMINAR"
        );
    };

    const handleGenerarRutina = async () => {
        if (cargando) return;

        const token = await AsyncStorage.getItem('token');
        setMensajes(prev => [...prev, { text: "🏋️ Solicitando creación de rutina personalizada...", sender: 'usuario' }]);
        setCargando(true);

        try {
            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: "Genera una rutina de entrenamiento personalizada de alta intensidad para mi nivel actual. Incluye ejercicios, series y repeticiones basadas en ciencia.",
                    sessionId: sesionActual
                })
            });

            const data = await response.json();
            if (data.text) {
                setMensajes(prev => [...prev, { text: data.text, sender: 'ia' }]);
            } else {
                setMensajes(prev => [...prev, { text: "⚠️ No pude generar la rutina en este momento.", sender: 'ia' }]);
            }
        } catch (error) {
            console.error(error);
            setMensajes(prev => [...prev, { text: "Error de conexión al generar rutina.", sender: 'ia' }]);
        } finally {
            setCargando(false);
        }
    };

    const handleGenerarPlanVisual = async () => {
        if (!user || user.plan === 'Gratis') {
            showAlert("Mejora tu plan", "La generación de planes Élite es exclusiva para usuarios Pro y Ultimate.", "info", () => navigation.navigate('PlanesPago'));
            return;
        }

        const token = await AsyncStorage.getItem('token');
        setModalConfigPlan(false);
        setCargando(true);

        try {
            setMensajes(prev => [...prev, { text: `🚀 Creando tu Experiencia Élite: ${objetivoPlan}...`, sender: 'usuario' }]);

            const response = await fetch(`${BACKEND_URL}/generate-plan-interactive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    details: `OBJETIVO: ${objetivoPlan}. NIVEL: ${nivelPlan}. DÍAS/SEMANA: ${diasPlan}. DIETA: ${prefAlimenticia}. METODOLOGÍA: ${metodologia}. EQUIPAMIENTO: ${equipamiento}. PRIORIDAD: ${prioridad}. DURACIÓN: ${duracion}.`
                })
            });

            if (!response.ok) throw new Error('Error al conectar con Nexus AI');

            const planData = await response.json();

            setCargando(false);
            setMensajes(prev => [...prev, { text: "✨ ¡Tu Plan Maestro está listo! Pulsa el botón para verlo.", sender: 'ia' }]);

            navigation.navigate('ElitePlanScreen', { plan: planData });

        } catch (error) {
            console.error("[Visual Plan Error]:", error);
            showAlert("Error", "No se pudo generar la presentación interactiva.", "error");
            setCargando(false);
        }
    };

    const descargarRutinaPDF = async () => {
        if (!user || user.plan === 'Gratis') {
            showAlert("Mejora tu plan", "La generación de rutinas en PDF es exclusiva para usuarios Pro y Ultimate.", "info", () => navigation.navigate('PlanesPago'));
            return;
        }

        const token = await AsyncStorage.getItem('token');
        setModalConfigPlan(false);
        setCargando(true);

        try {
            setMensajes(prev => [...prev, { text: `📄 Generando tu Plan Élite: ${objetivoPlan} (${nivelPlan})...`, sender: 'usuario' }]);

            const response = await fetch(`${BACKEND_URL}/generate-pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    details: `OBJETIVO: ${objetivoPlan}. NIVEL: ${nivelPlan}. DÍAS/SEMANA: ${diasPlan}. DIETA: ${prefAlimenticia}. METODOLOGÍA: ${metodologia}. EQUIPAMIENTO: ${equipamiento}. PRIORIDAD: ${prioridad}. DURACIÓN: ${duracion}. Usuario: ${user.nombre} ${user.apellido}.`,
                    format: 'base64'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al generar PDF');
            }

            const data = await response.json();
            if (!data.base64) {
                throw new Error('El servidor no devolvió el PDF correctamente');
            }

            const fileUri = FileSystem.documentDirectory + 'Plan_Entrenamiento_Nexus_AI.pdf';
            await FileSystem.writeAsStringAsync(fileUri, data.base64, {
                encoding: 'base64'
            });

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri);
                setMensajes(prev => [...prev, {
                    text: "✅ Tu plan de entrenamiento ha sido generado exitosamente. ¡Listo para compartir!",
                    sender: 'ia'
                }]);
            } else {
                showAlert("Éxito", `PDF guardado en: ${fileUri}`, "success");
                setMensajes(prev => [...prev, {
                    text: `✅ Tu plan ha sido guardado en: ${fileUri}`,
                    sender: 'ia'
                }]);
            }
        } catch (error) {
            console.error("[PDF Error]:", error);
            showAlert("Error", error.message || "No se pudo generar el PDF", "error");
            setMensajes(prev => [...prev, {
                text: "❌ Error al generar el PDF: " + (error.message || "Intenta nuevamente"),
                sender: 'ia'
            }]);
        } finally {
            setCargando(false);
        }
    };

    const enviarMensajes = async (imageB64 = null) => {
        if (!inputUsuario.trim() && !imageB64 || cargando) return;

        const token = await AsyncStorage.getItem('token');
        const textoEnviado = inputUsuario;
        setInputUsuario('');

        if (imageB64) {
            setMensajes(prev => [...prev, { text: "📷 Analizando grupos musculares en tu foto...", sender: 'usuario', image: `data:image/jpeg;base64,${imageB64}` }]);
        } else {
            setMensajes(prev => [...prev, { text: textoEnviado, sender: 'usuario' }]);
        }

        setCargando(true);

        try {
            console.log(`[NexusAI] Enviando peticion a: ${BACKEND_URL}/chat`);
            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: textoEnviado,
                    image: imageB64,
                    sessionId: sesionActual
                })
            });

            console.log(`[NexusAI] Status de respuesta: ${response.status}`);
            const data = await response.json();
            console.log(`[NexusAI] Datos recibidos:`, JSON.stringify(data));

            if (response.status === 429) {
                const retryTime = data.retryAfter || 60;
                const errorMsg = data.error || `⚠️ Límite de la API alcanzado. Por favor espera ${retryTime} segundos antes de intentar nuevamente.`;
                setMensajes(prev => [...prev, {
                    text: errorMsg,
                    sender: 'ia'
                }]);
            } else if (response.status === 401 || response.status === 403) {
                showAlert("Sesión Expirada", "Tu sesión ha expirado o es inválida. Por favor inicia sesión nuevamente.", "warning", () => {
                    AsyncStorage.multiRemove(['token', 'user']);
                    navigation.replace('Login');
                });
            } else if (data.error) {
                setMensajes(prev => [...prev, { text: "⚠️ " + data.error, sender: 'ia' }]);
            } else if (data.text) {
                setMensajes(prev => [...prev, { text: data.text, sender: 'ia' }]);
            }
        } catch (error) {
            console.error("[NexusAI] Error en fetch:", error);
            setMensajes(prev => [...prev, { text: "Error de conexión con el servidor. Revisa la consola.", sender: 'ia' }]);
        } finally {
            setCargando(false);
        }
    };

    const analizarFoto = async () => {
        try {
            console.log("[NexusAI] Solicitando permisos de galería...");
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showAlert("Permiso denegado", "Se necesita permiso para acceder a tus fotos.", "warning");
                return;
            }

            console.log("[NexusAI] Abriendo galería...");
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'], // Formato moderno de array para Expo 54
                allowsEditing: true,
                base64: true,
                quality: 0.5,
            });

            console.log("[NexusAI] Resultado galería:", result.canceled ? "Cancelado" : "Seleccionado");

            if (!result.canceled && result.assets && result.assets.length > 0) {
                enviarMensajes(result.assets[0].base64);
            }
        } catch (error) {
            console.error("[NexusAI] Error al abrir galería:", error);
            showAlert("Error", "No se pudo abrir la galería de imágenes: " + error.message, "error");
        }
    };

    const descargarPlanPDF = async () => {
        if (!user || user.plan === 'Gratis') {
            showAlert("Mejora tu plan", "La generación de rutinas en PDF es exclusiva para usuarios Pro y Ultimate. ¿Deseas mejorar tu plan?", "info", () => navigation.navigate('PlanesPago'));
            return;
        }

        setModalConfigPlan(true);
    };

    const borrarHistorial = () => {
        setMensajes([]);
        setInputUsuario('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <LinearGradient
                        colors={['rgba(99, 255, 21, 0.12)', 'transparent']}
                        style={StyleSheet.absoluteFill}
                    />
                    <TouchableOpacity onPress={() => toggleSidebar(true)} style={styles.backBtn}>
                        <Ionicons name="menu" size={28} color="#63ff15" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Nexus AI <Text style={styles.titleHighlight}>Elite</Text></Text>
                        <View style={styles.statusRow}>
                            <View style={styles.dot} />
                            <Text style={styles.statusText}>{user ? `Plan ${user.plan || 'Gratis'}` : 'Alto Rendimiento'}</Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={descargarPlanPDF} style={styles.headerActionBtn}>
                            <Ionicons name="document-text-outline" size={22} color="#63ff15" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerActionBtn}>
                            <Ionicons name="close-circle-outline" size={22} color="#ff4d4d" />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={mensajes}
                    keyExtractor={(_, index) => index.toString()}
                    style={styles.chatContainer}
                    ref={scrollRef}
                    renderItem={({ item }) => <MessageBubble item={item} />}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => scrollRef.current?.scrollToEnd({ animated: true })}
                    ListHeaderComponent={
                        user?.plan === 'Gratis' && (
                            <View style={{ paddingHorizontal: 15, marginTop: 10 }}>
                                <NativeAd type="nutrition" />
                            </View>
                        )
                    }
                    ListFooterComponent={
                        cargando && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color="#63ff15" />
                                <Text style={styles.loadingText}>Analizando con Nexus AI...</Text>
                            </View>
                        )
                    }
                    contentContainerStyle={{ paddingBottom: 20 }}
                />

                <View style={styles.inputArea}>
                    <TouchableOpacity style={styles.routineBtn} onPress={handleGenerarRutina}>
                        <Ionicons name="barbell" size={24} color="#63ff15" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cameraBtn} onPress={analizarFoto}>
                        <Ionicons name="camera" size={24} color="#63ff15" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Consulta a Nexus AI..."
                        placeholderTextColor="#666"
                        value={inputUsuario}
                        onChangeText={setInputUsuario}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={() => enviarMensajes()}>
                        <Ionicons name="send" size={20} color="black" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* MODAL CONFIGURACIÓN PLAN GENERATIVO */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalConfigPlan}
                onRequestClose={() => setModalConfigPlan(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentPlan}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Configurar Plan Élite</Text>
                            <TouchableOpacity onPress={() => setModalConfigPlan(false)}>
                                <Ionicons name="close" size={28} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.labelPlan}>¿Cuál es tu objetivo principal?</Text>
                            <View style={styles.optionsGrid}>
                                {['Ganar Músculo', 'Perder Grasa', 'Fuerza Pura', 'Resistencia'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, objetivoPlan === opt && styles.optBtnSelected]}
                                        onPress={() => setObjetivoPlan(opt)}
                                    >
                                        <Text style={[styles.optText, objetivoPlan === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Tu nivel actual</Text>
                            <View style={styles.optionsGrid}>
                                {['Principiante', 'Intermedio', 'Avanzado', 'Atleta'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, nivelPlan === opt && styles.optBtnSelected]}
                                        onPress={() => setNivelPlan(opt)}
                                    >
                                        <Text style={[styles.optText, nivelPlan === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Días de entrenamiento por semana</Text>
                            <View style={styles.optionsGrid}>
                                {['2', '3', '4', '5', '6'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, diasPlan === opt && styles.optBtnSelected]}
                                        onPress={() => setDiasPlan(opt)}
                                    >
                                        <Text style={[styles.optText, diasPlan === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Preferencia Alimenticia</Text>
                            <View style={styles.optionsGrid}>
                                {['Equilibrada', 'Alta Proteína', 'Vegana', 'Keto'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, prefAlimenticia === opt && styles.optBtnSelected]}
                                        onPress={() => setPrefAlimenticia(opt)}
                                    >
                                        <Text style={[styles.optText, prefAlimenticia === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Metodología de Entrenamiento</Text>
                            <View style={styles.optionsGrid}>
                                {['Arnold Split', 'Push Pull Legs', 'Full Body', 'Heavy Duty (Mentzer)', 'Upper Lower', 'Bro Split'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, metodologia === opt && styles.optBtnSelected]}
                                        onPress={() => setMetodologia(opt)}
                                    >
                                        <Text style={[styles.optText, metodologia === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Equipamiento Disponible</Text>
                            <View style={styles.optionsGrid}>
                                {['Gimnasio Completo', 'Mancuernas/Barras', 'Solo Peso Corporal', 'Bandas Elásticas'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, equipamiento === opt && styles.optBtnSelected]}
                                        onPress={() => setEquipamiento(opt)}
                                    >
                                        <Text style={[styles.optText, equipamiento === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Enfoque / Prioridad Muscular</Text>
                            <View style={styles.optionsGrid}>
                                {['Equilibrado', 'Torso Potente', 'Piernas Estéticas', 'Espalda/V', 'Brazos Titanio'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, prioridad === opt && styles.optBtnSelected]}
                                        onPress={() => setPrioridad(opt)}
                                    >
                                        <Text style={[styles.optText, prioridad === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Duración de Sesión</Text>
                            <View style={styles.optionsGrid}>
                                {['30-45 min', '45-60 min', '60-90 min', '2 horas+'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, duracion === opt && styles.optBtnSelected]}
                                        onPress={() => setDuracion(opt)}
                                    >
                                        <Text style={[styles.optText, duracion === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.generateFinalBtn}
                                onPress={handleGenerarPlanVisual}
                            >
                                <LinearGradient
                                    colors={['#63ff15', '#4ad912']}
                                    style={styles.gradientBtnPlan}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name="sparkles" size={20} color="black" style={{ marginRight: 8 }} />
                                    <Text style={styles.btnTextBlack}>CREAR PRESENTACIÓN ÉLITE</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={descargarRutinaPDF}
                                style={{ marginTop: 15, alignSelf: 'center' }}
                            >
                                <Text style={{ color: '#666', fontSize: 13, textDecorationLine: 'underline' }}>O descargar como PDF clásico</Text>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* SIDEBAR OVERLAY */}
            {sidebarVisible && (
                <TouchableOpacity
                    activeOpacity={1}
                    style={StyleSheet.absoluteFill}
                    onPress={() => toggleSidebar(false)}
                >
                    <Animated.View style={[styles.sidebarOverlay, { opacity: overlayAnim }]} />
                </TouchableOpacity>
            )}

            {/* SIDEBAR PANEL */}
            <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.sidebarHeader}>
                        <Image source={{ uri: 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }} style={styles.sidebarLogo} />
                        <Text style={styles.sidebarTitle}>Nexus <Text style={{ color: '#63ff15' }}>AI</Text></Text>
                    </View>

                    <TouchableOpacity
                        style={styles.newChatSidebarBtn}
                        onPress={() => {
                            toggleSidebar(false);
                            setModalNuevaSesion(true);
                        }}
                    >
                        <Ionicons name="add" size={24} color="black" />
                        <Text style={styles.newChatSidebarText}>Nuevo Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.newChatSidebarBtn, { backgroundColor: '#1a1a1a', marginTop: 10, borderWidth: 1, borderColor: '#63ff1540' }]}
                        onPress={() => {
                            toggleSidebar(false);
                            navigation.navigate('SavedElitePlans');
                        }}
                    >
                        <Ionicons name="folder-open-outline" size={20} color="#63ff15" />
                        <Text style={[styles.newChatSidebarText, { color: '#63ff15', marginLeft: 10 }]}>Nexus Vault</Text>
                    </TouchableOpacity>

                    <Text style={styles.sidebarSectionTitle}>Historial Reciente</Text>

                    <FlatList
                        data={sesiones}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ paddingHorizontal: 15 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.sidebarItem, sesionActual === item.id && styles.sidebarItemActive]}
                                onPress={() => seleccionarSesion(item.id)}
                            >
                                <View style={styles.sidebarItemIcon}>
                                    <Ionicons
                                        name="chatbubble-ellipses-outline"
                                        size={20}
                                        color={sesionActual === item.id ? '#63ff15' : '#888'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={[styles.sidebarItemTitle, sesionActual === item.id && styles.sidebarItemTitleActive]}
                                        numberOfLines={1}
                                    >
                                        {item.title}
                                    </Text>
                                    <Text style={styles.sidebarItemTheme}>{item.theme || 'General'}</Text>
                                </View>
                                {sesionActual === item.id && (
                                    <TouchableOpacity onPress={() => eliminarSesion(item.id)}>
                                        <Ionicons name="trash-outline" size={16} color="#ff4d4d" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyTextSidebar}>No hay chats aún</Text>
                        }
                    />

                    <View style={styles.sidebarFooter}>
                        <View style={styles.sidebarFooterUser}>
                            <View style={styles.sidebarAvatarCircle}>
                                <Text style={styles.sidebarAvatarText}>{user?.nombre?.charAt(0) || 'A'}</Text>
                            </View>
                            <View>
                                <Text style={styles.sidebarUserName}>{user?.nombre || 'Atleta'}</Text>
                                <Text style={styles.sidebarUserPlan}>{user?.plan || 'Gratis'}</Text>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </Animated.View>

            {/* MODAL DE NUEVA SESIÓN (Se mantiene para inputs cómodos) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalNuevaSesion}
                onRequestClose={() => setModalNuevaSesion(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentPlan}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nexus AI: Nuevo Chat Élite</Text>
                            <TouchableOpacity onPress={() => setModalNuevaSesion(false)}>
                                <Ionicons name="close" size={28} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.labelPlan}>Título del Asesoramiento</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Ej: Mi Rutina Arnold 2025"
                                placeholderTextColor="#666"
                                value={nuevoTitulo}
                                onChangeText={setNuevoTitulo}
                            />

                            <Text style={styles.labelPlan}>Metodología del Coach</Text>
                            <View style={styles.optionsGrid}>
                                {['Arnold Split', 'Heavy Duty / Mentzer', 'Push Pull Legs', 'Full Body', 'High Volume', 'HIT Training'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, metodologia === opt && styles.optBtnSelected]}
                                        onPress={() => setMetodologia(opt)}
                                    >
                                        <Text style={[styles.optText, metodologia === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Intensidad del Programa</Text>
                            <View style={styles.optionsGrid}>
                                {['Moderada', 'Alta', 'Extrema (Fallo)', 'Atleta de Élite'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, intensidad === opt && styles.optBtnSelected]}
                                        onPress={() => setIntensidad(opt)}
                                    >
                                        <Text style={[styles.optText, intensidad === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Prioridad Muscular</Text>
                            <View style={styles.optionsGrid}>
                                {['Equilibrado', 'Pecho/Hombro', 'Piernas/Glúteo', 'V-Taper (Espalda)', 'Brazos/Core'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, prioridad === opt && styles.optBtnSelected]}
                                        onPress={() => setPrioridad(opt)}
                                    >
                                        <Text style={[styles.optText, prioridad === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.labelPlan}>Disponibilidad por Sesión</Text>
                            <View style={styles.optionsGrid}>
                                {['45 min', '60 min', '90 min', 'Sin Límite'].map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.optBtn, duracion === opt && styles.optBtnSelected]}
                                        onPress={() => setDuracion(opt)}
                                    >
                                        <Text style={[styles.optText, duracion === opt && styles.optTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.generateFinalBtn}
                                onPress={handleCrearNuevaSesion}
                            >
                                <LinearGradient
                                    colors={['#63ff15', '#4ad912']}
                                    style={styles.gradientBtnPlan}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <MaterialCommunityIcons name="brain" size={20} color="black" style={{ marginRight: 8 }} />
                                    <Text style={styles.btnTextBlack}>INICIALIZAR NEXUS AI</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
                onCancel={alert.onCancel}
                confirmText={alert.confirmText}
                cancelText={alert.cancelText}
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
        paddingVertical: 20,
        paddingHorizontal: 20,
        backgroundColor: '#111',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(99, 255, 21, 0.2)',
        overflow: 'hidden',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    headerTitleContainer: {
        flex: 1,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    titleHighlight: {
        color: '#63ff15',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    headerActionBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#63ff15',
        marginRight: 6,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
    },
    statusText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
    },
    chatContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    bubble: {
        flexDirection: 'row',
        marginBottom: 20,
        maxWidth: '85%',
    },
    userBubble: {
        alignSelf: 'flex-end',
    },
    iaBubble: {
        alignSelf: 'flex-start',
    },
    iaIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        marginTop: 5,
    },
    textWrapper: {
        backgroundColor: '#1a1a1a',
        padding: 16,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    userWrapper: {
        backgroundColor: '#63ff15',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 4,
        borderWidth: 0,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    userText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 15,
    },
    iaText: {
        color: '#ddd',
        lineHeight: 22,
        fontSize: 15,
    },
    msgText: {
        fontSize: 15,
        lineHeight: 22,
    },
    sentImage: {
        width: 200,
        height: 200,
        borderRadius: 15,
        marginBottom: 10,
        resizeMode: 'cover',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: 'rgba(99, 255, 21, 0.05)',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 15,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.1)',
    },
    loadingText: {
        color: '#63ff15',
        fontSize: 13,
        marginLeft: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    input: {
        flex: 1,
        backgroundColor: '#151515',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 12,
        color: 'white',
        marginRight: 10,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        fontSize: 15,
    },
    sendBtn: {
        backgroundColor: '#63ff15',
        width: 48,
        height: 48,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    routineBtn: {
        marginRight: 8,
        width: 48,
        height: 48,
        borderRadius: 15,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cameraBtn: {
        marginRight: 10,
        width: 48,
        height: 48,
        borderRadius: 15,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    // --- ESTILOS SIDEBAR ---
    sidebarOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 280,
        backgroundColor: '#0d0d0d',
        borderRightWidth: 1,
        borderRightColor: 'rgba(99, 255, 21, 0.2)',
        zIndex: 1000,
    },
    sidebarHeader: {
        padding: 25,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    sidebarLogo: {
        width: 35,
        height: 35,
        marginRight: 10,
    },
    sidebarTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
    },
    newChatSidebarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#63ff15',
        margin: 15,
        padding: 12,
        borderRadius: 12,
        justifyContent: 'center',
        gap: 8,
    },
    newChatSidebarText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 15,
    },
    sidebarSectionTitle: {
        color: '#666',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginHorizontal: 15,
        marginVertical: 10,
    },
    sidebarItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    sidebarItemActive: {
        backgroundColor: 'rgba(99, 255, 21, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.2)',
    },
    sidebarItemIcon: {
        marginRight: 12,
    },
    sidebarItemTitle: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '600',
    },
    sidebarItemTitleActive: {
        color: 'white',
        fontWeight: '700',
    },
    sidebarItemTheme: {
        color: '#666',
        fontSize: 11,
        marginTop: 2,
    },
    emptyTextSidebar: {
        color: '#444',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 20,
    },
    sidebarFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    sidebarFooterUser: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sidebarAvatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 255, 21, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.3)',
    },
    sidebarAvatarText: {
        color: '#63ff15',
        fontWeight: 'bold',
        fontSize: 16,
    },
    sidebarUserName: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    sidebarUserPlan: {
        color: '#63ff15',
        fontSize: 11,
        fontWeight: '600',
    },
    // --- ESTILOS MODAL PEQUEÑO ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContentSmall: {
        backgroundColor: '#111',
        borderRadius: 25,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.3)',
        width: '85%',
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        padding: 15,
        color: 'white',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    modalBtn: {
        flex: 0.48,
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    createBtn: {
        backgroundColor: '#63ff15',
    },
    btnText: {
        color: 'white',
        fontWeight: '700',
    },
    btnTextBlack: {
        color: 'black',
        fontWeight: '700',
    },
    // --- ESTILOS PARA FORMULARIO PLAN ---
    modalContentPlan: {
        backgroundColor: '#0a0a0a',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '85%',
        padding: 25,
        borderTopWidth: 2,
        borderTopColor: '#63ff15',
        width: '100%',
        marginTop: 'auto',
    },
    labelPlan: {
        color: '#63ff15',
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 20,
        marginBottom: 12,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optBtn: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        minWidth: '45%',
        alignItems: 'center',
    },
    optBtnSelected: {
        backgroundColor: 'rgba(99, 255, 21, 0.15)',
        borderColor: '#63ff15',
    },
    optText: {
        color: '#888',
        fontWeight: '600',
        fontSize: 14,
    },
    optTextSelected: {
        color: '#63ff15',
    },
    generateFinalBtn: {
        marginTop: 35,
        borderRadius: 15,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    gradientBtnPlan: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
    }
});
