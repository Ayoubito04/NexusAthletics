import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

export default function SavedElitePlans({ navigation }) {
    const [planes, setPlanes] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        loadSavedPlans();
    }, []);

    const loadSavedPlans = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/saved-plans`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error en el servidor');
            const data = await response.json();
            setPlanes(data);
        } catch (error) {
            console.error("Error loading plans:", error);
        } finally {
            setCargando(false);
        }
    };

    const deletePlan = async (id) => {
        // Implementar borrado si se desea, por ahora solo listar
    };

    const renderPlanItem = ({ item }) => {
        const plan = item.planData;
        return (
            <TouchableOpacity
                style={styles.planCard}
                onPress={() => navigation.navigate('ElitePlanScreen', { plan: plan })}
            >
                <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.cardInfo}>
                    <View style={styles.iconBox}>
                        <Ionicons name="sparkles" size={24} color="#63ff15" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.planTitle}>{plan.resumen.objetivo}</Text>
                        <Text style={styles.planDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#63ff15" />
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>NEXUS <Text style={{ color: '#63ff15' }}>VAULT</Text></Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.introBox}>
                <Text style={styles.introTitle}>Tus Planes Élite</Text>
                <Text style={styles.introSub}>Aquí se guardan todas las presentaciones interactivas generadas por Nexus AI para ti.</Text>
            </View>

            {cargando ? (
                <ActivityIndicator size="large" color="#63ff15" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={planes}
                    renderItem={renderPlanItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="folder-open-outline" size={60} color="#333" />
                            <Text style={styles.emptyText}>Aún no has guardado ningún plan.</Text>
                            <TouchableOpacity
                                style={styles.emptyBtn}
                                onPress={() => navigation.navigate('EntrenadorIA')}
                            >
                                <Text style={styles.emptyBtnText}>Generar mi primer plan</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 2,
    },
    introBox: {
        paddingHorizontal: 25,
        marginTop: 20,
        marginBottom: 30,
    },
    introTitle: {
        color: 'white',
        fontSize: 28,
        fontWeight: '800',
    },
    introSub: {
        color: '#666',
        fontSize: 14,
        marginTop: 8,
        lineHeight: 20,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    planCard: {
        marginBottom: 15,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#222',
        elevation: 5,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: '#333',
    },
    planTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    planDate: {
        color: '#63ff15',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },
    emptyBox: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyText: {
        color: '#444',
        fontSize: 16,
        marginTop: 15,
        textAlign: 'center',
    },
    emptyBtn: {
        marginTop: 25,
        paddingHorizontal: 25,
        paddingVertical: 12,
        backgroundColor: '#63ff15',
        borderRadius: 12,
    },
    emptyBtnText: {
        color: 'black',
        fontWeight: 'bold',
    }
});
