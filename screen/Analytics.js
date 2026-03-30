import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LinearGradient } from 'expo-linear-gradient';
import Config from '../constants/Config';
const BACKEND_URL = Config.BACKEND_URL;

export default function Analytics() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalKm: 0,
        totalKcal: 0,
        totalSegundos: 0,
        count: 0,
        healthSynced: false,
        healthService: '',
        healthCalories: 0,
        healthSteps: 0
    });
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        loadStats();
        // Recargar datos cuando la pantalla gane enfoque para asegurar que se vean cambios de calibración
        const unsubscribe = navigation.addListener('focus', () => {
            loadStats();
        });
        return unsubscribe;
    }, [navigation]);

    const loadStats = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/activities/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleAIAnalysis = async () => {
        setIsAnalyzing(true);
        setModalVisible(true);
        setAiAnalysis('');
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/activities/stats/ai-analysis`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAiAnalysis(data.analysis);
            } else {
                setAiAnalysis("No he podido procesar tus datos en este momento. Inténtalo más tarde.");
            }
        } catch (error) {
            console.error(error);
            setAiAnalysis("Error de conexión con el núcleo de Nexus AI.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    };

    const StatCard = ({ title, value, unit, icon, color }) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardValueRow}>
                <Text style={styles.cardValue}>{value}</Text>
                <Text style={styles.cardUnit}>{unit}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#63ff15" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nexus <Text style={{ color: '#007AFF' }}>Analytics</Text></Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadStats} tintColor="#007AFF" />
                }
            >
                <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Resumen de Rendimiento</Text>
                    <Text style={styles.summarySubtitle}>Has completado {stats.count} sesiones de entrenamiento en total.</Text>
                </View>

                <View style={styles.grid}>
                    <StatCard
                        title="Entrenamientos"
                        value={stats.count}
                        unit="SESIONES"
                        icon="barbell"
                        color="#63ff15"
                    />
                    <StatCard
                        title="Tiempo Activo"
                        value={formatTime(stats.totalSegundos)}
                        unit=""
                        icon="time"
                        color="#007AFF"
                    />
                </View>

                <TouchableOpacity
                    style={styles.aiAnalysisBtn}
                    onPress={handleAIAnalysis}
                >
                    <LinearGradient
                        colors={['#007AFF', '#00D1FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientBtn}
                    >
                        <Ionicons name="sparkles" size={20} color="white" />
                        <Text style={styles.aiBtnText}>PEDIR ANÁLISIS A NEXUS AI</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.proTip}>
                    <Ionicons name="bulb-outline" size={18} color="#ffd700" />
                    <Text style={styles.proTipText}>Tip: Los usuarios Ultimate tienen acceso a reportes biométricos avanzados cada mes.</Text>
                </View>
            </ScrollView>
            {/* Modal de Análisis IA */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.aiModalContent}>
                        <View style={styles.aiModalHeader}>
                            <MaterialCommunityIcons name="brain" size={28} color="#63ff15" />
                            <Text style={styles.aiModalTitle}>NEXUS AI BRAIN</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#63ff15" />
                            </TouchableOpacity>
                        </View>

                        {isAnalyzing ? (
                            <View style={styles.analyzingContainer}>
                                <ActivityIndicator size="large" color="#63ff15" />
                                <Text style={styles.analyzingText}>Escaneando Evolución Biométrica...</Text>
                                <Text style={styles.analyzingSubtext}>Procesando métricas acumuladas y sincronización de salud.</Text>
                            </View>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.analysisResult}>
                                    <Text style={styles.analysisLabel}>ANÁLISIS DE EVOLUCIÓN:</Text>
                                    <Text style={styles.analysisText}>{aiAnalysis}</Text>
                                    <View style={styles.analysisFooter}>
                                        <Ionicons name="star" size={18} color="#FFD700" />
                                        <Text style={styles.footerMsg}>Basado en tus últimas 20 actividades.</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.goToChatBtn}
                                    onPress={() => {
                                        setModalVisible(false);
                                        navigation.navigate('EntrenadorIA');
                                    }}
                                >
                                    <Text style={styles.goToChatText}>HABLAR CON COACH ÉLITE</Text>
                                    <Ionicons name="arrow-forward" size={18} color="black" />
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    summaryBox: { marginBottom: 25 },
    summaryTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
    summarySubtitle: { color: '#666', fontSize: 14, marginTop: 4 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 15 },
    statCard: { width: '47%', backgroundColor: '#111', borderRadius: 20, padding: 15, borderLeftWidth: 4, borderWidth: 1, borderColor: '#161616' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    iconBox: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { color: '#888', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    cardValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    cardValue: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    cardUnit: { color: '#444', fontSize: 12, fontWeight: 'bold' },
    chartPlaceholder: { backgroundColor: '#111', borderRadius: 25, padding: 20, marginTop: 25, borderWidth: 1, borderColor: '#161616' },
    chartTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
    barContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, paddingHorizontal: 10 },
    barWrapper: { alignItems: 'center', gap: 8 },
    bar: { width: 12, borderRadius: 6 },
    barDay: { color: '#444', fontSize: 10, fontWeight: 'bold' },
    aiAnalysisBtn: { marginTop: 30, borderRadius: 20, overflow: 'hidden' },
    gradientBtn: { padding: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    aiBtnText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
    proTip: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#1a1a10', padding: 15, borderRadius: 15, marginTop: 25, borderWidth: 1, borderColor: '#333010' },
    proTipText: { color: '#888', fontSize: 12, flex: 1, fontStyle: 'italic' },
    healthSyncBox: {
        backgroundColor: 'rgba(99, 255, 21, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginTop: 25,
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.2)',
    },
    healthSyncHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    healthSyncTitle: {
        color: '#63ff15',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    healthSyncDesc: {
        color: '#888',
        fontSize: 12,
        lineHeight: 18,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiModalContent: {
        width: '90%',
        backgroundColor: '#0a0a0a',
        borderRadius: 30,
        padding: 25,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.3)',
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    aiModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingBottom: 15,
    },
    aiModalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
        marginLeft: 15,
        flex: 1,
    },
    closeBtn: {
        padding: 5,
    },
    analyzingContainer: {
        paddingVertical: 50,
        alignItems: 'center',
    },
    analyzingText: {
        color: '#63ff15',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        textAlign: 'center',
    },
    analyzingSubtext: {
        color: '#666',
        fontSize: 13,
        marginTop: 10,
        textAlign: 'center',
    },
    analysisResult: {
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
    },
    analysisLabel: {
        color: '#63ff15',
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 15,
        letterSpacing: 1,
    },
    analysisText: {
        color: '#ddd',
        fontSize: 15,
        lineHeight: 24,
    },
    analysisFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 8,
    },
    footerMsg: {
        color: '#555',
        fontSize: 12,
        fontWeight: '600',
    },
    goToChatBtn: {
        backgroundColor: '#63ff15',
        borderRadius: 15,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    goToChatText: {
        color: 'black',
        fontWeight: '900',
        fontSize: 14,
    }
});
