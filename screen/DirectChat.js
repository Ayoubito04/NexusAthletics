import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = Config.BACKEND_URL;

export default function DirectChat() {
    const navigation = useNavigation();
    const route = useRoute();
    const { friendId, friendName } = route.params;

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
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
        }
    };

    const renderMessage = ({ item }) => {
        const isMine = item.senderId === currentUserId;
        return (
            <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                {item.image && (
                    <Image source={{ uri: item.image }} style={styles.messageImage} />
                )}
                {item.text ? (
                    <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                        {item.text}
                    </Text>
                ) : null}
                <Text style={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.friendAvatar}>
                    <Ionicons name="person" size={20} color="#63ff15" />
                </View>
                <Text style={styles.headerTitle}>{friendName}</Text>
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
                        <Ionicons name="send" size={22} color="black" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
    backBtn: { marginRight: 15 },
    friendAvatar: { width: 35, height: 35, borderRadius: 17.5, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#333' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    chatList: { padding: 20 },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 10 },
    myMessage: { alignSelf: 'flex-end', backgroundColor: '#63ff15', borderBottomRightRadius: 4 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: '#161616', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#222' },
    messageText: { fontSize: 15 },
    myMessageText: { color: 'black', fontWeight: '500' },
    theirMessageText: { color: 'white' },
    timestamp: { fontSize: 9, color: '#666', marginTop: 4, alignSelf: 'flex-end' },
    inputArea: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#222' },
    input: { flex: 1, backgroundColor: '#000', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, color: 'white', fontSize: 14, maxHeight: 100 },
    sendBtn: { backgroundColor: '#63ff15', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    messageImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 5 },
    imagePickerBtn: { marginRight: 10, padding: 5 }
});
