import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = Config.BACKEND_URL;

export default function Achievements() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalKm: 0, totalKcal: 0, count: 0 });

    const ACHIEVEMENTS_DATA = [
        { id: 1, title: 'Iniciado', desc: 'Completa tu primera actividad.', req: (s) => s.count >= 1, icon: 'flag' },
        { id: 2, title: 'Atleta de Hierro', desc: 'Recorre más de 50km totales.', req: (s) => s.totalKm >= 50, icon: 'barbell' },
        { id: 3, title: 'Antorcha Humana', desc: 'Quema más de 5000 kcal.', req: (s) => s.totalKcal >= 5000, icon: 'flame' },
        { id: 4, title: 'Explorador Elite', desc: 'Realiza 10 actividades GPS.', req: (s) => s.count >= 10, icon: 'map' },
        { id: 5, title: 'Influencer Fitness', desc: 'Invita a 3 amigos con éxito.', req: (s) => false, icon: 'people' }, // Requiere check extra
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/activities/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setStats(await response.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderMedal = ({ item }) => {
        const unlocked = item.req(stats);
        return (
            <View style={[styles.medalCard, !unlocked && styles.medalLocked]}>
                <View style={[styles.iconCircle, { backgroundColor: unlocked ? '#ffd70030' : '#222' }]}>
                    <Ionicons name={item.icon} size={30} color={unlocked ? '#ffd700' : '#444'} />
                </View>
                <View style={styles.medalInfo}>
                    <Text style={[styles.medalTitle, !unlocked && styles.textLocked]}>{item.title}</Text>
                    <Text style={styles.medalDesc}>{item.desc}</Text>
                </View>
                {unlocked ? (
                    <Ionicons name="checkmark-circle" size={24} color="#63ff15" />
                ) : (
                    <Ionicons name="lock-closed" size={20} color="#444" />
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sala de <Text style={{ color: '#ffd700' }}>Trofeos</Text></Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#ffd700" style={{ marginTop: 100 }} />
            ) : (
                <FlatList
                    data={ACHIEVEMENTS_DATA}
                    renderItem={renderMedal}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={() => (
                        <View style={styles.summary}>
                            <Text style={styles.summaryText}>Has desbloqueado {ACHIEVEMENTS_DATA.filter(a => a.req(stats)).length} de {ACHIEVEMENTS_DATA.length} logros.</Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${(ACHIEVEMENTS_DATA.filter(a => a.req(stats)).length / ACHIEVEMENTS_DATA.length) * 100}%` }]} />
                            </View>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    list: { padding: 20 },
    summary: { marginBottom: 30, backgroundColor: '#111', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#222' },
    summaryText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    progressBar: { width: '100%', height: 8, backgroundColor: '#222', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#ffd700' },
    medalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
    medalLocked: { opacity: 0.6 },
    iconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    medalInfo: { flex: 1 },
    medalTitle: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    textLocked: { color: '#666' },
    medalDesc: { color: '#666', fontSize: 12, marginTop: 4 }
});
