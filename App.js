import React, { useState, useEffect } from 'react';
import { LogBox } from 'react-native';

// Ignorar advertencias de NativeEventEmitter y notificaciones en Expo Go
LogBox.ignoreLogs([
  'new NativeEventEmitter()',
  'expo-notifications: Android Push notifications'
]);
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Animated, Easing } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import Home from './screen/Home';
import Details from './screen/Details';
import Login from './screen/Login';
import Register from './screen/register';
import ActividadGuardada from './screen/ActividadGuardada';
import CalcularCalorias from './screen/CalcularCalorias';
import PlanesPago from './screen/PlanesPago';
import EntrenadorIA from './screen/EntrenadorIA';
import Profile from './screen/Profile';
import IGCResult from './screen/IGCResult';
import Community from './screen/Community';
import AdminDashboard from './screen/AdminDashboard';
import SplashScreen from './components/SplashScreen';
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
import HealthSync from './screen/HealthSync';
import FAQ from './screen/FAQ';
import Ranking from './screen/Ranking';
import VoiceCoach from './screen/VoiceCoach';
import MuscleRankings from './screen/MuscleRankings';
import WelcomePlans from './screen/WelcomePlans';
import Notifications from './screen/Notifications';
import StepsHistory from './screen/StepsHistory';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { BlurView } from 'expo-blur';

import * as Haptics from 'expo-haptics';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        tabBarStyle: {
          backgroundColor: 'transparent',
          position: 'absolute',
          bottom: 20,
          left: 15,
          right: 15,
          height: 75,
          borderRadius: 30,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#63ff15',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
        tabBarBackground: () => (
          <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
          </BlurView>
        ),
        tabBarActiveTintColor: '#63ff15',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.3)',
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
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 5 }}>
              <Ionicons name={iconName} size={focused ? 24 : 22} color={color} />
              {focused && (
                <View style={{
                  position: 'absolute',
                  top: -10,
                  width: 30,
                  height: 2,
                  backgroundColor: '#63ff15',
                  borderRadius: 1,
                  shadowColor: '#63ff15',
                  shadowOpacity: 0.8,
                  shadowRadius: 6,
                  elevation: 5
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
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tab.Screen 
        name="Nexus IA" 
        component={EntrenadorIA}
        options={{ tabBarLabel: 'Nexus' }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        }}
      />
      <Tab.Screen 
        name="Estadísticas" 
        component={Analytics}
        options={{ tabBarLabel: 'Stats' }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tab.Screen 
        name="Comunidad" 
        component={Community}
        options={{ tabBarLabel: 'Social' }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={Profile}
        options={{ tabBarLabel: 'Yo' }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
    </Tab.Navigator>
  );
}

const forFade = ({ current, next }) => {
// ... (mantenemos el resto igual)
  const opacity = Animated.add(
    current.progress,
    next ? next.progress : 0
  ).interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 0],
  });

  return {
    leftButtonStyle: { opacity },
    rightButtonStyle: { opacity },
    titleStyle: { opacity },
    backgroundStyle: { opacity },
  };
};

const config = {
  animation: 'spring',
  config: {
    stiffness: 1000,
    damping: 500,
    mass: 3,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <StripeProvider
      publishableKey="pk_test_51SxCv7KV7EtlOjzAPkr9kxPg19zo18IXDudvJVZtWszzdMPth6jVFcWJGCSC4UljrAk5Sp1gcMchHUjhNNBnvHgu00xElYfcej"
      merchantIdentifier="merchant.com.nexusathletics"
    >
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            transitionSpec: {
              open: config,
              close: config,
            },
            cardStyleInterpolator: ({ current, next, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                    {
                      scale: next
                        ? next.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.95],
                        })
                        : 1,
                    },
                  ],
                  opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
                overlayStyle: {
                  opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                },
              };
            },
          }}
        >
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Details" component={Details} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="ActividadGuardada" component={ActividadGuardada} />
          <Stack.Screen name="CalcularCalorias" component={CalcularCalorias} />
          <Stack.Screen name="PlanesPago" component={PlanesPago} />
          <Stack.Screen name="EntrenadorIA" component={EntrenadorIA} />
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
          <Stack.Screen name="HealthSync" component={HealthSync} />
          <Stack.Screen name="FAQ" component={FAQ} />
          <Stack.Screen name="Ranking" component={Ranking} />
          <Stack.Screen name="VoiceCoach" component={VoiceCoach} />
          <Stack.Screen name="MuscleRankings" component={MuscleRankings} />
          <Stack.Screen name="WelcomePlans" component={WelcomePlans} />
          <Stack.Screen name="Notifications" component={Notifications} />
          <Stack.Screen name="StepsHistory" component={StepsHistory} />
        </Stack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );
}
