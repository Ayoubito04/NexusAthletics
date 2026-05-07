import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND_URL = Config.BACKEND_URL;

export default function DirectChat() {
    const navigation = useNavigation();
    const route = useRoute();
    const { friendId, friendName } = route.params;

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef();

    useEffect(() => {
        loadData();
        const interval = setInterval(loadMessages, 5000); // Polling cada 5 segundos
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setCurrentUserId(user.id);
        }
        await loadMessages();
    };

    const loadMessages = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/chat/dm/${friendId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMessages(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true
        });

        if (!result.canceled) {
            handleSend(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleSend = async (base64Image = null) => {
        if (!inputText.trim() && !base64Image) return;

        const textToSend = inputText;
        setInputText('');

        try {
            setSending(true);
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/chat/dm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    receiverId: friendId,
                    text: textToSend,
                    image: base64Image
                })
            });

            if (response.ok) {
                loadMessages();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    const formatDateLabel = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'Hoy';
        if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    };

    const shouldShowDateSeparator = (item, index) => {
        if (index === 0) return true;
        const prev = messages[index - 1];
        return new Date(item.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
    };

    const renderMessage = ({ item, index }) => {
        const isMine = item.senderId === currentUserId;
        return (
            <>
                {shouldShowDateSeparator(item, index) && (
                    <View style={styles.dateSeparatorWrap}>
                        <Text style={styles.dateSeparator}>{formatDateLabel(item.createdAt)}</Text>
                    </View>
                )}
                <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheir]}>
                    {!isMine && <View style={styles.miniAvatarDot} />}
                    <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                        {item.image && (
                            <Image source={{ uri: item.image }} style={styles.messageImage} />
                        )}
                        {item.text ? (
                            <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                                {item.text}
                            </Text>
                        ) : null}
                        <Text style={[styles.timestamp, isMine && styles.timestampMine]}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </View>
            </>
        );
    };

    const EmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={42} color="#2f2f36" />
            <Text style={styles.emptyTitle}>Inicia la conversación</Text>
            <Text style={styles.emptyText}>Saluda, comparte una foto o coordina un entrenamiento.</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.bgLayer} pointerEvents="none">
                <LinearGradient colors={['rgba(99,255,21,0.08)','transparent']} style={styles.bgOrb1} />
                <LinearGradient colors={['rgba(0,209,255,0.06)','transparent']} style={styles.bgOrb2} />
            </View>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.friendAvatar}>
                    <Ionicons name="person" size={20} color="#63ff15" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{friendName}</Text>
                    <Text style={styles.headerSub}>Chat privado</Text>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#63ff15" style={{ flex: 1 }} />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.chatList}
                    onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
                    ListEmptyComponent={<EmptyState />}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputArea}>
                    <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                        <Ionicons name="image-outline" size={24} color="#63ff15" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.input}
                        placeholder="Escribe un mensaje..."
                        placeholderTextColor="#666"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={() => handleSend()}>
                        {sending ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <Ionicons name="send" size={20} color="black" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    bgLayer: { ...StyleSheet.absoluteFillObject },
    bgOrb1: { position: 'absolute', width: 240, height: 240, borderRadius: 140, top: -90, right: -70 },
    bgOrb2: { position: 'absolute', width: 220, height: 220, borderRadius: 140, top: 240, left: -80 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(99,255,21,0.12)', backgroundColor: 'rgba(10,10,10,0.9)' },
    backBtn: { marginRight: 15 },
    friendAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: 'rgba(99,255,21,0.25)' },
    headerTitle: { color: 'white', fontSize: 17, fontWeight: '800' },
    headerSub: { color: '#6f6f76', fontSize: 11, marginTop: 1, fontWeight: '600' },
    chatList: { padding: 14, paddingBottom: 8, flexGrow: 1 },
    dateSeparatorWrap: { alignItems: 'center', marginVertical: 8 },
    dateSeparator: {
        color: '#7a7a84',
        fontSize: 11,
        fontWeight: '700',
        backgroundColor: 'rgba(255,255,255,0.04)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    messageRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
    messageRowMine: { justifyContent: 'flex-end' },
    messageRowTheir: { justifyContent: 'flex-start' },
    miniAvatarDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#63ff15',
        marginRight: 6,
        marginBottom: 10,
        opacity: 0.7,
    },
    messageBubble: { maxWidth: '82%', padding: 12, borderRadius: 16 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#63ff15', borderBottomRightRadius: 4 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: '#161616', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    messageText: { fontSize: 15 },
    myMessageText: { color: 'black', fontWeight: '500' },
    theirMessageText: { color: '#F1F1F4' },
    timestamp: { fontSize: 9, color: '#7d7d86', marginTop: 6, alignSelf: 'flex-end', fontWeight: '600' },
    timestampMine: { color: '#1b1b1b' },
    inputArea: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(17,17,17,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(99,255,21,0.12)' },
    input: { flex: 1, backgroundColor: '#0a0a0a', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, color: 'white', fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    sendBtn: { backgroundColor: '#63ff15', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    messageImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 5 },
    imagePickerBtn: { marginRight: 10, padding: 6, borderRadius: 12, backgroundColor: 'rgba(99,255,21,0.08)', borderWidth: 1, borderColor: 'rgba(99,255,21,0.15)' },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 30 },
    emptyTitle: { color: '#bdbdc4', fontSize: 16, fontWeight: '800', marginTop: 12 },
    emptyText: { color: '#6e6e75', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 19 },
});
