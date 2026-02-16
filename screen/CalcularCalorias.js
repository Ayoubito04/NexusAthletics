import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function CalcularCalorias({ route }) {
    const navigation = useNavigation();
    const [cargando, setCargando] = useState(true);
    const { actividad } = route.params;

    useEffect(() => {
        // Simulamos una carga pequeña para que la transición sea suave
        const timer = setTimeout(() => {
            setCargando(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    if (!actividad) {
        return (
            <View style={styles.center}>
                <Text style={{ color: 'white' }}>No se encontró la actividad.</Text>
            </View>
        );
    }

    if (cargando) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#63ff15" />
                <Text style={styles.loadingText}>Calculando balance energético...</Text>
            </View>
        );
    }

    // Tu función renderItem mejorada con estilo y el 'return' que faltaba
    const renderItem = () => (
        <View style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="flame" size={40} color="#63ff15" />
                <Text style={styles.title}>Resumen Energético</Text>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>CALORÍAS</Text>
                    <Text style={styles.statValue}>{actividad} kcal</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>ESFUERZO</Text>
                    <Text style={styles.statValue}>Alto</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.backButtonText}>VOLVER AL HISTORIAL</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
        <FlatList
            data={actividad}
            renderItem={renderItem}
            keyExtractor={item=>item.id.toString()}
        />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'center',
        padding: 20
    },
    center: {
        flex: 1,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        color: '#63ff15',
        marginTop: 15,
        fontSize: 16,
        fontWeight: 'bold'
    },
    card: {
        backgroundColor: '#1e1e1e',
        borderRadius: 25,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.3)',
        alignItems: 'center'
    },
    header: {
        alignItems: 'center',
        marginBottom: 30
    },
    title: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 10
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 40
    },
    statBox: {
        alignItems: 'center'
    },
    statLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5
    },
    statValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold'
    },
    backButton: {
        backgroundColor: '#63ff15',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 15,
        width: '100%',
        alignItems: 'center'
    },
    backButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 16
    }
});
