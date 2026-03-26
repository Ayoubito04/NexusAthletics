import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Platform, RefreshControl, Image, Alert, Share } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';

const BACKEND_URL = Config.BACKEND_URL;


const UserSearchResult = React.memo(({ item, onAddFriend, onChat }) => (
    <View style={styles.userResultCard}>
        <View style={styles.userInfoMini}>
            <Image source={{ uri: item.avatar || 'https://via.placeholder.com/100' }} style={styles.avatarMini} />
            <View>
                <Text style={styles.userResultName}>{item.nombre} {item.apellido}</Text>
                <Text style={styles.userResultPlan}>{item.plan}</Text>
            </View>
        </View>
        <View style={styles.userResultActions}>
            <TouchableOpacity style={styles.addBtn} onPress={() => onAddFriend(item.id)}>
                <Ionicons name="person-add" size={20} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatBtn} onPress={() => onChat(item)}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#63ff15" />
            </TouchableOpacity>
        </View>
    </View>
));

const PostItem = React.memo(({ item, currentUserId, onLike, onComment, onShare, onChat, navigation, commentingPostId, setCommentingPostId, commentText, setCommentText, handleComment }) => (
    <View style={styles.postCard}>
        <View style={styles.postHeader}>
            <TouchableOpacity style={styles.userInfo} onPress={() => onChat(item.user)}>
                <View style={styles.avatarCircle}>
                    {item.user.avatar ? (
                        <Image source={{ uri: item.user.avatar }} style={styles.postAvatar} />
                    ) : (
                        <Ionicons name="person" size={22} color="#63ff15" />
                    )}
                </View>
                <View>
                    <Text style={styles.userName}>{item.user.nombre} {item.user.apellido}</Text>
                    <View style={styles.planBadge}><Text style={styles.planText}>{item.user.plan}</Text></View>
                </View>
            </TouchableOpacity>
            <Text style={styles.timeAgo}>{new Date(item.createdAt).toLocaleDateString('es-ES')}</Text>
        </View>

        {item.descripcion && <Text style={styles.description}>{item.descripcion}</Text>}

        {item.imagen && (
            <View style={styles.postImageContainer}>
                <Image source={{ uri: item.imagen }} style={styles.postImage} resizeMode="cover" />
            </View>
        )}

        <View style={styles.activityStats}>
            <View style={styles.activityStatItem}>
                <MaterialCommunityIcons name={item.tipo === 'Correr' ? 'run-fast' : 'walk'} size={20} color="#63ff15" />
                <Text style={styles.activityStatText}>{item.tipo}</Text>
            </View>
            <View style={styles.activityStatItem}>
                <Ionicons name="speedometer-outline" size={18} color="#63ff15" />
                <Text style={styles.activityStatText}>{item.distancia} km</Text>
            </View>
            <View style={styles.activityStatItem}>
                <Ionicons name="time-outline" size={18} color="#63ff15" />
                <Text style={styles.activityStatText}>{item.tiempo} min</Text>
            </View>
        </View>

        {item.ruta && Array.isArray(item.ruta) && item.ruta.length > 0 && (
            <View style={styles.routeBadge}>
                <Ionicons name="map-outline" size={14} color="#63ff15" />
                <Text style={styles.routeBadgeText}>Ruta GPS · {item.ruta.length} puntos</Text>
            </View>
        )}

        <View style={styles.interactions}>
            <View style={styles.interactionStats}>
                <Text style={styles.statCount}>{item._count?.likes || 0} likes</Text>
                <Text style={styles.statCount}>{item._count?.comments || 0} comentarios</Text>
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(item.id)}>
                    <Ionicons name={item.likes?.some(l => l.userId === currentUserId) ? "heart" : "heart-outline"} size={22} color={item.likes?.some(l => l.userId === currentUserId) ? "#ff4d4d" : "#666"} />
                    <Text style={[styles.actionText, item.likes?.some(l => l.userId === currentUserId) && styles.likedText]}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentingPostId(item.id === commentingPostId ? null : item.id)}>
                    <Ionicons name="chatbubble-outline" size={20} color="#666" />
                    <Text style={styles.actionText}>Comentar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(item)}>
                    <Ionicons name="share-social-outline" size={20} color="#666" />
                    <Text style={styles.actionText}>Exportar</Text>
                </TouchableOpacity>
            </View>
        </View>

        {item.comments?.length > 0 && (
            <View style={styles.commentsSection}>
                {item.comments.slice(0, 2).map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                        <Text style={styles.commentUser}>{comment.user.nombre}: <Text style={styles.commentText}>{comment.texto}</Text></Text>
                    </View>
                ))}
            </View>
        )}

        {commentingPostId === item.id && (
            <View style={styles.commentInputContainer}>
                <TextInput style={styles.commentInput} placeholder="Escribe un comentario..." placeholderTextColor="#666" value={commentText} onChangeText={setCommentText} />
                <TouchableOpacity style={styles.sendButton} onPress={() => handleComment(item.id)}>
                    <Ionicons name="send" size={20} color="#000" />
                </TouchableOpacity>
            </View>
        )}
    </View>
));

export default function Community() {
    const navigation = useNavigation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [commentingPostId, setCommentingPostId] = useState(null);
    const [commentText, setCommentText] = useState('');

    // Búsqueda y Sugerencias
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestedFriends, setSuggestedFriends] = useState([]);

    useEffect(() => {
        loadUserData();
        loadPosts();
        loadSuggestions();
    }, []);

    const loadUserData = async () => {
        const userData = await AsyncStorage.getItem('user');
        if (userData) setCurrentUserId(JSON.parse(userData).id);
    };

    const loadSuggestions = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/friends/suggested`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setSuggestedFriends(await response.json());
        } catch (error) {
            console.error(error);
        }
    };

    const loadPosts = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/posts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setPosts(await response.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSearch = async (text) => {
        setSearchQuery(text);
        if (text.length < 3) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/users/search?query=${text}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) setSearchResults(await response.json());
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddFriend = async (friendId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/friends/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ receiverId: friendId })
            });

            if (response.ok) {
                Alert.alert("Éxito", "Solicitud de amistad enviada");
                setSearchQuery('');
                setSearchResults([]);
            } else {
                const data = await response.json();
                Alert.alert("Aviso", data.error || "No se pudo enviar la solicitud");
            }
        } catch (error) {
            Alert.alert("Error", "Error de conexión");
        }
    };

    const handleExternalShare = async (post) => {
        try {
            await Share.share({
                message: `Mira mi progreso en Nexus Athletics: ${post.tipo} - ${post.distancia}km en ${post.tiempo}. ¡Únete a la élite!`,
            });
        } catch (error) {
            console.log(error);
        }
    };

    const handleLike = async (postId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${BACKEND_URL}/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadPosts();
        } catch (error) {
            console.error(error);
        }
    };

    const handleComment = async (postId) => {
        if (!commentText.trim()) return;
        try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${BACKEND_URL}/posts/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ texto: commentText })
            });
            setCommentText('');
            setCommentingPostId(null);
            loadPosts();
        } catch (error) {
            console.error(error);
        }
    };


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Comunidad <Text style={styles.titleHighlight}>Elite</Text></Text>
                    <Text style={styles.subtitle}>Conecta con otros atletas</Text>
                </View>
                <TouchableOpacity style={styles.friendsBtn} onPress={() => navigation.navigate('Friends')}>
                    <Ionicons name="people" size={24} color="#63ff15" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#666" style={{ marginLeft: 15 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar atletas por nombre o email..."
                        placeholderTextColor="#444"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color="#666" style={{ marginRight: 10 }} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {searchResults.length > 0 && (
                <View style={styles.searchResultsBox}>
                    <FlatList
                        data={searchResults}
                        renderItem={({ item }) => (
                            <UserSearchResult
                                item={item}
                                onAddFriend={handleAddFriend}
                                onChat={(u) => navigation.navigate('DirectChat', { friendId: u.id, friendName: u.nombre })}
                            />
                        )}
                        keyExtractor={(item) => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 15 }}
                    />
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color="#63ff15" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={posts}
                    ListHeaderComponent={() => (
                        <>
                            {suggestedFriends.length > 0 && (
                                <View style={styles.suggestedSection}>
                                    <Text style={styles.sectionTitle}>Atletas Sugeridos</Text>
                                    <FlatList
                                        data={suggestedFriends}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.suggestedCard}
                                                onPress={() => navigation.navigate('DirectChat', { friendId: item.id, friendName: item.nombre })}
                                            >
                                                <Image source={{ uri: item.avatar || 'https://via.placeholder.com/100' }} style={styles.suggestedAvatar} />
                                                <Text style={styles.suggestedName} numberOfLines={1}>{item.nombre}</Text>
                                                <Text style={styles.suggestedGoal} numberOfLines={1}>{item.objetivo || 'Atleta'}</Text>
                                                <TouchableOpacity
                                                    style={styles.suggestedAddBtn}
                                                    onPress={() => handleAddFriend(item.id)}
                                                >
                                                    <Ionicons name="person-add" size={14} color="black" />
                                                    <Text style={styles.suggestedAddText}>SEGUIR</Text>
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        )}
                                        keyExtractor={(item) => item.id.toString()}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingBottom: 20 }}
                                    />
                                </View>
                            )}
                            {posts.length === 0 && (
                                <View style={styles.emptyFeed}>
                                    <Ionicons name="newspaper-outline" size={60} color="#222" />
                                    <Text style={styles.emptyFeedTitle}>Tu muro está vacío</Text>
                                    <Text style={styles.emptyFeedSub}>Sigue a otros atletas para ver sus progresos o publica tu primera actividad.</Text>
                                </View>
                            )}
                        </>
                    )}
                    renderItem={({ item }) => (
                        <PostItem
                            item={item}
                            currentUserId={currentUserId}
                            onLike={handleLike}
                            onComment={handleComment}
                            onShare={handleExternalShare}
                            onChat={(u) => navigation.navigate('DirectChat', { friendId: u.id, friendName: u.nombre })}
                            navigation={navigation}
                            commentingPostId={commentingPostId}
                            setCommentingPostId={setCommentingPostId}
                            commentText={commentText}
                            setCommentText={setCommentText}
                            handleComment={handleComment}
                        />
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    initialNumToRender={5}
                    maxToRenderPerBatch={5}
                    windowSize={3}
                    removeClippedSubviews={Platform.OS === 'android'}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadPosts} tintColor="#63ff15" />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingTop: 60, paddingBottom: 10 },
    title: { fontSize: 32, fontWeight: '900', color: '#fff' },
    titleHighlight: { color: '#63ff15' },
    subtitle: { color: '#666', fontSize: 14, marginTop: -2 },
    friendsBtn: { backgroundColor: '#111', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: '#222' },
    searchContainer: { paddingHorizontal: 20, marginTop: 15 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 15, height: 50, borderWidth: 1, borderColor: '#222' },
    searchInput: { flex: 1, color: 'white', paddingHorizontal: 10, fontSize: 14 },
    searchResultsBox: { backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#222' },
    userResultCard: { backgroundColor: '#161616', width: 220, padding: 15, borderRadius: 20, marginRight: 15, borderWidth: 1, borderColor: '#333' },
    userInfoMini: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    avatarMini: { width: 40, height: 40, borderRadius: 20 },
    userResultName: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    userResultPlan: { color: '#63ff15', fontSize: 10, fontWeight: 'bold' },
    userResultActions: { flexDirection: 'row', justifyContent: 'space-between' },
    addBtn: { backgroundColor: '#63ff15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, flex: 1, marginRight: 8, alignItems: 'center' },
    chatBtn: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, flex: 0.5, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
    listContent: { padding: 20, paddingBottom: 100 },
    postCard: { backgroundColor: '#111', borderRadius: 25, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#222' },
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarCircle: { width: 45, height: 45, backgroundColor: '#000', borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    userName: { color: '#fff', fontSize: 16, fontWeight: '800' },
    planBadge: { backgroundColor: 'rgba(99, 255, 21, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    planText: { color: '#63ff15', fontSize: 10, fontWeight: 'bold' },
    timeAgo: { color: '#666', fontSize: 12 },
    description: { color: '#ddd', fontSize: 14, lineHeight: 20, marginBottom: 15 },
    activityStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#000', borderRadius: 15, padding: 12, marginBottom: 15 },
    activityStatItem: { alignItems: 'center', gap: 4 },
    activityStatText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    commentUser: { color: '#63ff15', fontWeight: 'bold', fontSize: 12 },
    commentText: { color: '#bbb', fontWeight: 'normal' },
    commentInputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 10 },
    commentInput: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 10, color: '#fff', fontSize: 14 },
    sendButton: { backgroundColor: '#63ff15', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    postAvatar: { width: 45, height: 45, borderRadius: 22.5 },
    postImageContainer: { width: '100%', height: 250, borderRadius: 20, overflow: 'hidden', marginBottom: 15, backgroundColor: '#000' },
    postImage: { width: '100%', height: '100%' },
    routeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(99,255,21,0.08)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 15, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(99,255,21,0.2)' },
    routeBadgeText: { color: '#63ff15', fontSize: 12, fontWeight: '600' },
    interactions: { borderTopWidth: 1, borderTopColor: '#222', paddingTop: 12 },
    interactionStats: { flexDirection: 'row', gap: 15, marginBottom: 12 },
    statCount: { color: '#888', fontSize: 13 },
    actionButtons: { flexDirection: 'row', justifyContent: 'space-between' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionText: { color: '#666', fontSize: 13 },
    likedText: { color: '#ff4d4d' },
    commentsSection: { marginTop: 15, gap: 5 },
    suggestedSection: { paddingHorizontal: 20, marginBottom: 10 },
    sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
    suggestedCard: { backgroundColor: '#111', width: 130, padding: 15, borderRadius: 20, marginRight: 12, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
    suggestedAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 10 },
    suggestedName: { color: 'white', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
    suggestedGoal: { color: '#63ff15', fontSize: 10, marginBottom: 10 },
    suggestedAddBtn: { backgroundColor: '#63ff15', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 5 },
    suggestedAddText: { color: 'black', fontWeight: 'bold', fontSize: 10 },
    emptyFeed: { alignItems: 'center', padding: 40, marginTop: 20 },
    emptyFeedTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 15 },
    emptyFeedSub: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 }
});
