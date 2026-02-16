const { prisma } = require('../config/prisma');

const requestFriend = async (req, res) => {
    const { receiverId } = req.body;
    try {
        const friendship = await prisma.friendship.create({
            data: { senderId: req.user.id, receiverId: parseInt(receiverId), status: 'PENDIENTE' }
        });
        res.json(friendship);
    } catch (error) {
        res.status(400).json({ error: "Solicitud ya enviada o error" });
    }
};

const getFriends = async (req, res) => {
    try {
        const friends = await prisma.friendship.findMany({
            where: { OR: [{ senderId: req.user.id, status: 'ACEPTADA' }, { receiverId: req.user.id, status: 'ACEPTADA' }] },
            include: {
                sender: { select: { id: true, nombre: true, avatar: true } },
                receiver: { select: { id: true, nombre: true, avatar: true } }
            }
        });
        const friendList = friends.map(f => f.senderId === req.user.id ? f.receiver : f.sender);
        res.json(friendList);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener amigos" });
    }
};

const acceptFriend = async (req, res) => {
    const { senderId } = req.body;
    try {
        await prisma.friendship.update({
            where: { senderId_receiverId: { senderId: parseInt(senderId), receiverId: req.user.id } },
            data: { status: 'ACEPTADA' }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: "No se pudo aceptar la solicitud" });
    }
};

const getNotificationsCount = async (req, res) => {
    try {
        const pendingCount = await prisma.friendship.count({
            where: { receiverId: req.user.id, status: 'PENDIENTE' }
        });
        res.json({ total: pendingCount });
    } catch (error) {
        res.status(500).json({ error: "Error al contar notificaciones" });
    }
};

const getPendingRequests = async (req, res) => {
    try {
        const requests = await prisma.friendship.findMany({
            where: { receiverId: req.user.id, status: 'PENDIENTE' },
            include: { sender: { select: { id: true, nombre: true, avatar: true, email: true } } }
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener solicitudes" });
    }
};

const declineRequest = async (req, res) => {
    const { senderId } = req.body;
    try {
        await prisma.friendship.delete({
            where: { senderId_receiverId: { senderId: parseInt(senderId), receiverId: req.user.id } }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: "No se pudo rechazar la solicitud" });
    }
};

const searchUsers = async (req, res) => {
    const { query } = req.query;
    try {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { nombre: { contains: query, mode: 'insensitive' } },
                    { apellido: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ],
                NOT: { id: req.user.id }
            },
            select: { id: true, nombre: true, apellido: true, avatar: true, plan: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Error en la búsqueda" });
    }
};

const getSuggestedFriends = async (req, res) => {
    try {
        // Obtener IDs de amigos actuales y solicitudes pendientes
        const existingFriendships = await prisma.friendship.findMany({
            where: {
                OR: [
                    { senderId: req.user.id },
                    { receiverId: req.user.id }
                ]
            },
            select: { senderId: true, receiverId: true }
        });

        const relatedUserIds = new Set();
        relatedUserIds.add(req.user.id);
        existingFriendships.forEach(f => {
            relatedUserIds.add(f.senderId);
            relatedUserIds.add(f.receiverId);
        });

        // Sugerir usuarios que NO estén en esa lista
        const suggested = await prisma.user.findMany({
            where: {
                id: { notIn: Array.from(relatedUserIds) }
            },
            take: 10,
            select: { id: true, nombre: true, apellido: true, avatar: true, plan: true, objetivo: true }
        });

        res.json(suggested);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener sugerencias" });
    }
};

const getNotifications = async (req, res) => {
    try {
        const pendingRequests = await prisma.friendship.findMany({
            where: { receiverId: req.user.id, status: 'PENDIENTE' },
            include: { sender: { select: { id: true, nombre: true, avatar: true } } }
        });

        const notifications = pendingRequests.map(req => ({
            id: `friend_${req.senderId}`,
            title: 'Solicitud de amistad',
            message: `${req.sender.nombre} quiere ser tu amigo en Nexus.`,
            type: 'info',
            time: 'Nuevo',
            icon: 'person-add'
        }));

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener notificaciones" });
    }
};

module.exports = { requestFriend, getFriends, acceptFriend, getNotificationsCount, getPendingRequests, declineRequest, searchUsers, getSuggestedFriends, getNotifications };
