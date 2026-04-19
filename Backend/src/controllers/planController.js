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

// ─── Ultimate Plan Generator ────────────────────────────────────────────────
// POST /generate-plan-ultimate
// Genera un mesociclo de 4 semanas personalizado usando datos reales del usuario
const generateUltimatePlan = async (req, res) => {
    const { details, lesiones, horasSueno, nivelEstres, semanas = 4, periodi, tecnicas = [] } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                muscleStrengths: true,
                workoutSessions: { orderBy: { date: 'desc' }, take: 10 },
            },
        });

        if (user.plan !== 'Ultimate') {
            return res.status(403).json({ error: 'Esta función es exclusiva del Plan Ultimate.' });
        }

        // Construir contexto de fuerza real del usuario
        const fuerzaCtx = user.muscleStrengths.length > 0
            ? user.muscleStrengths.map(m =>
                `${m.muscle}: 1RM=${m.bestOneRM}kg, Volumen acum.=${Math.round(m.totalVolume)}kg, Sesiones=${m.sessions}`
              ).join(' | ')
            : 'Sin datos de fuerza registrados todavía';

        // Volumen reciente
        const volReciente = user.workoutSessions.slice(0, 5)
            .map(s => `${new Date(s.date).toLocaleDateString('es-ES')}: ${Math.round(s.totalVolume)}kg vol, ${s.duration || '?'}min`)
            .join(' | ') || 'Sin sesiones recientes';

        // Músculo más débil vs más fuerte
        const sorted = [...user.muscleStrengths].sort((a, b) => b.bestOneRM - a.bestOneRM);
        const masFlojo = sorted.at(-1)?.muscle || 'desconocido';
        const masFuerte = sorted[0]?.muscle || 'desconocido';

        const systemPrompt = `Eres el sistema de generación de planes de entrenamiento más avanzado del mundo, con conocimiento de fisiología del ejercicio de nivel doctoral.

RESPONDE SOLO CON JSON VÁLIDO. SIN TEXTO ADICIONAL. SIN COMENTARIOS.

=== PERFIL COMPLETO DEL ATLETA ===
Nombre: ${user.nombre} ${user.apellido || ''}
Edad: ${user.edad || '?'} años | Peso: ${user.peso || '?'}kg | Altura: ${user.altura || '?'}cm
Género: ${user.genero || '?'} | Nivel actividad: ${user.nivelActividad || '?'}
Objetivo principal: ${user.objetivo || '?'}
Horas de sueño/noche: ${horasSueno || '7-8h'}
Nivel de estrés: ${nivelEstres || 'Moderado'}
Lesiones o restricciones: ${lesiones || 'Ninguna'}

=== DATOS REALES DE FUERZA (de sus entrenamientos) ===
${fuerzaCtx}
Músculo más fuerte: ${masFuerte} | Músculo más débil: ${masFlojo}

=== HISTORIAL RECIENTE DE ENTRENAMIENTOS ===
${volReciente}

=== CONFIGURACIÓN DESEADA ===
Solicitud: ${details}
Duración del mesociclo: ${semanas} semanas
Periodización: ${periodi || 'Ondulada Diaria (DUP)'}
Técnicas avanzadas a incluir: ${tecnicas.length > 0 ? tecnicas.join(', ') : 'Las más apropiadas según el nivel'}

=== ESTRUCTURA JSON REQUERIDA ===
{
  "esUltimate": true,
  "resumen": {
    "objetivo": "título conciso",
    "estrategia": "explicación detallada de 2-3 frases del enfoque científico",
    "duracion": "${semanas} semanas",
    "frecuencia": "X días/semana",
    "volumenSemanal": { "Pecho": "X series", "Espalda": "X series", "Piernas": "X series", "Hombros": "X series", "Brazos": "X series", "Core": "X series" },
    "macros": { "Proteina": "Xg", "Carbos": "Xg", "Grasas": "Xg", "Calorias": "Xkcal" },
    "nutricionTiming": {
      "preWorkout": "qué comer 1-2h antes",
      "postWorkout": "qué comer 30min después",
      "antesDormir": "qué comer antes de dormir"
    }
  },
  "analisis": {
    "puntosFuertes": ["descripción basada en datos reales"],
    "puntosMejora": ["descripción basada en datos reales"],
    "ajustes": "cómo el plan corrige los desequilibrios detectados"
  },
  "semanas": [
    {
      "semana": 1,
      "tipo": "Acumulación",
      "descripcion": "breve descripción de la fase",
      "rpe": "7",
      "rir": "3",
      "dias": [
        {
          "dia": 1,
          "titulo": "nombre del día",
          "calentamiento": ["ejercicio 1", "ejercicio 2"],
          "ejercicios": [
            {
              "nombre": "nombre del ejercicio",
              "series": "4",
              "reps": "10-12",
              "rir": "2-3",
              "pesoSugerido": "Xkg (basado en 1RM si disponible)",
              "tecnica": "técnica avanzada si aplica",
              "nota": "tip técnico clave",
              "imgKey": "press_banca"
            }
          ],
          "vueltaCalma": ["estiramiento 1", "estiramiento 2"]
        }
      ]
    }
  ],
  "suplementacion": [
    { "nombre": "suplemento", "dosis": "Xg", "timing": "cuándo tomarlo", "motivo": "por qué" }
  ]
}

=== REGLAS CRÍTICAS ===
1. Usa los datos reales de 1RM para calcular pesos sugeridos (usa 70-85% del 1RM según la fase)
2. Si ${masFlojo} es el músculo más débil, aumenta su volumen un 25-30%
3. La semana ${semanas} SIEMPRE es Deload (reduce volumen 40%, intensidad 50%)
4. imgKey solo puede ser: press_banca, sentadilla, peso_muerto, curls, yoga_stretch, cardio_burn, pilates_core, flex_stretch, dominadas, remo, press_hombros, extension_triceps, zancadas
5. Adapta el plan a las lesiones: ${lesiones || 'ninguna restricción'}
6. Con estrés ${nivelEstres || 'moderado'} y ${horasSueno || '7-8h'} de sueño, ajusta el volumen apropiadamente
7. Genera exactamente ${semanas} semanas con progresión lógica`;

        const contents = [{ parts: [{ text: systemPrompt }] }];
        const response = await tryGeminiWithFallback(contents);

        let planJson;
        try {
            let cleanText = response.data.candidates[0].content.parts[0].text;
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
            planJson = JSON.parse(cleanText);
        } catch (e) {
            console.error('[Ultimate] Error parsing JSON:', e);
            throw new Error('La IA no generó un formato compatible. Reintenta.');
        }

        res.json(planJson);
    } catch (error) {
        console.error('[Ultimate] Error:', error);
        res.status(500).json({ error: error.message });
    }
};

const PRO_PRICE_FULL     = 4.99;
const PRO_PRICE_DISCOUNT = 2.49; // 50% off por ≥3 invitaciones exitosas

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
            data: { plan: 'Pro', haUsadoTrial: true, trialEndDate: endDate }
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error("Trial Error:", error);
        res.status(500).json({ error: "Error al activar el mes de prueba" });
    }
};

// GET /plans/trial-status
// Devuelve el estado actual del trial. Si ha expirado y el plan sigue en Pro, lo baja a Gratis.
const getTrialStatus = async (req, res) => {
    try {
        let user = await prisma.user.findUnique({ where: { id: req.user.id } });

        const now = new Date();
        const trialExpired = user.haUsadoTrial && user.trialEndDate && user.trialEndDate < now;

        // Auto-downgrade si el trial expiró y no han renovado
        if (trialExpired && user.plan === 'Pro') {
            user = await prisma.user.update({
                where: { id: req.user.id },
                data: { plan: 'Gratis' }
            });
        }

        const hasDiscount = (user.invitacionesExitosas || 0) >= 3;
        const renewPrice  = hasDiscount ? PRO_PRICE_DISCOUNT : PRO_PRICE_FULL;

        let daysLeft = null;
        if (user.haUsadoTrial && user.trialEndDate && user.trialEndDate > now) {
            daysLeft = Math.ceil((new Date(user.trialEndDate) - now) / (1000 * 60 * 60 * 24));
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json({
            user: userWithoutPassword,
            trialActive:  daysLeft !== null,
            trialExpired: trialExpired,
            daysLeft,
            hasDiscount,
            renewPrice,
            invites: user.invitacionesExitosas || 0,
        });
    } catch (error) {
        console.error("TrialStatus Error:", error);
        res.status(500).json({ error: "Error al verificar estado del trial" });
    }
};

module.exports = { downloadPDF, generatePDF, generatePlanInteractive, generateUltimatePlan, savePlan, getSavedPlans, getSavedPlanById, updateSavedPlan, deleteSavedPlan, startTrial, getTrialStatus };
