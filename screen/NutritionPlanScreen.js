import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Animated, Easing, Dimensions, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;
const { width } = Dimensions.get('window');

const OBJETIVOS = [
    { id: 'Volumen', label: 'Volumen', icon: 'barbell-outline', desc: 'Ganar masa muscular' },
    { id: 'Definición', label: 'Definición', icon: 'flame-outline', desc: 'Perder grasa' },
    { id: 'Mantenimiento', label: 'Mantenimiento', icon: 'fitness-outline', desc: 'Mantener peso' },
];

const RESTRICCIONES = [
    { id: 'Ninguna', label: 'Ninguna' },
    { id: 'Vegetariano', label: 'Vegetariano' },
    { id: 'Vegano', label: 'Vegano' },
    { id: 'Sin gluten', label: 'Sin gluten' },
];

const COMIDAS = [3, 4, 5];

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const MACRO_COLORS = { proteinas: '#63ff15', carbohidratos: '#00D1FF', grasas: '#FFD700' };

export default function NutritionPlanScreen({ navigation }) {
    const { theme } = useTheme();
    const [objetivo, setObjetivo] = useState('Volumen');
    const [calorias, setCalorias] = useState('2200');
    const [restriccion, setRestriccion] = useState('Ninguna');
    const [numComidas, setNumComidas] = useState(4);
    const [loading, setLoading] = useState(false);
    const [plan, setPlan] = useState(null);
    const [expandedDay, setExpandedDay] = useState(0);
    const [saved, setSaved] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        AsyncStorage.getItem('nutritionPlan').then(data => {
            if (data) setPlan(JSON.parse(data));
        }).catch(() => {});
    }, []);

    useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }
    }, [loading]);

    useEffect(() => {
        if (plan) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }
    }, [plan]);

    const generatePlan = async () => {
        setLoading(true);
        setPlan(null);
        setSaved(false);
        fadeAnim.setValue(0);
        try {
            const token = await AsyncStorage.getItem('token');
            const prompt = `Eres un nutricionista deportivo experto. Genera un plan de alimentación semanal COMPLETO y DETALLADO. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin explicaciones.

Formato exacto requerido:
{"dias":[{"nombre":"Lunes","totalCalorias":2200,"totalProteinas":165,"totalCarbohidratos":220,"totalGrasas":73,"comidas":[{"tipo":"Desayuno","plato":"Nombre del plato","ingredientes":"ingrediente1, ingrediente2, ingrediente3","calorias":550,"proteinas":40,"carbohidratos":55,"grasas":18}]}]}

Parámetros del usuario:
- Objetivo: ${objetivo}
- Calorías diarias objetivo: ${calorias} kcal
- Restricción alimentaria: ${restriccion}
- Número de comidas al día: ${numComidas}

Genera los 7 días (Lunes a Domingo). Cada día debe tener exactamente ${numComidas} comidas. Los platos deben ser variados, realistas y deliciosos. Los macros deben estar correctamente calculados y sumar aproximadamente ${calorias} kcal por día.`;

            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: prompt }),
            });

            if (!response.ok) throw new Error('Error de red');
            const data = await response.json();
            const raw = data.reply || data.message || '';

            // Extract JSON from response
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON en respuesta');
            const parsed = JSON.parse(jsonMatch[0]);
            if (!parsed.dias || !Array.isArray(parsed.dias)) throw new Error('Formato inválido');

            setPlan(parsed);
        } catch (e) {
            alert('Error generando el plan. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const savePlan = async () => {
        if (!plan) return;
        await AsyncStorage.setItem('nutritionPlan', JSON.stringify(plan));
        setSaved(true);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={theme.text} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>NUTRICIÓN IA</Text>
                    <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Plan semanal personalizado</Text>
                </View>
                <MaterialCommunityIcons name="food-apple-outline" size={26} color="#63ff15" />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {/* Config section */}
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>Configura tu plan</Text>

                    {/* Objetivo */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Objetivo</Text>
                    <View style={styles.optionRow}>
                        {OBJETIVOS.map(o => (
                            <TouchableOpacity
                                key={o.id}
                                style={[styles.optionChip, objetivo === o.id && styles.optionChipActive, { backgroundColor: theme.surfaceSecondary }]}
                                onPress={() => setObjetivo(o.id)}
                            >
                                <Ionicons name={o.icon} size={16} color={objetivo === o.id ? '#63ff15' : theme.textSecondary} />
                                <Text style={[styles.optionText, { color: objetivo === o.id ? '#63ff15' : theme.textSecondary }]}>{o.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Calorías */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Calorías diarias objetivo</Text>
                    <View style={[styles.inputRow, { backgroundColor: theme.inputBg }]}>
                        <Ionicons name="flame-outline" size={18} color="#63ff15" />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            value={calorias}
                            onChangeText={v => setCalorias(v.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            placeholder="2200"
                            placeholderTextColor={theme.textMuted}
                            maxLength={5}
                        />
                        <Text style={[styles.inputSuffix, { color: theme.textMuted }]}>kcal</Text>
                    </View>

                    {/* Restricción */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Restricción alimentaria</Text>
                    <View style={styles.optionRow}>
                        {RESTRICCIONES.map(r => (
                            <TouchableOpacity
                                key={r.id}
                                style={[styles.optionChip, restriccion === r.id && styles.optionChipActive, { backgroundColor: theme.surfaceSecondary }]}
                                onPress={() => setRestriccion(r.id)}
                            >
                                <Text style={[styles.optionText, { color: restriccion === r.id ? '#63ff15' : theme.textSecondary }]}>{r.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Num comidas */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Comidas al día</Text>
                    <View style={styles.optionRow}>
                        {COMIDAS.map(n => (
                            <TouchableOpacity
                                key={n}
                                style={[styles.optionChip, numComidas === n && styles.optionChipActive, { backgroundColor: theme.surfaceSecondary }]}
                                onPress={() => setNumComidas(n)}
                            >
                                <Text style={[styles.optionText, { color: numComidas === n ? '#63ff15' : theme.textSecondary }]}>{n} comidas</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Generate button */}
                    <TouchableOpacity onPress={generatePlan} disabled={loading} style={{ marginTop: 16 }}>
                        <LinearGradient
                            colors={['#63ff15', '#4dd10e']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.generateBtn}
                        >
                            {loading
                                ? <ActivityIndicator color="#000" />
                                : <>
                                    <Ionicons name="sparkles" size={18} color="#000" />
                                    <Text style={styles.generateBtnText}>GENERAR PLAN</Text>
                                </>
                            }
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Loading state */}
                {loading && (
                    <View style={[styles.loadingCard, { backgroundColor: theme.surface }]}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <MaterialCommunityIcons name="food-fork-drink" size={44} color="#63ff15" />
                        </Animated.View>
                        <Text style={[styles.loadingTitle, { color: theme.text }]}>CREANDO TU PLAN</Text>
                        <Text style={[styles.loadingDesc, { color: theme.textSecondary }]}>La IA está diseñando tu menú semanal personalizado...</Text>
                    </View>
                )}

                {/* Plan result */}
                {plan && !loading && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {/* Summary macros */}
                        {plan.dias[0] && (
                            <View style={[styles.macroSummary, { backgroundColor: theme.surface }]}>
                                <Text style={[styles.cardTitle, { color: theme.text }]}>Macros diarios estimados</Text>
                                <View style={styles.macroRow}>
                                    <MacroBadge label="Proteínas" value={plan.dias[0].totalProteinas} unit="g" color={MACRO_COLORS.proteinas} />
                                    <MacroBadge label="Carbos" value={plan.dias[0].totalCarbohidratos} unit="g" color={MACRO_COLORS.carbohidratos} />
                                    <MacroBadge label="Grasas" value={plan.dias[0].totalGrasas} unit="g" color={MACRO_COLORS.grasas} />
                                    <MacroBadge label="Calorías" value={plan.dias[0].totalCalorias} unit="kcal" color="#FF6B6B" />
                                </View>
                            </View>
                        )}

                        {/* Day cards */}
                        {plan.dias.map((dia, idx) => (
                            <DayCard
                                key={idx}
                                dia={dia}
                                expanded={expandedDay === idx}
                                onToggle={() => setExpandedDay(expandedDay === idx ? -1 : idx)}
                                theme={theme}
                            />
                        ))}

                        {/* Save button */}
                        <TouchableOpacity onPress={savePlan} style={{ marginBottom: 32 }}>
                            <LinearGradient
                                colors={saved ? ['#1a2e10', '#1a2e10'] : ['#63ff15', '#4dd10e']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.generateBtn}
                            >
                                <Ionicons name={saved ? 'checkmark-circle' : 'bookmark-outline'} size={18} color={saved ? '#63ff15' : '#000'} />
                                <Text style={[styles.generateBtnText, { color: saved ? '#63ff15' : '#000' }]}>
                                    {saved ? 'PLAN GUARDADO' : 'GUARDAR PLAN'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function MacroBadge({ label, value, unit, color }) {
    return (
        <View style={styles.macroBadge}>
            <Text style={[styles.macroValue, { color }]}>{value}<Text style={styles.macroUnit}>{unit}</Text></Text>
            <Text style={styles.macroLabel}>{label}</Text>
        </View>
    );
}

function DayCard({ dia, expanded, onToggle, theme }) {
    return (
        <View style={[styles.dayCard, { backgroundColor: theme.surface }]}>
            <TouchableOpacity style={styles.dayHeader} onPress={onToggle} activeOpacity={0.8}>
                <View style={styles.dayHeaderLeft}>
                    <View style={styles.dayDot} />
                    <Text style={[styles.dayName, { color: theme.text }]}>{dia.nombre}</Text>
                </View>
                <View style={styles.dayHeaderRight}>
                    <Text style={styles.dayCals}>{dia.totalCalorias} kcal</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
                </View>
            </TouchableOpacity>

            {expanded && dia.comidas && dia.comidas.map((comida, i) => (
                <View key={i} style={[styles.mealRow, { borderTopColor: theme.border }]}>
                    <View style={styles.mealTypeTag}>
                        <Text style={styles.mealTypeText}>{comida.tipo}</Text>
                    </View>
                    <Text style={[styles.mealName, { color: theme.text }]}>{comida.plato}</Text>
                    {comida.ingredientes ? (
                        <Text style={[styles.mealIngredients, { color: theme.textMuted }]}>{comida.ingredientes}</Text>
                    ) : null}
                    <View style={styles.mealMacros}>
                        <Text style={[styles.mealMacro, { color: MACRO_COLORS.proteinas }]}>{comida.proteinas}g P</Text>
                        <Text style={[styles.mealMacro, { color: MACRO_COLORS.carbohidratos }]}>{comida.carbohidratos}g C</Text>
                        <Text style={[styles.mealMacro, { color: MACRO_COLORS.grasas }]}>{comida.grasas}g G</Text>
                        <Text style={[styles.mealMacro, { color: '#FF6B6B' }]}>{comida.calorias} kcal</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 2 },
    headerSub: { fontSize: 12, marginTop: 2 },
    scroll: { paddingHorizontal: 16, paddingBottom: 120 },

    card: { borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(99,255,21,0.1)' },
    cardTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1, marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },

    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    optionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
    optionChipActive: { borderColor: '#63ff15' },
    optionText: { fontSize: 13, fontWeight: '600' },

    inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    input: { flex: 1, fontSize: 15, fontWeight: '600' },
    inputSuffix: { fontSize: 13 },

    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
    generateBtnText: { color: '#000', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

    loadingCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(99,255,21,0.15)' },
    loadingTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 2 },
    loadingDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

    macroSummary: { borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(99,255,21,0.1)' },
    macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
    macroBadge: { alignItems: 'center', flex: 1 },
    macroValue: { fontSize: 18, fontWeight: '800' },
    macroUnit: { fontSize: 11, fontWeight: '400' },
    macroLabel: { color: '#888', fontSize: 11, marginTop: 2 },

    dayCard: { borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#63ff15' },
    dayName: { fontSize: 15, fontWeight: '700' },
    dayHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dayCals: { color: '#63ff15', fontSize: 13, fontWeight: '600' },

    mealRow: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
    mealTypeTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(99,255,21,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
    mealTypeText: { color: '#63ff15', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    mealName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    mealIngredients: { fontSize: 12, marginBottom: 8, lineHeight: 18 },
    mealMacros: { flexDirection: 'row', gap: 12 },
    mealMacro: { fontSize: 11, fontWeight: '700' },
});
