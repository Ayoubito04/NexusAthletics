import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const DARK_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#1a1a1a" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function CalcularCalorias({ route }) {
    const navigation = useNavigation();
    const [cargando, setCargando] = useState(true);
    const { actividad } = route.params;

    useEffect(() => {
        const timer = setTimeout(() => {
            setCargando(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    if (!actividad) {
        return (
            <SafeAreaView style={styles.center}>
                <Ionicons name="alert-circle-outline" size={60} color="#666" />
                <Text style={styles.errorText}>Datos de actividad no disponibles.</Text>
                <TouchableOpacity style={styles.backButtonMini} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>VOLVER</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    if (cargando) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#63ff15" />
                <Text style={styles.loadingText}>ANALIZANDO BIO-MÉTRICAS...</Text>
                <Text style={styles.loadingSub}>IA NEXUS ESTÁ PROCESANDO TU RUTA</Text>
            </View>
        );
    }

    const hasRoute = actividad.ruta && Array.isArray(actividad.ruta) && actividad.ruta.length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.mapContainer}>
                {hasRoute ? (
                    <MapView
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        customMapStyle={DARK_MAP_STYLE}
                        initialRegion={{
                            latitude: actividad.ruta[Math.floor(actividad.ruta.length / 2)].latitude,
                            longitude: actividad.ruta[Math.floor(actividad.ruta.length / 2)].longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                    >
                        <Polyline
                            coordinates={actividad.ruta}
                            strokeColor="#63ff15"
                            strokeWidth={4}
                        />
                    </MapView>
                ) : (
                    <View style={styles.noMap}>
                        <MaterialCommunityIcons name="map-marker-off" size={60} color="#222" />
                        <Text style={styles.noMapText}>RUTA NO REGISTRADA</Text>
                    </View>
                )}
                <LinearGradient
                    colors={['rgba(5,5,5,0)', 'rgba(5,5,5,1)']}
                    style={styles.mapOverlay}
                />
            </View>

            <TouchableOpacity style={styles.backButtonTop} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>

            <ScrollView style={styles.infoScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.locationLabel}>LOCALIZACIÓN</Text>
                        <Text style={styles.locationValue}>{actividad.lugar || "NEXUS ZONE"}</Text>
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeText}>{actividad.tipo || "ENTRENAMIENTO"}</Text>
                        </View>
                    </View>

                    <View style={styles.statsCard}>
                        <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.statsInner}>
                            <View style={styles.statRow}>
                                <View style={styles.statItem}>
                                    <View style={styles.iconCircle}>
                                        <Ionicons name="flame" size={24} color="#63ff15" />
                                    </View>
                                    <View>
                                        <Text style={styles.statLabel}>CALORÍAS</Text>
                                        <Text style={styles.statValue}>{actividad.calorias}<Text style={styles.statUnit}> kcal</Text></Text>
                                    </View>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <View style={[styles.iconCircle, { borderColor: '#00D1FF' }]}>
                                        <Ionicons name="navigate" size={24} color="#00D1FF" />
                                    </View>
                                    <View>
                                        <Text style={styles.statLabel}>DISTANCIA</Text>
                                        <Text style={styles.statValue}>{actividad.distancia}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.horizontalDivider} />

                            <View style={styles.statRow}>
                                <View style={styles.statItem}>
                                    <View style={[styles.iconCircle, { borderColor: '#A259FF' }]}>
                                        <Ionicons name="timer" size={24} color="#A259FF" />
                                    </View>
                                    <View>
                                        <Text style={styles.statLabel}>TIEMPO</Text>
                                        <Text style={styles.statValue}>{actividad.tiempo}</Text>
                                    </View>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <View style={[styles.iconCircle, { borderColor: '#FFD700' }]}>
                                        <Ionicons name="flash" size={24} color="#FFD700" />
                                    </View>
                                    <View>
                                        <Text style={styles.statLabel}>INTENSIDAD</Text>
                                        <Text style={styles.statValue}>ALTA</Text>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    <View style={styles.aiMessage}>
                        <Ionicons name="sparkles" size={20} color="#63ff15" />
                        <Text style={styles.aiText}>
                            Nexus IA ha analizado tu esfuerzo. Has quemado el equivalente a un almuerzo saludable. ¡Mantén este ritmo!
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.goBack()}>
                        <LinearGradient colors={['#63ff15', '#4ad912']} style={styles.actionGrad}>
                            <Text style={styles.actionText}>FINALIZAR REVISIÓN</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    center: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#63ff15', marginTop: 20, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    loadingSub: { color: '#444', fontSize: 12, marginTop: 10, fontWeight: '600' },
    errorText: { color: '#666', marginTop: 20, fontSize: 16, textAlign: 'center' },
    mapContainer: { width: width, height: height * 0.45 },
    map: { flex: 1 },
    mapOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
    noMap: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
    noMapText: { color: '#333', marginTop: 15, fontWeight: '900', letterSpacing: 1 },
    backButtonTop: { position: 'absolute', top: 50, left: 20, width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333', zIndex: 10 },
    infoScroll: { flex: 1, marginTop: -30 },
    content: { paddingHorizontal: 25 },
    header: { alignItems: 'center', marginBottom: 25 },
    locationLabel: { color: '#666', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    locationValue: { color: 'white', fontSize: 24, fontWeight: '900', marginTop: 5, textAlign: 'center' },
    typeBadge: { backgroundColor: 'rgba(99,255,21,0.1)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginTop: 12, borderWidth: 1, borderColor: 'rgba(99,255,21,0.3)' },
    typeText: { color: '#63ff15', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    statsCard: { borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#222', elevation: 20 },
    statsInner: { padding: 25 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconCircle: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: '#63ff15', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    statLabel: { color: '#555', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    statValue: { color: 'white', fontSize: 18, fontWeight: '900' },
    statUnit: { fontSize: 10, color: '#444' },
    statDivider: { width: 1, height: 40, backgroundColor: '#222' },
    horizontalDivider: { height: 1, backgroundColor: '#222', marginVertical: 20 },
    aiMessage: { flexDirection: 'row', backgroundColor: '#111', padding: 20, borderRadius: 20, marginTop: 25, gap: 15, borderLeftWidth: 4, borderLeftColor: '#63ff15' },
    aiText: { flex: 1, color: '#aaa', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
    actionBtn: { width: '100%', height: 60, borderRadius: 20, overflow: 'hidden', marginTop: 30, elevation: 10 },
    actionGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    actionText: { color: 'black', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    backButtonMini: { marginTop: 30, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15, backgroundColor: '#222' },
});
