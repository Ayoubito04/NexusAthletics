import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
    ActivityIndicator, Platform, RefreshControl, Image, Alert, Share, Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Config from '../constants/Config';
import { useTheme } from '../context/ThemeContext';

const BACKEND_URL = Config.BACKEND_URL;

// ─── Skeleton loader ────────────────────────────────────────────────────────
const SkeletonCard = () => {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });
    return (
        <Animated.View style={[styles.skeletonCard, { opacity }]} accessibilityLabel="Cargando publicación">
            <View style={styles.skeletonHeader}>
                <View style={styles.skeletonAvatar} />
                <View style={{ gap: 8, flex: 1 }}>
                    <View style={[styles.skeletonLine, { width: '55%' }]} />
                    <View style={[styles.skeletonLine, { width: '35%', height: 10 }]} />
                </View>
            </View>
            <View style={[styles.skeletonLine, { width: '90%', marginBottom: 10 }]} />
            <View style={[styles.skeletonLine, { width: '70%' }]} />
        </Animated.View>
    );
};

// ─── Search result card ──────────────────────────────────────────────────────
const UserSearchResult = React.memo(({ item, onAddFriend, onChat }) => (
    <View style={styles.userResultCard} accessible accessibilityLabel={`Perfil de ${item.nombre}, plan ${item.plan}`}>
        <Image
            source={{ uri: item.avatar || 'https://via.placeholder.com/100' }}
            style={styles.userResultAvatar}
            accessibilityLabel={`Avatar de ${item.nombre}`}
        />
        <Text style={styles.userResultName} numberOfLines={1}>{item.nombre}</Text>
        <View style={[styles.miniPlanBadge, item.plan !== 'Gratis' && { backgroundColor: '#63ff1520' }]}>
            <Text style={[styles.miniPlanText, item.plan !== 'Gratis' && { color: '#63ff15' }]}>{item.plan}</Text>
        </View>
        <TouchableOpacity
            onPress={() => onAddFriend(item.id)}
            activeOpacity={0.85}
            style={{ width: '100%' }}
            accessibilityLabel={`Seguir a ${item.nombre}`}
            accessibilityRole="button"
        >
            <LinearGradient colors={['#63ff15', '#4acc10']} style={styles.followBtn}>
                <Ionicons name="person-add" size={14} color="black" />
                <Text style={styles.followBtnText}>SEGUIR</Text>
            </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
            onPress={() => onChat(item)}
            activeOpacity={0.85}
            style={styles.chatMiniBtn}
            accessibilityLabel={`Enviar mensaje a ${item.nombre}`}
            accessibilityRole="button"
        >
            <Ionicons name="chatbubble-ellipses" size={14} color="#63ff15" />
            <Text style={styles.chatMiniBtnText}>Mensaje</Text>
        </TouchableOpacity>
    </View>
));

// ─── Activity stats ──────────────────────────────────────────────────────────
const ActivityStats = React.memo(({ item }) => (
    <View style={styles.statsRow} accessible accessibilityLabel={`Actividad: ${item.tipo}, ${item.distancia} km, ${item.tiempo} minutos`}>
        {[
            { icon: item.tipo === 'Correr' ? 'run-fast' : 'walk', isMCI: true, value: item.tipo },
            { icon: 'speedometer-outline', value: `${item.distancia} km` },
            { icon: 'time-outline', value: `${item.tiempo} min` },
        ].map((s, i) => (
            <React.Fragment key={i}>
                {i > 0 && <View style={styles.statSep} />}
                <View style={styles.statItem}>
                    {s.isMCI
                        ? <MaterialCommunityIcons name={s.icon} size={16} color="#63ff15" />
                        : <Ionicons name={s.icon} size={15} color="#63ff15" />
                    }
                    <Text style={styles.statVal}>{s.value}</Text>
                </View>
            </React.Fragment>
        ))}
    </View>
));

// ─── Workout stats ───────────────────────────────────────────────────────────
const WorkoutStats = React.memo(({ exerciseData, tiempo }) => (
    <View style={styles.workoutBlock} accessible accessibilityLabel="Detalles del entrenamiento">
        {(exerciseData || []).slice(0, 4).map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
                <View style={styles.exerciseDot} />
                <Text style={styles.exerciseName} numberOfLines={1}>{ex.exercise || ex.name}</Text>
                <Text style={styles.exerciseDetail}>{ex.weight}kg × {ex.reps}</Text>
                <View style={styles.ormChip}>
                    <Text style={styles.ormText}>~{ex.oneRepMax}kg</Text>
                </View>
            </View>
        ))}
        {exerciseData?.length > 4 && (
            <Text style={styles.moreExercises}>+{exerciseData.length - 4} ejercicios más</Text>
        )}
        {tiempo > 0 && (
            <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={12} color="#555" />
                <Text style={styles.durationText}>{tiempo} min de entrenamiento</Text>
            </View>
        )}
    </View>
));

// ─── Post card ───────────────────────────────────────────────────────────────
const PostItem = React.memo(({
    item, currentUserId, onLike, onShare, onChat, onDelete,
    commentingPostId, setCommentingPostId, commentText, setCommentText, onComment
}) => {
    const isOwner = item.userId === currentUserId || item.user?.id === currentUserId;
    const { theme } = useTheme();
    const isWorkout = item.tipo === 'Entrenamiento' || item.isPR;
    const isLiked = item.likes?.some(l => l.userId === currentUserId);
    const likeCount = item._count?.likes || 0;
    const commentCount = item._count?.comments || 0;
    const isCommenting = commentingPostId === item.id;

    const heartScale = useRef(new Animated.Value(1)).current;

    const handleLikePress = () => {
        Animated.sequence([
            Animated.timing(heartScale, { toValue: 1.45, duration: 110, useNativeDriver: true }),
            Animated.spring(heartScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
        ]).start();
        onLike(item.id);
    };

    const authorName = `${item.user.nombre} ${item.user.apellido || ''}`.trim();
    const dateLabel = new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

    return (
        <View
            style={[styles.postCard, isWorkout && styles.postCardWorkout, item.isPR && styles.postCardPR, { backgroundColor: theme.surface }]}
            accessible
            accessibilityLabel={`Publicación de ${authorName}${item.isPR ? ', récord personal' : ''}`}
        >
            {item.isPR && (
                <LinearGradient colors={['rgba(255,215,0,0.08)', 'transparent']} style={styles.prGlowBg} />
            )}

            {/* Header */}
            <TouchableOpacity
                style={styles.postHeader}
                onPress={() => onChat(item.user)}
                activeOpacity={0.8}
                accessibilityLabel={`Ver perfil de ${authorName}`}
                accessibilityRole="button"
            >
                <View style={[styles.avatarWrap, item.isPR && styles.avatarWrapPR, isWorkout && !item.isPR && styles.avatarWrapWorkout]}>
                    {item.user.avatar
                        ? <Image source={{ uri: item.user.avatar }} style={styles.avatar} accessibilityLabel={`Foto de ${authorName}`} />
                        : <Text style={styles.avatarLetter}>{item.user.nombre?.charAt(0) || '?'}</Text>
                    }
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.postUserName, { color: theme.text }]}>{authorName}</Text>
                    <View style={styles.badgeRow}>
                        <View style={[
                            styles.planChip,
                            item.user.plan === 'Ultimate' && styles.planChipUltimate,
                            item.user.plan === 'Pro' && styles.planChipPro,
                        ]}>
                            <Text style={[styles.planChipText, item.user.plan !== 'Gratis' && { color: '#63ff15' }]}>
                                {item.user.plan}
                            </Text>
                        </View>
                        {item.isPR && (
                            <View style={styles.prChip}>
                                <Text style={styles.prChipText}>🏆 PR</Text>
                            </View>
                        )}
                        {isWorkout && !item.isPR && (
                            <View style={styles.workoutChip}>
                                <MaterialCommunityIcons name="dumbbell" size={9} color="#63ff15" />
                                <Text style={styles.workoutChipText}>ENTRENO</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Text style={styles.postDate}>{dateLabel}</Text>
            </TouchableOpacity>

            {/* Content */}
            {item.descripcion ? <Text style={[styles.postText, { color: theme.text }]}>{item.descripcion}</Text> : null}

            {item.imagen ? (
                <View style={styles.postImgWrap}>
                    <Image
                        source={{ uri: item.imagen }}
                        style={styles.postImg}
                        resizeMode="cover"
                        accessibilityLabel={`Imagen de ${authorName}`}
                    />
                </View>
            ) : null}

            {isWorkout
                ? <WorkoutStats exerciseData={item.exerciseData} tiempo={item.tiempo} />
                : item.distancia > 0 && <ActivityStats item={item} />
            }

            {/* Actions */}
            <View style={styles.actionsBar}>
                <View style={styles.actionsLeft}>
                    <TouchableOpacity
                        style={[styles.actionPill, isLiked && styles.actionPillLiked]}
                        onPress={handleLikePress}
                        activeOpacity={0.75}
                        accessibilityLabel={isLiked ? `Quitar me gusta, ${likeCount} likes` : `Me gusta, ${likeCount} likes`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isLiked }}
                    >
                        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#ff4d6d' : '#888'} />
                        </Animated.View>
                        <Text style={[styles.actionPillText, isLiked && { color: '#ff4d6d' }]}>
                            {likeCount > 0 ? likeCount : 'Me gusta'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionPill, isCommenting && styles.actionPillComment]}
                        onPress={() => setCommentingPostId(isCommenting ? null : item.id)}
                        activeOpacity={0.75}
                        accessibilityLabel={isCommenting ? 'Cerrar comentarios' : `Comentar, ${commentCount} comentarios`}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isCommenting }}
                    >
                        <Ionicons name={isCommenting ? 'chatbubble' : 'chatbubble-outline'} size={17} color={isCommenting ? '#63ff15' : '#888'} />
                        <Text style={[styles.actionPillText, isCommenting && { color: '#63ff15' }]}>
                            {commentCount > 0 ? commentCount : 'Comentar'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={() => onShare(item)}
                        activeOpacity={0.75}
                        accessibilityLabel="Compartir publicación"
                        accessibilityRole="button"
                    >
                        <Ionicons name="share-social-outline" size={17} color="#888" />
                        <Text style={styles.shareBtnText}>Compartir</Text>
                    </TouchableOpacity>
                    {isOwner && (
                        <TouchableOpacity
                            style={styles.shareBtn}
                            onPress={() => onDelete(item.id)}
                            activeOpacity={0.75}
                            accessibilityLabel="Eliminar publicación"
                            accessibilityRole="button"
                        >
                            <Ionicons name="trash-outline" size={17} color="#ff4d4d" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Comments preview */}
            {item.comments?.length > 0 && (
                <View style={styles.commentsPreview}>
                    {item.comments.slice(0, 2).map(c => (
                        <View key={c.id} style={styles.commentLine}>
                            <View style={styles.commentDot} />
                            <Text style={styles.commentAuthor}>{c.user.nombre} </Text>
                            <Text style={styles.commentBody} numberOfLines={2}>{c.texto}</Text>
                        </View>
                    ))}
                    {item.comments.length > 2 && (
                        <Text style={styles.moreComments}>Ver los {item.comments.length} comentarios</Text>
                    )}
                </View>
            )}

            {/* Comment input */}
            {isCommenting && (
                <View style={styles.commentInputRow}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Escribe un comentario..."
                        placeholderTextColor="#444"
                        value={commentText}
                        onChangeText={setCommentText}
                        autoFocus
                        accessibilityLabel={`Comentario para publicación de ${authorName}`}
                        returnKeyType="send"
                        onSubmitEditing={() => onComment(item.id)}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, !commentText.trim() && { opacity: 0.4 }]}
                        onPress={() => onComment(item.id)}
                        disabled={!commentText.trim()}
                        accessibilityLabel="Enviar comentario"
                        accessibilityRole="button"
                    >
                        <LinearGradient colors={['#63ff15', '#4acc10']} style={styles.sendBtnInner}>
                            <Ionicons name="arrow-up" size={16} color="#000" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function Community() {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [commentingPostId, setCommentingPostId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestedFriends, setSuggestedFriends] = useState([]);

    const fabScale = useRef(new Animated.Value(1)).current;

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
            const res = await fetch(`${BACKEND_URL}/friends/suggested`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSuggestedFriends(await res.json());
        } catch (_) {}
    };

    const loadPosts = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/posts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setPosts(await res.json());
        } catch (_) {}
        finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const handleSearch = useCallback(async (text) => {
        setSearchQuery(text);
        if (text.length < 3) { setSearchResults([]); return; }
        setIsSearching(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/users/search?query=${text}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSearchResults(await res.json());
        } catch (_) {}
        finally { setIsSearching(false); }
    }, []);

    const handleAddFriend = useCallback(async (friendId) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(`${BACKEND_URL}/friends/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ receiverId: friendId })
            });
            if (res.ok) {
                Alert.alert('Solicitud enviada', 'El atleta recibirá tu solicitud de amistad.');
                setSearchQuery('');
                setSearchResults([]);
            } else {
                const data = await res.json();
                Alert.alert('Aviso', data.error || 'No se pudo enviar la solicitud');
            }
        } catch (_) { Alert.alert('Error', 'Error de conexión'); }
    }, []);

    const handleDeletePost = useCallback(async (postId) => {
        Alert.alert('Eliminar publicación', '¿Seguro que quieres eliminar esta publicación?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar', style: 'destructive', onPress: async () => {
                    setPosts(prev => prev.filter(p => p.id !== postId));
                    try {
                        const token = await AsyncStorage.getItem('token');
                        await fetch(`${BACKEND_URL}/posts/${postId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    } catch (_) { loadPosts(); }
                }
            }
        ]);
    }, []);

    const handleLike = useCallback(async (postId) => {
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            const liked = p.likes?.some(l => l.userId === currentUserId);
            return {
                ...p,
                likes: liked
                    ? (p.likes || []).filter(l => l.userId !== currentUserId)
                    : [...(p.likes || []), { userId: currentUserId }],
                _count: { ...p._count, likes: (p._count?.likes || 0) + (liked ? -1 : 1) }
            };
        }));
        try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${BACKEND_URL}/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (_) { loadPosts(); }
    }, [currentUserId]);

    const handleComment = useCallback(async (postId) => {
        const text = commentText.trim();
        if (!text) return;
        setCommentText('');
        setCommentingPostId(null);
        const tempId = Date.now();
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            return {
                ...p,
                comments: [...(p.comments || []), { id: tempId, texto: text, user: { nombre: 'Tú' } }],
                _count: { ...p._count, comments: (p._count?.comments || 0) + 1 }
            };
        }));
        try {
            const token = await AsyncStorage.getItem('token');
            await fetch(`${BACKEND_URL}/posts/${postId}/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ texto: text })
            });
            loadPosts();
        } catch (_) { loadPosts(); }
    }, [commentText]);

    const handleShare = useCallback(async (post) => {
        try {
            const userName = `${post.user?.nombre || ''} ${post.user?.apellido || ''}`.trim();
            const APP_LINK = 'https://play.google.com/store/apps/details?id=com.nexusathletics';

            let message = '';

            if (post.isPR && post.exerciseData?.length > 0) {
                const top = post.exerciseData[0];
                message =
                    `🏆 ¡RÉCORD PERSONAL!\n` +
                    `${userName} acaba de romper su récord en ${top.exercise || top.name}:\n` +
                    `💪 ${top.weight}kg × ${top.reps} reps · 1RM estimado: ${top.oneRepMax}kg\n` +
                    (post.descripcion ? `\n"${post.descripcion}"\n` : '') +
                    `\n⚡ Entrena con IA en Nexus Athletics:\n${APP_LINK}`;
            } else if (post.tipo === 'Entrenamiento' && post.exerciseData?.length > 0) {
                const ejercicios = post.exerciseData.slice(0, 3).map(e => `• ${e.exercise || e.name} ${e.weight}kg`).join('\n');
                message =
                    `💪 ${userName} acaba de completar un entrenamiento:\n` +
                    `${ejercicios}\n` +
                    (post.tiempo > 0 ? `⏱ ${post.tiempo} min\n` : '') +
                    (post.descripcion ? `\n"${post.descripcion}"\n` : '') +
                    `\n⚡ Únete a la élite en Nexus Athletics:\n${APP_LINK}`;
            } else {
                const tipo = post.tipo || 'Actividad';
                message =
                    `🏃 ${userName} completó: ${tipo}` +
                    (post.distancia > 0 ? ` · ${post.distancia}km` : '') +
                    (post.tiempo > 0 ? ` · ${post.tiempo} min` : '') +
                    (post.descripcion ? `\n\n"${post.descripcion}"` : '') +
                    `\n\n⚡ Entrena con IA en Nexus Athletics:\n${APP_LINK}`;
            }

            await Share.share({ message });
        } catch (_) {}
    }, []);

    const navigateToChat = useCallback((u) => {
        navigation.navigate('DirectChat', { friendId: u.id, friendName: u.nombre });
    }, [navigation]);

    const animateFab = () => {
        Animated.sequence([
            Animated.timing(fabScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
            Animated.spring(fabScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
        ]).start();
    };

    const renderPost = useCallback(({ item }) => (
        <PostItem
            item={item}
            currentUserId={currentUserId}
            onLike={handleLike}
            onShare={handleShare}
            onChat={navigateToChat}
            onDelete={handleDeletePost}
            commentingPostId={commentingPostId}
            setCommentingPostId={setCommentingPostId}
            commentText={commentText}
            setCommentText={setCommentText}
            onComment={handleComment}
        />
    ), [currentUserId, handleLike, handleShare, navigateToChat, handleDeletePost, commentingPostId, commentText, handleComment]);

    const ListHeader = useCallback(() => (
        <>
            {suggestedFriends.length > 0 && (
                <View style={styles.suggestedSection}>
                    <View style={styles.sectionRow}>
                        <Ionicons name="flash" size={12} color="#63ff15" />
                        <Text style={styles.sectionLabel}>ATLETAS SUGERIDOS</Text>
                    </View>
                    <FlatList
                        data={suggestedFriends}
                        renderItem={({ item }) => (
                            <UserSearchResult
                                item={item}
                                onAddFriend={handleAddFriend}
                                onChat={navigateToChat}
                            />
                        )}
                        keyExtractor={i => i.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 4 }}
                    />
                </View>
            )}
            {posts.length > 0 && (
                <View style={styles.sectionRow}>
                    <Ionicons name="newspaper-outline" size={12} color="#444" />
                    <Text style={[styles.sectionLabel, { color: '#444' }]}>ACTIVIDAD RECIENTE</Text>
                </View>
            )}
            {posts.length === 0 && !loading && (
                <View style={styles.emptyState}>
                    <LinearGradient
                        colors={['#63ff1510', '#63ff1505']}
                        style={styles.emptyIconWrap}
                    >
                        <Ionicons name="people-outline" size={40} color="#63ff1560" />
                    </LinearGradient>
                    <Text style={styles.emptyTitle}>Sin actividad aún</Text>
                    <Text style={styles.emptySub}>
                        Sigue a otros atletas para ver sus entrenos, records y actividades aquí.
                    </Text>
                    <TouchableOpacity
                        style={styles.emptyBtn}
                        onPress={() => { setSearchQuery(' '); handleSearch(' '); }}
                        activeOpacity={0.85}
                        accessibilityLabel="Buscar atletas para seguir"
                        accessibilityRole="button"
                    >
                        <LinearGradient colors={['#63ff15', '#4acc10']} style={styles.emptyBtnInner}>
                            <Ionicons name="search" size={16} color="#000" />
                            <Text style={styles.emptyBtnText}>Descubrir atletas</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}
        </>
    ), [suggestedFriends, posts.length, loading]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                        Comunidad <Text style={styles.headerGreen}>Elite</Text>
                    </Text>
                    <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Conecta con otros atletas</Text>
                </View>
                <TouchableOpacity
                    style={styles.friendsIconBtn}
                    onPress={() => navigation.navigate('Friends')}
                    accessibilityLabel="Ver solicitudes de amistad"
                    accessibilityRole="button"
                >
                    <Ionicons name="people" size={22} color="#63ff15" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={17} color="#555" style={{ marginLeft: 14 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar atletas por nombre..."
                        placeholderTextColor="#444"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        accessibilityLabel="Buscar atletas"
                        accessibilityHint="Escribe al menos 3 letras"
                        returnKeyType="search"
                    />
                    {isSearching
                        ? <ActivityIndicator size="small" color="#63ff15" style={{ marginRight: 14 }} />
                        : searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => { setSearchQuery(''); setSearchResults([]); }}
                                accessibilityLabel="Limpiar búsqueda"
                                accessibilityRole="button"
                                style={{ padding: 6, marginRight: 8 }}
                            >
                                <Ionicons name="close-circle" size={18} color="#555" />
                            </TouchableOpacity>
                        )
                    }
                </View>
            </View>

            {/* Search results */}
            {searchResults.length > 0 && (
                <View style={styles.searchResultsStrip}>
                    <FlatList
                        data={searchResults}
                        renderItem={({ item }) => (
                            <UserSearchResult
                                item={item}
                                onAddFriend={handleAddFriend}
                                onChat={navigateToChat}
                            />
                        )}
                        keyExtractor={i => i.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
                    />
                </View>
            )}

            {/* Feed */}
            {loading ? (
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                    {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </View>
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={i => i.id.toString()}
                    ListHeaderComponent={ListHeader}
                    contentContainerStyle={styles.feedContent}
                    style={{ backgroundColor: theme.background }}
                    initialNumToRender={5}
                    maxToRenderPerBatch={4}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); loadPosts(); }}
                            tintColor="#63ff15"
                        />
                    }
                />
            )}

            {/* FAB — publicar actividad */}
            <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
                <TouchableOpacity
                    onPress={() => {
                        animateFab();
                        navigation.navigate('TrainingCalendar');
                    }}
                    activeOpacity={1}
                    accessibilityLabel="Registrar nuevo entrenamiento"
                    accessibilityRole="button"
                >
                    <LinearGradient
                        colors={['#63ff15', '#4acc10']}
                        style={styles.fabInner}
                    >
                        <Ionicons name="add" size={28} color="#000" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },

    // Header
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    },
    headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    headerGreen: { color: '#63ff15' },
    headerSub: { color: '#666', fontSize: 12, marginTop: 2, fontWeight: '600' },
    friendsIconBtn: {
        backgroundColor: '#63ff1518', padding: 13, borderRadius: 18,
        borderWidth: 1.5, borderColor: '#63ff1540',
        shadowColor: '#63ff15', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },

    // Section labels
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    sectionLabel: { color: '#63ff15', fontSize: 10, fontWeight: '800', letterSpacing: 2 },

    // Search
    searchWrap: { paddingHorizontal: 16, marginBottom: 10 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212',
        borderRadius: 16, height: 48, borderWidth: 1, borderColor: '#222',
    },
    searchInput: { flex: 1, color: 'white', paddingHorizontal: 10, fontSize: 14 },
    searchResultsStrip: { borderBottomWidth: 1, borderBottomColor: '#151515' },

    // Feed
    feedContent: { paddingHorizontal: 16, paddingBottom: 110 },

    // Skeleton
    skeletonCard: {
        backgroundColor: '#121212', borderRadius: 20, padding: 18,
        marginBottom: 14, borderWidth: 1, borderColor: '#1a1a1a',
    },
    skeletonHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e1e1e' },
    skeletonLine: { height: 13, backgroundColor: '#1e1e1e', borderRadius: 6, marginBottom: 4 },

    // Post card
    postCard: {
        backgroundColor: '#111', borderRadius: 22, padding: 16,
        marginBottom: 14, borderWidth: 1, borderColor: '#1e1e1e', overflow: 'hidden',
    },
    postCardWorkout: { borderColor: '#63ff1530' },
    postCardPR: { borderColor: '#ffd70040' },
    prGlowBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },

    // Post header
    postHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 12, gap: 11,
    },
    avatarWrap: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#2a2a2a', overflow: 'hidden',
    },
    avatarWrapWorkout: { borderColor: '#63ff1550' },
    avatarWrapPR: { borderColor: '#ffd70060' },
    avatar: { width: 46, height: 46, borderRadius: 23 },
    avatarLetter: { color: '#63ff15', fontSize: 18, fontWeight: '900' },
    postUserName: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 5 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
    planChip: { backgroundColor: '#1e1e1e', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    planChipUltimate: { backgroundColor: '#ff4d4d15' },
    planChipPro: { backgroundColor: '#63ff1515' },
    planChipText: { color: '#666', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    prChip: { backgroundColor: '#ffd70018', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#ffd70030' },
    prChipText: { color: '#FFD700', fontSize: 9, fontWeight: '800' },
    workoutChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#63ff1512', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    workoutChipText: { color: '#63ff15', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    postDate: { color: '#555', fontSize: 11, fontWeight: '600' },

    // Post content
    postText: { color: '#ccc', fontSize: 14, lineHeight: 22, marginBottom: 12 },
    postImgWrap: { width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
    postImg: { width: '100%', height: '100%' },

    // Stats
    statsRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0d0d0d', borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
        borderWidth: 1, borderColor: '#63ff1515',
    },
    statItem: { flex: 1, alignItems: 'center', gap: 4 },
    statVal: { color: '#ddd', fontSize: 12, fontWeight: '700' },
    statSep: { width: 1, height: 24, backgroundColor: '#63ff1520' },

    // Workout
    workoutBlock: {
        backgroundColor: '#0d0d0d', borderRadius: 14,
        padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: '#63ff1520',
    },
    exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    exerciseDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#63ff15' },
    exerciseName: { flex: 1, color: '#ccc', fontSize: 13, fontWeight: '600' },
    exerciseDetail: { color: '#777', fontSize: 12 },
    ormChip: { backgroundColor: '#63ff1512', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
    ormText: { color: '#63ff15', fontSize: 10, fontWeight: '700' },
    moreExercises: { color: '#555', fontSize: 11, textAlign: 'center', marginTop: 2 },
    durationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1e1e1e' },
    durationText: { color: '#555', fontSize: 12 },

    // Actions
    actionsBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 14, marginTop: 8, borderTopWidth: 1, borderTopColor: '#1e1e1e',
        flexWrap: 'wrap', gap: 8,
    },
    actionsLeft: { flexDirection: 'row', gap: 8, flex: 1, flexWrap: 'wrap' },
    actionPill: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#161616', paddingHorizontal: 18, paddingVertical: 12,
        borderRadius: 28, borderWidth: 1.5, borderColor: '#252525',
        minWidth: 110,
    },
    actionPillText: { color: '#888', fontSize: 14, fontWeight: '700' },
    actionPillLiked: { backgroundColor: '#ff4d6d15', borderColor: '#ff4d6d40' },
    actionPillComment: { backgroundColor: '#63ff1512', borderColor: '#63ff1540' },
    shareBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 7,
        backgroundColor: '#161616', paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: 28, borderWidth: 1.5, borderColor: '#252525',
    },
    shareBtnText: { color: '#888', fontSize: 14, fontWeight: '700' },

    // Comments
    commentsPreview: { marginTop: 12, gap: 7, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#161616' },
    commentLine: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 },
    commentDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#333', marginTop: 6 },
    commentAuthor: { color: '#ddd', fontWeight: '800', fontSize: 13 },
    commentBody: { color: '#888', fontSize: 13, flex: 1 },
    moreComments: { color: '#555', fontSize: 12, fontWeight: '600', marginTop: 2 },

    commentInputRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14,
        backgroundColor: '#141414', borderRadius: 22, borderWidth: 1.5, borderColor: '#63ff1530',
        paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
    },
    commentInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 6 },
    sendBtn: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
    sendBtnInner: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#63ff15', shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 6,
    },

    // Suggested / search cards
    suggestedSection: { marginBottom: 20 },
    userResultCard: {
        backgroundColor: '#121212', width: 152, padding: 14, borderRadius: 22,
        marginRight: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1e1e1e', gap: 8,
    },
    userResultAvatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: '#63ff1540' },
    userResultName: { color: '#fff', fontWeight: '800', fontSize: 13, textAlign: 'center' },
    miniPlanBadge: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
    miniPlanText: { color: '#555', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    followBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, borderRadius: 14, paddingVertical: 11, width: '100%',
        shadowColor: '#63ff15', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
    },
    followBtnText: { color: 'black', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
    chatMiniBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: '#161616', borderRadius: 14,
        paddingVertical: 10, width: '100%',
        borderWidth: 1.5, borderColor: '#63ff1535',
    },
    chatMiniBtnText: { color: '#63ff15', fontSize: 12, fontWeight: '700' },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 20 },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 20, borderWidth: 1, borderColor: '#63ff1520',
    },
    emptyTitle: { color: '#555', fontSize: 18, fontWeight: '800', marginBottom: 10 },
    emptySub: { color: '#3a3a3a', fontSize: 13, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10, marginBottom: 28 },
    emptyBtn: { borderRadius: 20, overflow: 'hidden', width: '80%' },
    emptyBtnInner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14, paddingHorizontal: 24,
    },
    emptyBtnText: { color: '#000', fontWeight: '900', fontSize: 14 },

    // FAB
    fab: {
        position: 'absolute', bottom: 28, right: 20,
        shadowColor: '#63ff15', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
    },
    fabInner: {
        width: 58, height: 58, borderRadius: 29,
        justifyContent: 'center', alignItems: 'center',
    },
});
