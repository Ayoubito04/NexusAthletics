const { prisma } = require('../config/prisma');
const { getOnlineCount } = require('../services/activityTracker');

const VALID_PLANS = ['Gratis', 'Pro', 'Ultimate'];

const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: { id: true, email: true, nombre: true, apellido: true, plan: true, role: true, createdAt: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
};

const getOnlineUsers = (req, res) => {
    res.json({ count: getOnlineCount() });
};

const updateUserPlan = async (req, res) => {
    const { id } = req.params;
    const { plan } = req.body;
    if (!VALID_PLANS.includes(plan)) {
        return res.status(400).json({ error: "Plan inválido" });
    }
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { plan }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar plan" });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar usuario" });
    }
};

module.exports = { getUsers, getOnlineUsers, updateUserPlan, deleteUser };
