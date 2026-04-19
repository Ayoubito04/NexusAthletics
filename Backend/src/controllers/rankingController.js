const { prisma } = require('../config/prisma');

// XP formula — composite score based on gym experience only
const calcXP = (u) => {
    const sessionsXP = (u._count?.workoutSessions || 0) * 100;
    const postsXP    = (u._count?.posts || 0) * 30;
    const likesXP    = (u.posts || []).reduce((s, p) => s + (p._count?.likes || 0), 0) * 5;
    const referXP    = (u.invitacionesExitosas || 0) * 200;
    const volumeXP   = (u.workoutSessions || []).reduce((s, w) => s + (w.totalVolume || 0), 0) * 0.01;
    return Math.round(sessionsXP + postsXP + likesXP + referXP + volumeXP);
};

// GET /ranking/users?category=xp|pasos|cardio|volumen|social
const getUsersRanking = async (req, res) => {
    const { category = 'xp' } = req.query;

    try {
        let ranked = [];

        if (category === 'volumen') {
            const result = await prisma.workoutSession.groupBy({
                by: ['userId'],
                _sum: { totalVolume: true },
                orderBy: { _sum: { totalVolume: 'desc' } },
                take: 100,
            });
            const userIds = result.map(r => r.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, nombre: true, apellido: true, avatar: true, plan: true },
            });
            const userMap = Object.fromEntries(users.map(u => [u.id, u]));
            ranked = result.map((r, i) => ({
                rank: i + 1, userId: r.userId,
                nombre: userMap[r.userId]?.nombre,
                apellido: userMap[r.userId]?.apellido,
                avatar: userMap[r.userId]?.avatar,
                plan: userMap[r.userId]?.plan,
                score: Math.round(r._sum.totalVolume || 0),
                unit: 'kg vol',
            }));

        } else if (category === 'social') {
            const postsWithLikes = await prisma.post.findMany({
                select: {
                    userId: true,
                    _count: { select: { likes: true } },
                },
            });
            const likeMap = {};
            postsWithLikes.forEach(p => {
                if (!likeMap[p.userId]) likeMap[p.userId] = 0;
                likeMap[p.userId] += p._count.likes;
            });
            const sorted = Object.entries(likeMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 100);
            const userIds = sorted.map(([id]) => parseInt(id));
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, nombre: true, apellido: true, avatar: true, plan: true },
            });
            const userMap = Object.fromEntries(users.map(u => [u.id, u]));
            ranked = sorted.map(([userId, likes], i) => ({
                rank: i + 1, userId: parseInt(userId),
                nombre: userMap[parseInt(userId)]?.nombre,
                apellido: userMap[parseInt(userId)]?.apellido,
                avatar: userMap[parseInt(userId)]?.avatar,
                plan: userMap[parseInt(userId)]?.plan,
                score: likes, unit: 'likes',
            }));

        } else {
            // XP composite ranking
            const users = await prisma.user.findMany({
                select: {
                    id: true, nombre: true, apellido: true, avatar: true, plan: true,
                    invitacionesExitosas: true,
                    _count: { select: { workoutSessions: true, posts: true } },
                    posts: { select: { _count: { select: { likes: true } } } },
                    workoutSessions: { select: { totalVolume: true } },
                },
            });
            ranked = users
                .map(u => ({
                    userId: u.id, nombre: u.nombre, apellido: u.apellido,
                    avatar: u.avatar, plan: u.plan,
                    score: calcXP(u), unit: 'XP',
                }))
                .filter(u => u.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 100)
                .map((u, i) => ({ ...u, rank: i + 1 }));
        }

        res.json(ranked);
    } catch (error) {
        console.error('[Ranking] Error getUsersRanking:', error);
        res.status(500).json({ error: 'Error al obtener ranking' });
    }
};

module.exports = { getUsersRanking };
