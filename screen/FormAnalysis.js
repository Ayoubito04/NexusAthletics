import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

const RISK_COLOR = { Bajo: '#63ff15', Medio: '#FFD700', Alto: '#ff4444' };

export default function FormAnalysis() {
    const navigation = useNavigation();
    const [media, setMedia]         = useState(null); // { uri, mimeType, isVideo }
    const [exercise, setExercise]   = useState('');
    const [loading, setLoading]     = useState(false);
    const [result, setResult]       = useState(null);
    const [error, setError]         = useState('');

    const pickMedia = async (fromCamera) => {
        const perm = fromCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!perm.granted) {
            Alert.alert('Permiso denegado', 'Necesitas dar acceso a la cámara o galería.');
            return;
        }

        const opts = {
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            quality: 0.7,
            videoMaxDuration: 30,
        };

        const res = fromCamera
            ? await ImagePicker.launchCameraAsync(opts)
            : await ImagePicker.launchImageLibraryAsync(opts);

        if (res.canceled) return;
        const asset = res.assets[0];
        const isVideo = asset.type === 'video';
        const mimeType = isVideo ? 'video/mp4' : (asset.mimeType || 'image/jpeg');
        setMedia({ uri: asset.uri, mimeType, isVideo });
        setResult(null);
        setError('');
    };

    const analyze = async () => {
        if (!media) { setError('Selecciona una foto o vídeo primero.'); return; }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const token = await AsyncStorage.getItem('token');
            const mediaBase64 = await FileSystem.readAsStringAsync(media.uri, {
                encoding: 'base64',
            });

            const res = await fetch(`${BACKEND_URL}/user/form-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ mediaBase64, mimeType: media.mimeType, exerciseName: exercise }),
            });
            const json = await res.json();
            if (!res.ok) { setError(json.error || 'Error del servidor'); return; }
            setResult(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const scoreColor = result
        ? result.score >= 8 ? '#63ff15' : result.score >= 6 ? '#FFD700' : '#ff4444'
        : '#63ff15';

    return (
        <SafeAreaView style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={s.headerTitle}>ANÁLISIS DE TÉCNICA</Text>
                    <Text style={s.headerSub}>IA evalúa tu ejecución</Text>
                </View>
                <View style={s.ultimateBadge}>
                    <Ionicons name="school" size={14} color="#000" />
                    <Text style={s.ultimateText}>ULTIMATE</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

                {/* Media picker */}
                <View style={s.pickerCard}>
                    <LinearGradient colors={['#0d1a0d', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={18} />
                    <Text style={s.pickerTitle}>SUBE TU VÍDEO O FOTO</Text>
                    <Text style={s.pickerSub}>Máx. 30 segundos · La IA analizará tu técnica</Text>

                    <View style={s.pickerBtns}>
                        <TouchableOpacity style={s.pickerBtn} onPress={() => pickMedia(true)}>
                            <LinearGradient colors={['#63ff15', '#3dcc00']} style={s.pickerBtnGrad} borderRadius={14}>
                                <Ionicons name="camera" size={28} color="#000" />
                                <Text style={s.pickerBtnText}>GRABAR</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.pickerBtn} onPress={() => pickMedia(false)}>
                            <LinearGradient colors={['#1a1a1a', '#111']} style={s.pickerBtnGrad} borderRadius={14}>
                                <Ionicons name="images" size={28} color="#63ff15" />
                                <Text style={[s.pickerBtnText, { color: '#63ff15' }]}>GALERÍA</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {media && (
                        <View style={s.previewBox}>
                            {media.isVideo ? (
                                <Video
                                    source={{ uri: media.uri }}
                                    style={s.previewVideo}
                                    useNativeControls
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={s.previewImgPlaceholder}>
                                    <Ionicons name="checkmark-circle" size={40} color="#63ff15" />
                                    <Text style={s.previewImgText}>Foto seleccionada</Text>
                                </View>
                            )}
                            <TouchableOpacity style={s.removeBtn} onPress={() => setMedia(null)}>
                                <Ionicons name="close-circle" size={24} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Exercise name */}
                <View style={s.inputCard}>
                    <Text style={s.inputLabel}>EJERCICIO (opcional)</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Ej: Sentadilla, Press banca, Peso muerto..."
                        placeholderTextColor="#444"
                        value={exercise}
                        onChangeText={setExercise}
                    />
                </View>

                {/* Error */}
                {!!error && (
                    <View style={s.errorBox}>
                        <Ionicons name="alert-circle" size={16} color="#ff4444" />
                        <Text style={s.errorText}>{error}</Text>
                    </View>
                )}

                {/* Analyze button */}
                <TouchableOpacity onPress={analyze} disabled={loading || !media} activeOpacity={0.8}>
                    <LinearGradient
                        colors={media && !loading ? ['#63ff15', '#3dcc00'] : ['#1a1a1a', '#111']}
                        style={s.analyzeBtn}
                        borderRadius={16}
                    >
                        {loading
                            ? <ActivityIndicator color="#000" size="small" />
                            : <MaterialCommunityIcons name="brain" size={20} color={media ? '#000' : '#333'} />
                        }
                        <Text style={[s.analyzeBtnText, { color: media && !loading ? '#000' : '#333' }]}>
                            {loading ? 'ANALIZANDO...' : 'ANALIZAR TÉCNICA'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {loading && (
                    <Text style={s.loadingHint}>La IA está evaluando tu ejecución · puede tardar 15-30s</Text>
                )}

                {/* Results */}
                {result && (
                    <View style={s.resultsWrap}>

                        {/* Score */}
                        <View style={s.scoreCard}>
                            <LinearGradient colors={[scoreColor + '15', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={18} />
                            <View style={s.scoreRow}>
                                <View style={[s.scoreCircle, { borderColor: scoreColor }]}>
                                    <Text style={[s.scoreNum, { color: scoreColor }]}>{result.score}</Text>
                                    <Text style={s.scoreUnit}>/10</Text>
                                </View>
                                <View style={s.scoreInfo}>
                                    <Text style={s.scoreExercise}>{result.ejercicioDetectado || exercise || 'Ejercicio'}</Text>
                                    <View style={[s.riskBadge, { backgroundColor: RISK_COLOR[result.nivelRiesgo] + '20', borderColor: RISK_COLOR[result.nivelRiesgo] + '60' }]}>
                                        <Text style={[s.riskText, { color: RISK_COLOR[result.nivelRiesgo] }]}>
                                            RIESGO {result.nivelRiesgo?.toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={s.scoreSummary}>{result.resumen}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Errors */}
                        {result.errores?.length > 0 && (
                            <View style={[s.listCard, { borderColor: '#ff444430' }]}>
                                <LinearGradient colors={['#1a0000', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={18} />
                                <View style={s.listHeader}>
                                    <Ionicons name="warning" size={16} color="#ff4444" />
                                    <Text style={[s.listTitle, { color: '#ff4444' }]}>ERRORES DETECTADOS</Text>
                                </View>
                                {result.errores.map((e, i) => (
                                    <View key={i} style={s.listItem}>
                                        <View style={[s.listDot, { backgroundColor: '#ff4444' }]} />
                                        <Text style={s.listText}>{e}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Corrections */}
                        {result.correcciones?.length > 0 && (
                            <View style={[s.listCard, { borderColor: '#FFD70030' }]}>
                                <LinearGradient colors={['#1a1200', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={18} />
                                <View style={s.listHeader}>
                                    <Ionicons name="build" size={16} color="#FFD700" />
                                    <Text style={[s.listTitle, { color: '#FFD700' }]}>CORRECCIONES</Text>
                                </View>
                                {result.correcciones.map((c, i) => (
                                    <View key={i} style={s.listItem}>
                                        <View style={[s.listDot, { backgroundColor: '#FFD700' }]} />
                                        <Text style={s.listText}>{c}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Positives */}
                        {result.positivos?.length > 0 && (
                            <View style={[s.listCard, { borderColor: '#63ff1530' }]}>
                                <LinearGradient colors={['#001a00', 'transparent']} style={StyleSheet.absoluteFill} borderRadius={18} />
                                <View style={s.listHeader}>
                                    <Ionicons name="checkmark-circle" size={16} color="#63ff15" />
                                    <Text style={[s.listTitle, { color: '#63ff15' }]}>LO QUE HACES BIEN</Text>
                                </View>
                                {result.positivos.map((p, i) => (
                                    <View key={i} style={s.listItem}>
                                        <View style={[s.listDot, { backgroundColor: '#63ff15' }]} />
                                        <Text style={s.listText}>{p}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Analyze again */}
                        <TouchableOpacity style={s.reanalyzeBtn} onPress={() => { setResult(null); setMedia(null); }}>
                            <Ionicons name="refresh" size={16} color="#63ff15" />
                            <Text style={s.reanalyzeBtnText}>ANALIZAR OTRO EJERCICIO</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container:   { flex: 1, backgroundColor: '#0A0A0A' },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
    backBtn:     { padding: 4 },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
    headerSub:   { color: '#555', fontSize: 11, marginTop: 1 },
    ultimateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    ultimateText:  { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    content: { padding: 16, gap: 14, paddingBottom: 40 },

    pickerCard:  { backgroundColor: '#111', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#63ff1530', overflow: 'hidden', gap: 10 },
    pickerTitle: { color: '#63ff15', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    pickerSub:   { color: '#555', fontSize: 12 },
    pickerBtns:  { flexDirection: 'row', gap: 12 },
    pickerBtn:   { flex: 1 },
    pickerBtnGrad: { paddingVertical: 18, alignItems: 'center', gap: 8 },
    pickerBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 1 },

    previewBox:  { borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a1a', height: 200, position: 'relative' },
    previewVideo: { width: '100%', height: '100%' },
    previewImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    previewImgText: { color: '#63ff15', fontSize: 13, fontWeight: '700' },
    removeBtn:   { position: 'absolute', top: 8, right: 8 },

    inputCard:   { backgroundColor: '#111', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1e1e1e', gap: 8 },
    inputLabel:  { color: '#444', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
    input:       { color: '#fff', fontSize: 14, paddingVertical: 6 },

    errorBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ff444415', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#ff444440' },
    errorText:   { color: '#ff6666', fontSize: 13, flex: 1 },

    analyzeBtn:  { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    analyzeBtnText: { fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
    loadingHint: { color: '#555', fontSize: 12, textAlign: 'center', marginTop: -6 },

    resultsWrap: { gap: 14 },

    scoreCard:   { backgroundColor: '#111', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#1e1e1e', overflow: 'hidden' },
    scoreRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    scoreCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
    scoreNum:    { fontSize: 28, fontWeight: '900' },
    scoreUnit:   { color: '#555', fontSize: 12, fontWeight: '700', marginTop: -4 },
    scoreInfo:   { flex: 1, gap: 8 },
    scoreExercise: { color: '#fff', fontSize: 16, fontWeight: '900' },
    riskBadge:   { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    riskText:    { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    scoreSummary: { color: '#aaa', fontSize: 13, lineHeight: 19 },

    listCard:    { backgroundColor: '#111', borderRadius: 18, padding: 16, borderWidth: 1, overflow: 'hidden', gap: 10 },
    listHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    listTitle:   { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    listItem:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    listDot:     { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
    listText:    { color: '#ccc', fontSize: 13, lineHeight: 20, flex: 1 },

    reanalyzeBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: '#63ff1530' },
    reanalyzeBtnText: { color: '#63ff15', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
