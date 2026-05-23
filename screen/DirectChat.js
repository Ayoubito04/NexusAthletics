import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Image, Animated, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Config from '../constants/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = Config.BACKEND_URL;
const { width } = Dimensions.get('window');

// ─── Bubble ──────────────────────────────────────────────────────────────────
const Bubble = ({ item, isMine, showTail }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(isMine ? 16 : -16)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);

    const isPending = item._pending;

    return (
        <Animated.View style={[
            styles.bubbleWrap,
            isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheir,
            { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }
        ]}>
            {isMine ? (
                <LinearGradient
                    colors={isPending ? ['#4acc10aa', '#3aaa09aa'] : ['#63ff15', '#4acc10']}
                    style={[styles.bubble, styles.bubbleMine, showTail && styles.bubbleMineWithTail]}
                >
                    {item.image ? <Image source={{ uri: item.image }} style={styles.msgImage} /> : null}
                    {item.text ? <Text style={styles.textMine}>{item.text}</Text> : null}
                    <View style={styles.timeRow}>
                        <Text style={styles.timeMine}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Ionicons
                            name={isPending ? 'time-outline' : 'checkmark-done'}
                            size={11}
                            color={isPending ? '#1a1a1a' : '#1a6600'}
                        />
                    </View>
                </LinearGradient>
            ) : (
                <View style={[styles.bubble, styles.bubbleTheir, showTail && styles.bubbleTheirWithTail]}>
                    {item.image ? <Image source={{ uri: item.image }} style={styles.msgImage} /> : null}
                    {item.text ? <Text style={styles.textTheir}>{item.text}</Text> : null}
                    <Text style={styles.timeTheir}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            )}
        </Animated.View>
    );
};

// ─── Date separator ──────────────────────────────────────────────────────────
const DateSep = ({ label }) => (
    <View style={styles.dateSepRow}>
        <View style={styles.dateSepLine} />
        <Text style={styles.dateSepText}>{label}</Text>
        <View style={styles.dateSepLine} />
    </View>
);

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function DirectChat() {
    const navigation = useNavigation();
    const route = useRoute();
    const { friendId, friendName, friendAvatar } = route.params;

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [isFocused, setIsFocused] = useState(false);
    const flatListRef = useRef();
    const sendScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        loadData();
        const interval = setInterval(syncMessages, 4000);
        return () => clearInterval(interval);
    }, [syncMessages]);

    const loadData = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) setCurrentUserId(JSON.parse(userData).id);
        await loadMessages();
    };

    const loadMessages = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/chat/dm/${friendId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setMessages(await res.json());
        } catch (_) {}
        finally { setLoading(false); }
    };

    const syncMessages = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/chat/dm/${friendId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const fresh = await res.json();
                setMessages(prev => {
                    const pending = prev.filter(m => m._pending);
                    if (pending.length === 0) return fresh;
                    // If server message count grew vs our confirmed count, pending was delivered
                    const prevConfirmed = prev.length - pending.length;
                    if (fresh.length > prevConfirmed) return fresh;
                    return [...fresh, ...pending];
                });
            }
        } catch (_) {}
    }, [friendId]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true
        });
        if (!result.canceled) sendMessage(null, `data:image/jpeg;base64,${result.assets[0].base64}`);
    };

    const animateSend = () => {
        Animated.sequence([
            Animated.timing(sendScale, { toValue: 0.82, duration: 70, useNativeDriver: true }),
            Animated.spring(sendScale, { toValue: 1, tension: 120, friction: 6, useNativeDriver: true }),
        ]).start();
    };

    const sendMessage = useCallback(async (text = null, image = null) => {
        const msgText = text ?? inputText.trim();
        if (!msgText && !image) return;

        setInputText('');
        animateSend();

        const tempId = Date.now();
        const optimistic = {
            id: tempId,
            _tempId: tempId,
            _pending: true,
            userId: currentUserId,
            text: msgText || null,
            image: image || null,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${BACKEND_URL}/chat/dm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ receiverId: friendId, text: msgText, image })
            });
            syncMessages(); // replace optimistic with real server message
        } catch (_) {
            setMessages(prev => prev.map(m => m._tempId === tempId ? { ...m, _failed: true } : m));
        }
    }, [inputText, currentUserId, friendId, syncMessages]);

    const formatDateLabel = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'Hoy';
        if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long' });
    };

    const renderItem = useCallback(({ item, index }) => {
        const isMine = item.userId === currentUserId;
        const prev = messages[index - 1];
        const next = messages[index + 1];
        const showDate = index === 0 ||
            new Date(item.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
        const showTail = !next || next.senderId !== item.senderId;

        return (
            <>
                {showDate && <DateSep label={formatDateLabel(item.createdAt)} />}
                <Bubble item={item} isMine={isMine} showTail={showTail} />
            </>
        );
    }, [messages, currentUserId]);

    const canSend = inputText.trim().length > 0;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={26} color="white" />
                </TouchableOpacity>

                <View style={styles.headerAvatarWrap}>
                    {friendAvatar
                        ? <Image source={{ uri: friendAvatar }} style={styles.headerAvatar} />
                        : (
                            <LinearGradient colors={['#63ff1530', '#63ff1510']} style={styles.headerAvatarPlaceholder}>
                                <Text style={styles.headerAvatarLetter}>{friendName?.charAt(0) || '?'}</Text>
                            </LinearGradient>
                        )
                    }
                    <View style={styles.onlineDot} />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={styles.headerName}>{friendName}</Text>
                    <Text style={styles.headerStatus}>En línea</Text>
                </View>

                <TouchableOpacity style={styles.headerAction} activeOpacity={0.7}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            {/* KAV wraps messages + input so both move together */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
            >
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color="#63ff15" size="large" />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={item => (item._tempId || item.id).toString()}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconWrap}>
                                    <Ionicons name="chatbubbles-outline" size={38} color="#2a2a2a" />
                                </View>
                                <Text style={styles.emptyTitle}>Inicia la conversación</Text>
                                <Text style={styles.emptySub}>Saluda, comparte progreso o coordina un entreno.</Text>
                            </View>
                        }
                        showsVerticalScrollIndicator={false}
                        keyboardDismissMode="interactive"
                        keyboardShouldPersistTaps="handled"
                    />
                )}

                {/* Input bar */}
                <View style={[styles.inputBar, isFocused && styles.inputBarFocused]}>
                    <TouchableOpacity style={styles.attachBtn} onPress={pickImage} activeOpacity={0.7}>
                        <Ionicons name="image-outline" size={22} color="#555" />
                    </TouchableOpacity>

                    <TextInput
                        style={styles.input}
                        placeholder="Mensaje..."
                        placeholderTextColor="#333"
                        value={inputText}
                        onChangeText={setInputText}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        multiline
                        maxLength={1000}
                        blurOnSubmit={false}
                    />

                    <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                        <TouchableOpacity
                            onPress={() => sendMessage()}
                            disabled={!canSend}
                            activeOpacity={0.85}
                        >
                            {canSend ? (
                                <LinearGradient
                                    colors={['#63ff15', '#4acc10']}
                                    style={styles.sendBtn}
                                >
                                    <Ionicons name="send" size={17} color="black" />
                                </LinearGradient>
                            ) : (
                                <View style={styles.sendBtnDisabled}>
                                    <Ionicons name="send" size={17} color="#333" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#141414',
        backgroundColor: '#0a0a0a', gap: 10,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#141414',
    },
    headerAvatarWrap: { position: 'relative' },
    headerAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#63ff1540' },
    headerAvatarPlaceholder: {
        width: 42, height: 42, borderRadius: 21,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#63ff1540',
    },
    headerAvatarLetter: { color: '#63ff15', fontSize: 18, fontWeight: '900' },
    onlineDot: {
        position: 'absolute', bottom: 1, right: 1,
        width: 11, height: 11, borderRadius: 6,
        backgroundColor: '#63ff15',
        borderWidth: 2, borderColor: '#0a0a0a',
    },
    headerName: { color: '#fff', fontSize: 16, fontWeight: '800' },
    headerStatus: { color: '#63ff15', fontSize: 11, fontWeight: '600', marginTop: 1 },
    headerAction: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#141414',
    },

    // Messages
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 12, paddingVertical: 14, flexGrow: 1, gap: 2 },

    // Date separator
    dateSepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16, paddingHorizontal: 4 },
    dateSepLine: { flex: 1, height: 1, backgroundColor: '#1a1a1a' },
    dateSepText: { color: '#3a3a3a', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    // Bubbles
    bubbleWrap: { marginVertical: 1, maxWidth: width * 0.78 },
    bubbleWrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    bubbleWrapTheir: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8, borderRadius: 20 },
    bubbleMine: { borderBottomRightRadius: 20 },
    bubbleMineWithTail: { borderBottomRightRadius: 4 },
    bubbleTheir: {
        backgroundColor: '#161616', borderWidth: 1, borderColor: '#222',
        borderBottomLeftRadius: 20,
    },
    bubbleTheirWithTail: { borderBottomLeftRadius: 4 },
    textMine: { color: '#000', fontSize: 15, fontWeight: '500', lineHeight: 21 },
    textTheir: { color: '#e8e8e8', fontSize: 15, lineHeight: 21 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, alignSelf: 'flex-end' },
    timeMine: { color: '#1a6600', fontSize: 10, fontWeight: '600' },
    timeTheir: { color: '#444', fontSize: 10, fontWeight: '600', marginTop: 4, alignSelf: 'flex-end' },
    msgImage: { width: 220, height: 160, borderRadius: 12, marginBottom: 6 },

    // Input bar
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: '#0d0d0d',
        borderTopWidth: 1, borderTopColor: '#141414',
    },
    inputBarFocused: { borderTopColor: '#63ff1530' },
    attachBtn: {
        width: 42, height: 42, borderRadius: 21,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#141414', borderWidth: 1, borderColor: '#1e1e1e',
        marginBottom: 1,
    },
    input: {
        flex: 1, backgroundColor: '#141414', borderRadius: 22,
        paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
        color: 'white', fontSize: 15, maxHeight: 120,
        borderWidth: 1, borderColor: '#1e1e1e',
    },
    sendBtn: {
        width: 42, height: 42, borderRadius: 21,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#63ff15', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
    },
    sendBtnDisabled: {
        width: 42, height: 42, borderRadius: 21,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#141414', borderWidth: 1, borderColor: '#1e1e1e',
    },

    // Empty
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#111', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#1a1a1a', marginBottom: 16,
    },
    emptyTitle: { color: '#3a3a3a', fontSize: 17, fontWeight: '800', marginBottom: 8 },
    emptySub: { color: '#2a2a2a', fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 40 },
});
