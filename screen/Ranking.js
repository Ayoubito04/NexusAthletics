import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = Config.BACKEND_URL;

export default function Ranking() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [ranking, setRanking] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [myId, setMyId] = useState(null);

    useEffect(() => {
        loadMyData();
        loadRanking();
    }, []);

    const loadMyData = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) setMyId(JSON.parse(userData).id);
    };

    const loadRanking = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/user/ranking`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRanking(data);
            }
        } catch (error) {
            console.error("Error al cargar ranking:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadRanking();
    };

    const getMedalColor = (index) => {
        switch (index) {
            case 0: return '#FFD700'; // Oro
            case 1: return '#C0C0C0'; // Plata
            case 2: return '#CD7F32'; // Bronce
            default: return '#666';
        }
    };

    const renderUser = ({ item, index }) => {
        const isMe = item.id === myId;
        const isTop3 = index < 3;

        return (
            <LinearGradient
                colors={isMe ? ['#63ff1520', '#111'] : ['#111', '#0a0a0a']}
                style={[styles.userCard, isMe && styles.myCard]}
            >
                <View style={styles.rankContainer}>
                    {isTop3 ? (
                        <MaterialCommunityIcons name="medal" size={24} color={getMedalColor(index)} />
                    ) : (
                        <Text style={styles.rankText}>{index + 1}</Text>
                    )}
                </View>

                <Image
                    source={item.avatar ? { uri: item.avatar } : { uri: 'https://i.ibb.co/vzG7ZkL/ai-logo-a.png' }}
                    style={[styles.avatar, { borderColor: isTop3 ? getMedalColor(index) : '#222' }]}
                />

                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                        {item.nombre} {item.apellido}
                        {isMe && <Text style={styles.meLabel}> (TU)</Text>}
                    </Text>
                    <Text style={styles.userPlan}>{item.plan}</Text>
                </View>

                <View style={styles.statsContainer}>
                    <Text style={styles.kmValue}>{item.totalKm}</Text>
                    <Text style={styles.kmLabel}>KM</Text>
                </View>
            </LinearGradient>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Ranking <Text style={{ color: '#63ff15' }}>Elite</Text></Text>
                    <Text style={styles.headerSub}>Competición entre Amigos</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#63ff15" />
                    <Text style={styles.loaderText}>Calculando posiciones...</Text>
                </View>
            ) : (
                <FlatList
                    data={ranking}
                    renderItem={renderUser}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#63ff15" />
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Añade amigos para ver su progreso y competir con ellos.</Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 25, borderBottomWidth: 1, borderBottomColor: '#111' },
    backBtn: { marginRight: 20 },
    headerTitle: { fontSize: 26, fontWeight: '900', color: 'white' },
    headerSub: { color: '#666', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { color: '#63ff15', marginTop: 15, fontWeight: 'bold' },
    list: { padding: 20 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1a1a1a'
    },
    myCard: { borderColor: '#63ff1540' },
    rankContainer: { width: 35, alignItems: 'center' },
    rankText: { color: '#444', fontSize: 18, fontWeight: '900' },
    avatar: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, marginRight: 15 },
    userInfo: { flex: 1 },
    userName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    userPlan: { color: '#63ff15', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    meLabel: { color: '#63ff15', fontSize: 10 },
    statsContainer: { alignItems: 'flex-end' },
    kmValue: { color: 'white', fontSize: 18, fontWeight: '900' },
    kmLabel: { color: '#666', fontSize: 9, fontWeight: 'bold', marginTop: -2 },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 50 }
});
