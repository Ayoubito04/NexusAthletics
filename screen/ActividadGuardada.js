import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, FlatList, ActivityIndicator, Dimensions, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NexusAlert from '../components/NexusAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const BACKEND_URL = Config.BACKEND_URL;

const MI_ESTILO_MINI = [
    { "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#1a1a1a" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const ActivityItem = React.memo(({ item, onShare, onAnalyze }) => (
    <View style={styles.card}>
        <LinearGradient
            colors={['#1a1a1a', '#111']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        />
        <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
                <LinearGradient
                    colors={['rgba(99, 255, 21, 0.2)', 'rgba(99, 255, 21, 0.05)']}
                    style={styles.iconCircle}
                >
                    <MaterialCommunityIcons
                        name={item.tipo === 'Correr' ? 'run-fast' : 'walk'}
                        size={24}
                        color="#63ff15"
                    />
                </LinearGradient>
                <View>
                    <Text style={styles.tipoText}>{item.tipo || 'Actividad'}</Text>
                    <View style={styles.dateRow}>
                        <Ionicons name="time-outline" size={12} color="#888" />
                        <Text style={styles.dateText}>{item.fecha}</Text>
                    </View>
                </View>
            </View>
            <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => onShare(item)}
            >
                <Ionicons name="share-social" size={18} color="#63ff15" />
            </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
            <View style={styles.mainStat}>
                <Text style={styles.mainStatValue}>{item.distancia}</Text>
                <Text style={styles.mainStatLabel}>KMS</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.sideStats}>
                <View style={styles.sideStatItem}>
                    <View style={styles.sideIconBox}>
                        <Ionicons name="timer-outline" size={14} color="#63ff15" />
                    </View>
                    <Text style={styles.sideStatValue}>{item.tiempo}</Text>
                </View>
                <View style={styles.sideStatItem}>
                    <View style={styles.sideIconBox}>
                        <Ionicons name="flame" size={14} color="#ff4d4d" />
                    </View>
                    <Text style={styles.sideStatValue}>{item.calorias} <Text style={styles.kcalUnit}>kcal</Text></Text>
                </View>
            </View>
        </View>

        <View style={styles.mapWrapper}>
            {item.ruta && Array.isArray(item.ruta) && item.ruta.length > 0 ? (
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: item.ruta[0].latitude,
                        longitude: item.ruta[0].longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    liteMode={true}
                    customMapStyle={MI_ESTILO_MINI}
                >
                    <Polyline
                        coordinates={item.ruta}
                        strokeColor="#63ff15"
                        strokeWidth={3}
                    />
                </MapView>
            ) : (
                <View style={styles.noMap}>
                    <MaterialCommunityIcons name="map-marker-off-outline" size={40} color="#222" />
                    <Text style={styles.noMapText}>Trayectoria no registrada</Text>
                </View>
            )}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.mapOverlay}
            />
            <View style={styles.locationBadge}>
                <Ionicons name="location" size={12} color="#63ff15" />
                <Text style={styles.locationText} numberOfLines={1}>{item.lugar || "Entrenamiento Élite"}</Text>
            </View>
        </View>

        <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onAnalyze(item.calorias)}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#63ff15', '#4ad912']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <MaterialCommunityIcons name="cpu-64-bit" size={20} color="#000" />
                <Text style={styles.actionButtonText}>Analizar con IA Nexus</Text>
                <Ionicons name="chevron-forward" size={18} color="#000" />
            </LinearGradient>
        </TouchableOpacity>
    </View>
));

export default function ActividadGuardada() {
    const navigation = useNavigation();
    const [actividades, setActividades] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [descripcion, setDescripcion] = useState('');
    const [sharing, setSharing] = useState(false);

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

    const verCalorias = (calorias) => {
        navigation.navigate("CalcularCalorias", { actividad: calorias });
    }

    const handleShare = async () => {
        if (!selectedActivity) return;

        try {
            setSharing(true);
            const token = await AsyncStorage.getItem('token');

            if (!token) {
                showAlert("Error", "Debes iniciar sesión para compartir", "error");
                return;
            }

            const response = await fetch(`${BACKEND_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    tipo: selectedActivity.tipo,
                    distancia: selectedActivity.distancia,
                    tiempo: selectedActivity.tiempo,
                    calorias: selectedActivity.calorias,
                    ruta: selectedActivity.ruta,
                    descripcion: descripcion || `${selectedActivity.tipo} - ${selectedActivity.distancia} km`
                })
            });

            if (response.ok) {
                showAlert("¡Éxito!", "Tu actividad ha sido compartida en la comunidad", "success");
                setModalVisible(false);
                setDescripcion('');
                setSelectedActivity(null);
            } else {
                const data = await response.json();
                showAlert("Error", data.error || "No se pudo compartir la actividad", "error");
            }
        } catch (error) {
            console.error("Error al compartir:", error);
            showAlert("Error", "Error de conexión al compartir", "error");
        } finally {
            setSharing(false);
        }
    };

    const openShareModal = (item) => {
        setSelectedActivity(item);
        setModalVisible(true);
    };

    const cargarActividades = async () => {
        try {
            const datos = await AsyncStorage.getItem('actividades');
            if (datos) {
                const parsedData = JSON.parse(datos);
                setActividades(parsedData);
            }
        } catch (error) {
            showAlert("Error", "No se pudo cargar las actividades", "error");
        } finally {
            setCargando(false);
        }
    }

    useEffect(() => {
        cargarActividades();
        const unsubscribe = navigation.addListener('focus', () => {
            cargarActividades();
        });
        return unsubscribe;
    }, []);


    if (cargando) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#63ff15" />
                <Text style={styles.loadingText}>Sincronizando historial...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['rgba(99, 255, 21, 0.15)', 'transparent']}
                style={styles.headerGradient}
            />
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Historial <Text style={styles.titleHighlight}>Elite</Text></Text>
                    <Text style={styles.subtitle}>Tus logros, impulsados por IA</Text>
                </View>
                <TouchableOpacity style={styles.filterBtn}>
                    <Ionicons name="options-outline" size={24} color="#63ff15" />
                </TouchableOpacity>
            </View>

            {actividades.length > 0 ? (
                <FlatList
                    data={actividades}
                    renderItem={({ item }) => (
                        <ActivityItem
                            item={item}
                            onShare={openShareModal}
                            onAnalyze={verCalorias}
                        />
                    )}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={3}
                    maxToRenderPerBatch={3}
                    windowSize={3}
                    removeClippedSubviews={Platform.OS === 'android'}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                        <MaterialCommunityIcons name="lightning-bolt-outline" size={60} color="#333" />
                    </View>
                    <Text style={styles.emptyTitle}>Sin actividad registrada</Text>
                    <Text style={styles.emptySub}>Supera tus límites hoy. Tus entrenamientos aparecerán aquí una vez que los completes.</Text>
                    <TouchableOpacity
                        style={styles.startBtn}
                        onPress={() => navigation.navigate("ActivityMap")}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#1a1a1a', '#0a0a0a']}
                            style={styles.startBtnGradient}
                        >
                            <Text style={styles.startBtnText}>Empezar Entrenamiento</Text>
                            <Ionicons name="play" size={16} color="#63ff15" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Compartir Actividad</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {selectedActivity && (
                            <View style={styles.modalBody}>
                                <View style={styles.activityPreview}>
                                    <MaterialCommunityIcons
                                        name={selectedActivity.tipo === 'Correr' ? 'run-fast' : 'walk'}
                                        size={32}
                                        color="#63ff15"
                                    />
                                    <View style={styles.previewStats}>
                                        <Text style={styles.previewType}>{selectedActivity.tipo}</Text>
                                        <Text style={styles.previewDetail}>
                                            {selectedActivity.distancia} km • {selectedActivity.tiempo} • {selectedActivity.calorias} kcal
                                        </Text>
                                    </View>
                                </View>

                                <TextInput
                                    style={styles.descriptionInput}
                                    placeholder="Agrega una descripción (opcional)..."
                                    placeholderTextColor="#666"
                                    value={descripcion}
                                    onChangeText={setDescripcion}
                                    multiline
                                    maxLength={200}
                                />

                                <TouchableOpacity
                                    style={styles.shareButton}
                                    onPress={handleShare}
                                    disabled={sharing}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#63ff15', '#4ad912']}
                                        style={styles.shareButtonGradient}
                                    >
                                        {sharing ? (
                                            <ActivityIndicator color="#000" size="small" />
                                        ) : (
                                            <>
                                                <Ionicons name="share-social" size={20} color="#000" />
                                                <Text style={styles.shareButtonText}>Compartir en Comunidad</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

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
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#050505',
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        color: '#666',
        marginTop: 15,
        fontSize: 16,
        fontWeight: '500'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingTop: 60,
        paddingBottom: 25,
        zIndex: 1,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
    },
    titleHighlight: {
        color: '#63ff15',
        textShadowColor: 'rgba(99, 255, 21, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitle: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
    filterBtn: {
        backgroundColor: 'rgba(99, 255, 21, 0.05)',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.1)',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    card: {
        borderRadius: 32,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 15,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.2)',
    },
    tipoText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        opacity: 0.7,
    },
    dateText: {
        color: '#aaa',
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '500',
    },
    shareBtn: {
        backgroundColor: 'rgba(99, 255, 21, 0.1)',
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.2)',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 18,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    mainStat: {
        alignItems: 'flex-start',
        flex: 1,
    },
    mainStatValue: {
        color: '#63ff15',
        fontSize: 32,
        fontWeight: '900',
        lineHeight: 32,
    },
    mainStatLabel: {
        color: '#666',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        marginTop: 4,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 15,
    },
    sideStats: {
        flex: 1,
        gap: 12,
    },
    sideStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sideIconBox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sideStatValue: {
        color: '#eee',
        fontSize: 16,
        fontWeight: '700',
    },
    kcalUnit: {
        fontSize: 11,
        color: '#666',
        fontWeight: '600',
    },
    mapWrapper: {
        height: 160,
        marginHorizontal: 20,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 15,
    },
    map: {
        flex: 1,
    },
    mapOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    noMap: {
        flex: 1,
        backgroundColor: '#151515',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    noMapText: {
        color: '#444',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    locationBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(99, 255, 21, 0.3)',
    },
    locationText: {
        color: '#63ff15',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 6,
    },
    actionButton: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#63ff15',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    actionButtonGradient: {
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    actionButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },
    emptyIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#222',
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
    },
    emptySub: {
        color: '#666',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
        fontSize: 14,
        fontWeight: '500',
    },
    startBtn: {
        marginTop: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#63ff15',
        width: '100%',
    },
    startBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    startBtnText: {
        color: '#63ff15',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#111',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        padding: 30,
        paddingBottom: Platform.OS === 'ios' ? 50 : 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '900',
    },
    modalBody: {
        gap: 25,
    },
    activityPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        padding: 20,
        borderRadius: 20,
        gap: 18,
        borderWidth: 1,
        borderColor: '#222',
    },
    previewStats: {
        flex: 1,
    },
    previewType: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
    },
    previewDetail: {
        color: '#888',
        fontSize: 14,
        marginTop: 4,
        fontWeight: '500',
    },
    descriptionInput: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 20,
        color: '#fff',
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#222',
    },
    shareButton: {
        borderRadius: 20,
        overflow: 'hidden',
        height: 60,
    },
    shareButtonGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    shareButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
    }
});