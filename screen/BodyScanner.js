import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = Config.BACKEND_URL;

export default function BodyScanner() {
    const navigation = useNavigation();
    const [image, setImage] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImage(result.assets[0]);
            setResult(null);
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara.");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImage(result.assets[0]);
            setResult(null);
        }
    };

    const runScanner = async () => {
        if (!image) return;

        setAnalyzing(true);
        try {
            const token = await AsyncStorage.getItem('token');

            // Asegurar que la imagen base64 tenga el formato correcto
            let imageData = image.base64;
            if (imageData && !imageData.startsWith('data:image')) {
                imageData = `data:image/jpeg;base64,${imageData}`;
            }

            const response = await fetch(`${BACKEND_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: `Analiza mi físico en esta foto. RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO.
                    Estructura:
                    {
                        "grasa_estimada": "X%",
                        "evaluacion_muscular": {
                            "tren_superior": "descripción corta",
                            "tren_inferior": "descripción corta",
                            "core": "descripción corta"
                        },
                        "puntos_fuertes": ["punto 1", "punto 2"],
                        "puntos_mejorar": ["punto 1", "punto 2"],
                        "nivel": "Principiante/Intermedio/Avanzado/Elite",
                        "recomendacion_elite": "Consejo maestro"
                    }`,
                    image: imageData
                })
            });

            const data = await response.json();
            if (response.ok) {
                try {
                    let cleanText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleanText);
                    setResult(parsed);
                    await extractMuscleScores(data.text);
                } catch (e) {
                    setResult({ raw: data.text });
                }
            } else {
                Alert.alert("Error", data.error || "No se pudo realizar el análisis.");
            }
        } catch (error) {
            Alert.alert("Error de conexión", "Asegúrate de tener internet.");
        } finally {
            setAnalyzing(false);
        }
    };

    const ResultCard = ({ title, icon, children }) => (
        <View style={styles.premiumCard}>
            <View style={styles.cardHeader}>
                <Ionicons name={icon} size={20} color="#63ff15" />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            {children}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nexus <Text style={{ color: '#63ff15' }}>Vision</Text></Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {!result && (
                    <View style={styles.introBox}>
                        <Text style={styles.introTitle}>Bio-Scanner Visual</Text>
                        <Text style={styles.introDesc}>Nuestra IA de grado atlético analizará tu composición corporal para optimizar tu evolución.</Text>
                    </View>
                )}

                <View style={[styles.scannerInterface, result && { aspectRatio: 16 / 9, height: 200 }]}>
                    {image ? (
                        <View style={styles.previewContainer}>
                            <Image source={{ uri: image.uri }} style={styles.preview} />
                            {analyzing && (
                                <View style={styles.scanLineContainer}>
                                    <View style={styles.scanLine} />
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.placeholder}>
                            <View style={styles.pulseContainer}>
                                <Ionicons name="scan-outline" size={60} color="#63ff15" />
                            </View>
                            <Text style={styles.placeholderText}>ESPERANDO IMAGEN...</Text>
                        </View>
                    )}
                </View>

                {!result && (
                    <View style={styles.controls}>
                        {!image ? (
                            <>
                                <TouchableOpacity style={styles.mainBtn} onPress={takePhoto}>
                                    <Ionicons name="camera" size={24} color="black" />
                                    <Text style={styles.mainBtnText}>CAPTURAR AHORA</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
                                    <Ionicons name="image" size={20} color="white" />
                                    <Text style={styles.secondaryBtnText}>Explorar Galería</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.retryBtn} onPress={() => setImage(null)} disabled={analyzing}>
                                    <Ionicons name="trash" size={20} color="#ff4d4d" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.scanBtn, analyzing && styles.disabledBtn]}
                                    onPress={runScanner}
                                    disabled={analyzing}
                                >
                                    {analyzing ? (
                                        <ActivityIndicator color="black" />
                                    ) : (
                                        <>
                                            <Text style={styles.scanBtnText}>INICIAR ANÁLISIS BIO-IA</Text>
                                            <Ionicons name="flask" size={20} color="black" />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {result && (
                    <View style={styles.resultContainer}>
                        <View style={styles.resultMainHeader}>
                            <View>
                                <Text style={styles.resultSubtitle}>INFORME DE COMPOSICIÓN</Text>
                                <Text style={styles.resultTitleMain}>Nivel {result.nivel || 'Analizado'}</Text>
                            </View>
                            <View style={styles.grasaBadge}>
                                <Text style={styles.grasaValue}>{result.grasa_estimada || '--'}</Text>
                                <Text style={styles.grasaLabel}>GRASA</Text>
                            </View>
                        </View>

                        {result.raw ? (
                            <ResultCard title="Análisis General" icon="document-text">
                                <Text style={styles.resultText}>{result.raw}</Text>
                            </ResultCard>
                        ) : (
                            <>
                                <ResultCard title="Desarrollo Muscular" icon="barbell">
                                    <View style={styles.muscleRow}>
                                        <Text style={styles.muscleLabel}>Superior:</Text>
                                        <Text style={styles.muscleDesc}>{result.evaluacion_muscular?.tren_superior}</Text>
                                    </View>
                                    <View style={styles.muscleRow}>
                                        <Text style={styles.muscleLabel}>Inferior:</Text>
                                        <Text style={styles.muscleDesc}>{result.evaluacion_muscular?.tren_inferior}</Text>
                                    </View>
                                    <View style={styles.muscleRow}>
                                        <Text style={styles.muscleLabel}>Core:</Text>
                                        <Text style={styles.muscleDesc}>{result.evaluacion_muscular?.core}</Text>
                                    </View>
                                </ResultCard>

                                <View style={styles.highlightsRow}>
                                    <View style={[styles.highlightHalf, { borderColor: '#63ff15' }]}>
                                        <Text style={[styles.highlightTitle, { color: '#63ff15' }]}>FORTALEZAS</Text>
                                        {(result.puntos_fuertes || []).map((p, i) => (
                                            <Text key={i} style={styles.highlightText}>• {p}</Text>
                                        ))}
                                    </View>
                                    <View style={[styles.highlightHalf, { borderColor: '#ffa500' }]}>
                                        <Text style={[styles.highlightTitle, { color: '#ffa500' }]}>A MEJORAR</Text>
                                        {(result.puntos_mejorar || []).map((p, i) => (
                                            <Text key={i} style={styles.highlightText}>• {p}</Text>
                                        ))}
                                    </View>
                                </View>

                                <ResultCard title="Recomendación Nexus Elite" icon="star">
                                    <Text style={styles.recommendationText}>{result.recomendacion_elite}</Text>
                                </ResultCard>
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.rankingsBtnPremium}
                            onPress={() => navigation.navigate('MuscleRankings')}
                        >
                            <Text style={styles.rankingsBtnTextPremium}>VER RANKING GLOBAL</Text>
                            <Ionicons name="chevron-forward" size={20} color="black" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.resetBtnFlat} onPress={() => { setImage(null); setResult(null); }}>
                            <Text style={styles.resetBtnText}>DESCARTAR Y REPETIR</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.privacyNota}>
                    <Ionicons name="shield-checkmark" size={14} color="#333" />
                    <Text style={styles.privacyText}>CIFRADO DE EXTREMO A EXTREMO. TUS DATOS SON PRIVADOS.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    introBox: { marginBottom: 30 },
    introTitle: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 8 },
    introDesc: { color: '#888', fontSize: 14, lineHeight: 20 },
    scannerInterface: {
        width: '100%',
        aspectRatio: 3 / 4,
        backgroundColor: '#111',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: '#222',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30
    },
    placeholder: { alignItems: 'center' },
    pulseContainer: { padding: 20, borderRadius: 50, backgroundColor: 'rgba(99, 255, 21, 0.05)' },
    placeholderText: { color: '#444', marginTop: 15, fontWeight: 'bold', letterSpacing: 1 },
    previewContainer: { width: '100%', height: '100%', position: 'relative' },
    preview: { width: '100%', height: '100%', resizeMode: 'cover' },
    scanLineContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
    scanLine: { width: '100%', height: 2, backgroundColor: '#63ff15', position: 'absolute', top: '50%', shadowColor: '#63ff15', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 10 },
    controls: { width: '100%' },
    mainBtn: { backgroundColor: '#63ff15', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 15 },
    mainBtnText: { color: 'black', fontWeight: '900', fontSize: 16 },
    secondaryBtn: { padding: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    secondaryBtnText: { color: 'white', fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 15 },
    retryBtn: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    scanBtn: { flex: 1, backgroundColor: '#63ff15', borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    scanBtnText: { color: 'black', fontWeight: '900', fontSize: 16 },
    disabledBtn: { opacity: 0.5 },
    resultContainer: { width: '100%', gap: 20 },
    resultMainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    resultSubtitle: { color: '#666', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    resultTitleMain: { color: 'white', fontSize: 28, fontWeight: '900' },
    grasaBadge: { backgroundColor: '#111', padding: 12, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#63ff15' },
    grasaValue: { color: '#63ff15', fontSize: 20, fontWeight: '900' },
    grasaLabel: { color: '#666', fontSize: 10, fontWeight: 'bold' },
    premiumCard: { backgroundColor: '#111', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#222' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
    cardTitle: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    muscleRow: { flexDirection: 'row', marginBottom: 8, gap: 10 },
    muscleLabel: { color: '#63ff15', fontWeight: 'bold', minWidth: 60 },
    muscleDesc: { color: '#ccc', flex: 1, fontSize: 13 },
    highlightsRow: { flexDirection: 'row', gap: 12 },
    highlightHalf: { flex: 1, backgroundColor: '#111', borderRadius: 18, padding: 15, borderWidth: 1 },
    highlightTitle: { fontSize: 10, fontWeight: '900', marginBottom: 10 },
    highlightText: { color: '#ccc', fontSize: 11, marginBottom: 5 },
    recommendationText: { color: '#aaa', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
    rankingsBtnPremium: { backgroundColor: '#63ff15', borderRadius: 15, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rankingsBtnTextPremium: { color: 'black', fontWeight: '900', fontSize: 14 },
    resetBtnFlat: { padding: 15, alignItems: 'center' },
    resetBtnText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
    privacyNota: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 30 },
    privacyText: { color: '#333', fontSize: 10, fontWeight: 'bold' }
});
