import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;

export default function Notifications() {
    const navigation = useNavigation();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const fadeAnim = new Animated.Value(0);

    useEffect(() => {
        loadNotifications();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, []);

    const loadNotifications = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            const response = await fetch(`${BACKEND_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();

                // Si no hay datos reales, mostramos los estáticos para no dejar la pantalla vacía
                // Pero si hay, los unimos.
                const welcomeNotif = {
                    id: 'welcome',
                    title: '¡Bienvenido a Nexus!',
                    message: 'Comienza tu transformación hoy con nuestro entrenador IA.',
                    type: 'info',
                    time: 'Hoy',
                    icon: 'sparkles'
                };

                const finalData = data.length > 0 ? [welcomeNotif, ...data] : [welcomeNotif];
                setNotifications(finalData);
            } else {
                // Fallback si falla el server
                setNotifications([
                    {
                        id: 'welcome',
                        title: '¡Bienvenido a Nexus!',
                        message: 'Comienza tu transformación hoy con nuestro entrenador IA.',
                        type: 'info',
                        time: 'Hoy',
                        icon: 'sparkles'
                    }
                ]);
            }
            setIsLoading(false);
            setRefreshing(false);
        } catch (error) {
            console.error("Error loading notifications:", error);
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadNotifications();
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'success': return '#63ff15';
            case 'premium': return '#FFD700';
            case 'warning': return '#FFB800';
            default: return '#00D1FF';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#0a0a0a', '#050505']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                >
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notificaciones</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#63ff15" />
                }
            >
                {isLoading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#63ff15" />
                        <Text style={styles.loaderText}>Cargando novedades...</Text>
                    </View>
                ) : notifications.length > 0 ? (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        {notifications.map((notif) => (
                            <TouchableOpacity key={notif.id} style={styles.notifCard} activeOpacity={0.8}>
                                <View style={[styles.iconWrap, { backgroundColor: getIconColor(notif.type) + '15' }]}>
                                    <Ionicons name={notif.icon} size={22} color={getIconColor(notif.type)} />
                                </View>
                                <View style={styles.notifContent}>
                                    <View style={styles.notifHeader}>
                                        <Text style={styles.notifTitle}>{notif.title}</Text>
                                        <Text style={styles.notifTime}>{notif.time}</Text>
                                    </View>
                                    <Text style={styles.notifMessage}>{notif.message}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={60} color="#27272A" />
                        <Text style={styles.emptyTitle}>Todo al día</Text>
                        <Text style={styles.emptyText}>No tienes notificaciones pendientes por ahora.</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A'
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1F1F1F'
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    scrollContent: {
        padding: 20,
        flexGrow: 1
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100
    },
    loaderText: {
        color: '#52525B',
        marginTop: 15,
        fontSize: 14,
        fontWeight: '600'
    },
    notifCard: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#0D0D0D',
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1A1A1A'
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    notifContent: {
        flex: 1,
        justifyContent: 'center'
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    notifTitle: {
        color: 'white',
        fontSize: 15,
        fontWeight: '700'
    },
    notifTime: {
        color: '#52525B',
        fontSize: 11,
        fontWeight: '600'
    },
    notifMessage: {
        color: '#A1A1AA',
        fontSize: 13,
        lineHeight: 18
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100
    },
    emptyTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '800',
        marginTop: 20
    },
    emptyText: {
        color: '#52525B',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40
    }
});
