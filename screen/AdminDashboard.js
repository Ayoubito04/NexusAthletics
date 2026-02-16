import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Platform
} from 'react-native';
import NexusAlert from '../components/NexusAlert';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from '../constants/Config';
const API_URL = Config.BACKEND_URL;

export default function AdminDashboard() {
    const navigation = useNavigation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // NexusAlert State
    const [alert, setAlert] = useState({ visible: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null, confirmText: 'ACEPTAR' });

    const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null, confirmText = 'ACEPTAR') => {
        setAlert({
            visible: true,
            title,
            message,
            type,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setAlert(prev => ({ ...prev, visible: false }));
            },
            onCancel: onCancel ? () => {
                onCancel();
                setAlert(prev => ({ ...prev, visible: false }));
            } : null,
            confirmText
        });
    };

    const fetchUsers = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_URL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setUsers(data);
            } else {
                showAlert('Error', data.error || 'No se pudieron cargar los usuarios', 'error');
            }
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Error de conexión con el servidor', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleUpdatePlan = async (userId, currentPlan) => {
        // Para simplicidad en NexusAlert por ahora, usaremos showAlert secuencial o normal.
        // Pero como NexusAlert es binario (Confirm/Cancel), haremos una lógica de selección simplificada
        // o mantendremos el Alert.alert nativo SOLO si es una lista compleja (ActionSheet).
        // Sin embargo, el usuario quiere TODO con NexusAlert.
        // Así que ofreceremos pasar a PRO o ULTIMATE como confirmaciones separadas si es necesario,
        // o crearemos un componente de selección.
        // Por ahora, para no complicar, cambiaremos a un mensaje genérico de confirmación para el siguiente plan.
        const nextPlan = currentPlan === 'Gratis' ? 'Pro' : 'Ultimate';
        showAlert(
            'Subir Plan',
            `¿Deseas cambiar el plan de este usuario a ${nextPlan}?`,
            'info',
            async () => {
                try {
                    const token = await AsyncStorage.getItem('token');
                    const response = await fetch(`${API_URL}/admin/users/${userId}/plan`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ plan: nextPlan })
                    });
                    if (response.ok) {
                        showAlert('Éxito', 'Plan actualizado correctamente', 'success');
                        fetchUsers();
                    } else {
                        const data = await response.json();
                        showAlert('Error', data.error || 'No se pudo actualizar el plan', 'error');
                    }
                } catch (error) {
                    showAlert('Error', 'Error de conexión', 'error');
                }
            },
            () => { },
            "CAMBIAR"
        );
    };

    const handleDeleteUser = (userId, userEmail) => {
        showAlert(
            'Eliminar Usuario',
            `¿Estás seguro de que deseas eliminar a ${userEmail}?`,
            'warning',
            async () => {
                try {
                    const token = await AsyncStorage.getItem('token');
                    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        showAlert('Éxito', 'Usuario eliminado', 'success');
                        fetchUsers();
                    } else {
                        const data = await response.json();
                        showAlert('Error', data.error || 'No se pudo eliminar el usuario', 'error');
                    }
                } catch (error) {
                    showAlert('Error', 'Error de conexión', 'error');
                }
            },
            () => { },
            "ELIMINAR"
        );
    };

    const renderUserItem = ({ item }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.nombre} {item.apellido}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.planBadge}>
                    <Text style={[styles.planText, item.plan === 'Ultimate' ? styles.ultimateText : item.plan === 'Pro' ? styles.proText : styles.gratisText]}>
                        Plan: {item.plan}
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleUpdatePlan(item.id, item.plan)}
                >
                    <Ionicons name="create-outline" size={24} color="#63ff15" />
                </TouchableOpacity>
                {item.role !== 'ADMIN' && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteUser(item.id, item.email)}
                    >
                        <Ionicons name="trash-outline" size={24} color="#ff4d4d" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#63ff15" />
                </TouchableOpacity>
                <Text style={styles.title}>Panel Admin</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#63ff15" style={{ flex: 1 }} />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderUserItem}
                    contentContainerStyle={styles.listContent}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchUsers();
                    }}
                    refreshing={refreshing}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No hay usuarios registrados</Text>
                    }
                />
            )}

            <NexusAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onConfirm={alert.onConfirm}
                onCancel={alert.onCancel}
                confirmText={alert.confirmText}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    backButton: {
        padding: 5,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 15,
    },
    userCard: {
        backgroundColor: '#111',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    userEmail: {
        color: '#aaa',
        fontSize: 14,
        marginTop: 2,
    },
    planBadge: {
        marginTop: 8,
    },
    planText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    gratisText: {
        color: '#63ff15',
    },
    proText: {
        color: '#3498db',
    },
    ultimateText: {
        color: '#e74c3c',
    },
    actions: {
        flexDirection: 'row',
    },
    actionButton: {
        marginLeft: 15,
        padding: 5,
    },
    emptyText: {
        color: '#555',
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    }
});
