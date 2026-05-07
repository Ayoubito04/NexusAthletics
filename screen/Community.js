import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Platform, RefreshControl, Image, Alert, Share } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

// Stats row for activity posts (running/cycling)
const ActivityStats = ({ item }) => (
    <View style={styles.activityStats}>
        <View style={styles.activityStatItem}>
            <MaterialCommunityIcons name={item.tipo === 'Correr' ? 'run-fast' : 'walk'} size={18} color="#63ff15" />
            <Text style={styles.activityStatText}>{item.tipo}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.activityStatItem}>
            <Ionicons name="speedometer-outline" size={16} color="#63ff15" />
            <Text style={styles.activityStatText}>{item.distancia} km</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.activityStatItem}>
            <Ionicons name="time-outline" size={16} color="#63ff15" />
            <Text style={styles.activityStatText}>{item.tiempo} min</Text>
        </View>
    </View>
);

// Exercise breakdown for workout/PR posts
const WorkoutStats = ({ exerciseData, tiempo }) => (
    <View style={styles.workoutStatsBlock}>
        {(exerciseData || []).slice(0, 4).map((ex, i) => (
            <View key={i} style={styles.workoutExerciseRow}>
                <View style={styles.workoutExerciseDot} />
                <Text style={styles.workoutExerciseName} numberOfLines={1}>{ex.exercise || ex.name}</Text>
                <Text style={styles.workoutExerciseWeight}>{ex.weight}kg × {ex.reps} reps</Text>
                <View style={styles.workoutOneRM}>
                    <Text style={styles.workoutOneRMText}>1RM ~{ex.oneRepMax}kg</Text>
                </View>
            </View>
        ))}
        {exerciseData?.length > 4 && (
            <Text style={styles.workoutMore}>+{exerciseData.length - 4} más</Text>
        )}
        {tiempo > 0 && (
            <View style={styles.workoutDuration}>
                <Ionicons name="time-outline" size={13} color="#555" />
                <Text style={styles.workoutDurationText}>{tiempo} min</Text>
            </View>
        )}
    </View>
);

const PostItem = React.memo(({ item, currentUserId, onLike, onComment, onShare, onChat, navigation, commentingPostId, setCommentingPostId, commentText, setCommentText, handleComment }) => {
    const isWorkout = item.tipo === 'Entrenamiento' || item.isPR;
    const isLiked = item.likes?.some(l => l.userId === currentUserId);
    const likeCount = item._count?.likes || 0;
    const commentCount = item._count?.comments || 0;

    return (
        <View style={[styles.postCard, isWorkout && styles.postCardWorkout]}>
            {isWorkout && item.isPR && (
                <LinearGradient
                    colors={['rgba(255,215,0,0.12)', 'transparent']}
                    style={styles.prGlow}
                />
            )}

            {/* Post header */}
            <View style={styles.postHeader}>
                <TouchableOpacity style={styles.userInfo} onPress={() => onChat(item.user)}>
                    <View style={styles.avatarCircle}>
                        {item.user.avatar ? (
                            <Image source={{ uri: item.user.avatar }} style={styles.postAvatar} />
                        ) : (
                            <Text style={styles.avatarInitial}>{item.user.nombre?.charAt(0) || '?'}</Text>
                        )}
                    </View>
                    <View>
                        <Text style={styles.userName}>{item.user.nombre} {item.user.apellido}</Text>
                        <View style={styles.postMeta}>
                            <View style={[styles.planBadge,
                                item.user.plan === 'Ultimate' && styles.planUltimateBadge,
                                item.user.plan === 'Pro' && styles.planProBadge
                            ]}>
                                <Text style={[styles.planText, item.user.plan !== 'Gratis' && styles.planTextBright]}>
                                    {item.user.plan}
                                </Text>
                            </View>
                            {isWorkout && item.isPR && (
                                <View style={styles.prBadge}>
                                    <Text style={styles.prBadgeText}>🏆 RÉCORD PERSONAL</Text>
                                </View>
                            )}
                            {isWorkout && !item.isPR && (
                                <View style={styles.workoutBadge}>
                                    <MaterialCommunityIcons name="dumbbell" size={10} color="#63ff15" />
                                    <Text style={styles.workoutBadgeText}>ENTRENAMIENTO</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </TouchableOpacity>
                <Text style={styles.timeAgo}>{new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</Text>
            </View>

            {/* Description */}
            {item.descripcion && <Text style={styles.description}>{item.descripcion}</Text>}

            {/* Image */}
            {item.imagen && (
                <View style={styles.postImageContainer}>
                    <Image source={{ uri: item.imagen }} style={styles.postImage} resizeMode="cover" />
                </View>
            )}

            {/* Stats block */}
            {isWorkout ? (
                <WorkoutStats exerciseData={item.exerciseData} tiempo={item.tiempo} />
            ) : (
                item.distancia > 0 && <ActivityStats item={item} />
            )}

            {/* Interactions */}
            <View style={styles.interactions}>
                <View style={styles.interactionStats}>
                    <Text style={styles.statCount}>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</Text>
                    <Text style={styles.statDotSep}>·</Text>
                    <Text style={styles.statCount}>{commentCount} comentarios</Text>
                </View>
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(item.id)}>
                        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#ff4d4d" : "#555"} />
                        <Text style={[styles.actionText, isLiked && styles.likedText]}>Like</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentingPostId(item.id === commentingPostId ? null : item.id)}>
                        <Ionicons name="chatbubble-outline" size={19} color="#555" />
                        <Text style={styles.actionText}>Comentar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(item)}>
                        <Ionicons name="share-social-outline" size={19} color="#555" />
                        <Text style={styles.actionText}>Compartir</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Comments */}
            {item.comments?.length > 0 && (
                <View style={styles.commentsSection}>
                    {item.comments.slice(0, 2).map((comment) => (
                        <View key={comment.id} style={styles.commentItem}>
                            <Text style={styles.commentUser}>{comment.user.nombre}{'  '}<Text style={styles.commentText}>{comment.texto}</Text></Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Comment input */}
            {commentingPostId === item.id && (
                <View style={styles.commentInputContainer}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Escribe un comentario..."
                        placeholderTextColor="#444"
                        value={commentText}
                        onChangeText={setCommentText}
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={() => handleComment(item.id)}>
                        <LinearGradient colors={['#7bff35', '#4dd10e']} style={styles.sendBtnGradient}>
                            <Ionicons name="arrow-up" size={18} color="#000" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
});

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
            <View style={styles.bgLayer} pointerEvents="none">
                <LinearGradient colors={['rgba(99,255,21,0.08)','transparent']} style={styles.bgOrbA} />
                <LinearGradient colors={['rgba(0,209,255,0.07)','transparent']} style={styles.bgOrbB} />
            </View>
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

            <View style={styles.eliteStrip}>
                <Ionicons name="sparkles" size={14} color="#63ff15" />
                <Text style={styles.eliteStripText}>Zona Elite: comparte progreso, récords y retos con tu comunidad.</Text>
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
    container: { flex: 1, backgroundColor: '#060606' },
    bgLayer: { ...StyleSheet.absoluteFillObject },
    bgOrbA: { position: 'absolute', top: -110, right: -70, width: 260, height: 260, borderRadius: 140 },
    bgOrbB: { position: 'absolute', top: 220, left: -90, width: 240, height: 240, borderRadius: 140 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
    title: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    titleHighlight: { color: '#63ff15' },
    subtitle: { color: '#707070', fontSize: 13, marginTop: 1, fontWeight: '600' },
    friendsBtn: { backgroundColor: 'rgba(99,255,21,0.08)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(99,255,21,0.2)' },

    // Search
    searchContainer: { paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17,17,17,0.92)', borderRadius: 18, height: 48, borderWidth: 1, borderColor: 'rgba(99,255,21,0.14)' },
    searchInput: { flex: 1, color: 'white', paddingHorizontal: 12, fontSize: 14 },
    eliteStrip: {
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(99,255,21,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(99,255,21,0.15)',
    },
    eliteStripText: { color: '#A0A0A8', fontSize: 12, fontWeight: '600', flex: 1 },
    searchResultsBox: { backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#111' },
    userResultCard: { backgroundColor: '#141414', width: 200, padding: 14, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: 'rgba(99,255,21,0.1)' },
    userInfoMini: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    avatarMini: { width: 38, height: 38, borderRadius: 19 },
    userResultName: { color: 'white', fontWeight: '700', fontSize: 13 },
    userResultPlan: { color: '#63ff15', fontSize: 10, fontWeight: '700' },
    userResultActions: { flexDirection: 'row', gap: 8 },
    addBtn: { backgroundColor: '#63ff15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, flex: 1, alignItems: 'center' },
    chatBtn: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, flex: 0.5, borderWidth: 1, borderColor: '#222', alignItems: 'center' },

    // Feed
    listContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 6 },
    postCard: {
        backgroundColor: 'rgba(17,17,17,0.93)',
        borderRadius: 24,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    postCardWorkout: {
        borderColor: 'rgba(99,255,21,0.2)',
    },
    prGlow: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 120,
    },

    // Post header
    postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    avatarCircle: { width: 44, height: 44, backgroundColor: '#0a0a0a', borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(99,255,21,0.2)', overflow: 'hidden' },
    postAvatar: { width: 44, height: 44, borderRadius: 22 },
    avatarInitial: { color: '#63ff15', fontSize: 18, fontWeight: '900' },
    userName: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4 },
    postMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    planBadge: { backgroundColor: 'rgba(99,255,21,0.08)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
    planUltimateBadge: { backgroundColor: 'rgba(255,51,102,0.12)' },
    planProBadge: { backgroundColor: 'rgba(99,255,21,0.12)' },
    planText: { color: '#555', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    planTextBright: { color: '#63ff15' },
    prBadge: { backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
    prBadgeText: { color: '#FFD700', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    workoutBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(99,255,21,0.08)', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
    workoutBadgeText: { color: '#63ff15', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    timeAgo: { color: '#444', fontSize: 12, fontWeight: '600', marginTop: 2 },

    // Description
    description: { color: '#D0D0D5', fontSize: 14, lineHeight: 21, marginBottom: 14 },

    // Image
    postImageContainer: { width: '100%', height: 240, borderRadius: 18, overflow: 'hidden', marginBottom: 14, backgroundColor: '#000' },
    postImage: { width: '100%', height: '100%' },

    // Activity stats
    activityStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0a0a0a', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(99,255,21,0.08)' },
    activityStatItem: { flex: 1, alignItems: 'center', gap: 5 },
    activityStatText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    statDivider: { width: 1, height: 28, backgroundColor: 'rgba(99,255,21,0.1)' },

    // Workout stats
    workoutStatsBlock: { backgroundColor: '#0a0a0a', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(99,255,21,0.1)' },
    workoutExerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    workoutExerciseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#63ff15', shadowColor: '#63ff15', shadowOpacity: 0.8, shadowRadius: 3 },
    workoutExerciseName: { flex: 1, color: '#ddd', fontSize: 13, fontWeight: '600' },
    workoutExerciseWeight: { color: '#888', fontSize: 12, fontWeight: '600' },
    workoutOneRM: { backgroundColor: 'rgba(99,255,21,0.08)', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
    workoutOneRMText: { color: '#63ff15', fontSize: 10, fontWeight: '700' },
    workoutMore: { color: '#555', fontSize: 12, fontWeight: '600', marginTop: 2, textAlign: 'center' },
    workoutDuration: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(99,255,21,0.08)', paddingTop: 8 },
    workoutDurationText: { color: '#444', fontSize: 12, fontWeight: '600' },

    // Interactions
    interactions: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12, marginTop: 4 },
    interactionStats: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 10 },
    statCount: { color: '#555', fontSize: 12, fontWeight: '600' },
    statDotSep: { color: '#333', fontSize: 12 },
    actionButtons: { flexDirection: 'row', gap: 24 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.02)' },
    actionText: { color: '#71717A', fontSize: 13, fontWeight: '700' },
    likedText: { color: '#ff4d4d' },

    // Comments
    commentsSection: { marginTop: 12, gap: 6 },
    commentItem: {},
    commentUser: { color: '#fff', fontWeight: '700', fontSize: 13 },
    commentText: { color: '#888', fontWeight: '400' },
    commentInputContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8, backgroundColor: '#0a0a0a', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(99,255,21,0.12)', paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
    commentInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 6 },
    sendButton: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
    sendBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Suggested
    suggestedSection: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: { color: 'white', fontSize: 15, fontWeight: '800', marginBottom: 14, letterSpacing: -0.3 },
    suggestedCard: { backgroundColor: '#111', width: 120, padding: 14, borderRadius: 20, marginRight: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(99,255,21,0.1)' },
    suggestedAvatar: { width: 48, height: 48, borderRadius: 24, marginBottom: 8, borderWidth: 1.5, borderColor: 'rgba(99,255,21,0.3)' },
    suggestedName: { color: 'white', fontWeight: '700', fontSize: 12, marginBottom: 2, textAlign: 'center' },
    suggestedGoal: { color: '#555', fontSize: 10, marginBottom: 10, textAlign: 'center' },
    suggestedAddBtn: { backgroundColor: '#63ff15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
    suggestedAddText: { color: 'black', fontWeight: '800', fontSize: 10 },

    // Empty
    emptyFeed: { alignItems: 'center', padding: 40, marginTop: 20 },
    emptyFeedTitle: { color: '#333', fontSize: 18, fontWeight: '800', marginTop: 15 },
    emptyFeedSub: { color: '#444', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
