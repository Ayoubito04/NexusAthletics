const { prisma } = require('../config/prisma');
const { generateElitePDF } = require('../services/pdfService');

const { tryGeminiWithFallback } = require('../services/geminiService');

const downloadPDF = async (req, res) => {
    try {
        const { planText } = req.query;
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        const pdfData = await generateElitePDF(user, planText || "Plan de entrenamiento Nexus Athletics AI");

        res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="Plan_Nexus_AI.pdf"'
        }).end(pdfData);
    } catch (error) {
        res.status(500).json({ error: "Error al descargar PDF" });
    }
};

const generatePDF = async (req, res) => {
    const { details, format } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { activities: { orderBy: { fecha: 'desc' }, take: 5 } }
        });

        let context = `\n--- CONTEXTO DEL ATLETA ---
Nombre: ${user.nombre || 'Atleta'}
Peso: ${user.peso || '?'}kg, Altura: ${user.altura || '?'}cm, Edad: ${user.edad || '?'}
Objetivo: ${user.objetivo || 'Mejorar'}, Nivel: ${user.nivelActividad || 'Normal'}`;

        if (user.activities && user.activities.length > 0) {
            context += `\nActividad Reciente: ${user.activities.map(a => a.tipo + " (" + a.distancia + "km)").join(', ')}`;
        }

        const systemPrompt = `Eres un Entrenador de Élite. Genera un plan de entrenamiento detallado basado en: ${details}. ${context} \nDivide el plan en secciones claras: Lunes, Martes, etc. Usa Markdown.`;
        const contents = [{ parts: [{ text: systemPrompt }] }];

        const response = await tryGeminiWithFallback(contents);
        const planText = response.data.candidates[0].content.parts[0].text;

        const pdfData = await generateElitePDF(user, planText);

        if (format === 'base64') {
            res.json({ base64: pdfData.toString('base64') });
        } else {
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="Plan_Nexus_AI.pdf"'
            }).end(pdfData);
        }
    } catch (error) {
        res.status(500).json({ error: "Error al generar el plan PDF: " + error.message });
    }
};

const generatePlanInteractive = async (req, res) => {
    const { details } = req.body;
    try {
        let user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        // Sistema de reset diario para rutinas (igual que mensajes)
        const today = new Date();
        const lastUpdate = new Date(user.ultimaActualizacionRutinas);

        if (today.toDateString() !== lastUpdate.toDateString()) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    rutinasGeneradasHoy: 0,
                    ultimaActualizacionRutinas: today
                }
            });
        }

        // Verificar límite para plan Gratis
        const LIMITE_RUTINAS_GRATIS = 3;
        if (user.plan === 'Gratis' && user.rutinasGeneradasHoy >= LIMITE_RUTINAS_GRATIS) {
            return res.status(429).json({
                error: `Has alcanzado el límite de ${LIMITE_RUTINAS_GRATIS} rutinas diarias del Plan Gratis. Mejora a Pro para rutinas ilimitadas.`,
                limitReached: true,
                rutinasUsadas: user.rutinasGeneradasHoy,
                limiteTotal: LIMITE_RUTINAS_GRATIS
            });
        }

        const systemPrompt = `Eres un motor de generación de planes de entrenamiento Élite. 
        DEBES RESPONDER ÚNICAMENTE CON UN OBJETO JSON VÁLIDO. SIN TEXTO ADICIONAL, SIN TILDES EN LAS LLAVES.
        
        Estructura requerida:
        {
          "resumen": {
            "objetivo": "Título corto",
            "estrategia": "Explicación breve de la táctica",
            "macros": { "Proteina": "Xg", "Carbos": "Xg", "Grasas": "Xg" }
          },
          "dias": [
            {
              "dia": 1,
              "titulo": "Nombre del día",
              "ejercicios": [
                { "nombre": "Ejer 1", "series": "4", "reps": "12", "imgKey": "press_banca" }
              ]
            }
          ]
        }

        Instrucciones: 
        1. Usa los datos del usuario: Peso ${user.peso}kg, Objetivo ${user.objetivo}.
        2. Solicitud específica: "${details}".
        3. Se un experto en múltiples disciplinas: Gimnasio, Pilates, Yoga, Crossfit, Calistenia y Entrenamiento de Flexibilidad.
        4. Si el usuario busca "Perder grasa", prioriza entrenamiento de fuerza con intervalos o circuitos.
        5. Si busca "Flexibilidad/Pilates", genera secuencias de movimientos fluidos y controlados.
        6. Genera 3 días de entrenamiento si no se especifica lo contrario.
        7. imgKey permitidas: press_banca, sentadilla, peso_muerto, curls, yoga_stretch, cardio_burn, pilates_core, flex_stretch.`;

        const contents = [{ parts: [{ text: systemPrompt }] }];

        const response = await tryGeminiWithFallback(contents);
        let planJson;
        try {
            let cleanText = response.data.candidates[0].content.parts[0].text;
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
            planJson = JSON.parse(cleanText);
        } catch (e) {
            console.error("Error parsing AI JSON:", e);
            throw new Error("La IA no generó un formato compatible. Reintenta.");
        }

        // Incrementar contador de rutinas generadas
        await prisma.user.update({
            where: { id: user.id },
            data: {
                rutinasGeneradasHoy: { increment: 1 }
            }
        });

        // Enviar respuesta con info del límite
        res.json({
            ...planJson,
            _meta: {
                rutinasUsadas: user.rutinasGeneradasHoy + 1,
                rutinasRestantes: user.plan === 'Gratis' ? LIMITE_RUTINAS_GRATIS - (user.rutinasGeneradasHoy + 1) : 'ilimitadas',
                plan: user.plan
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const savePlan = async (req, res) => {
    const { planData } = req.body;
    try {
        const savedPlan = await prisma.savedPlan.create({
            data: {
                userId: req.user.id,
                planData
            }
        });
        res.json(savedPlan);
    } catch (error) {
        res.status(500).json({ error: "Error al guardar el plan" });
    }
};

const getSavedPlans = async (req, res) => {
    try {
        const plans = await prisma.savedPlan.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(plans);
    } catch (error) {
        res.status(500).json({ error: "Error al cargar planes guardados" });
    }
};

// GET - Obtener un plan guardado por ID
const getSavedPlanById = async (req, res) => {
    try {
        const plan = await prisma.savedPlan.findFirst({
            where: {
                id: req.params.id,
                userId: req.user.id
            }
        });

        if (!plan) {
            return res.status(404).json({ error: "Plan no encontrado" });
        }

        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el plan" });
    }
};

// UPDATE - Actualizar un plan guardado
const updateSavedPlan = async (req, res) => {
    const { planData, nombre } = req.body;
    try {
        const existing = await prisma.savedPlan.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!existing) {
            return res.status(404).json({ error: "Plan no encontrado" });
        }

        const plan = await prisma.savedPlan.update({
            where: { id: req.params.id },
            data: {
                planData: planData || existing.planData,
                nombre: nombre || existing.nombre
            }
        });
        res.json(plan);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el plan" });
    }
};

// DELETE - Eliminar un plan guardado
const deleteSavedPlan = async (req, res) => {
    try {
        const existing = await prisma.savedPlan.findFirst({
            where: { id: req.params.id, userId: req.user.id }
        });

        if (!existing) {
            return res.status(404).json({ error: "Plan no encontrado" });
        }

        await prisma.savedPlan.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true, message: "Plan eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el plan" });
    }
};

const startTrial = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user.haUsadoTrial) {
            return res.status(400).json({ error: "Ya has usado el mes de prueba anteriormente." });
        }

        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                plan: 'Pro',
                haUsadoTrial: true,
                trialEndDate: endDate
            }
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error("Trial Error:", error);
        res.status(500).json({ error: "Error al activar el mes de prueba" });
    }
};

module.exports = { downloadPDF, generatePDF, generatePlanInteractive, savePlan, getSavedPlans, getSavedPlanById, updateSavedPlan, deleteSavedPlan, startTrial };
