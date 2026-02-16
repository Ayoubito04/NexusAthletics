import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function IGCResult() {
    const navigation = useNavigation();
    const route = useRoute();
    const { nombreUsuario, edad, peso, altura, sexo } = route.params;

    // Fórmula del IGC (Deurenberg)
    // IGC = 1.2 * (IMC) + 0.23 * edad - 10.8 * sexo - 5.4
    // sexo: 1 para hombres, 0 para mujeres.
    const imc = peso / ((altura / 100) ** 2);
    const igc = (1.2 * imc) + (0.23 * edad) - (10.8 * sexo) - 5.4;

    const getCategoria = (val) => {
        if (sexo === 1) { // Hombres
            if (val < 6) return { label: 'Atleta', color: '#63ff15' };
            if (val < 14) return { label: 'Fitness', color: '#0ce810' };
            if (val < 18) return { label: 'Normal', color: '#ffd700' };
            if (val < 25) return { label: 'Sobrepeso', color: '#ff8c00' };
            return { label: 'Obeso', color: '#ff4d4d' };
        } else { // Mujeres
            if (val < 14) return { label: 'Atleta', color: '#63ff15' };
            if (val < 21) return { label: 'Fitness', color: '#0ce810' };
            if (val < 25) return { label: 'Normal', color: '#ffd700' };
            if (val < 32) return { label: 'Sobrepeso', color: '#ff8c00' };
            return { label: 'Obesa', color: '#ff4d4d' };
        }
    };

    const categoria = getCategoria(igc);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tu Resultado</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.resultCard}>
                    <Text style={styles.userName}>¡Hola, {nombreUsuario}!</Text>
                    <Text style={styles.igcLabel}>Tu Índice de Grasa Corporal es:</Text>
                    <Text style={[styles.igcValue, { color: categoria.color }]}>{igc.toFixed(1)}%</Text>
                    <View style={[styles.badge, { backgroundColor: categoria.color + '20', borderColor: categoria.color }]}>
                        <Text style={[styles.badgeText, { color: categoria.color }]}>{categoria.label}</Text>
                    </View>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Análisis Biométrico</Text>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>IMC:</Text>
                        <Text style={styles.statVal}>{imc.toFixed(1)}</Text>
                    </View>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Metabolismo Basal Est.:</Text>
                        <Text style={styles.statVal}>{(10 * peso + 6.25 * altura - 5 * edad + (sexo === 1 ? 5 : -161)).toFixed(0)} kcal</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.coachBtn}
                    onPress={() => navigation.navigate('EntrenadorIA')}
                >
                    <Ionicons name="chatbubble-ellipses" size={24} color="black" />
                    <Text style={styles.coachBtnText}>Consultar al Coach IA</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backHomeBtn}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={styles.backHomeText}>Volver al Inicio</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        marginLeft: 15,
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    resultCard: {
        backgroundColor: '#111',
        width: '100%',
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: 30,
    },
    userName: {
        color: 'white',
        fontSize: 18,
        marginBottom: 10,
    },
    igcLabel: {
        color: '#666',
        fontSize: 14,
    },
    igcValue: {
        fontSize: 64,
        fontWeight: '900',
        marginVertical: 10,
    },
    badge: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    badgeText: {
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    infoSection: {
        width: '100%',
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 20,
        marginBottom: 30,
    },
    sectionTitle: {
        color: '#444',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 15,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    statLabel: {
        color: '#aaa',
        fontSize: 14,
    },
    statVal: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    coachBtn: {
        backgroundColor: '#0ce810',
        width: '100%',
        height: 60,
        borderRadius: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    coachBtnText: {
        color: 'black',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backHomeBtn: {
        padding: 15,
    },
    backHomeText: {
        color: '#666',
        textDecorationLine: 'underline',
    }
});
