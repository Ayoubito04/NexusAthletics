const { prisma } = require('../config/prisma');
const { sendPushNotification } = require('../services/notificationService');
const { uploadImage } = require('../services/cloudinaryService');

const createPost = async (req, res) => {
    try {
        const { tipo, distancia, tiempo, calorias, ruta, descripcion, imagen, activityId } = req.body;

        let cloudinaryUrl = imagen;
        if (imagen && (imagen.startsWith('data:image') || imagen.length > 500)) {
            // Es un base64, lo subimos
            cloudinaryUrl = await uploadImage(imagen, 'posts');
        }

        const post = await prisma.post.create({
            data: {
                userId: req.user.id,
                activityId,
                tipo,
                distancia: distancia !== undefined ? parseFloat(distancia) : undefined,
                tiempo: tiempo !== undefined ? parseFloat(tiempo) : undefined,
                calorias: calorias !== undefined ? parseFloat(calorias) : undefined,
                ruta,
                descripcion,
                imagen: cloudinaryUrl
            },
            include: {
                user: { select: { id: true, nombre: true, avatar: true, plan: true } },
                likes: true,
                comments: { include: { user: { select: { id: true, nombre: true, avatar: true } } } }
            }
        });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: "Error al crear post" });
    }
};

const getPosts = async (req, res) => {
    try {
        const posts = await prisma.post.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, nombre: true, avatar: true, plan: true } },
                likes: { select: { userId: true } },
                comments: {
                    include: { user: { select: { id: true, nombre: true, avatar: true } } },
                    take: 2,
                    orderBy: { createdAt: 'desc' }
                },
                _count: { select: { likes: true, comments: true } }
            }
        });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener posts" });
    }
};

const toggleLike = async (req, res) => {
    const postId = parseInt(req.params.postId);
    const userId = req.user.id;
    try {
        const existingLike = await prisma.like.findUnique({ where: { postId_userId: { postId, userId } } });
        if (existingLike) {
            await prisma.like.delete({ where: { postId_userId: { postId, userId } } });
            res.json({ liked: false });
        } else {
            await prisma.like.create({ data: { postId, userId } });

            // Notificar al dueño del post (si no es el mismo usuario)
            try {
                const post = await prisma.post.findUnique({
                    where: { id: postId },
                    include: {
                        user: { select: { pushToken: true, id: true } },
                        _count: { select: { likes: true } }
                    }
                });

                const sender = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { nombre: true }
                });

                if (post && post.user && post.user.pushToken && post.user.id !== userId) {
                    await sendPushNotification(
                        post.user.pushToken,
                        "¡Nuevo Like! 🔥",
                        `${sender.nombre || 'Un usuario'} le ha dado like a tu actividad.`,
                        { type: 'like', postId }
                    );
                }
            } catch (pushErr) {
                console.error("Error al notificar like:", pushErr);
            }

            res.json({ liked: true });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al procesar like" });
    }
};

const addComment = async (req, res) => {
    const postId = parseInt(req.params.postId);
    const { texto } = req.body;
    try {
        const comment = await prisma.comment.create({
            data: {
                texto,
                postId,
                userId: req.user.id
            },
            include: { user: { select: { id: true, nombre: true, avatar: true } } }
        });

        // Notificar al dueño del post
        try {
            const post = await prisma.post.findUnique({
                where: { id: postId },
                include: { user: { select: { pushToken: true, id: true } } }
            });

            if (post && post.user && post.user.pushToken && post.user.id !== req.user.id) {
                await sendPushNotification(
                    post.user.pushToken,
                    "Nuevo Comentario 💬",
                    `${comment.user.nombre || 'Un usuario'} comentó: "${texto.substring(0, 30)}${texto.length > 30 ? '...' : ''}"`,
                    { type: 'comment', postId }
                );
            }
        } catch (pushErr) {
            console.error("Error al notificar comentario:", pushErr);
        }

        res.json(comment);
    } catch (error) {
        res.status(500).json({ error: "Error al añadir comentario" });
    }
};

// UPDATE - Actualizar post propio
const updatePost = async (req, res) => {
    const postId = parseInt(req.params.postId);
    const { descripcion } = req.body;
    try {
        const existing = await prisma.post.findFirst({
            where: { id: postId, userId: req.user.id }
        });
        
        if (!existing) {
            return res.status(404).json({ error: "Post no encontrado o sin permisos" });
        }

        const post = await prisma.post.update({
            where: { id: postId },
            data: { descripcion },
            include: {
                user: { select: { id: true, nombre: true, avatar: true, plan: true } },
                likes: { select: { userId: true } },
                comments: { include: { user: { select: { id: true, nombre: true, avatar: true } } } }
            }
        });
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar post" });
    }
};

// DELETE - Eliminar post propio
const deletePost = async (req, res) => {
    const postId = parseInt(req.params.postId);
    try {
        const existing = await prisma.post.findFirst({
            where: { id: postId, userId: req.user.id }
        });
        
        if (!existing) {
            return res.status(404).json({ error: "Post no encontrado o sin permisos" });
        }

        // Eliminar likes y comentarios asociados primero
        await prisma.like.deleteMany({ where: { postId } });
        await prisma.comment.deleteMany({ where: { postId } });
        await prisma.post.delete({ where: { id: postId } });
        
        res.json({ success: true, message: "Post eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar post" });
    }
};

// DELETE - Eliminar comentario propio
const deleteComment = async (req, res) => {
    const commentId = parseInt(req.params.commentId);
    try {
        const existing = await prisma.comment.findFirst({
            where: { id: commentId, userId: req.user.id }
        });
        
        if (!existing) {
            return res.status(404).json({ error: "Comentario no encontrado" });
        }

        await prisma.comment.delete({ where: { id: commentId } });
        res.json({ success: true, message: "Comentario eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar comentario" });
    }
};

module.exports = { createPost, getPosts, toggleLike, addComment, updatePost, deletePost, deleteComment };
