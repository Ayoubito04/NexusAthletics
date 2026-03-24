import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Animated, Linking, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import NexusAlert from '../components/NexusAlert';

import * as Location from 'expo-location';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

const DARK_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#1a1a1a" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function HealthSync({ navigation }) {
    const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
    const [pastStepCount, setPastStepCount] = useState(0);
    const [currentStepCount, setCurrentStepCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [manualSteps, setManualSteps] = useState('');
    const [manualKcal, setManualKcal] = useState('');
    const [showCalibrator, setShowCalibrator] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [isConnecting, setIsConnecting] = useState(false);

    // GPS Tracking States
    const [isTracking, setIsTracking] = useState(false);
    const [route, setRoute] = useState([]);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [distance, setDistance] = useState(0);
    const locationSubscription = useRef(null);

    // Background Tracking States
    const [bgSteps, setBgSteps] = useState(0);
    const [bgDistance, setBgDistance] = useState(0);
    const [bgRoute, setBgRoute] = useState([]);

    // NexusAlert State
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

    const showAlert = (title, message, type = 'info') => {
        setAlert({ visible: true, title, message, type });
    };

    useEffect(() => {
        subscribe();
        loadBackgroundData();
        
        const interval = setInterval(loadBackgroundData, 10000);

        return () => {
            clearInterval(interval);
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    const loadBackgroundData = async () => {
        try {
            const userJson = await AsyncStorage.getItem('user');
            const userDataParsed = userJson ? JSON.parse(userJson) : null;
            const userId = userDataParsed?._id || userDataParsed?.id || 'default';

            const STEPS_KEY = `steps_data_${userId}`;
            const ROUTE_KEY = `nexus_bg_route_${userId}`;
            const DISTANCE_KEY = `nexus_bg_distance_${userId}`;

            const stepsJson = await AsyncStorage.getItem(STEPS_KEY);
            const dist = await AsyncStorage.getItem(DISTANCE_KEY);
            const routeJson = await AsyncStorage.getItem(ROUTE_KEY);
            
            if (stepsJson) {
                const data = JSON.parse(stepsJson);
                const today = new Date().toDateString();
                if (data.date === today) setPastStepCount(data.steps);
            }
            if (dist) setBgDistance(parseFloat(dist));
            if (routeJson) setBgRoute(JSON.parse(routeJson));
        } catch (e) {
            console.error('Error cargando datos de fondo:', e);
        }
    };

    const subscribe = async () => {
        const { Pedometer } = require('expo-sensors');
        const isAvailable = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(String(isAvailable));

        if (isAvailable) {
            try {
                const userJson = await AsyncStorage.getItem('user');
                const userDataParsed = userJson ? JSON.parse(userJson) : null;
                const userId = userDataParsed?._id || userDataParsed?.id || 'default';
                const STEPS_KEY = `steps_data_${userId}`;

                const savedSteps = await AsyncStorage.getItem(STEPS_KEY);
                const today = new Date().toDateString();
                if (savedSteps) {
                    const data = JSON.parse(savedSteps);
                    if (data.date === today) setPastStepCount(data.steps);
                }
            } catch (e) { }

            const subscription = Pedometer.watchStepCount(result => {
                setCurrentStepCount(result.steps);
            });

            return subscription;
        }
    };

    const toggleTracking = async () => {
        if (isTracking) {
            stopTracking();
        } else {
            startTracking();
        }
    };

    const CalcularDistancia = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000;
    };

    const startTracking = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            showAlert("Permiso Denegado", "Se requiere ubicación para el seguimiento de ruta.", "error");
            return;
        }

        setIsTracking(true);
        setRoute([]);
        setDistance(0);

        locationSubscription.current = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 2000,
                distanceInterval: 5,
            },
            (newLocation) => {
                const { latitude, longitude } = newLocation.coords;
                setCurrentLocation(newLocation);

                setRoute((prev) => {
                    if (prev.length > 0) {
                        const lastPoint = prev[prev.length - 1];
                        const d = CalcularDistancia(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
                        setDistance(prevDist => prevDist + d);
                    }
                    return [...prev, { latitude, longitude }];
                });
            }
        );
    };

    const stopTracking = async () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
        }
        setIsTracking(false);
        saveSession();
    };

    const saveSession = async () => {
        const kcal = (currentStepCount * 0.04).toFixed(0);
        const newActivity = {
            id: Date.now(),
            fecha: new Date().toLocaleDateString(),
            tiempo: "Sincronizado",
            distancia: (distance / 1000).toFixed(2) + " km",
            ruta: route,
            lugar: "Nexus Sync Zone",
            calorias: kcal
        };

        try {
            const acts = await AsyncStorage.getItem('actividades');
            let list = acts ? JSON.parse(acts) : [];
            list.push(newActivity);
            await AsyncStorage.setItem('actividades', JSON.stringify(list));
            showAlert("✅ Sincronización Finalizada", "Tu actividad y ruta han sido guardadas.", "success");
        } catch (e) {
            console.error(e);
        }
    };

    const handleSyncClick = () => {
        showAlert("Próximamente", "La sincronización externa con Google Fit y Apple Health se habilitará en una futura actualización de Nexus IA. Por ahora, usa el Rastreo GPS Integrado.", "info");
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bio-Sincronización</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.statusCard, isTracking && { borderColor: '#63ff15', borderWidth: 2 }]}>
                    <LinearGradient colors={['#1a1a1a', '#0a0a0a']} style={styles.cardGrad}>
                        <View style={styles.statusRow}>
                            <View style={styles.iconCircle}>
                                <MaterialCommunityIcons name={isTracking ? "navigation" : "walk"} size={30} color="#63ff15" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.statusLabel}>{isTracking ? " Rastreo GPS Activo" : "Pasos de Hoy"}</Text>
                                <Text style={styles.statusValue}>{pastStepCount + currentStepCount}</Text>
                                {(isTracking || bgDistance > 0) && (
                                    <View style={styles.trackingInfoRow}>
                                        <Ionicons name="location" size={12} color="#63ff15" />
                                        <Text style={styles.trackingSub}>
                                            Distancia: <Text style={{ color: 'white' }}>{((distance + bgDistance) / 1000).toFixed(2) + " km"}</Text>
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity style={[styles.trackingToggle, isTracking && styles.trackingToggleActive]} onPress={toggleTracking}>
                                <Ionicons name={isTracking ? "stop" : "play"} size={26} color={isTracking ? "white" : "black"} />
                            </TouchableOpacity>
                        </View>

                        {((isTracking && route.length > 1) || (!isTracking && bgRoute.length > 1)) && (
                            <View style={styles.miniMapContainer}>
                                <MapView
                                    style={styles.miniMap}
                                    provider={PROVIDER_GOOGLE}
                                    customMapStyle={DARK_MAP_STYLE}
                                    region={{
                                        latitude: isTracking ? route[route.length - 1].latitude : bgRoute[bgRoute.length - 1].latitude,
                                        longitude: isTracking ? route[route.length - 1].longitude : bgRoute[bgRoute.length - 1].longitude,
                                        latitudeDelta: 0.005,
                                        longitudeDelta: 0.005,
                                    }}
                                >
                                    <Polyline 
                                        coordinates={isTracking ? route : bgRoute} 
                                        strokeColor={isTracking ? "#63ff15" : "#00D1FF"} 
                                        strokeWidth={4} 
                                    />
                                </MapView>
                                {!isTracking && (
                                    <View style={styles.bgLabel}>
                                        <Text style={styles.bgLabelText}>ACTIVIDAD EN SEGUNDO PLANO</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.divider} />
                        
                        <Text style={styles.infoText}>
                            {!isTracking && bgDistance > 0 
                                ? "Nexus IA está rastreando tu actividad en segundo plano mediante GPS." 
                                : isTracking 
                                    ? "La ruta y los pasos se están capturando simultáneamente." 
                                    : "Pulsa PLAY para iniciar una sesión de rastreo manual (GPS + Pasos)."}
                        </Text>
                    </LinearGradient>
                </View>

                <View style={styles.integrationSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Conexiones Externas</Text>
                        <View style={styles.lockBadge}>
                            <Ionicons name="lock-closed" size={10} color="#FF6B6B" />
                            <Text style={styles.lockText}>PROXIMAMENTE</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.integrationItem, { opacity: 0.5 }]} onPress={handleSyncClick}>
                        <Ionicons name="logo-google" size={30} color="#EA4335" />
                        <View style={styles.integrationInfo}>
                            <Text style={styles.integrationName}>Google Fit / Health Connect</Text>
                            <Text style={styles.integrationStatus}>Integración en desarrollo</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#444" />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.integrationItem, { opacity: 0.5 }]} onPress={handleSyncClick}>
                        <Ionicons name="logo-apple" size={30} color="white" />
                        <View style={styles.integrationInfo}>
                            <Text style={styles.integrationName}>Apple HealthКиt</Text>
                            <Text style={styles.integrationStatus}>Próximamente para IOS</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#444" />
                    </TouchableOpacity>
                </View>

                <View style={styles.adviceCard}>
                    <LinearGradient colors={['#242424', '#1a1a1a']} style={styles.adviceGrad}>
                        <Ionicons name="bulb" size={24} color="#FFD700" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.adviceTitle}>Consejo Nexus</Text>
                            <Text style={styles.adviceText}>Usa el rastreo GPS nativo mientras caminas para que la IA pueda calcular con precisión tu metabolismo basal y ruta biológica.</Text>
                        </View>
                    </LinearGradient>
                </View>
            </ScrollView>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={() => setAlert({ ...alert, visible: false })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    headerTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    content: { padding: 20 },
    
    statusCard: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#111', marginBottom: 25, borderWidth: 1, borderColor: '#222' },
    cardGrad: { padding: 20 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(99,255,21,0.1)', justifyContent: 'center', alignItems: 'center' },
    statusLabel: { color: '#888', fontSize: 14, fontWeight: '600' },
    statusValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },
    
    trackingToggle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#63ff15', justifyContent: 'center', alignItems: 'center' },
    trackingToggleActive: { backgroundColor: '#FF6B6B' },
    
    trackingInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    trackingSub: { color: '#888', fontSize: 14 },
    
    miniMapContainer: { height: 180, borderRadius: 15, overflow: 'hidden', marginTop: 15, borderWidth: 1, borderColor: '#333' },
    miniMap: { flex: 1 },
    
    bgLabel: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,209,255,0.8)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
    bgLabelText: { color: 'black', fontSize: 10, fontWeight: 'bold' },

    divider: { height: 1, backgroundColor: '#222', marginVertical: 15 },
    infoText: { color: '#666', fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
    
    integrationSection: { marginBottom: 25 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,107,107,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    lockText: { color: '#FF6B6B', fontSize: 10, fontWeight: 'bold' },
    
    integrationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', padding: 15, borderRadius: 15, marginBottom: 10, gap: 15, borderWidth: 1, borderColor: '#222' },
    integrationInfo: { flex: 1 },
    integrationName: { color: 'white', fontSize: 16, fontWeight: '600' },
    integrationStatus: { color: '#666', fontSize: 12 },
    
    adviceCard: { borderRadius: 15, overflow: 'hidden' },
    adviceGrad: { padding: 15, flexDirection: 'row', gap: 15, alignItems: 'center' },
    adviceTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    adviceText: { color: '#aaa', fontSize: 13, lineHeight: 18 }
});
