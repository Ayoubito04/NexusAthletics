import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Animated, Linking, TextInput } from 'react-native';
// import { Pedometer } from 'expo-sensors'; // Se importa dinámicamente abajo
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import NexusAlert from '../components/NexusAlert';

import Config from '../constants/Config';
import GoogleFitService from '../services/GoogleFitService';

export default function HealthSync({ navigation }) {
    const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
    const [pastStepCount, setPastStepCount] = useState(0);
    const [currentStepCount, setCurrentStepCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [manualSteps, setManualSteps] = useState('');
    const [manualKcal, setManualKcal] = useState('');
    const [showCalibrator, setShowCalibrator] = useState(false);
    const [showAccountSelector, setShowAccountSelector] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [syncProgress, setSyncProgress] = useState(0);
    const [isConnecting, setIsConnecting] = useState(false);

    // NexusAlert State
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

    const showAlert = (title, message, type = 'info') => {
        setAlert({ visible: true, title, message, type });
    };

    useEffect(() => {
        subscribe();
    }, []);

    const subscribe = async () => {
        // Importación dinámica
        const { Pedometer } = require('expo-sensors');

        const isAvailable = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(String(isAvailable));

        if (isAvailable) {
            // En Android, getStepCountAsync NO está soportado
            // Usamos AsyncStorage para mantener los pasos del día
            if (Platform.OS === 'android') {
                // Cargar pasos guardados del día anterior
                try {
                    const savedDate = await AsyncStorage.getItem('nexus_steps_date');
                    const savedSteps = await AsyncStorage.getItem('nexus_steps_count');
                    const today = new Date().toDateString();

                    if (savedDate === today && savedSteps) {
                        // Misma fecha, usar pasos guardados
                        setPastStepCount(parseInt(savedSteps));
                    } else {
                        // Nuevo día, resetear
                        setPastStepCount(0);
                        await AsyncStorage.setItem('nexus_steps_date', today);
                        await AsyncStorage.setItem('nexus_steps_count', '0');
                    }
                } catch (e) {
                    console.log("Error cargando pasos guardados:", e);
                    setPastStepCount(0);
                }
            } else {
                // iOS: Sí soporta getStepCountAsync
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 1);

                try {
                    const pastStepCountResult = await Pedometer.getStepCountAsync(start, end);
                    if (pastStepCountResult) {
                        const steps = pastStepCountResult.steps;
                        setPastStepCount(steps);
                        await syncStepsToBackend(steps);
                    }
                } catch (e) {
                    console.log("Error al obtener pasos:", e);
                    setPastStepCount(0);
                }
            }

            // Observar pasos en tiempo real (funciona en iOS y Android)
            const subscription = Pedometer.watchStepCount(async result => {
                const currentSteps = result.steps;
                setCurrentStepCount(currentSteps);

                // Para Android, actualizar el contador total en AsyncStorage
                if (Platform.OS === 'android') {
                    const totalSteps = pastStepCount + currentSteps;
                    const today = new Date().toDateString();
                    await AsyncStorage.setItem('nexus_steps_date', today);
                    await AsyncStorage.setItem('nexus_steps_count', totalSteps.toString());

                    // Sincronizar cada 50 pasos
                    if (totalSteps % 50 === 0 && totalSteps > 0) {
                        await syncStepsToBackend(totalSteps);
                    }
                } else {
                    // iOS: Sincronizar cada 100 pasos
                    if (currentSteps % 100 === 0 && currentSteps > 0) {
                        const totalSteps = pastStepCount + currentSteps;
                        await syncStepsToBackend(totalSteps);
                    }
                }
            });

            return subscription;
        } else {
            // Modo Simulación para Demos/TFG
            setPastStepCount(12543);
            console.log("Modo simulación activado para Bio-Sincro.");
        }
    };

    // 🔥 NUEVA FUNCIÓN: Sincronizar pasos automáticamente con el backend
    const syncStepsToBackend = async (steps) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const calories = steps * 0.04 + 1800; // Fórmula: 0.04 kcal por paso + metabolismo basal

            await fetch(`${Config.BACKEND_URL}/user/health-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    calories: Math.round(calories),
                    steps: steps
                })
            });

            console.log(`✅ Pasos sincronizados automáticamente: ${steps} pasos, ${Math.round(calories)} kcal`);
        } catch (error) {
            console.error('Error sincronizando pasos:', error);
        }
    };

    const handleSelectAccount = async (email) => {
        setSelectedAccount(email);
        setShowAccountSelector(false);
        setIsConnecting(true);

        // Simulación de progreso de conexión con nube
        let progress = 0;
        const interval = setInterval(() => {
            progress += 0.1;
            setSyncProgress(progress);
            if (progress >= 1) {
                clearInterval(interval);
                finalizeConnection(email);
            }
        }, 300);
    };

    const finalizeConnection = async (email) => {
        const serviceName = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';
        try {
            const token = await AsyncStorage.getItem('token');
            // Persistir en backend
            await fetch(`${Config.BACKEND_URL}/user/health-sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ synced: true, service: serviceName })
            });

            // Persistir localmente
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                parsedUser.healthSynced = true;
                parsedUser.healthService = serviceName;
                parsedUser.healthEmail = email;
                await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
            }

            setIsConnecting(false);
            showAlert(
                "Conexión Exitosa",
                `Nexus AI se ha vinculado con la cuenta ${email} de ${serviceName}.`,
                "success"
            );
        } catch (error) {
            console.error(error);
            setIsConnecting(false);
        }
    };

    const handleCalibrate = async () => {
        if (!manualSteps) {
            showAlert("Error", "Por favor, introduce al menos el número de pasos reales.", "error");
            return;
        }

        setIsSyncing(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const serviceName = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';

            // Actualizamos los datos en el backend con los valores manuales
            const steps = parseInt(manualSteps);
            const calories = manualKcal ? parseFloat(manualKcal) : (steps * 0.04 + 1800);

            await fetch(`${Config.BACKEND_URL}/user/health-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ calories, steps })
            });

            // Forzamos que el usuario esté marcado como sincronizado
            await fetch(`${Config.BACKEND_URL}/user/health-sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ synced: true, service: serviceName })
            });

            // Actualizar estado local
            setPastStepCount(steps);
            setCurrentStepCount(0);
            setShowCalibrator(false);

            showAlert(
                "✅ Google Fit Vinculado",
                `¡Perfecto! Nexus AI ahora conoce tus datos reales:\n\n🚶 ${steps} pasos\n🔥 ${Math.round(calories)} kcal\n\nEl Coach ajustará tus entrenamientos según tu actividad real.`,
                "success"
            );
        } catch (error) {
            console.error(error);
            showAlert("Error", "No se pudo sincronizar la calibración.", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSync = async () => {
        if (Platform.OS !== 'android') {
            showAlert("iOS Detectado", "Para Apple HealthKit usa el botón de arriba. Google Fit es solo para Android.", "info");
            return;
        }

        setIsSyncing(true);
        try {
            const auth = await GoogleFitService.authorize();
            if (auth.success) {
                const steps = await GoogleFitService.getTodaySteps();
                const calories = await GoogleFitService.getTodayCalories();

                const token = await AsyncStorage.getItem('token');
                const serviceName = 'Google Fit';

                // Persistir en backend la sincronización
                await fetch(`${Config.BACKEND_URL}/user/health-sync`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ synced: true, service: serviceName })
                });

                // Enviar datos reales
                await fetch(`${Config.BACKEND_URL}/user/health-data`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        calories: calories > 0 ? calories : (steps * 0.04 + 1800),
                        steps: steps
                    })
                });

                // Actualizar estado local
                setPastStepCount(steps);
                setCurrentStepCount(0);

                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const parsedUser = JSON.parse(userData);
                    parsedUser.healthSynced = true;
                    parsedUser.healthService = serviceName;
                    await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
                }

                showAlert(
                    "Sincronización Exitosa",
                    `¡Nexus IA conectado con Google Fit!\n\n🚶 Pasos: ${steps}\n🔥 Calorías: ${calories} kcal\n\nTu progreso se ha actualizado correctamente.`,
                    "success"
                );
            } else {
                showAlert("Error de Conexión", auth.message || "No se pudo autorizar Google Fit. Revisa los permisos.", "error");
            }
        } catch (error) {
            console.error(error);
            showAlert("Error", "Error al conectar con la API de Google Fit.", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bio-Sincronización</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.statusCard}>
                    <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.cardGrad}>
                        <View style={styles.statusRow}>
                            <MaterialCommunityIcons name="walk" size={40} color="#63ff15" />
                            <View>
                                <Text style={styles.statusLabel}>Pasos en las últimas 24h</Text>
                                <Text style={styles.statusValue}>{pastStepCount + currentStepCount}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.calibrateToggle}
                            onPress={() => setShowCalibrator(!showCalibrator)}
                        >
                            <Text style={styles.calibrateToggleText}>
                                {showCalibrator ? "❌ CANCELAR" : "🔗 VINCULAR GOOGLE FIT MANUALMENTE"}
                            </Text>
                            <Ionicons name={showCalibrator ? "close-circle" : "sync"} size={16} color="#63ff15" />
                        </TouchableOpacity>

                        {showCalibrator && (
                            <View style={styles.calibratorPanel}>
                                <Text style={styles.calibratorTitle}>📲 Cómo Vincular Google Fit</Text>
                                <Text style={styles.calibratorSubtitle}>
                                    1. Abre la app de <Text style={{ fontWeight: 'bold', color: '#EA4335' }}>Google Fit</Text> en tu dispositivo{'\n'}
                                    2. Ve a la sección <Text style={{ fontWeight: 'bold' }}>Inicio</Text> o <Text style={{ fontWeight: 'bold' }}>Diario</Text>{'\n'}
                                    3. Copia tus datos actuales de <Text style={{ fontWeight: 'bold', color: '#63ff15' }}>Pasos</Text> y <Text style={{ fontWeight: 'bold', color: '#FF6B6B' }}>Calorías</Text>{'\n'}
                                    4. Introduce esos valores aquí abajo ⬇️
                                </Text>

                                <View style={styles.inputGroup}>
                                    <View style={styles.inputWrapper}>
                                        <Text style={styles.inputLabel}>🚶 PASOS DE HOY (desde Google Fit)</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Ej: 8540"
                                            placeholderTextColor="#444"
                                            keyboardType="numeric"
                                            value={manualSteps}
                                            onChangeText={setManualSteps}
                                        />
                                    </View>
                                    <View style={styles.inputWrapper}>
                                        <Text style={styles.inputLabel}>🔥 CALORÍAS (Opcional)</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Ej: 2450"
                                            placeholderTextColor="#444"
                                            keyboardType="numeric"
                                            value={manualKcal}
                                            onChangeText={setManualKcal}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.btnConfirmCalibrate} onPress={handleCalibrate} disabled={isSyncing}>
                                    {isSyncing ? <ActivityIndicator color="black" /> : <Text style={styles.btnConfirmText}>✅ VINCULAR CON NEXUS AI</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.divider} />

                        {/* Badge de Sincronización Automática */}
                        <View style={styles.autoSyncBadge}>
                            <View style={styles.syncIndicator}>
                                <MaterialCommunityIcons name="sync-circle" size={16} color="#63ff15" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.autoSyncTitle}>Sincronización Automática Activa</Text>
                                <Text style={styles.autoSyncSubtitle}>
                                    {Platform.OS === 'android'
                                        ? 'Tus pasos se actualizan cada 50 pasos automáticamente'
                                        : 'Tus pasos se actualizan cada 100 pasos automáticamente'}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.infoText}>
                            {isPedometerAvailable === 'true'
                                ? "✅ Conectado con los sensores de movimiento del dispositivo."
                                : "💡 Simulación Nexus: Sensores no detectados (Ideal para demos)."}
                        </Text>
                    </LinearGradient>
                </View>

                <View style={styles.integrationSection}>
                    <Text style={styles.sectionTitle}>Conexiones Externas</Text>

                    {Platform.OS === 'ios' ? (
                        <>
                            <TouchableOpacity style={styles.integrationItem} onPress={() => setShowAccountSelector(true)}>
                                <Ionicons name="logo-apple" size={30} color="white" />
                                <View style={styles.integrationInfo}>
                                    <Text style={styles.integrationName}>Apple HealthKit</Text>
                                    <Text style={styles.integrationStatus}>
                                        {selectedAccount ? `Vinculado: ${selectedAccount}` : "Servicio preferencial iOS"}
                                    </Text>
                                </View>
                                <Ionicons
                                    name={selectedAccount ? "checkmark-circle" : "chevron-forward"}
                                    size={24}
                                    color={selectedAccount ? "#63ff15" : "#444"}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.integrationItem, { opacity: 0.5 }]} disabled={true}>
                                <Ionicons name="logo-google" size={30} color="#EA4335" />
                                <View style={styles.integrationInfo}>
                                    <Text style={styles.integrationName}>Google Fit</Text>
                                    <Text style={styles.integrationStatus}>No disponible en este sistema</Text>
                                </View>
                                <Ionicons name="close-circle" size={24} color="#444" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity style={styles.integrationItem} onPress={() => setShowAccountSelector(true)}>
                                <Ionicons name="logo-google" size={30} color="#EA4335" />
                                <View style={styles.integrationInfo}>
                                    <Text style={styles.integrationName}>Google Fit / Health Connect</Text>
                                </View>
                                <Ionicons name="checkmark-circle" size={24} color="#63ff15" />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.integrationItem, { opacity: 0.5 }]} disabled={true}>
                                <Ionicons name="logo-apple" size={30} color="white" />
                                <View style={styles.integrationInfo}>
                                    <Text style={styles.integrationName}>Apple HealthKit</Text>
                                    <Text style={styles.integrationStatus}>Disponible solo en iOS</Text>
                                </View>
                                <Ionicons name="close-circle" size={24} color="#444" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]}
                    onPress={handleSync}
                    disabled={isSyncing}
                >
                    {isSyncing ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <>
                            <Text style={styles.syncBtnText}>FORZAR BI-SINCRONIZACIÓN</Text>
                            <MaterialCommunityIcons name="sync" size={20} color="black" />
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.nexusAdvice}>
                    <Ionicons name="sparkles" size={20} color="#63ff15" />
                    <Text style={styles.adviceText}>
                        "Nexus AI utiliza tus niveles de actividad diarios para ajustar automáticamente la intensidad de las rutinas de mañana."
                    </Text>
                </View>
            </ScrollView>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={() => setAlert({ ...alert, visible: false })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
    content: { padding: 20 },
    statusCard: { borderRadius: 25, overflow: 'hidden', marginBottom: 30, borderWidth: 1, borderColor: '#222' },
    cardGrad: { padding: 25 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    statusLabel: { color: '#888', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    statusValue: { color: 'white', fontSize: 36, fontWeight: '900' },
    divider: { height: 1, backgroundColor: '#222', marginVertical: 20 },
    infoText: { color: '#666', fontSize: 12, textAlign: 'center' },
    sectionTitle: { color: 'white', fontSize: 16, fontWeight: '800', marginBottom: 15, textTransform: 'uppercase' },
    integrationSection: { gap: 12, marginBottom: 40 },
    integrationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#222',
        gap: 20
    },
    integrationInfo: { flex: 1 },
    integrationName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    integrationStatus: { color: '#666', fontSize: 12, marginTop: 2 },
    syncBtn: {
        backgroundColor: '#63ff15',
        height: 60,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginBottom: 30
    },
    syncBtnDisabled: { opacity: 0.6 },
    syncBtnText: { color: 'black', fontWeight: '900', fontSize: 14 },
    calibrateToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(99, 255, 21, 0.05)',
        paddingVertical: 8,
        borderRadius: 10,
        marginTop: 15,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(99, 255, 21, 0.3)',
        gap: 8
    },
    calibrateToggleText: {
        color: '#63ff15',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    calibratorPanel: {
        marginTop: 20,
        backgroundColor: '#111',
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#333'
    },
    calibratorTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5
    },
    calibratorSubtitle: {
        color: '#666',
        fontSize: 11,
        marginBottom: 15,
        lineHeight: 16
    },
    inputGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        gap: 10
    },
    inputWrapper: {
        flex: 1
    },
    inputLabel: {
        color: '#888',
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 5
    },
    textInput: {
        backgroundColor: '#050505',
        height: 45,
        borderRadius: 10,
        paddingHorizontal: 12,
        color: 'white',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#222'
    },
    btnConfirmCalibrate: {
        backgroundColor: '#63ff15',
        height: 45,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    btnConfirmText: {
        color: 'black',
        fontWeight: '900',
        fontSize: 12
    },
    googleModal: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 24,
        alignItems: 'center'
    },
    googleLogo: {
        width: 32,
        height: 32,
        marginBottom: 16
    },
    googleTitle: {
        color: '#202124',
        fontSize: 22,
        fontWeight: '500',
        textAlign: 'center'
    },
    googleSubtitle: {
        color: '#5f6368',
        fontSize: 14,
        marginTop: 4,
        marginBottom: 24,
        textAlign: 'center'
    },
    accountItem: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#e8eaed',
        gap: 12
    },
    accountAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1a73e8',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarLetter: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    },
    accountName: {
        color: '#3c4043',
        fontSize: 14,
        fontWeight: '500'
    },
    accountEmail: {
        color: '#5f6368',
        fontSize: 12
    },
    addAccountBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#e8eaed',
        gap: 12
    },
    addAccountText: {
        color: '#1a73e8',
        fontSize: 14,
        fontWeight: '500'
    },
    googlePrivacy: {
        color: '#5f6368',
        fontSize: 11,
        marginTop: 20,
        textAlign: 'left',
        lineHeight: 16
    },
    btnCancelGoogle: {
        marginTop: 24,
        alignSelf: 'flex-end',
        padding: 8
    },
    btnCancelText: {
        color: '#1a73e8',
        fontSize: 12,
        fontWeight: 'bold'
    },
    connectingCard: {
        width: '80%',
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    connectingText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20
    },
    progressBarBg: {
        width: '100%',
        height: 4,
        backgroundColor: '#222',
        borderRadius: 2,
        marginTop: 20,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#63ff15'
    },
    connectingSub: {
        color: '#666',
        fontSize: 11,
        marginTop: 10,
        textAlign: 'center'
    },
    nexusAdvice: {
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        gap: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#63ff15'
    },
    adviceText: { color: '#aaa', fontSize: 13, lineHeight: 20, flex: 1, fontStyle: 'italic' },

    // Estilos para badge de sincronización automática
    autoSyncBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 255, 21, 0.05)',
        padding: 12,
        borderRadius: 12,
        marginVertical: 15,
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.2)',
        gap: 10,
    },
    syncIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(99, 255, 21, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.3)',
    },
    autoSyncTitle: {
        color: '#63ff15',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    autoSyncSubtitle: {
        color: '#888',
        fontSize: 10,
        lineHeight: 14,
    },
});
