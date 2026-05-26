import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Alert, ActivityIndicator, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

const MacroBadge = ({ label, value, color }) => (
    <View style={[styles.macroBadge, { borderColor: color + '40', backgroundColor: color + '18' }]}>
        <Text style={[styles.macroVal, { color }]}>{value}</Text>
        <Text style={styles.macroLbl}>{label}</Text>
    </View>
);

const MealRow = ({ meal }) => (
    <View style={styles.mealRow}>
        <View style={styles.mealHeader}>
            <Ionicons name="restaurant-outline" size={13} color="#63ff15" />
            <Text style={styles.mealType}>{meal.tipo}</Text>
        </View>
        <Text style={styles.mealPlato}>{meal.plato}</Text>
        <View style={styles.macrosRow}>
            <MacroBadge label="kcal" value={meal.calorias} color="#63ff15" />
            <MacroBadge label="P" value={`${meal.proteinas}g`} color="#3b82f6" />
            <MacroBadge label="C" value={`${meal.carbohidratos}g`} color="#f59e0b" />
            <MacroBadge label="G" value={`${meal.grasas}g`} color="#ec4899" />
        </View>
    </View>
);

const PlanDetailModal = ({ plan, visible, onClose, theme }) => {
    const [expandedDay, setExpandedDay] = useState(null);

    if (!plan) return null;
    const dias = plan.planData?.dias || [];

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                        <View>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Plan Nutricional</Text>
                            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                                {plan.objetivo || 'Sin objetivo'} · {plan.calorias || '—'} kcal
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={theme.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                        {dias.map((dia, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.dayCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                onPress={() => setExpandedDay(expandedDay === i ? null : i)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.dayRow}>
                                    <Text style={[styles.dayName, { color: theme.primary }]}>{dia.nombre}</Text>
                                    <Ionicons
                                        name={expandedDay === i ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color={theme.textSecondary}
                                    />
                                </View>
                                {expandedDay === i && dia.comidas?.map((c, j) => <MealRow key={j} meal={c} />)}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

export default function SavedNutritionPlans({ navigation }) {
    const { theme } = useTheme();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/nutrition-plans`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setPlans(Array.isArray(data) ? data : []);
        } catch (e) {
            setPlans([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const handleDelete = (id) => {
        Alert.alert('Eliminar plan', '¿Seguro que quieres eliminar este plan?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('token');
                        await fetch(`${BACKEND_URL}/nutrition-plans/${id}`, {
                            method: 'DELETE',
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        setPlans(prev => prev.filter(p => p.id !== id));
                    } catch { }
                }
            }
        ]);
    };

    const renderItem = ({ item }) => {
        const dias = item.planData?.dias?.length || 0;
        const dateStr = new Date(item.createdAt).toLocaleDateString('es-ES', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => setSelectedPlan(item)}
                activeOpacity={0.85}
            >
                <View style={styles.cardLeft}>
                    <View style={[styles.iconBox, { backgroundColor: theme.primary + '20' }]}>
                        <Ionicons name="nutrition-outline" size={22} color={theme.primary} />
                    </View>
                    <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>
                            {item.objetivo || 'Plan nutricional'}
                        </Text>
                        <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                            {item.calorias ? `${item.calorias} kcal/día · ` : ''}{dias} días · {dateStr}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>NUTRICIÓN VAULT</Text>
                <TouchableOpacity onPress={fetchPlans} style={styles.refreshBtn}>
                    <Ionicons name="refresh-outline" size={20} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : plans.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="nutrition-outline" size={56} color={theme.textMuted || '#555'} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin planes guardados</Text>
                    <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                        Genera un plan nutricional con IA y guárdalo aquí
                    </Text>
                    <TouchableOpacity
                        style={[styles.ctaBtn, { backgroundColor: theme.primary }]}
                        onPress={() => navigation.navigate('NutritionPlan')}
                    >
                        <Text style={styles.ctaBtnText}>GENERAR PLAN</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={plans}
                    keyExtractor={item => String(item.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    showsVerticalScrollIndicator={false}
                    style={{ backgroundColor: theme.background }}
                />
            )}

            <PlanDetailModal
                plan={selectedPlan}
                visible={!!selectedPlan}
                onClose={() => setSelectedPlan(null)}
                theme={theme}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
    },
    backBtn: { padding: 4 },
    refreshBtn: { padding: 4 },
    headerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 6 },
    emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    ctaBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
    ctaBtnText: { color: '#000', fontWeight: '800', letterSpacing: 1.5 },
    card: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 14, padding: 14, borderWidth: 1,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
    cardSub: { fontSize: 12 },
    deleteBtn: { padding: 8 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    modalContent: { flex: 1, marginTop: 48, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 18, borderBottomWidth: 1,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', letterSpacing: 1 },
    modalSub: { fontSize: 12, marginTop: 2 },
    closeBtn: { padding: 6 },
    dayCard: { borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1 },
    dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dayName: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
    mealRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    mealHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
    mealType: { fontSize: 11, color: '#63ff15', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    mealPlato: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 8 },
    macrosRow: { flexDirection: 'row', gap: 6 },
    macroBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' },
    macroVal: { fontSize: 12, fontWeight: '700' },
    macroLbl: { fontSize: 9, color: '#888', letterSpacing: 0.5 },
});
