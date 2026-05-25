import React, { useState, useEffect, createContext, useContext } from 'react';
import { LogBox } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadows, radius, rs } from './theme';
import { scheduleInactivityReminder, scheduleDailyMotivation } from './services/NotificationService';

// Ignorar advertencias de NativeEventEmitter y notificaciones en Expo Go
LogBox.ignoreLogs([
  'new NativeEventEmitter()',
  'expo-notifications: Android Push notifications'
]);
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import Home from './screen/Home';
import Login from './screen/Login';
import Register from './screen/register';
import PlanesPago from './screen/PlanesPago';
import NexusIA from './screen/NexusIA';
import Profile from './screen/Profile';
import IGCResult from './screen/IGCResult';
import Community from './screen/Community';
import AdminDashboard from './screen/AdminDashboard';
import SplashScreen from './components/SplashScreen';
import LoadingScreen from './components/LoadingScreen';
import Verification from './screen/Verification';
import Checkout from './screen/Checkout';
import DirectChat from './screen/DirectChat';
import Friends from './screen/Friends';
import BiometricData from './screen/BiometricData';
import BodyScanner from './screen/BodyScanner';
import Analytics from './screen/Analytics';
import Achievements from './screen/Achievements';
import AccountSettings from './screen/AccountSettings';
import ElitePlanScreen from './screen/ElitePlanScreen';
import SavedElitePlans from './screen/SavedElitePlans';
import FoodScanner from './screen/FoodScanner';
import TrainingCalendar from './screen/TrainingCalendar';
import FAQ from './screen/FAQ';
import Ranking from './screen/Ranking';
import MuscleRankings from './screen/MuscleRankings';
import WelcomePlans from './screen/WelcomePlans';
import Notifications from './screen/Notifications';
import UserRanking from './screen/UserRanking';
import Facturacion from './screen/Facturacion';
import DigitalTwin from './screen/DigitalTwin';
import FormAnalysis from './screen/FormAnalysis';
import OnboardingScreen from './screen/OnboardingScreen';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import * as Haptics from 'expo-haptics';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export const LoadingContext = createContext({
  showLoading: (message, subMessage, duration) => {},
  hideLoading: () => {},
});

export const useLoading = () => useContext(LoadingContext);

function TabNavigator() {
  const { showLoading } = useLoading();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: rs(10),
          fontWeight: '600',
          marginBottom: 4,
          letterSpacing: 0.25,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          height: 66,
          borderRadius: radius.tab,
          borderTopWidth: 0,
          borderWidth: 1.2,
          borderColor: 'rgba(99,255,21,0.35)',
          ...shadows.tabBar,
          overflow: 'hidden',
          elevation: 20,
          zIndex: 999,
          shadowColor: '#63ff15',
          shadowOpacity: 0.15,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        },
        tabBarBackground: () => (
          <View style={{ flex: 1 }}>
            <BlurView
              intensity={95}
              tint="dark"
              style={{ ...StyleSheet.absoluteFillObject }}
            />
            <LinearGradient
              colors={['rgba(15,15,18,0.96)', 'rgba(5,5,8,0.99)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ ...StyleSheet.absoluteFillObject }}
            />
          </View>
        ),
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Nexus IA') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === 'Estadísticas') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Comunidad') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
              <Ionicons name={iconName} size={rs(23)} color={color} />
              {focused && (
                <View style={{
                  width: 16,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: '#63ff15',
                  marginTop: 4,
                  shadowColor: '#63ff15',
                  shadowOpacity: 0.9,
                  shadowRadius: 5,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 5,
                }} />
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={Home}
        options={{ tabBarLabel: 'Home' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const isFocused = navigation.isFocused();
            if (!isFocused) {
              showLoading('ACCEDIENDO AL DASHBOARD', 'SINCRONIZANDO CORE SYSTEM...', 800);
            }
          },
        })}
      />
      <Tab.Screen 
        name="Nexus IA" 
        component={NexusIA}
        options={{ tabBarLabel: 'Nexus' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const isFocused = navigation.isFocused();
            if (!isFocused) {
              showLoading('ACCEDIENDO A NEXUS IA', 'SINTONIZANDO RED NEURONAL...', 800);
            }
          },
        })}
      />
      <Tab.Screen 
        name="Estadísticas" 
        component={Analytics}
        options={{ tabBarLabel: 'Stats' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const isFocused = navigation.isFocused();
            if (!isFocused) {
              showLoading('PROCESANDO MÉTRICAS', 'CALCULANDO RENDIMIENTO...', 800);
            }
          },
        })}
      />
      <Tab.Screen 
        name="Comunidad" 
        component={Community}
        options={{ tabBarLabel: 'Social' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const isFocused = navigation.isFocused();
            if (!isFocused) {
              showLoading('CONECTANDO A LA RED', 'SINCRONIZANDO ATLETAS NEXUS...', 800);
            }
          },
        })}
      />
      <Tab.Screen 
        name="Perfil" 
        component={Profile}
        options={{ tabBarLabel: 'Yo' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const isFocused = navigation.isFocused();
            if (!isFocused) {
              showLoading('CARGANDO EXPEDIENTE', 'SINCRONIZANDO CONFIGURACIÓN...', 800);
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}

const screenTransition = {
  animation: 'spring',
  config: {
    stiffness: 280,
    damping: 32,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('token').then(token => {
      setInitialRoute(token ? 'MainTabs' : 'Login');
    }).catch(() => setInitialRoute('Login'));
  }, []);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [loadingSubMsg, setLoadingSubMsg] = useState('');

  const showLoading = (message = '', subMessage = '', duration = 0) => {
    setLoadingMsg(message);
    setLoadingSubMsg(subMessage);
    setLoading(true);

    if (duration > 0) {
      setTimeout(() => {
        setLoading(false);
      }, duration);
    }
  };

  const hideLoading = () => {
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      Updates.checkForUpdateAsync().then(({ isAvailable }) => {
        if (isAvailable) {
          Updates.fetchUpdateAsync().then(() => Updates.reloadAsync()).catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  // Keepalive: ping al servidor cada 14 min para evitar cold starts de Render
  useEffect(() => {
    const ping = () => fetch('https://nexusathletics.onrender.com/').catch(() => {});
    ping();
    const interval = setInterval(ping, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Notificaciones locales: motivación diaria + recordatorio de inactividad
  useEffect(() => {
    scheduleInactivityReminder();
    scheduleDailyMotivation();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!initialRoute) return null;

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      <StripeProvider
        publishableKey="pk_live_51SxCur3T8zYFpQJlxQCx79IL6Kj5Ioby9BuJEWOkWz4ZbKfNSXh7XeDi3bO7Ww8q2FTEOC4ralvwqtFDD6gRcaDC00MwOAK2Tf"
        merchantIdentifier="merchant.com.nexusathletics"
      >
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              transitionSpec: {
                open: screenTransition,
                close: screenTransition,
              },
              cardStyleInterpolator: ({ current, next, layouts }) => {
                return {
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.width * 0.35, 0],
                        }),
                      },
                      {
                        scale: next
                          ? next.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0.985],
                          })
                          : 1,
                      },
                    ],
                    opacity: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.75, 1],
                    }),
                  },
                  overlayStyle: {
                    opacity: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0.12],
                    }),
                  },
                };
              },
            }}
          >
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="PlanesPago" component={PlanesPago} />
            <Stack.Screen name="EntrenadorIA" component={NexusIA} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="IGCResult" component={IGCResult} />
            <Stack.Screen name="Community" component={Community} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
            <Stack.Screen name="Verification" component={Verification} />
            <Stack.Screen name="Checkout" component={Checkout} />
            <Stack.Screen name="DirectChat" component={DirectChat} />
            <Stack.Screen name="Friends" component={Friends} />
            <Stack.Screen name="BiometricData" component={BiometricData} />
            <Stack.Screen name="BodyScanner" component={BodyScanner} />
            <Stack.Screen name="Analytics" component={Analytics} />
            <Stack.Screen name="Achievements" component={Achievements} />
            <Stack.Screen name="AccountSettings" component={AccountSettings} />
            <Stack.Screen name="ElitePlanScreen" component={ElitePlanScreen} />
            <Stack.Screen name="SavedElitePlans" component={SavedElitePlans} />
            <Stack.Screen name="FoodScanner" component={FoodScanner} />
            <Stack.Screen name="TrainingCalendar" component={TrainingCalendar} />
            <Stack.Screen name="FAQ" component={FAQ} />
            <Stack.Screen name="Ranking" component={Ranking} />
            <Stack.Screen name="MuscleRankings" component={MuscleRankings} />
            <Stack.Screen name="WelcomePlans" component={WelcomePlans} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="UserRanking" component={UserRanking} />
            <Stack.Screen name="Facturacion" component={Facturacion} />
            <Stack.Screen name="DigitalTwin" component={DigitalTwin} />
            <Stack.Screen name="FormAnalysis" component={FormAnalysis} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </StripeProvider>
      {loading && (
        <View style={StyleSheet.absoluteFill}>
          <LoadingScreen message={loadingMsg} subMessage={loadingSubMsg} />
        </View>
      )}
    </LoadingContext.Provider>
  );
}
