const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const saveNutritionPlan = async (req, res) => {
    const { planData, objetivo, calorias } = req.body;
    const userId = req.user.id;

    if (!planData) return res.status(400).json({ error: 'planData requerido' });

    try {
        const plan = await prisma.nutritionPlan.create({
            data: { userId, planData, objetivo: objetivo || null, calorias: calorias || null }
        });
        res.json(plan);
    } catch (e) {
        console.error('[NutritionPlan] Save error:', e.message);
        res.status(500).json({ error: 'Error al guardar el plan' });
    }
};

const getNutritionPlans = async (req, res) => {
    const userId = req.user.id;
    try {
        const plans = await prisma.nutritionPlan.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(plans);
    } catch (e) {
        res.status(500).json({ error: 'Error al obtener planes' });
    }
};

const deleteNutritionPlan = async (req, res) => {
    const userId = req.user.id;
    const id = parseInt(req.params.id);

    try {
        const plan = await prisma.nutritionPlan.findUnique({ where: { id } });
        if (!plan || plan.userId !== userId) return res.status(404).json({ error: 'Plan no encontrado' });

        await prisma.nutritionPlan.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Error al eliminar el plan' });
    }
};

module.exports = { saveNutritionPlan, getNutritionPlans, deleteNutritionPlan };
