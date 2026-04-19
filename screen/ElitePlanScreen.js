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

const F = 'https://fitnessprogramer.com/wp-content/uploads';
const EXERCISE_IMAGES = {
    // ── PECHO ──
    "press_banca":             `${F}/2021/02/Barbell-Bench-Press.gif`,
    "press_inclinado":         `${F}/2021/02/Incline-Barbell-Bench-Press.gif`,
    "press_declinado":         `${F}/2021/02/Decline-Barbell-Bench-Press.gif`,
    "press_mancuernas":        `${F}/2021/02/Dumbbell-Bench-Press.gif`,
    "press_inclinado_mdb":     `${F}/2021/02/Incline-Dumbbell-Press.gif`,
    "aperturas":               `${F}/2021/02/Dumbbell-Flyes.gif`,
    "aperturas_inclinadas":    `${F}/2021/02/Incline-Dumbbell-Flyes.gif`,
    "aperturas_cable":         `${F}/2021/02/Cable-Crossover.gif`,
    "fondos":                  `${F}/2021/02/Chest-Dips.gif`,
    "push_up":                 `${F}/2021/02/Push-Up.gif`,
    "push_up_diamante":        `${F}/2021/06/Diamond-Push-Up.gif`,
    "push_up_ancho":           `${F}/2021/06/Wide-Push-Up.gif`,
    "pullover":                `${F}/2021/02/Dumbbell-Pullover.gif`,
    // ── ESPALDA ──
    "peso_muerto":             `${F}/2021/02/Barbell-Deadlift.gif`,
    "peso_muerto_rumano":      `${F}/2021/02/Romanian-Deadlift.gif`,
    "peso_muerto_sumo":        `${F}/2021/02/Sumo-Deadlift.gif`,
    "dominadas":               `${F}/2021/02/Pull-Up.gif`,
    "dominadas_supinas":       `${F}/2021/02/Chin-Up.gif`,
    "remo":                    `${F}/2021/02/Bent-Over-Barbell-Row.gif`,
    "remo_mancuerna":          `${F}/2021/02/Dumbbell-Row.gif`,
    "remo_sentado":            `${F}/2021/02/Seated-Cable-Rows.gif`,
    "remo_polea":              `${F}/2021/02/Cable-Row.gif`,
    "remo_tbar":               `${F}/2021/02/T-Bar-Row.gif`,
    "jalon":                   `${F}/2021/02/Lat-Pulldown.gif`,
    "jalon_neutro":            `${F}/2021/06/Neutral-Grip-Lat-Pulldown.gif`,
    "face_pull":               `${F}/2021/06/Face-Pull.gif`,
    "buenos_dias":             `${F}/2021/02/Good-Morning.gif`,
    "encogimientos":           `${F}/2021/02/Barbell-Shrug.gif`,
    "encogimientos_mdb":       `${F}/2021/02/Dumbbell-Shrug.gif`,
    "australian_row":          `${F}/2021/06/Australian-Pull-Up.gif`,
    // ── HOMBROS ──
    "press_hombros":           `${F}/2021/06/Dumbbell-Shoulder-Press.gif`,
    "press_militar":           `${F}/2021/02/Barbell-Overhead-Press.gif`,
    "press_arnold":            `${F}/2021/02/Arnold-Press.gif`,
    "elevaciones_laterales":   `${F}/2021/02/Lateral-Raise.gif`,
    "elevaciones_frontales":   `${F}/2021/02/Front-Raise.gif`,
    "vuelo_posterior":         `${F}/2021/06/Bent-Over-Dumbbell-Lateral-Raise.gif`,
    "press_sentado":           `${F}/2021/02/Seated-Dumbbell-Press.gif`,
    "elevacion_cable":         `${F}/2021/06/Cable-Lateral-Raise.gif`,
    // ── BÍCEPS ──
    "curls":                   `${F}/2021/02/Dumbbell-Curl.gif`,
    "curl_barra":              `${F}/2021/02/Barbell-Curl.gif`,
    "curl_martillo":           `${F}/2021/02/Dumbbell-Hammer-Curl.gif`,
    "curl_concentrado":        `${F}/2021/02/Concentration-Curl.gif`,
    "curl_predicador":         `${F}/2021/02/Preacher-Curl.gif`,
    "curl_cable":              `${F}/2021/06/Cable-Curl.gif`,
    "curl_inclinado":          `${F}/2021/02/Incline-Dumbbell-Curl.gif`,
    "curl_martillo_cable":     `${F}/2021/06/Cable-Hammer-Curl.gif`,
    // ── TRÍCEPS ──
    "extension_triceps":       `${F}/2021/06/Triceps-Pushdown.gif`,
    "triceps_frances":         `${F}/2021/02/EZ-Bar-Skull-Crusher.gif`,
    "patada_triceps":          `${F}/2021/02/Dumbbell-Kickback.gif`,
    "fondos_triceps":          `${F}/2021/02/Triceps-Dips.gif`,
    "extension_polea":         `${F}/2021/06/Overhead-Cable-Tricep-Extension.gif`,
    "press_cerrado":           `${F}/2021/02/Close-Grip-Barbell-Bench-Press.gif`,
    "extension_mancuerna":     `${F}/2021/02/Overhead-Dumbbell-Extension.gif`,
    // ── PIERNAS ──
    "sentadilla":              `${F}/2021/02/Barbell-Full-Squat.gif`,
    "sentadilla_goblet":       `${F}/2021/02/Goblet-Squat.gif`,
    "sentadilla_bulgara":      `${F}/2021/06/Bulgarian-Split-Squat.gif`,
    "sentadilla_hack":         `${F}/2021/02/Hack-Squat.gif`,
    "sentadilla_front":        `${F}/2021/02/Front-Squat.gif`,
    "zancadas":                `${F}/2021/02/Dumbbell-Lunges.gif`,
    "zancadas_caminando":      `${F}/2021/02/Walking-Lunges.gif`,
    "zancadas_inversas":       `${F}/2021/06/Reverse-Lunge.gif`,
    "prensa":                  `${F}/2021/02/Leg-Press.gif`,
    "extension_cuadriceps":    `${F}/2021/02/Leg-Extension.gif`,
    "curl_femoral":            `${F}/2021/02/Lying-Leg-Curl.gif`,
    "curl_sentado":            `${F}/2021/06/Seated-Leg-Curl.gif`,
    "hip_thrust":              `${F}/2021/02/Barbell-Hip-Thrust.gif`,
    "hip_thrust_mdb":          `${F}/2021/06/Dumbbell-Hip-Thrust.gif`,
    "gemelos":                 `${F}/2021/02/Standing-Calf-Raises.gif`,
    "gemelos_sentado":         `${F}/2021/02/Seated-Calf-Raise.gif`,
    "step_up":                 `${F}/2021/06/Step-Up.gif`,
    "pistol_squat":            `${F}/2021/06/Pistol-Squat.gif`,
    "good_morning":            `${F}/2021/02/Good-Morning.gif`,
    // ── CORE ──
    "pilates_core":            `${F}/2021/02/Plank.gif`,
    "plank_lateral":           `${F}/2021/02/Side-Plank.gif`,
    "abdominales":             `${F}/2021/02/Crunch.gif`,
    "crunch_cable":            `${F}/2021/06/Cable-Crunch.gif`,
    "russian_twist":           `${F}/2021/06/Russian-Twist.gif`,
    "leg_raise":               `${F}/2021/02/Lying-Leg-Raise.gif`,
    "leg_raise_colgado":       `${F}/2021/02/Hanging-Leg-Raise.gif`,
    "superman":                `${F}/2021/06/Superman.gif`,
    "mountain_climber":        `${F}/2021/06/Mountain-Climber.gif`,
    "dead_bug":                `${F}/2021/06/Dead-Bug.gif`,
    "rueda_abdominal":         `${F}/2021/02/Ab-Wheel-Rollout.gif`,
    "pallof_press":            `${F}/2021/06/Pallof-Press.gif`,
    "bird_dog":                `${F}/2021/06/Bird-Dog.gif`,
    // ── CALISTENIA ──
    "muscle_up":               `${F}/2021/06/Muscle-Up.gif`,
    "fondos_paralelas":        `${F}/2021/02/Parallel-Bar-Dip.gif`,
    "pike_push":               `${F}/2021/06/Pike-Push-Up.gif`,
    "archer_push":             `${F}/2021/06/Archer-Push-Up.gif`,
    "l_sit":                   `${F}/2021/06/L-Sit.gif`,
    "dragon_flag":             `${F}/2021/06/Dragon-Flag.gif`,
    "burpees":                 `${F}/2021/06/Burpee.gif`,
    "salto_caja":              `${F}/2021/06/Box-Jump.gif`,
    "salto_cuerda":            `${F}/2021/06/Jump-Rope.gif`,
    "sprint":                  `${F}/2021/06/High-Knees.gif`,
    // ── CARDIO / YOGA / FLEX ──
    "cardio_burn":             `${F}/2021/06/Jumping-Jacks.gif`,
    "yoga_stretch":            `${F}/2021/06/Cat-Stretch.gif`,
    "flex_stretch":            `${F}/2021/06/Single-Leg-Stretch.gif`,
    "yoga_warrior":            `${F}/2021/06/Warrior-Pose.gif`,
    "hip_flexor":              `${F}/2021/06/Hip-Flexor-Stretch.gif`,
    "foam_roller":             `${F}/2021/06/Foam-Rolling.gif`,
    "estiramiento_isquios":    `${F}/2021/06/Standing-Hamstring-Stretch.gif`,
    "estiramiento_cuadriceps": `${F}/2021/06/Standing-Quad-Stretch.gif`,
    "estiramiento_pecho":      `${F}/2021/06/Chest-Stretch.gif`,
    "default":                 `${F}/2021/02/Barbell-Bench-Press.gif`,
};

export default function ElitePlanScreen({ route, navigation }) {
    const { plan } = route.params;
    const [activeIndex, setActiveIndex] = useState(0);
    const [guardado, setGuardado] = useState(false);
    const [agendado, setAgendado] = useState(false);
    const [semanaActiva, setSemanaActiva] = useState(0); // para plan Ultimate

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
                                <Text style={{ color: '#63ff15', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>⏱ NUTRICIÓN TIMING</Text>
                                {[['🕐 Pre-Entreno', plan.resumen.nutricionTiming.preWorkout],
                                  ['🏋️ Post-Entreno', plan.resumen.nutricionTiming.postWorkout],
                                  ['🌙 Antes de Dormir', plan.resumen.nutricionTiming.antesDormir]
                                ].map(([label, val]) => val ? (
                                    <View key={label} style={{ marginBottom: 6 }}>
                                        <Text style={{ color: '#888', fontSize: 11, fontWeight: '700' }}>{label}</Text>
                                        <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 18 }}>{val}</Text>
                                    </View>
                                ) : null)}
                            </View>
                        )}

                        {/* Análisis de fuerza */}
                        {plan.analisis && (
                            <View style={[styles.summaryCard, { marginTop: 14, borderLeftColor: '#a855f7' }]}>
                                <Text style={{ color: '#a855f7', fontWeight: '800', fontSize: 11, letterSpacing: 1, marginBottom: 10 }}>🔬 ANÁLISIS PERSONALIZADO</Text>
                                <Text style={{ color: '#888', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>✅ PUNTOS FUERTES</Text>
                                {(plan.analisis.puntosFuertes || []).map((p, i) => (
                                    <Text key={i} style={{ color: '#ccc', fontSize: 13, marginBottom: 3 }}>• {p}</Text>
                                ))}
                                <Text style={{ color: '#888', fontSize: 11, fontWeight: '700', marginTop: 8, marginBottom: 4 }}>⚠️ A MEJORAR</Text>
                                {(plan.analisis.puntosMejora || []).map((p, i) => (
                                    <Text key={i} style={{ color: '#ccc', fontSize: 13, marginBottom: 3 }}>• {p}</Text>
                                ))}
                                <Text style={{ color: '#888', fontSize: 11, fontWeight: '700', marginTop: 8, marginBottom: 4 }}>🎯 AJUSTES APLICADOS</Text>
                                <Text style={{ color: '#ccc', fontSize: 13, lineHeight: 18 }}>{plan.analisis.ajustes}</Text>
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
                                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>SEM {s.semana}</Text>
                                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700' }}>{s.tipo}</Text>
                                          </LinearGradient>
                                        : <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#2a2a2a' }}>
                                            <Text style={{ color: '#555', fontWeight: '700', fontSize: 12 }}>SEM {s.semana}</Text>
                                            <Text style={{ color: '#444', fontSize: 10 }}>{s.tipo}</Text>
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
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800' }}>RPE</Text>
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
                                    <Text style={{ color: '#63ff15', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>🔥 CALENTAMIENTO</Text>
                                    {dia.calentamiento.map((c, ci) => (
                                        <Text key={ci} style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>• {c}</Text>
                                    ))}
                                </View>
                            )}

                            {/* Ejercicios — grid 2 columnas */}
                            <View style={styles.exGrid}>
                                {(dia.ejercicios || []).map((ex, ei) => (
                                    <View key={ei} style={styles.exGridCard}>
                                        <Image
                                            source={{ uri: EXERCISE_IMAGES[ex.imgKey] || EXERCISE_IMAGES.default }}
                                            style={styles.exGridImage}
                                            resizeMode="cover"
                                        />
                                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.97)']} style={styles.exGridOverlay}>
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
                                                <Text style={{ color: '#a855f7', fontSize: 10, fontWeight: '800', marginTop: 3 }}>{ex.pesoSugerido}</Text>
                                            )}
                                            {ex.tecnica && <Text style={{ color: '#f59e0b', fontSize: 10, marginTop: 3 }}>⚡ {ex.tecnica}</Text>}
                                        </LinearGradient>
                                    </View>
                                ))}
                            </View>

                            {/* Vuelta a la calma */}
                            {dia.vueltaCalma?.length > 0 && (
                                <View style={{ backgroundColor: '#0d0d1f', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.15)' }}>
                                    <Text style={{ color: '#a855f7', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 }}>🧘 VUELTA A LA CALMA</Text>
                                    {dia.vueltaCalma.map((c, ci) => (
                                        <Text key={ci} style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>• {c}</Text>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}

                    {/* Suplementación */}
                    {plan.suplementacion?.length > 0 && (
                        <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
                            <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 }}>💊 SUPLEMENTACIÓN RECOMENDADA</Text>
                            {plan.suplementacion.map((s, i) => (
                                <View key={i} style={{ backgroundColor: '#111', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FFD70020' }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{s.nombre}</Text>
                                        <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>{s.dosis}</Text>
                                    </View>
                                    <Text style={{ color: '#63ff15', fontSize: 11, marginBottom: 2 }}>⏰ {s.timing}</Text>
                                    <Text style={{ color: '#666', fontSize: 11, fontStyle: 'italic' }}>{s.motivo}</Text>
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
                        <View style={styles.exGrid}>
                            {item.ejercicios.map((ex, idx) => (
                                <View key={idx} style={styles.exGridCard}>
                                    <Image
                                        source={{ uri: EXERCISE_IMAGES[ex.imgKey] || EXERCISE_IMAGES.default }}
                                        style={styles.exGridImage}
                                        resizeMode="cover"
                                    />
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.97)']}
                                        style={styles.exGridOverlay}
                                    >
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
                                            <Text style={{ color: '#a855f7', fontSize: 10, fontWeight: '800', marginTop: 3 }}>{ex.pesoSugerido}</Text>
                                        )}
                                    </LinearGradient>
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
    macroKey: { color: '#666', fontSize: 10, fontWeight: 'bold', marginTop: 5 },
    startBtn: { marginTop: 'auto', backgroundColor: '#63ff15', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    startBtnText: { color: 'black', fontWeight: '900', fontSize: 14 },
    dayBanner: { backgroundColor: '#111', padding: 20, borderRadius: 20, borderLeftWidth: 5, borderLeftColor: '#63ff15', marginBottom: 20 },
    dayNumber: { color: '#63ff15', fontSize: 12, fontWeight: '900' },
    dayTitle: { color: 'white', fontSize: 22, fontWeight: '800', marginTop: 5 },
    exerciseScroll: { flex: 1 },
    exGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    exGridCard: { width: '48%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#161616' },
    exGridImage: { width: '100%', height: 130, backgroundColor: '#111' },
    exGridOverlay: { padding: 10, paddingTop: 6 },
    exGridName: { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 16, marginBottom: 5 },
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
    exBadgeGreenText: { color: '#63ff15', fontSize: 12, fontWeight: '900' },
    exBadgeGold: { backgroundColor: 'rgba(255,215,0,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255,215,0,0.35)' },
    exBadgeGoldText: { color: '#FFD700', fontSize: 12, fontWeight: '800' },
    exBadgePurple: { backgroundColor: 'rgba(168,85,247,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)' },
    exBadgePurpleText: { color: '#a855f7', fontSize: 12, fontWeight: '800' },
    exNota: { color: '#666', fontSize: 11, fontStyle: 'italic', marginTop: 5 },
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
