const bcrypt = require('bcrypt');
const { prisma } = require('../config/prisma');
const { uploadImage } = require('../services/cloudinaryService');

const updateBiometrics = async (req, res) => {
    const { peso, altura, edad, genero, objetivo, nivelActividad } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                peso: peso ? parseFloat(peso) : undefined,
                altura: altura ? parseFloat(altura) : undefined,
                edad: edad ? parseInt(edad) : undefined,
                genero,
                objetivo,
                nivelActividad
            }
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar biometría" });
    }
};

const updateProfile = async (req, res) => {
    const { nombre, apellido } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { nombre, apellido }
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar perfil" });
    }
};

const updatePushToken = async (req, res) => {
    const { token } = req.body;
    try {
        await prisma.user.update({
            where: { id: req.user.id },
            data: { pushToken: token }
        });
        res.json({ success: true, message: "Token de notificaciones actualizado" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar token de notificaciones" });
    }
};

const updateHealthSync = async (req, res) => {
    const { synced, service } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                healthSynced: synced,
                healthService: service
            }
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar sincronización de salud" });
    }
};

const updateHealthData = async (req, res) => {
    const { calories, steps } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                healthCalories: calories ? parseFloat(calories) : undefined,
                healthSteps: steps ? parseInt(steps) : undefined
            }
        });
        res.json({ success: true, healthCalories: user.healthCalories, healthSteps: user.healthSteps });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar datos de salud" });
    }
};

const updateAvatar = async (req, res) => {
    const { avatar } = req.body;
    try {
        if (!avatar) return res.status(400).json({ error: "No se proporcionó imagen" });

        let cloudinaryUrl = avatar;
        if (avatar.startsWith('data:image') || avatar.length > 500) {
            cloudinaryUrl = await uploadImage(avatar, 'profiles');
        }

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { avatar: cloudinaryUrl }
        });

        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error("Error al actualizar avatar:", error);
        res.status(500).json({ error: "Error al actualizar avatar" });
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        // Si el usuario se registró con social login y no tiene contraseña
        if (!user.password) {
            // Permitimos establecer una si no tiene (opcional, podrías también pedir social reset)
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
            return res.json({ success: true, message: "Contraseña establecida correctamente" });
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) return res.status(400).json({ error: "La contraseña actual es incorrecta" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        res.json({ success: true, message: "Contraseña actualizada correctamente" });
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        res.status(500).json({ error: "Error interno al cambiar contraseña" });
    }
};

const syncSteps = async (req, res) => {
    const { steps, date } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                healthSteps: steps ? parseInt(steps) : 0
            }
        });
        res.json({ success: true, steps: user.healthSteps });
    } catch (error) {
        console.error("Error al sincronizar pasos:", error);
        res.status(500).json({ error: "Error al sincronizar pasos" });
    }
};

const getRanking = async (req, res) => {
    try {
        const userId = req.user.id;

        // Buscamos los amigos del usuario (donde la solicitud fue aceptada)
        const userWithFriends = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                friends: {
                    where: { status: 'accepted' },
                    include: {
                        friend: {
                            select: {
                                id: true,
                                nombre: true,
                                apellido: true,
                                avatar: true,
                                plan: true,
                                activities: {
                                    select: { distancia: true }
                                }
                            }
                        }
                    }
                },
                friendOf: {
                    where: { status: 'accepted' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                nombre: true,
                                apellido: true,
                                avatar: true,
                                plan: true,
                                activities: {
                                    select: { distancia: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        // Extraemos los amigos de ambas direcciones (quien envió y quien recibió la solicitud)
        const friendsList = [
            ...userWithFriends.friends.map(f => f.friend),
            ...userWithFriends.friendOf.map(f => f.user)
        ];

        // Incluimos al propio usuario en el ranking para que pueda compararse
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                nombre: true,
                apellido: true,
                avatar: true,
                plan: true,
                activities: {
                    select: { distancia: true }
                }
            }
        });

        friendsList.push(currentUser);

        // Procesamos los datos para calcular el total de KM por usuario
        const formattedRanking = friendsList.map(user => {
            const totalKm = user.activities.reduce((sum, act) => sum + (act.distancia / 1000), 0);
            return {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                avatar: user.avatar,
                plan: user.plan,
                totalKm: parseFloat(totalKm.toFixed(2))
            };
        });

        // Ordenamos de mayor a menor distancia
        formattedRanking.sort((a, b) => b.totalKm - a.totalKm);

        res.json(formattedRanking);
    } catch (error) {
        console.error("Error al obtener ranking de amigos:", error);
        res.status(500).json({ error: "Error al obtener ranking" });
    }
};

module.exports = {
    updateBiometrics,
    updateProfile,
    updatePushToken,
    updateHealthSync,
    updateHealthData,
    syncSteps,
    updateAvatar,
    changePassword,
    getRanking
};

