import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function IGC() {
    const route = useRoute();
    const navigation = useNavigation();
    const { nombreUsuario, edad, peso, altura, id, sexo } = route.params; // Asumiendo que pasas 'sexo' (1 o 0)

    const pesoNum = parseFloat(peso);
    const alturaM = parseFloat(altura) / 100;
    const edadNum = parseInt(edad);

    // Lógica corregida
    const imc = pesoNum / (alturaM * alturaM);

    // Fórmula de Deurenberg (Ajustada: si no tienes sexo, usamos 0.5 como promedio o asume hombre/mujer)
    const factorSexo = sexo ?? 1;
    const igc = (1.20 * imc) + (0.23 * edadNum) - (10.8 * factorSexo) - 5.4;

    const getEstado = (valor) => {
        if (valor < 20) return { label: 'Bajo en Grasa', color: '#419dff' };
        if (valor < 25) return { label: 'Normal', color: '#2ecc71' };
        if (valor < 30) return { label: 'Sobrepeso', color: '#ff9800' };
        return { label: 'Obesidad', color: '#f44336' };
    };

    const estadoInfo = getEstado(igc);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.greeting}>¡Hola, {nombreUsuario}!</Text>
            <Text style={styles.subtitle}>Aquí tienes tu informe de salud</Text>

            <View style={styles.resultCard}>
                <Text style={styles.label}>Tu Índice de Grasa Corporal</Text>
                <Text style={[styles.mainResult, { color: estadoInfo.color }]}>
                    {igc.toFixed(1)}%
                </Text>

                <View style={[styles.tag, { backgroundColor: estadoInfo.color }]}>
                    <Text style={styles.tagText}>{estadoInfo.label.toUpperCase()}</Text>
                </View>

                <View style={styles.divider} />

                <Text style={styles.secondaryInfo}>
                    IMC Actual: <Text style={styles.bold}>{imc.toFixed(2)}</Text>
                </Text>
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>¿Qué significa esto?</Text>
                <Text style={styles.infoText}>
                    El IGC estima el porcentaje de tu peso que es grasa corporal en comparación con la masa magra (músculos, huesos, etc).
                </Text>
            </View>

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.backButtonText}>Volver a calcular</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#040f17',
        padding: 25,
        alignItems: 'center',
    },
    greeting: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 20,
    },
    subtitle: {
        fontSize: 18,
        color: '#ccc',
        marginBottom: 30,
    },
    resultCard: {
        backgroundColor: '#161b22',
        width: '100%',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#30363d',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    label: {
        color: '#8b949e',
        fontSize: 16,
        marginBottom: 10,
    },
    mainResult: {
        fontSize: 64,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    tag: {
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginBottom: 20,
    },
    tagText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: '#30363d',
        width: '100%',
        marginVertical: 20,
    },
    secondaryInfo: {
        color: '#fff',
        fontSize: 18,
    },
    bold: {
        fontWeight: 'bold',
        color: '#419dff',
    },
    infoBox: {
        marginTop: 30,
        backgroundColor: '#0d1117',
        padding: 20,
        borderRadius: 15,
        width: '100%',
    },
    infoTitle: {
        color: '#419dff',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    infoText: {
        color: '#8b949e',
        lineHeight: 20,
    },
    backButton: {
        marginTop: 40,
        backgroundColor: '#1f1f1f',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#30363d',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});