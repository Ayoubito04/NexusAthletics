import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, FlatList, Animated, Platform } from 'react-native';
import NexusAlert from '../components/NexusAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

const { width, height } = Dimensions.get('window');

const EXERCISE_IMAGES = {
    "press_banca": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif",
    "sentadilla": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Full-Squat.gif",
    "peso_muerto": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif",
    "curls": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif",
    "default": "https://i.ibb.co/vzG7ZkL/ai-logo-a.png"
};

export default function ElitePlanScreen({ route, navigation }) {
    const { plan } = route.params;
    const [activeIndex, setActiveIndex] = useState(0);
    const [guardado, setGuardado] = useState(false);
    const [agendado, setAgendado] = useState(false);

    // NexusAlert State
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null });

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

    if (!plan || !plan.dias) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                    <Text style={styles.headerTitle}>ERROR</Text>
                </View>
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No se pudo cargar el formato del plan.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const handleSavePlan = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/save-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ planData: plan })
            });

            if (response.ok) {
                setGuardado(true);
                showAlert("✨ Plan Guardado", "El plan se ha guardado en tu Bóveda.", "success");
            }
        } catch (error) { console.error(error); }
    };

    const handleScheduleToCalendar = async () => {
        try {
            const savedRoutines = await AsyncStorage.getItem('assigned_routines');
            let currentRoutines = savedRoutines ? JSON.parse(savedRoutines) : {};

            const today = new Date();
            const dayOfWeek = today.getDay();
            const diffToMonday = today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
            const startMonday = new Date(today.setDate(diffToMonday));

            // Sincronizamos para las próximas 8 semanas (2 meses aproximadamente)
            const WEEKS_TO_PLAN = 8;

            for (let week = 0; week < WEEKS_TO_PLAN; week++) {
                plan.dias.forEach((diaPlan, index) => {
                    const targetDate = new Date(startMonday);
                    targetDate.setDate(startMonday.getDate() + (week * 7) + index);
                    const dateKey = targetDate.toISOString().split('T')[0];

                    currentRoutines[dateKey] = {
                        title: diaPlan.titulo,
                        isElite: true,
                        planId: plan.id || 'ai-master', // Para identificar de qué plan viene
                        exercises: diaPlan.ejercicios.map((ex, i) => ({
                            id: `ai-${dateKey}-${i}`,
                            name: ex.nombre,
                            muscle: 'IA Nexus',
                            icon: 'sparkles'
                        }))
                    };
                });
            }

            await AsyncStorage.setItem('assigned_routines', JSON.stringify(currentRoutines));
            setAgendado(true);
            showAlert(
                "🚀 Propagación Nexus Completada",
                "Tu rutina se ha inyectado para los próximos 2 meses. Puedes verla repetida semanalmente en tu calendario.",
                "success"
            );
        } catch (error) {
            console.error("Schedule error:", error);
        }
    };

    const renderSlide = ({ item }) => {
        if (item.type === 'summary') {
            return (
                <View style={[styles.slide, { backgroundColor: '#050505' }]}>
                    <LinearGradient colors={['#63ff1520', 'transparent']} style={styles.gradBg} />
                    <View style={styles.slideHeader}>
                        <Text style={styles.slideLabel}>PRESENTACIÓN ÉLITE</Text>
                        <Text style={styles.slideTitle}>{plan.resumen.objetivo.toUpperCase()}</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <Ionicons name="flash" size={40} color="#63ff15" style={{ marginBottom: 10 }} />
                        <Text style={styles.summaryText}>{plan.resumen.estrategia}</Text>
                    </View>

                    <View style={styles.macroGrid}>
                        {Object.entries(plan.resumen.macros).map(([key, val]) => (
                            <View key={key} style={styles.macroItem}>
                                <Text style={styles.macroVal}>{val}</Text>
                                <Text style={styles.macroKey}>{key.toUpperCase()}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.startBtn} onPress={() => setActiveIndex(1)}>
                        <Text style={styles.startBtnText}>EXPLORAR RUTINA SEMANAL</Text>
                        <Ionicons name="arrow-forward" size={20} color="black" />
                    </TouchableOpacity>
                </View>
            );
        }

        if (item.type === 'day') {
            return (
                <View style={styles.slide}>
                    <View style={styles.dayBanner}>
                        <Text style={styles.dayNumber}>DÍA {item.dia}</Text>
                        <Text style={styles.dayTitle}>{item.titulo}</Text>
                    </View>

                    <ScrollView style={styles.exerciseScroll} showsVerticalScrollIndicator={false}>
                        {item.ejercicios.map((ex, idx) => (
                            <View key={idx} style={styles.exerciseCard}>
                                <Image source={{ uri: EXERCISE_IMAGES[ex.imgKey] || EXERCISE_IMAGES.default }} style={styles.exImage} />
                                <View style={styles.exInfo}>
                                    <Text style={styles.exName}>{ex.nombre}</Text>
                                    <View style={styles.exStats}><Text style={styles.exStatText}>{ex.series} x {ex.reps}</Text></View>
                                </View>
                            </View>
                        ))}
                        <View style={{ height: 100 }} />
                    </ScrollView>
                </View>
            );
        }

        if (item.type === 'nutrition') {
            return (
                <View style={[styles.slide, { backgroundColor: '#0a0a0a' }]}>
                    <View style={styles.slideHeader}>
                        <Text style={styles.slideLabel}>ACCIONES</Text>
                        <Text style={styles.slideTitle}>SINCRO MAESTRA</Text>
                    </View>

                    <ScrollView style={{ flex: 1 }}>
                        <TouchableOpacity style={styles.syncBtnMain} onPress={handleScheduleToCalendar}>
                            <LinearGradient colors={['#63ff15', '#4ad912']} style={styles.syncBtnGrad}>
                                <Ionicons name="calendar" size={28} color="black" />
                                <View>
                                    <Text style={styles.syncBtnT}>PROGRAMAR EN CALENDARIO</Text>
                                    <Text style={styles.syncBtnS}>Repetir esta rutina los próximos 2 meses</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color="#63ff15" />
                            <Text style={styles.infoText}>Esto inyectará el ciclo semanal automáticamente en cada semana futura.</Text>
                        </View>

                        <TouchableOpacity style={styles.saveBtnSec} onPress={handleSavePlan}>
                            <Ionicons name={guardado ? "checkmark-circle" : "cloud-upload-outline"} size={20} color="#63ff15" />
                            <Text style={styles.saveBtnSecText}>{guardado ? "GUARDADO EN VAULT" : "GUARDAR PLAN EN NUBE"}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            );
        }
    };

    const slides = [{ type: 'summary' }, ...plan.dias.map(d => ({ ...d, type: 'day' })), { type: 'nutrition' }];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={30} color="white" /></TouchableOpacity>
                <Text style={styles.navTitle}>NEXUS <Text style={{ color: '#63ff15' }}>ELITE</Text></Text>
                <View style={{ width: 30 }} />
            </View>

            <FlatList
                data={slides}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, index) => index.toString()}
                onScroll={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            />

            <View style={styles.indicatorContainer}>
                {slides.map((_, i) => (
                    <View key={i} style={[styles.indicator, activeIndex === i && styles.indicatorActive]} />
                ))}
            </View>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
    navTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    slide: { width, height: height - 120, padding: 25 },
    gradBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
    slideHeader: { marginTop: 40, marginBottom: 30 },
    slideLabel: { color: '#63ff15', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
    slideTitle: { color: 'white', fontSize: 32, fontWeight: '900' },
    summaryCard: { backgroundColor: '#111', padding: 25, borderRadius: 25, borderLeftWidth: 1, borderLeftColor: '#63ff15', marginBottom: 30 },
    summaryText: { color: '#ccc', fontSize: 16, lineHeight: 24 },
    macroGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 },
    macroItem: { width: '47%', backgroundColor: '#161616', padding: 20, borderRadius: 20, alignItems: 'center' },
    macroVal: { color: '#63ff15', fontSize: 24, fontWeight: '900' },
    macroKey: { color: '#666', fontSize: 10, fontWeight: 'bold', marginTop: 5 },
    startBtn: { marginTop: 'auto', backgroundColor: '#63ff15', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    startBtnText: { color: 'black', fontWeight: '900', fontSize: 14 },
    dayBanner: { backgroundColor: '#111', padding: 20, borderRadius: 20, borderLeftWidth: 5, borderLeftColor: '#63ff15', marginBottom: 20 },
    dayNumber: { color: '#63ff15', fontSize: 12, fontWeight: '900' },
    dayTitle: { color: 'white', fontSize: 22, fontWeight: '800', marginTop: 5 },
    exerciseScroll: { flex: 1 },
    exerciseCard: { backgroundColor: '#161616', borderRadius: 20, marginBottom: 12, flexDirection: 'row', padding: 12, alignItems: 'center' },
    exImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#000' },
    exInfo: { flex: 1, marginLeft: 15 },
    exName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    exStats: { marginTop: 4 },
    exStatText: { color: '#63ff15', fontSize: 11, fontWeight: '800' },
    syncBtnMain: { borderRadius: 25, overflow: 'hidden' },
    syncBtnGrad: { padding: 25, flexDirection: 'row', alignItems: 'center', gap: 20 },
    syncBtnT: { color: 'black', fontWeight: '900', fontSize: 16 },
    syncBtnS: { color: 'rgba(0,0,0,0.6)', fontSize: 11, fontWeight: '700' },
    infoBox: { flexDirection: 'row', gap: 10, marginTop: 20, backgroundColor: '#111', padding: 15, borderRadius: 15 },
    infoText: { color: '#666', fontSize: 12, flex: 1 },
    saveBtnSec: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 20, borderWidth: 1, borderColor: '#333', borderRadius: 20 },
    saveBtnSecText: { color: 'white', fontWeight: '800', fontSize: 14 },
    indicatorContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, position: 'absolute', bottom: 40, width: '100%' },
    indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#444' },
    indicatorActive: { backgroundColor: '#63ff15', width: 20 }
});
