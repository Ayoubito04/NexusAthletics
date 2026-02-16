import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import NexusAlert from '../components/NexusAlert';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const DARK_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#1b1b1b" }] },
    { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
    { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
    { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

export default function ActivityMap() {
    const navigation = useNavigation();
    const [location, setLocation] = useState(null);
    const [corriendo, setCorriendo] = useState(false);
    const [ruta, setRuta] = useState([]);
    const [tiempo, setTiempo] = useState(0);
    const [distanciaTotal, setDistanciaTotal] = useState(0);
    const [calorias, setCalorias] = useState(0);

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

    const reloj = useRef(null);
    const vigilante = useRef(null);
    const mapRef = useRef(null);

    useEffect(() => {
        if (corriendo) {
            const kcalPorKm = 65;
            const total = distanciaTotal * kcalPorKm;
            setCalorias(total.toFixed(0));
        }
    }, [distanciaTotal]);

    const CalcularDistancia = (lat1, lon1, lat2, lon2) => {
        const toRad = (v) => (v * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000;
    };

    const formatTime = (segundos) => {
        const m = Math.floor(segundos / 60);
        const s = segundos % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const saveActivity = async () => {
        const reverseGeocode = await Location.reverseGeocodeAsync(
            {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            }
        );
        const nombreLugar = reverseGeocode[0]?.street || reverseGeocode[0]?.city || 'Nexus Zone';

        const newActivity = {
            id: Date.now(),
            fecha: new Date().toLocaleDateString(),
            tiempo: formatTime(tiempo),
            distancia: (distanciaTotal * 1000).toFixed(0) + " m",
            ruta: ruta,
            lugar: nombreLugar,
            calorias: calorias
        };

        try {
            const acts = await AsyncStorage.getItem('actividades');
            let list = acts ? JSON.parse(acts) : [];
            list.push(newActivity);
            await AsyncStorage.setItem('actividades', JSON.stringify(list));

            const token = await AsyncStorage.getItem('token');
            await fetch('http://192.168.0.22:3000/activities', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    tipo: "Running",
                    distancia: (distanciaTotal * 1000).toFixed(0).toString(),
                    tiempo: formatTime(tiempo),
                    calorias: parseFloat(calorias),
                    ruta: JSON.stringify(ruta)
                })
            });
        } catch (e) { console.log(e); }

        showAlert('NEXUS LOG', 'Entrenamiento guardado en la bóveda.', 'success');
    };

    const toggleActivity = async () => {
        if (corriendo) {
            setCorriendo(false);
            if (reloj.current) clearInterval(reloj.current);
            if (vigilante.current) vigilante.current.remove();
            saveActivity();
        } else {
            setTiempo(0);
            setDistanciaTotal(0);
            setRuta([{ latitude: location.coords.latitude, longitude: location.coords.longitude }]);
            setCorriendo(true);
            setCalorias(0);

            reloj.current = setInterval(() => setTiempo(prev => prev + 1), 1000);

            vigilante.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 2000,
                    distanceInterval: 5,
                },
                (newLoc) => {
                    const { latitude, longitude, accuracy } = newLoc.coords;
                    setLocation(newLoc);
                    if (accuracy > 35) return;

                    setRuta((prev) => {
                        const last = prev[prev.length - 1];
                        if (!last) return [{ latitude, longitude }];
                        const dist = CalcularDistancia(last.latitude, last.longitude, latitude, longitude);
                        if (dist < 4 || dist > 200) return prev;

                        setDistanciaTotal(d => d + (dist / 1000));
                        return [...prev, { latitude, longitude }];
                    });
                }
            );
        }
    };

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let currentLoc = await Location.getCurrentPositionAsync({});
            setLocation(currentLoc);
        })();
        return () => {
            if (reloj.current) clearInterval(reloj.current);
            if (vigilante.current) vigilante.current.remove();
        };
    }, []);

    if (!location) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#63ff15" />
                <Text style={styles.loadingText}>SINCRONIZANDO GPS...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                customMapStyle={DARK_MAP_STYLE}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.003,
                    longitudeDelta: 0.003,
                }}
            >
                <Polyline
                    coordinates={ruta}
                    strokeColor="#63ff15"
                    strokeWidth={5}
                    lineDashPattern={[1]}
                />

                <Marker coordinate={location.coords} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.userMarkerContainer}>
                        <View style={styles.userMarkerOuter}>
                            <View style={styles.userMarkerInner} />
                        </View>
                        <View style={styles.userMarkerPulse} />
                    </View>
                </Marker>
            </MapView>

            <SafeAreaView style={styles.overlayUI}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                        <Ionicons name="chevron-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.titleBadge}>
                        <Text style={styles.titleText}>CARDIOTRACK <Text style={{ color: '#63ff15' }}>NEXUS</Text></Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('ActividadGuardada')} style={styles.historyBtn}>
                        <Ionicons name="time-outline" size={24} color="#63ff15" />
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomSection}>
                    <LinearGradient colors={['rgba(20,20,20,0.95)', 'rgba(0,0,0,0.98)']} style={styles.statsCard}>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>TIEMPO</Text>
                                <Text style={styles.statValue}>{formatTime(tiempo)}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>DISTANCIA</Text>
                                <Text style={styles.statValue}>{(distanciaTotal * 1000).toFixed(0)}<Text style={styles.statUnit}>m</Text></Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>KCAL</Text>
                                <Text style={styles.statValue}>{calorias}</Text>
                            </View>
                        </View>

                        <View style={styles.controlsRow}>
                            <TouchableOpacity
                                style={[styles.mainActionBtn, corriendo ? styles.stopBtn : styles.startBtn]}
                                onPress={toggleActivity}
                            >
                                <LinearGradient
                                    colors={corriendo ? ['#ff4d4d', '#cc0000'] : ['#63ff15', '#4ad912']}
                                    style={styles.actionGrad}
                                >
                                    <Ionicons name={corriendo ? "stop" : "play"} size={28} color="black" />
                                    <Text style={styles.actionText}>{corriendo ? "DETENER" : "INICIAR"}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </SafeAreaView>

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    map: { ...StyleSheet.absoluteFillObject },
    loadingContainer: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#63ff15', marginTop: 15, fontWeight: '900', letterSpacing: 2 },
    overlayUI: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    titleBadge: { backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#63ff1540' },
    titleText: { color: 'white', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    historyBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    bottomSection: { marginBottom: 20 },
    statsCard: { borderRadius: 30, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 20 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
    statLabel: { color: '#666', fontSize: 10, fontWeight: '800', marginBottom: 5, letterSpacing: 1 },
    statValue: { color: 'white', fontSize: 24, fontWeight: '900' },
    statUnit: { fontSize: 12, color: '#666', marginLeft: 2 },
    controlsRow: { alignItems: 'center' },
    mainActionBtn: { width: '80%', height: 60, borderRadius: 20, overflow: 'hidden', elevation: 10 },
    actionGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    actionText: { color: 'black', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    userMarkerContainer: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    userMarkerOuter: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(99, 255, 21, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#63ff15' },
    userMarkerInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#63ff15' },
    userMarkerPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(99, 255, 21, 0.15)', borderWidth: 1, borderColor: 'rgba(99, 255, 21, 0.3)' }
});
