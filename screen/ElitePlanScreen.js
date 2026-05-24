import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import NexusAlert from '../components/NexusAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';
import { EXERCISE_IMAGES } from '../utils/exerciseMedia';

const BACKEND_URL = Config.BACKEND_URL;

const { width, height } = Dimensions.get('window');

// EXERCISE_IMAGES is now in utils/exerciseMedia.js and imported above

const GIF_CACHE_KEY = 'nexus_exercise_gifs_v1';

export default function ElitePlanScreen({ route, navigation }) {
    const { plan } = route.params;
    const [guardado, setGuardado] = useState(false);
    const [agendado, setAgendado] = useState(false);
    const [apiGifs, setApiGifs] = useState({});

    useEffect(() => {
        (async () => {
            try {
                const cached = await AsyncStorage.getItem(GIF_CACHE_KEY);
                if (cached) {
                    setApiGifs(JSON.parse(cached));
                }
                // Siempre intenta refrescar en background
                const res = await fetch(`${BACKEND_URL}/exercises/gifs`);
                if (res.ok) {
                    const data = await res.json();
                    if (Object.keys(data).length > 0) {
                        setApiGifs(data);
                        await AsyncStorage.setItem(GIF_CACHE_KEY, JSON.stringify(data));
                    }
                }
            } catch {}
        })();
    }, []);

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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ planData: plan })
            });
            if (response.ok) {
                setGuardado(true);
                showAlert('✨ Plan Guardado', 'El plan se ha guardado en tu Bóveda.', 'success');
            } else {
                showAlert('Error', 'No se pudo guardar el plan.', 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error', 'No se pudo guardar el plan.', 'error');
        }
    };

    const handleScheduleToCalendar = async () => {
        try {
            const savedRoutines = await AsyncStorage.getItem('assigned_routines');
            let currentRoutines = savedRoutines ? JSON.parse(savedRoutines) : {};

            const now = new Date();
            const dow = now.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb

            // Arrancar siempre desde el próximo lunes (o hoy si es lunes)
            // (8 - dow) % 7 → 0 si hoy es lunes, 1 si es domingo, 6 si es martes...
            const daysToMonday = (8 - dow) % 7;
            const startMonday = new Date(now);
            startMonday.setDate(now.getDate() + daysToMonday);
            startMonday.setHours(0, 0, 0, 0);

            const mapEx = (ex, dateKey, i) => ({
                id: `ai-${dateKey}-${i}`,
                name: ex.nombre,
                muscle: 'IA Nexus',
                sets: parseInt(ex.series) || 3,
                reps: ex.reps || '10-12',
                weight: 0,
                icon: 'sparkles',
                imgKey: ex.imgKey || null,
                rir: ex.rir || null,
                pesoSugerido: ex.pesoSugerido || null,
                tempo: ex.tempo || null,
                tecnica: ex.tecnica || null,
                nota: ex.nota || null,
            });

            // Offsets Lunes→Domingo: los descansos caen en finde siempre que sea posible
            // 0=Lun 1=Mar 2=Mié 3=Jue 4=Vie 5=Sáb 6=Dom
            const WEEKLY_DAY_OFFSETS = {
                1: [0],                      // Lun
                2: [0, 3],                   // Lun, Jue
                3: [0, 2, 4],               // Lun, Mié, Vie
                4: [0, 1, 3, 4],            // Lun, Mar, Jue, Vie
                5: [0, 1, 2, 3, 4],         // Lun–Vie  → finde libre
                6: [0, 1, 2, 3, 4, 5],      // Lun–Sáb  → solo Dom libre
                7: [0, 1, 2, 3, 4, 5, 6],   // Todos
            };

            const getDayOffset = (numDays, idx) =>
                (WEEKLY_DAY_OFFSETS[numDays] ?? [...Array(numDays).keys()])[idx] ?? idx;

            const WEEKS = 4;
            const numDays = (plan.dias || []).length;
            const isUltimatePlan = !!(plan.analisis || plan.suplementacion?.length);

            for (let week = 0; week < WEEKS; week++) {
                (plan.dias || []).forEach((diaPlan, index) => {
                    const d = new Date(startMonday);
                    d.setDate(startMonday.getDate() + week * 7 + getDayOffset(numDays, index));
                    const dateKey = d.toISOString().split('T')[0];
                    currentRoutines[dateKey] = {
                        title: diaPlan.titulo,
                        isElite: true,
                        isUltimate: isUltimatePlan,
                        semanaNum: week + 1,
                        planId: plan.resumen?.objetivo || 'ai-master',
                        preWorkout: plan.resumen?.nutricionTiming?.preWorkout || null,
                        exercises: (diaPlan.ejercicios || []).map((ex, i) => mapEx(ex, dateKey, i)),
                    };
                });
            }

            await AsyncStorage.setItem('assigned_routines', JSON.stringify(currentRoutines));
            setAgendado(true);
            showAlert('🚀 Propagación Nexus Completada', `Tu rutina se ha inyectado para el próximo mes (4 semanas).`, 'success');
        } catch (error) {
            console.error('Schedule error:', error);
            showAlert('Error', 'No se pudo programar el plan.', 'error');
        }
    };

    // ─── Single unified render for both Pro and Ultimate ────────────────────
    const isUltimatePlan = !!(plan.analisis || plan.suplementacion?.length);
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topNav}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={30} color="white" /></TouchableOpacity>
                <Text style={styles.navTitle}>NEXUS <Text style={{ color: isUltimatePlan ? '#FFD700' : '#63ff15' }}>{isUltimatePlan ? 'ULTIMATE' : 'PRO'}</Text></Text>
                <View style={{ width: 30 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Resumen */}
                <LinearGradient colors={isUltimatePlan ? ['#FFD70015', 'transparent'] : ['#63ff1515', 'transparent']} style={{ padding: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <Text style={{ fontSize: 18 }}>{isUltimatePlan ? '👑' : '⚡'}</Text>
                        <Text style={[styles.slideLabel, { color: isUltimatePlan ? '#FFD700' : '#63ff15' }]}>{isUltimatePlan ? 'PLAN ULTIMATE' : 'PLAN PRO'} · {plan.resumen?.duracion}</Text>
                    </View>
                    <Text style={[styles.slideTitle, { fontSize: 24, marginBottom: 12 }]}>{plan.resumen?.objetivo?.toUpperCase()}</Text>
                    <View style={[styles.summaryCard, { borderLeftColor: isUltimatePlan ? '#FFD700' : '#63ff15' }]}>
                        <Text style={styles.summaryText}>{plan.resumen?.estrategia}</Text>
                    </View>
                    <View style={styles.macroGrid}>
                        {Object.entries(plan.resumen?.macros || {}).map(([k, v]) => (
                            <View key={k} style={styles.macroItem}>
                                <Text style={[styles.macroVal, { color: isUltimatePlan ? '#FFD700' : '#63ff15' }]}>{v}</Text>
                                <Text style={styles.macroKey}>{k.toUpperCase()}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Nutrición timing (Ultimate) */}
                    {plan.resumen?.nutricionTiming && (
                        <View style={[styles.summaryCard, { marginTop: 14, borderLeftColor: '#63ff15' }]}>
                            <Text style={{ color: '#63ff15', fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>⏱ NUTRICIÓN TIMING</Text>
                            {[['🕐 Pre-Entreno', plan.resumen.nutricionTiming.preWorkout],
                              ['🏋️ Post-Entreno', plan.resumen.nutricionTiming.postWorkout],
                              ['🌙 Antes de Dormir', plan.resumen.nutricionTiming.antesDormir]
                            ].map(([label, val]) => val ? (
                                <View key={label} style={{ marginBottom: 8 }}>
                                    <Text style={{ color: '#aaa', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>{label}</Text>
                                    <Text style={{ color: '#ddd', fontSize: 14, lineHeight: 20 }}>{val}</Text>
                                </View>
                            ) : null)}
                        </View>
                    )}

                    {/* Análisis personalizado (Ultimate) */}
                    {plan.analisis && (
                        <View style={[styles.summaryCard, { marginTop: 14, borderLeftColor: '#a855f7' }]}>
                            <Text style={{ color: '#a855f7', fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>🔬 ANÁLISIS PERSONALIZADO</Text>
                            <Text style={{ color: '#aaa', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>✅ PUNTOS FUERTES</Text>
                            {(plan.analisis.puntosFuertes || []).map((p, i) => (
                                <Text key={i} style={{ color: '#ddd', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>• {p}</Text>
                            ))}
                            <Text style={{ color: '#aaa', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 }}>⚠️ A MEJORAR</Text>
                            {(plan.analisis.puntosMejora || []).map((p, i) => (
                                <Text key={i} style={{ color: '#ddd', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>• {p}</Text>
                            ))}
                            <Text style={{ color: '#aaa', fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 6 }}>🎯 AJUSTES APLICADOS</Text>
                            <Text style={{ color: '#ddd', fontSize: 14, lineHeight: 21 }}>{plan.analisis.ajustes}</Text>
                        </View>
                    )}
                </LinearGradient>

                {/* Días */}
                {(plan.dias || []).map((dia, di) => (
                    <View key={di} style={{ marginHorizontal: 20, marginBottom: 20 }}>
                        <View style={styles.dayBanner}>
                            <Text style={styles.dayNumber}>DÍA {dia.dia}</Text>
                            <Text style={styles.dayTitle}>{dia.titulo}</Text>
                        </View>

                        {dia.calentamiento?.length > 0 && (
                            <View style={{ backgroundColor: '#0d1f0d', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(99,255,21,0.15)' }}>
                                <Text style={{ color: '#63ff15', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>🔥 CALENTAMIENTO</Text>
                                {dia.calentamiento.map((c, ci) => (
                                    <Text key={ci} style={{ color: '#bbb', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>• {c}</Text>
                                ))}
                            </View>
                        )}

                        <View style={styles.exGrid}>
                            {(dia.ejercicios || []).map((ex, ei) => (
                                <View key={ei} style={styles.exGridCard}>
                                    <Image
                                        source={{ uri: apiGifs[ex.imgKey] ? `${BACKEND_URL}/exercises/gif/${apiGifs[ex.imgKey]}` : (EXERCISE_IMAGES[ex.imgKey] || EXERCISE_IMAGES.default) }}
                                        style={styles.exGridImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.exGridOverlay}>
                                        <Text style={styles.exGridName} numberOfLines={2}>{ex.nombre}</Text>
                                        <View style={styles.exBadgeRow}>
                                            <View style={styles.exBadgeGreen}>
                                                <Text style={styles.exBadgeGreenText}>{ex.series}×{ex.reps}</Text>
                                            </View>
                                            {ex.rir && (
                                                <View style={styles.exBadgeGold}>
                                                    <Text style={styles.exBadgeGoldText}>RIR {ex.rir}</Text>
                                                </View>
                                            )}
                                            {ex.tempo && (
                                                <View style={styles.exBadgeTeal}>
                                                    <Text style={styles.exBadgeTealText}>⏱ {ex.tempo}</Text>
                                                </View>
                                            )}
                                        </View>
                                        {ex.pesoSugerido && (
                                            <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: '800', marginTop: 4 }}>{ex.pesoSugerido}</Text>
                                        )}
                                        {ex.tecnica && <Text style={{ color: '#f59e0b', fontSize: 11, marginTop: 3 }}>⚡ {ex.tecnica}</Text>}
                                    </View>
                                </View>
                            ))}
                        </View>

                        {dia.vueltaCalma?.length > 0 && (
                            <View style={{ backgroundColor: '#0d0d1f', borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: 'rgba(168,85,247,0.15)' }}>
                                <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>🧘 VUELTA A LA CALMA</Text>
                                {dia.vueltaCalma.map((c, ci) => (
                                    <Text key={ci} style={{ color: '#bbb', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>• {c}</Text>
                                ))}
                            </View>
                        )}
                    </View>
                ))}

                {/* Progresión 4 semanas (Ultimate) */}
                {plan.progresion?.length > 0 && (
                    <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '900', letterSpacing: 1.5 }}>📈 PLAN DE PROGRESIÓN</Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,215,0,0.2)' }} />
                            <Text style={{ color: '#555', fontSize: 11, fontWeight: '700' }}>4 SEMANAS</Text>
                        </View>
                        {plan.progresion.map((p, i) => {
                            const isDeload = p.semana === 4 || !!(p.nota && p.nota.toLowerCase().includes('deload'));
                            const col = isDeload ? '#FFD700' : '#63ff15';
                            return (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
                                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDeload ? 'rgba(255,215,0,0.1)' : 'rgba(99,255,21,0.08)', borderWidth: 2, borderColor: col, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                                        <Text style={{ color: col, fontWeight: '900', fontSize: 12 }}>{p.semana}</Text>
                                    </View>
                                    <View style={{ flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: isDeload ? 'rgba(255,215,0,0.15)' : 'rgba(99,255,21,0.1)' }}>
                                        <Text style={{ color: col, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 }}>SEMANA {p.semana}{isDeload ? ' · DELOAD' : ''}</Text>
                                        <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 20 }}>{p.nota}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Suplementación (Ultimate) */}
                {plan.suplementacion?.length > 0 && (
                    <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
                        <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 }}>💊 SUPLEMENTACIÓN RECOMENDADA</Text>
                        {plan.suplementacion.map((s, i) => (
                            <View key={i} style={{ backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFD70020' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{s.nombre}</Text>
                                    <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>{s.dosis}</Text>
                                </View>
                                <Text style={{ color: '#63ff15', fontSize: 12, marginBottom: 3 }}>⏰ {s.timing}</Text>
                                {s.motivo ? <Text style={{ color: '#999', fontSize: 12, fontStyle: 'italic' }}>{s.motivo}</Text> : null}
                            </View>
                        ))}
                    </View>
                )}

                {/* Acciones */}
                <View style={{ marginHorizontal: 20, gap: 12 }}>
                    <TouchableOpacity style={styles.syncBtnMain} onPress={handleScheduleToCalendar}>
                        <LinearGradient colors={isUltimatePlan ? ['#FFD700','#b8860b'] : ['#63ff15', '#38c000']} style={styles.syncBtnGrad}>
                            <Ionicons name="calendar" size={26} color="black" />
                            <View>
                                <Text style={styles.syncBtnT}>PROGRAMAR EN CALENDARIO</Text>
                                <Text style={styles.syncBtnS}>Repetir rutina los próximos 4 semanas</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtnSec} onPress={handleSavePlan}>
                        <Ionicons name={guardado ? 'checkmark-circle' : 'cloud-upload-outline'} size={20} color={isUltimatePlan ? '#FFD700' : '#63ff15'} />
                        <Text style={[styles.saveBtnSecText, { color: isUltimatePlan ? '#FFD700' : 'white' }]}>{guardado ? 'GUARDADO EN VAULT' : 'GUARDAR PLAN EN NUBE'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <NexusAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onConfirm={alert.onConfirm} />
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
    macroKey: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 5, letterSpacing: 0.5 },
    startBtn: { marginTop: 'auto', backgroundColor: '#63ff15', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    startBtnText: { color: 'black', fontWeight: '900', fontSize: 14 },
    dayBanner: { backgroundColor: '#111', padding: 20, borderRadius: 20, borderLeftWidth: 5, borderLeftColor: '#63ff15', marginBottom: 20 },
    dayNumber: { color: '#63ff15', fontSize: 12, fontWeight: '900' },
    dayTitle: { color: 'white', fontSize: 22, fontWeight: '800', marginTop: 5 },
    exerciseScroll: { flex: 1 },
    exGrid: { flexDirection: 'column', gap: 8 },
    exGridCard: { width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#161616', flexDirection: 'row', alignItems: 'center' },
    exGridImage: { width: 80, height: 80, backgroundColor: '#111' },
    exGridOverlay: { flex: 1, padding: 10, justifyContent: 'center' },
    exGridName: { color: '#fff', fontSize: 15, fontWeight: '900', lineHeight: 20, marginBottom: 6 },
    exBadgeRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
    exerciseCard: { borderRadius: 20, marginBottom: 14, overflow: 'hidden', backgroundColor: '#161616' },
    exImageBanner: { width: '100%', height: 110, backgroundColor: '#111' },
    exOverlay: { padding: 14, paddingTop: 10 },
    exImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#000' },
    exInfo: { flex: 1, marginLeft: 15 },
    exName: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
    exStats: { marginTop: 4 },
    exStatText: { color: '#63ff15', fontSize: 11, fontWeight: '800' },
    exBadgeGreen: { backgroundColor: 'rgba(99,255,21,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(99,255,21,0.4)' },
    exBadgeGreenText: { color: '#63ff15', fontSize: 13, fontWeight: '900' },
    exBadgeGold: { backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)' },
    exBadgeGoldText: { color: '#FFD700', fontSize: 12, fontWeight: '800' },
    exBadgePurple: { backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)' },
    exBadgePurpleText: { color: '#a855f7', fontSize: 12, fontWeight: '800' },
    exBadgeTeal: { backgroundColor: 'rgba(6,182,212,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(6,182,212,0.35)' },
    exBadgeTealText: { color: '#06b6d4', fontSize: 12, fontWeight: '800' },
    exNota: { color: '#999', fontSize: 12, fontStyle: 'italic', marginTop: 5, lineHeight: 16 },
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
