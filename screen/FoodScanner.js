import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, ActivityIndicator, Platform, Dimensions, Animated } from 'react-native';
import NexusAlert from '../components/NexusAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const { width } = Dimensions.get('window');
const BACKEND_URL = Config.BACKEND_URL;

export default function FoodScanner({ navigation }) {
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

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

    const pickImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showAlert("Permisos necesarios", "Necesitamos acceso a la cámara para escanear alimentos.", "warning");
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            analyzeFood(result.assets[0].base64);
        }
    };

    const analyzeFood = async (base64) => {
        setLoading(true);
        setResult(null);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: "Analiza este alimento. Dime: 1. Qué es. 2. Grado de salud (1-100). 3. Pros y Contras. 4. Valor nutricional estimado. Responde de forma muy visual y directa.",
                    image: `data:image/jpeg;base64,${base64}`
                })
            });

            const data = await response.json();
            if (data.text) {
                // Parseo simple para simular estructura visual
                setResult(data.text);
            }
        } catch (error) {
            console.error("Error analizando alimento:", error);
            showAlert("Error", "No se pudo conectar con Nexus AI.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#050505', '#000']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>NEXUS <Text style={{ color: '#63ff15' }}>FOOD SCAN</Text></Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {!image ? (
                    <View style={styles.uploadBox}>
                        <MaterialCommunityIcons name="food-apple-outline" size={80} color="#63ff15" />
                        <Text style={styles.uploadTitle}>Escáner Nutricional</Text>
                        <Text style={styles.uploadSub}>Apunta a tu comida o producto para que Nexus AI analice su calidad.</Text>

                        <TouchableOpacity style={styles.mainActionBtn} onPress={pickImage}>
                            <LinearGradient colors={['#63ff15', '#4ad912']} style={styles.gradBtn}>
                                <Ionicons name="camera" size={24} color="black" />
                                <Text style={styles.btnText}>ESCANEAR AHORA</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.resultContainer}>
                        <View style={styles.imageCard}>
                            <Image source={{ uri: image }} style={styles.previewImage} />
                            {loading && (
                                <View style={styles.loaderOverlay}>
                                    <ActivityIndicator size="large" color="#63ff15" />
                                    <Text style={styles.loaderText}>Analizando Bio-composición...</Text>
                                </View>
                            )}
                        </View>

                        {result && (
                            <Animated.View style={styles.resultCard}>
                                <View style={styles.resultHeader}>
                                    <Ionicons name="analytics" size={20} color="#63ff15" />
                                    <Text style={styles.resultLabel}>ANÁLISIS DE NEXUS AI</Text>
                                </View>
                                <Text style={styles.resultText}>{result}</Text>

                                <TouchableOpacity style={styles.resetBtn} onPress={() => setImage(null)}>
                                    <Text style={styles.resetBtnText}>ESCANEAR OTRO</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>
                )}
            </ScrollView>

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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    scrollContent: { padding: 25, alignItems: 'center' },
    uploadBox: { alignItems: 'center', marginTop: 60, width: '100%' },
    uploadTitle: { color: 'white', fontSize: 24, fontWeight: '900', marginTop: 20 },
    uploadSub: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 22, paddingHorizontal: 20 },
    mainActionBtn: { marginTop: 40, width: '80%', height: 60, borderRadius: 20, overflow: 'hidden' },
    gradBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    btnText: { color: 'black', fontWeight: '900', fontSize: 16 },
    resultContainer: { width: '100%', alignItems: 'center' },
    imageCard: { width: width - 50, height: width - 50, borderRadius: 30, overflow: 'hidden', backgroundColor: '#111', borderWidth: 2, borderColor: '#63ff1540' },
    previewImage: { width: '100%', height: '100%' },
    loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    loaderText: { color: '#63ff15', marginTop: 15, fontWeight: 'bold' },
    resultCard: { backgroundColor: '#111', width: '100%', borderRadius: 25, padding: 20, marginTop: 20, borderWidth: 1, borderColor: '#222' },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    resultLabel: { color: '#63ff15', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    resultText: { color: '#ccc', fontSize: 15, lineHeight: 24 },
    resetBtn: { marginTop: 20, padding: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#222' },
    resetBtnText: { color: '#63ff15', fontWeight: 'bold' }
});
