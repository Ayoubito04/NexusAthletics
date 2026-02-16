import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import NexusAlert from '../components/NexusAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = Config.BACKEND_URL;

export default function Friends() {
    const navigation = useNavigation();
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('friends'); // 'friends' o 'requests'

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

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        await Promise.all([loadFriends(), loadPendingRequests()]);
        setLoading(false);
        setRefreshing(false);
    };

    const loadFriends = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/friends/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setFriends(await response.json());
        } catch (error) {
            console.error(error);
        }
    };

    const loadPendingRequests = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/friends/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setPendingRequests(await response.json());
        } catch (error) {
            console.error(error);
        }
    };

    const handleAccept = async (senderId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/friends/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ senderId })
            });

            if (response.ok) {
                showAlert("Éxito", "Solicitud aceptada. ¡Ya sois amigos!", "success");
                loadAll();
            }
        } catch (error) {
            showAlert("Error", "No se pudo aceptar la solicitud", "error");
        }
    };

    const handleDecline = async (senderId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/friends/decline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ senderId })
            });

            if (response.ok) {
                loadAll();
            }
        } catch (error) {
            showAlert("Error", "No se pudo rechazar la solicitud", "error");
        }
    };

    const renderFriend = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('DirectChat', { friendId: item.id, friendName: item.nombre })}
        >
            <View style={styles.userInfo}>
                <Image source={{ uri: item.avatar || 'https://via.placeholder.com/100' }} style={styles.avatar} />
                <View>
                    <Text style={styles.userName}>{item.nombre}</Text>
                    <Text style={styles.userStatus}>En línea</Text>
                </View>
            </View>
            <Ionicons name="chatbubble-ellipses" size={24} color="#63ff15" />
        </TouchableOpacity>
    );

    const renderRequest = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.userInfo}>
                <Image source={{ uri: item.sender.avatar || 'https://via.placeholder.com/100' }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.sender.nombre} {item.sender.apellido}</Text>
                    <Text style={styles.userEmail}>{item.sender.email}</Text>
                </View>
            </View>
            <View style={styles.requestActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.sender.id)}>
                    <Ionicons name="checkmark" size={20} color="black" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item.sender.id)}>
                    <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Amigos y Comunidad</Text>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
                    onPress={() => setActiveTab('friends')}
                >
                    <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
                        AMIGOS ({friends.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
                    onPress={() => setActiveTab('requests')}
                >
                    <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                        SOLICITUDES ({pendingRequests.length})
                    </Text>
                    {pendingRequests.length > 0 && <View style={styles.notifBadge} />}
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#63ff15" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={activeTab === 'friends' ? friends : pendingRequests}
                    renderItem={activeTab === 'friends' ? renderFriend : renderRequest}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={loadAll} tintColor="#63ff15" />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name={activeTab === 'friends' ? "people-outline" : "mail-unread-outline"} size={80} color="#222" />
                            <Text style={styles.emptyText}>
                                {activeTab === 'friends' ? "Aún no tienes amigos agregados" : "No tienes solicitudes pendientes"}
                            </Text>
                        </View>
                    }
                />
            )}

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', position: 'relative' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: '#63ff15' },
    tabText: { color: '#666', fontWeight: 'bold', fontSize: 12 },
    activeTabText: { color: '#63ff15' },
    notifBadge: { position: 'absolute', top: 12, right: '25%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff4d4d' },
    list: { padding: 20 },
    card: {
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 15,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#222'
    },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15, borderWidth: 1, borderColor: '#333' },
    userName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    userStatus: { color: '#63ff15', fontSize: 12 },
    userEmail: { color: '#666', fontSize: 12 },
    requestActions: { flexDirection: 'row', gap: 10 },
    acceptBtn: { backgroundColor: '#63ff15', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    declineBtn: { backgroundColor: '#333', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#444', fontSize: 14, marginTop: 15, textAlign: 'center' }
});
