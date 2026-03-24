import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TRACKING_TASK = 'BACKGROUND_LOCATION_TRACKING';

// Función para calcular distancia entre dos coordenadas (Haversine)
const calcularDistancia = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Devuelve metros
};

// Definir la tarea de seguimiento de ubicación
TaskManager.defineTask(LOCATION_TRACKING_TASK, async ({ data, error }) => {
    if (error) {
        console.error('Error en tarea de ubicación en segundo plano:', error);
        return;
    }
    if (data) {
        const { locations } = data;
        const newLocation = locations[0];
        
        try {
            const today = new Date().toDateString();
            
            // Obtener el ID del usuario actual para separar los datos
            const userJson = await AsyncStorage.getItem('user');
            const userDataParsed = userJson ? JSON.parse(userJson) : null;
            const userId = userDataParsed?._id || userDataParsed?.id || 'default';

            const STEPS_KEY = `steps_data_${userId}`;
            const ROUTE_KEY = `nexus_bg_route_${userId}`;
            const DISTANCE_KEY = `nexus_bg_distance_${userId}`;

            // Obtener datos de pasos compartidos con StepCounter
            const savedStepsJson = await AsyncStorage.getItem(STEPS_KEY);
            let stepsData = savedStepsJson ? JSON.parse(savedStepsJson) : { date: today, steps: 0 };
            
            // Si es un nuevo día, resetear
            if (stepsData.date !== today) {
                stepsData = { date: today, steps: 0 };
            }

            // Datos específicos de fondo
            const savedRouteJson = await AsyncStorage.getItem(ROUTE_KEY);
            const savedDistanceJson = await AsyncStorage.getItem(DISTANCE_KEY);
            
            let route = savedRouteJson ? JSON.parse(savedRouteJson) : [];
            let totalDistance = savedDistanceJson ? parseFloat(savedDistanceJson) : 0;
            
            const { latitude, longitude } = newLocation.coords;
            
            if (route.length > 0) {
                const lastPoint = route[route.length - 1];
                const d = calcularDistancia(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
                
                if (d > 2) {
                    totalDistance += d;
                    // Estimación: 1 paso cada 0.75 metros
                    const newSteps = Math.floor(d / 0.75);
                    stepsData.steps += newSteps;
                    
                    route.push({ latitude, longitude });
                }
            } else {
                route.push({ latitude, longitude });
            }
            
            if (route.length > 100) route.shift();
            
            // Guardar todo
            await AsyncStorage.setItem(STEPS_KEY, JSON.stringify(stepsData));
            await AsyncStorage.setItem(ROUTE_KEY, JSON.stringify(route));
            await AsyncStorage.setItem(DISTANCE_KEY, totalDistance.toString());
            
            console.log(`[BG Location][User: ${userId}] Nueva Distancia: ${totalDistance.toFixed(2)}m, Pasos Totales: ${stepsData.steps}`);
            
        } catch (e) {
            console.error('Error procesando ubicación en segundo plano:', e);
        }
    }
});

// Función para iniciar el seguimiento
export const startLocationTracking = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK);
    if (!isRegistered) {
        await Location.startLocationUpdatesAsync(LOCATION_TRACKING_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
            foregroundService: {
                notificationTitle: 'Nexus IA Tracking',
                notificationBody: 'Rastreando tu actividad biológica...',
                notificationColor: '#63ff15',
            },
            pausesLocationUpdatesAutomatically: false,
        });
        console.log('Seguimiento en segundo plano iniciado');
    }
};

// Función para detener el seguimiento
export const stopLocationTracking = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TRACKING_TASK);
    if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TRACKING_TASK);
        console.log('Seguimiento en segundo plano detenido');
    }
};
