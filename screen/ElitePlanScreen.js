import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Dimensions, FlatList, Animated, Platform } from 'react-native';
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
    const [activeIndex, setActiveIndex] = useState(0);
    const [guardado, setGuardado] = useState(false);
    const [agendado, setAgendado] = useState(false);
    const [semanaActiva, setSemanaActiva] = useState(0);
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

    if (!plan || (!plan.dias && !plan.semanas)) {
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
            const dow = now.getDay();
            const startMonday = new Date(now);
            startMonday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
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
            });

            if (plan.esUltimate && plan.semanas) {
                plan.semanas.forEach((semana, weekIdx) => {
                    (semana.dias || []).forEach((diaPlan, dayIdx) => {
                        const d = new Date(startMonday);
                        d.setDate(startMonday.getDate() + weekIdx * 7 + dayIdx);
                        const dateKey = d.toISOString().split('T')[0];
                        currentRoutines[dateKey] = {
                            title: diaPlan.titulo,
                            isElite: true,
                            isUltimate: true,
                            fase: semana.tipo,
                            rpe: semana.rpe,
                            semanaNum: semana.semana,
                            planId: plan.resumen?.objetivo || 'ai-ultimate',
                            exercises: (diaPlan.ejercicios || []).map((ex, i) => mapEx(ex, dateKey, i)),
                        };
                    });
                });
                await AsyncStorage.setItem('assigned_routines', JSON.stringify(currentRoutines));
                setAgendado(true);
                showAlert('🚀 Mesociclo en Calendario', `${plan.semanas.length} semanas inyectadas. Visible en tu calendario.`, 'success');
            } else {
                const WEEKS = 8;
                for (let week = 0; week < WEEKS; week++) {
                    (plan.dias || []).forEach((diaPlan, index) => {
                        const d = new Date(startMonday);
                        d.setDate(startMonday.getDate() + week * 7 + index);
                        const dateKey = d.toISOString().split('T')[0];
                        currentRoutines[dateKey] = {
                            title: diaPlan.titulo,
                            isElite: true,
                            planId: plan.resumen?.objetivo || 'ai-master',
                            exercises: (diaPlan.ejercicios || []).map((ex, i) => mapEx(ex, dateKey, i)),
                        };
                    });
                }
                await AsyncStorage.setItem('assigned_routines', JSON.stringify(currentRoutines));
                setAgendado(true);
                showAlert('🚀 Propagación Nexus Completada', 'Tu rutina se ha inyectado para los próximos 2 meses.', 'success');
            }
        } catch (error) {
            console.error('Schedule error:', error);
            showAlert('Error', 'No se pudo programar el plan.', 'error');
        }
    };

    // ─── Render ULTIMATE ────────────────────────────────────────────────────
    if (plan.esUltimate && plan.semanas) {
        const semana = plan.semanas[semanaActiva] || plan.semanas[0];
        const FASE_COLORS = {
            'Acumulación': ['#3b82f6','#1d4ed8'],
            'Intensificación': ['#f59e0b','#b45309'],
            'Peak': ['#ef4444','#991b1b'],
            'Deload': ['#22c55e','#15803d'],
        };
        const faseColors = FASE_COLORS[semana?.tipo] || ['#63ff15','#38c000'];

        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.topNav}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={30} color="white" /></TouchableOpacity>
                    <Text style={styles.navTitle}>NEXUS <Text style={{ color: '#FFD700' }}>ULTIMATE</Text></Text>
                    <View style={{ width: 30 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    {/* Resumen + análisis */}
                    <LinearGradient colors={['#FFD70015','transparent']} style={{ padding: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <Text style={{ fontSize: 18 }}>👑</Text>
                            <Text style={[styles.slideLabel, { color: '#FFD700' }]}>MESOCICLO ULTIMATE • {plan.resumen?.duracion}</Text>
                        </View>
                        <Text style={[styles.slideTitle, { fontSize: 24, marginBottom: 12 }]}>{plan.resumen?.objetivo?.toUpperCase()}</Text>
                        <View style={[styles.summaryCard, { borderLeftColor: '#FFD700' }]}>
                            <Text style={styles.summaryText}>{plan.resumen?.estrategia}</Text>
                        </View>

                        {/* Macros */}
                        <View style={styles.macroGrid}>
                            {Object.entries(plan.resumen?.macros || {}).map(([k, v]) => (
                                <View key={k} style={styles.macroItem}>
                                    <Text style={[styles.macroVal, { color: '#FFD700' }]}>{v}</Text>
                                    <Text style={styles.macroKey}>{k.toUpperCase()}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Nutrición timing */}
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

                        {/* Análisis de fuerza */}
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

                    {/* Selector de semanas */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}>
                        {plan.semanas.map((s, i) => {
                            const colors = FASE_COLORS[s.tipo] || ['#63ff15','#38c000'];
                            const active = semanaActiva === i;
                            return (
                                <TouchableOpacity key={i} onPress={() => setSemanaActiva(i)}>
                                    {active
                                        ? <LinearGradient colors={colors} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }}>
                                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>SEM {s.semana}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' }}>{s.tipo}</Text>
                                          </LinearGradient>
                                        : <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#2a2a2a' }}>
                                            <Text style={{ color: '#666', fontWeight: '700', fontSize: 13 }}>SEM {s.semana}</Text>
                                            <Text style={{ color: '#555', fontSize: 11 }}>{s.tipo}</Text>
                                          </View>
                                    }
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Badge de fase */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                        <LinearGradient colors={faseColors} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 }}>
                            <View>
                                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>Semana {semana?.semana} — {semana?.tipo}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>{semana?.descripcion}</Text>
                            </View>
                            <View style={{ marginLeft: 'auto', alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{semana?.rpe}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800' }}>RPE</Text>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Días de la semana activa */}
                    {(semana?.dias || []).map((dia, di) => (
                        <View key={di} style={{ marginHorizontal: 20, marginBottom: 20 }}>
                            <View style={styles.dayBanner}>
                                <Text style={styles.dayNumber}>DÍA {dia.dia}</Text>
                                <Text style={styles.dayTitle}>{dia.titulo}</Text>
                            </View>

                            {/* Calentamiento */}
                            {dia.calentamiento?.length > 0 && (
                                <View style={{ backgroundColor: '#0d1f0d', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(99,255,21,0.15)' }}>
                                    <Text style={{ color: '#63ff15', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>🔥 CALENTAMIENTO</Text>
                                    {dia.calentamiento.map((c, ci) => (
                                        <Text key={ci} style={{ color: '#bbb', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>• {c}</Text>
                                    ))}
                                </View>
                            )}

                            {/* Ejercicios — grid 2 columnas */}
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
                                            </View>
                                            {ex.pesoSugerido && (
                                                <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: '800', marginTop: 4 }}>{ex.pesoSugerido}</Text>
                                            )}
                                            {ex.tecnica && <Text style={{ color: '#f59e0b', fontSize: 11, marginTop: 3 }}>⚡ {ex.tecnica}</Text>}
                                        </View>
                                    </View>
                                ))}
                            </View>

                            {/* Vuelta a la calma */}
                            {dia.vueltaCalma?.length > 0 && (
                                <View style={{ backgroundColor: '#0d0d1f', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.15)' }}>
                                    <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>🧘 VUELTA A LA CALMA</Text>
                                    {dia.vueltaCalma.map((c, ci) => (
                                        <Text key={ci} style={{ color: '#bbb', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>• {c}</Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}

                    {/* Suplementación */}
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
                                    <Text style={{ color: '#999', fontSize: 12, fontStyle: 'italic' }}>{s.motivo}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Acciones */}
                    <View style={{ marginHorizontal: 20, gap: 12 }}>
                        <TouchableOpacity style={styles.syncBtnMain} onPress={handleScheduleToCalendar}>
                            <LinearGradient colors={['#FFD700','#b8860b']} style={styles.syncBtnGrad}>
                                <Ionicons name="calendar" size={26} color="black" />
                                <View>
                                    <Text style={styles.syncBtnT}>PROGRAMAR EN CALENDARIO</Text>
                                    <Text style={styles.syncBtnS}>Repetir mesociclo las próximas semanas</Text>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtnSec} onPress={handleSavePlan}>
                            <Ionicons name={guardado ? 'checkmark-circle' : 'cloud-upload-outline'} size={20} color="#FFD700" />
                            <Text style={[styles.saveBtnSecText, { color: '#FFD700' }]}>{guardado ? 'GUARDADO EN VAULT' : 'GUARDAR PLAN EN NUBE'}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                <NexusAlert visible={alert.visible} title={alert.title} message={alert.message} type={alert.type} onConfirm={alert.onConfirm} />
            </SafeAreaView>
        );
    }

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
                        <View style={styles.exGrid}>
                            {item.ejercicios.map((ex, idx) => (
                                <View key={idx} style={styles.exGridCard}>
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
                                        </View>
                                        {ex.pesoSugerido && (
                                            <Text style={{ color: '#a855f7', fontSize: 12, fontWeight: '800', marginTop: 4 }}>{ex.pesoSugerido}</Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
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
