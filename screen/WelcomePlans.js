import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function WelcomePlans() {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        loadUser();
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 1000, useNativeDriver: true })
        ]).start();
    }, []);

    const loadUser = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) setUser(JSON.parse(userData));
    };

    const handleContinueFree = () => {
        navigation.navigate('Home');
    };

    const handleSelectPremium = () => {
        navigation.navigate('PlanesPago');
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']} style={styles.gradient}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Text style={styles.welcomeText}>¡BIENVENIDO, {user?.nombre?.toUpperCase() || 'ATLETA'}!</Text>
                        <Text style={styles.title}>Lleva tu entrenamiento al <Text style={styles.neonText}>SIGUIENTE NIVEL</Text></Text>
                    </Animated.View>

                    <Animated.View style={[styles.promoCard, { opacity: fadeAnim }]}>
                        <LinearGradient colors={['#63ff1520', '#000']} style={styles.promoGrad}>
                            <View style={styles.promoBadge}>
                                <Text style={styles.promoBadgeText}>OFERTA POR TIEMPO LIMITADO</Text>
                            </View>
                            <MaterialCommunityIcons name="crown" size={40} color="#63ff15" />
                            <Text style={styles.promoTitle}>DESBLOQUEA EL PODER DE LA ÉLITE</Text>
                            <Text style={styles.promoDesc}>
                                Los usuarios Pro y Ultimate desbloquean la <Text style={{ fontWeight: 'bold', color: '#63ff15' }}>IA de Fisiología Aplicada</Text> y rutinas personalizadas de nivel competición.
                            </Text>

                            <View style={styles.featureList}>
                                <View style={styles.featureItem}>
                                    <Ionicons name="checkmark-sharp" size={20} color="#63ff15" />
                                    <Text style={styles.featureText}>Rutinas Canvas IA Ilimitadas</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <Ionicons name="checkmark-sharp" size={20} color="#63ff15" />
                                    <Text style={styles.featureText}>Análisis de Imágenes Vision IA</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <Ionicons name="checkmark-sharp" size={20} color="#63ff15" />
                                    <Text style={styles.featureText}>Soporte Premium 24/7</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.premiumBtn} onPress={handleSelectPremium}>
                                <Text style={styles.premiumBtnText}>VER PLANES PREMIUM</Text>
                                <Ionicons name="arrow-forward" size={18} color="black" />
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>

                    <TouchableOpacity style={styles.freeLink} onPress={handleContinueFree}>
                        <Text style={styles.freeLinkText}>Continuar con la versión gratuita (IA Ilimitada incluida)</Text>
                    </TouchableOpacity>

                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    gradient: { flex: 1 },
    scrollContent: { padding: 25, alignItems: 'center', justifyContent: 'center', minHeight: '100%' },
    header: { alignItems: 'center', marginBottom: 40 },
    welcomeText: { color: '#666', fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
    title: { color: 'white', fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 40 },
    neonText: { color: '#63ff15' },
    promoCard: { width: '100%', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#63ff1540', backgroundColor: '#000' },
    promoGrad: { padding: 30, alignItems: 'center' },
    promoTitle: { color: 'white', fontSize: 20, fontWeight: '900', textAlign: 'center', marginTop: 15, marginBottom: 10 },
    promoDesc: { color: '#aaa', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 25 },
    featureList: { alignSelf: 'flex-start', marginBottom: 30, gap: 12 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureText: { color: '#eee', fontSize: 14, fontWeight: '500' },
    promoBadge: { backgroundColor: '#63ff15', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 15 },
    promoBadgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    premiumBtn: { backgroundColor: '#63ff15', width: '100%', height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    premiumBtnText: { color: 'black', fontWeight: '900', fontSize: 16 },
    freeLink: { marginTop: 30, padding: 10 },
    freeLinkText: { color: '#555', fontSize: 13, textDecorationLine: 'underline', fontWeight: 'bold' }
});
