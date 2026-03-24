import { registerRootComponent } from 'expo';

// CAPTURADOR DE ERRORES CRÍTICOS
try {
    console.log('🚀 PROYECTO INICIANDO...');
} catch (e) {
    console.error('🔥 ERROR DE CARGA INICIAL:', e);
}

// Cargar rastreador de ubicación en segundo plano
import './services/LocationTracker';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
