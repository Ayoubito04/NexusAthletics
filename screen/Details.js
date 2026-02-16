import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function Details() {
    const navigation = useNavigation();
    const route = useRoute(); // Hook para recibir parámetros

    // Extraemos los datos enviados desde Home (ponemos valores por defecto por si acaso)
    const { nombreUsuario, id } = route.params || { nombreUsuario: 'Invitado', id: 0 };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Pantalla de detalles</Text>

            <View style={styles.card}>
                <Text style={styles.infoText}>Hola, <Text style={styles.highlight}>{nombreUsuario}</Text></Text>
                <Text style={styles.infoText}>Tu ID es: {id}</Text>
            </View>

            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.textButton}>Volver al Inicio</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#120606',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 20,
    },
    card: {
        backgroundColor: '#1f1f1f',
        padding: 20,
        borderRadius: 15,
        width: '100%',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#333',
    },
    infoText: {
        fontSize: 18,
        color: '#bbb',
        marginBottom: 10,
    },
    highlight: {
        color: '#419dff',
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#419dff',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
    },
    textButton: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
