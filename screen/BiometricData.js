import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = Config.BACKEND_URL;

export default function BiometricData() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        peso: '',
        altura: '',
        edad: '',
        genero: 'Hombre',
        objetivo: 'Ganar músculo',
        nivelActividad: 'Moderado'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const user = await response.json();
                setForm({
                    peso: user.peso?.toString() || '',
                    altura: user.altura?.toString() || '',
                    edad: user.edad?.toString() || '',
                    genero: user.genero || 'Hombre',
                    objetivo: user.objetivo || 'Ganar músculo',
                    nivelActividad: user.nivelActividad || 'Moderado'
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.peso || !form.altura || !form.edad) {
            Alert.alert("Campos incompletos", "Por favor rellena peso, altura y edad.");
            return;
        }

        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/user/biometrics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });

            if (response.ok) {
                const data = await response.json();
                await AsyncStorage.setItem('user', JSON.stringify(data.user));
                Alert.alert("Éxito", "Tus datos han sido actualizados. Nexus AI ahora te conoce mejor.");
                navigation.goBack();
            } else {
                throw new Error("Error al guardar");
            }
        } catch (error) {
            Alert.alert("Error", "No se pudieron guardar los datos.");
        } finally {
            setSaving(false);
        }
    };

    const SelectBtn = ({ label, value, current, onSelect }) => (
        <TouchableOpacity
            style={[styles.selectorBtn, current === value && styles.selectorBtnActive]}
            onPress={() => onSelect(value)}
        >
            <Text style={[styles.selectorText, current === value && styles.selectorTextActive]}>{label}</Text>
        </TouchableOpacity>
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
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Perfil Biométrico</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle-outline" size={24} color="#63ff15" />
                        <Text style={styles.infoText}>Estos datos permiten a Nexus AI calcular tu metabolismo y optimizar tus rutinas.</Text>
                    </View>

                    <Text style={styles.label}>Medidas Corporales</Text>
                    <View style={styles.row}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.subLabel}>Peso (kg)</Text>
                            <TextInput
                                style={styles.input}
                                value={form.peso}
                                onChangeText={(val) => setForm({ ...form, peso: val })}
                                keyboardType="numeric"
                                placeholder="75"
                                placeholderTextColor="#444"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.subLabel}>Altura (cm)</Text>
                            <TextInput
                                style={styles.input}
                                value={form.altura}
                                onChangeText={(val) => setForm({ ...form, altura: val })}
                                keyboardType="numeric"
                                placeholder="175"
                                placeholderTextColor="#444"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.subLabel}>Edad</Text>
                            <TextInput
                                style={styles.input}
                                value={form.edad}
                                onChangeText={(val) => setForm({ ...form, edad: val })}
                                keyboardType="numeric"
                                placeholder="25"
                                placeholderTextColor="#444"
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Género</Text>
                    <View style={styles.selectorRow}>
                        <SelectBtn label="Hombre" value="Hombre" current={form.genero} onSelect={(v) => setForm({ ...form, genero: v })} />
                        <SelectBtn label="Mujer" value="Mujer" current={form.genero} onSelect={(v) => setForm({ ...form, genero: v })} />
                        <SelectBtn label="Otro" value="Otro" current={form.genero} onSelect={(v) => setForm({ ...form, genero: v })} />
                    </View>

                    <Text style={styles.label}>Objetivo Principal</Text>
                    <View style={styles.selectorWrap}>
                        {['Ganar músculo', 'Pérdida de Grasa', 'Tonificar', 'Rendimiento', 'Pilates / Yoga', 'Flexibilidad'].map(obj => (
                            <SelectBtn key={obj} label={obj} value={obj} current={form.objetivo} onSelect={(v) => setForm({ ...form, objetivo: v })} />
                        ))}
                    </View>

                    <Text style={styles.label}>Nivel de Actividad Diaria</Text>
                    <View style={styles.selectorWrap}>
                        {['Sedentario', 'Ligero', 'Moderado', 'Muy Activo'].map(lvl => (
                            <SelectBtn key={lvl} label={lvl} value={lvl} current={form.nivelActividad} onSelect={(v) => setForm({ ...form, nivelActividad: v })} />
                        ))}
                    </View>

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                        {saving ? (
                            <ActivityIndicator color="black" />
                        ) : (
                            <>
                                <Text style={styles.saveBtnText}>ACTUALIZAR PERFIL</Text>
                                <Ionicons name="shield-checkmark" size={20} color="black" />
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
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
    infoCard: { backgroundColor: '#111', padding: 15, borderRadius: 15, flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#222' },
    infoText: { color: '#888', flex: 1, fontSize: 13, lineHeight: 18 },
    label: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
    subLabel: { color: '#666', fontSize: 12, marginBottom: 5 },
    row: { flexDirection: 'row', gap: 15, marginBottom: 25 },
    inputGroup: { flex: 1 },
    input: { backgroundColor: '#161616', borderRadius: 12, padding: 15, color: 'white', fontSize: 16, borderWidth: 1, borderColor: '#333' },
    selectorRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    selectorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
    selectorBtn: { backgroundColor: '#111', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#222' },
    selectorBtnActive: { backgroundColor: '#63ff15', borderColor: '#63ff15' },
    selectorText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
    selectorTextActive: { color: 'black' },
    saveBtn: { backgroundColor: '#63ff15', padding: 18, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10, shadowColor: '#63ff15', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    saveBtnText: { color: 'black', fontWeight: '900', fontSize: 16 }
});
