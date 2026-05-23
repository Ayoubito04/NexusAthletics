const { prisma } = require('../config/prisma');
const { generateElitePDF } = require('../services/pdfService');

const { tryGeminiWithFallback, tryGeminiForPlans } = require('../services/geminiService');

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
    const { details, lesiones, horasSueno, nivelEstres, semanas = 4, periodi, tecnicas = [] } = req.body;
    const semanasNum = parseInt(semanas) || 4;
    const diasSemana = parseInt(details?.match(/DÍAS\/SEMANA:\s*(\d+)/)?.[1] || '4');
    const durHMatch = details?.match(/(\d+(?:[.,]\d+)?)\s*(hora|horas)/i);
    const durMMatch = details?.match(/(\d+)\s*(min|minutos)/i);
    let duracionMin = 60;
    if (durHMatch) duracionMin = Math.round(parseFloat(durHMatch[1].replace(',', '.')) * 60);
    else if (durMMatch) duracionMin = parseInt(durMMatch[1]);
    // Ejercicios por sesión según duración — responseMimeType garantiza JSON válido
    const maxEjercicios = duracionMin >= 120 ? 6 : duracionMin >= 90 ? 5 : 4;
    const maxEjerciciosU = duracionMin >= 120 ? 10 : duracionMin >= 90 ? 8 : 6;
    try {
        let user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                muscleStrengths: true,
                workoutSessions: { orderBy: { date: 'desc' }, take: 10 },
            },
        });

        // Reset diario de rutinas
        const today = new Date();
        const lastUpdate = new Date(user.ultimaActualizacionRutinas);
        if (today.toDateString() !== lastUpdate.toDateString()) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { rutinasGeneradasHoy: 0, ultimaActualizacionRutinas: today },
                include: { muscleStrengths: true, workoutSessions: { orderBy: { date: 'desc' }, take: 10 } },
            });
        }

        // Límite plan Gratis
        const LIMITE_RUTINAS_GRATIS = 3;
        if (user.plan === 'Gratis' && user.rutinasGeneradasHoy >= LIMITE_RUTINAS_GRATIS) {
            return res.status(429).json({
                error: `Has alcanzado el límite de ${LIMITE_RUTINAS_GRATIS} rutinas diarias del Plan Gratis. Mejora a Pro para rutinas ilimitadas.`,
                limitReached: true,
                rutinasUsadas: user.rutinasGeneradasHoy,
                limiteTotal: LIMITE_RUTINAS_GRATIS
            });
        }

        let systemPrompt;

        if (user.plan === 'Ultimate') {
            // ── Ultimate: formato Pro + rir/pesoSugerido/analisis ──
            const fuerzaCtx = user.muscleStrengths.length > 0
                ? user.muscleStrengths.map(m =>
                    `${m.muscle}: 1RM=${m.bestOneRM}kg`
                  ).join(' | ')
                : 'Sin datos de fuerza';

            const sorted = [...user.muscleStrengths].sort((a, b) => b.bestOneRM - a.bestOneRM);
            const masFlojo = sorted.at(-1)?.muscle || 'ninguno';
            const masFuerte = sorted[0]?.muscle || 'ninguno';

            systemPrompt = `Eres un motor de planes élite. RESPONDE SOLO CON JSON VÁLIDO Y COMPACTO. SIN TEXTO EXTRA.

ATLETA: ${user.nombre} | ${user.edad || '?'}a | ${user.peso || '?'}kg | ${user.altura || '?'}cm | ${user.objetivo || '?'} | ${user.nivelActividad || '?'}
Sueño: ${horasSueno || '7-8h'} | Estrés: ${nivelEstres || 'Moderado'} | Lesiones: ${lesiones || 'Ninguna'}
Fuerza: ${fuerzaCtx} | Más fuerte: ${masFuerte} | Más débil: ${masFlojo}
Solicitud: ${details}
Periodización: ${periodi || 'DUP'} | Técnicas: ${tecnicas.length > 0 ? tecnicas.join(', ') : 'apropiadas'}

JSON REQUERIDO (textos MUY CORTOS, máximo 12 palabras por campo de texto):
{
  "resumen": {
    "objetivo": "3-5 palabras",
    "estrategia": "1 frase corta",
    "macros": { "Proteina": "Xg", "Carbos": "Xg", "Grasas": "Xg", "Calorias": "Xkcal" }
  },
  "analisis": {
    "puntosFuertes": ["max 2 items, 4 palabras cada uno"],
    "puntosMejora": ["max 2 items, 4 palabras cada uno"],
    "ajustes": "1 frase corta"
  },
  "dias": [
    {
      "dia": 1, "titulo": "nombre corto",
      "ejercicios": [
        { "nombre": "Ejercicio", "series": "4", "reps": "10-12", "rir": "2", "tempo": "3-1-2", "pesoSugerido": "Xkg", "imgKey": "press_banca" }
      ]
    }
  ],
  "progresion": [
    { "semana": 2, "nota": "max 12 palabras" },
    { "semana": 3, "nota": "max 12 palabras" },
    { "semana": 4, "nota": "Deload: reduce volumen 30%, mantén intensidad" }
  ],
  "suplementacion": [{ "nombre": "...", "dosis": "Xg", "timing": "post-entreno" }]
}

REGLAS:
- "dias" debe tener EXACTAMENTE ${diasSemana} objetos.
- Exactamente ${maxEjerciciosU} ejercicios por día, todos con rir, tempo y pesoSugerido.
- Usa 70-85% del 1RM real para pesoSugerido. Si no hay datos, estima según nivel/peso.
- tempo formato "X-Y-Z": X=excéntrica(s), Y=pausa(s), Z=concéntrica(s). Ej: "3-1-2", "4-0-1". Para explosivos: "1-0-X".
- progresion SIEMPRE 3 items (semanas 2, 3 y 4). Semana 4 siempre deload. Cada nota máx 12 palabras.
- Máximo 3 items en suplementacion. Sin campo "motivo".
- TEXTOS CORTOS: objetivo≤5 palabras, estrategia≤12 palabras, titulo≤4 palabras.
- imgKey opciones: press_banca, press_inclinado, press_declinado, press_mancuernas, aperturas, fondos, push_up, push_up_diamante, pullover, peso_muerto, peso_muerto_rumano, dominadas, remo, remo_mancuerna, remo_sentado, jalon, face_pull, buenos_dias, encogimientos, press_hombros, press_militar, press_arnold, elevaciones_laterales, elevaciones_frontales, vuelo_posterior, curls, curl_barra, curl_martillo, curl_concentrado, curl_predicador, extension_triceps, triceps_frances, patada_triceps, fondos_triceps, press_cerrado, sentadilla, sentadilla_goblet, sentadilla_bulgara, sentadilla_hack, zancadas, zancadas_caminando, prensa, extension_cuadriceps, curl_femoral, hip_thrust, hip_thrust_mdb, gemelos, gemelos_sentado, step_up, abdominales, russian_twist, leg_raise, plank_lateral, mountain_climber, cardio_burn, yoga_stretch, flex_stretch, muscle_up, fondos_paralelas, burpees, salto_caja, flexiones, glute_bridge
- CASA: si equipamiento sin máquinas, usa solo: flexiones, fondos_silla, sentadilla_sin_peso, glute_bridge, curl_bandas, press_bandas, mountain_climber, burpees, push_up_diamante, pike_push, bear_crawl, salto_cuerda`;

        } else {
            // ── Pro: plan semanal estándar ──
            systemPrompt = `Eres un motor de generación de planes de entrenamiento Élite.
        DEBES RESPONDER ÚNICAMENTE CON UN OBJETO JSON VÁLIDO. SIN TEXTO ADICIONAL.

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
        3. Experto en Gimnasio, Pilates, Yoga, Crossfit, Calistenia y Flexibilidad.
        4. Si busca "Perder grasa", prioriza fuerza con intervalos o circuitos.
        5. Si busca "Flexibilidad/Pilates", genera secuencias fluidas y controladas.
        6. Genera EXACTAMENTE ${diasSemana} objetos en el array "dias".
        7. Genera EXACTAMENTE ${maxEjercicios} ejercicios por día (ajustado a la duración: 30-45min→4, 60min→5, 90min→7, 2h→9).
        8. imgKey debe ser el más específico para cada ejercicio. Opciones disponibles:
        GIMNASIO: press_banca, press_inclinado, press_declinado, aperturas, fondos, push_up, press_mancuernas,
        peso_muerto, dominadas, remo, jalon, remo_sentado, face_pull, buenos_dias, remo_mancuerna,
        press_hombros, press_militar, elevaciones_laterales, elevaciones_frontales, vuelo_posterior,
        curls, curl_martillo, curl_concentrado, curl_barra, extension_triceps, triceps_frances, patada_triceps,
        sentadilla, sentadilla_goblet, zancadas, prensa, extension_cuadriceps, curl_femoral, hip_thrust, gemelos, peso_muerto_rumano, sentadilla_bulgara,
        pilates_core, abdominales, russian_twist, leg_raise, superman, mountain_climber,
        muscle_up, fondos_paralelas, australian_row, pike_push, pistol_squat, burpees, salto_caja,
        cardio_burn, yoga_stretch, flex_stretch, yoga_warrior, hip_flexor
        CASA/SIN EQUIPAMIENTO: flexiones, fondos_silla, sentadilla_sin_peso, glute_bridge, triceps_silla, remo_bandas, curl_bandas, press_bandas, jumping_jacks, wall_sit, inchworm, bear_crawl, push_up_diamante, push_up_ancho, pike_push, archer_push, mountain_climber, burpees, salto_cuerda, sprint
        9. REGLA ENTRENAMIENTO EN CASA: Si EQUIPAMIENTO contiene "Solo Peso Corporal", "Mancuernas en Casa", "Bandas Elásticas" o "Exterior / Parque", usa EXCLUSIVAMENTE ejercicios sin máquinas. Evita: press_banca, prensa, extension_cuadriceps máquina, curl_femoral máquina, jalon, cable, sentadilla con barra. Usa imgKeys de CASA/SIN EQUIPAMIENTO. Con mancuernas añade: curls, press_mancuernas, remo_mancuerna, elevaciones_laterales, sentadilla_goblet, hip_thrust_mdb.`;
        }

        const contents = [{ parts: [{ text: systemPrompt }] }];
        const response = await tryGeminiForPlans(contents);

        let planJson;
        try {
            const allParts = response.data?.candidates?.[0]?.content?.parts || [];
            const jsonPart = allParts.find(p => !p.thought && p.text) || allParts[allParts.length - 1] || {};
            let cleanText = (jsonPart.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
            const start = cleanText.indexOf('{');
            const end = cleanText.lastIndexOf('}');
            if (start !== -1 && end !== -1) cleanText = cleanText.slice(start, end + 1);
            const openBr  = (cleanText.match(/\[/g) || []).length;
            const closeBr = (cleanText.match(/\]/g) || []).length;
            const opens   = (cleanText.match(/\{/g) || []).length;
            const closes  = (cleanText.match(/\}/g) || []).length;
            if (openBr > closeBr) cleanText += ']'.repeat(openBr - closeBr);
            if (opens  > closes)  cleanText += '}'.repeat(opens  - closes);
            planJson = JSON.parse(cleanText);
        } catch (e) {
            const rawParts = response.data?.candidates?.[0]?.content?.parts || [];
            console.error("Error parsing AI JSON:", e.message);
            console.error("Parts count:", rawParts.length, "| thought flags:", rawParts.map(p => !!p.thought));
            console.error("Raw text (500c):", rawParts.map(p => p.text || '').join('').slice(0, 500));
            throw new Error("La IA no devolvió un formato válido. Inténtalo de nuevo.");
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { rutinasGeneradasHoy: { increment: 1 } }
        });

        res.json({
            ...planJson,
            _meta: {
                rutinasUsadas: user.rutinasGeneradasHoy + 1,
                rutinasRestantes: user.plan === 'Gratis' ? LIMITE_RUTINAS_GRATIS - (user.rutinasGeneradasHoy + 1) : 'ilimitadas',
                plan: user.plan
            }
        });
    } catch (error) {
        console.error('[generatePlanInteractive]', error);
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
    const diasSemana = parseInt(details?.match(/DÍAS\/SEMANA:\s*(\d+)/)?.[1] || '4');
    const durHMatchU = details?.match(/(\d+(?:[.,]\d+)?)\s*(hora|horas)/i);
    const durMMatchU = details?.match(/(\d+)\s*(min|minutos)/i);
    let duracionMinU = 60;
    if (durHMatchU) duracionMinU = Math.round(parseFloat(durHMatchU[1].replace(',', '.')) * 60);
    else if (durMMatchU) duracionMinU = parseInt(durMMatchU[1]);
    const semanasPlanU = parseInt(semanas) || 4;
    const maxEjerciciosU = duracionMinU >= 120 ? 6 : duracionMinU >= 90 ? 5 : 4;
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

=== ESTRUCTURA JSON REQUERIDA (COMPACTA) ===
{
  "esUltimate": true,
  "resumen": {
    "objetivo": "título",
    "estrategia": "1-2 frases",
    "duracion": "${semanas} semanas",
    "macros": { "Proteina": "Xg", "Carbos": "Xg", "Grasas": "Xg", "Calorias": "Xkcal" },
    "nutricionTiming": { "preWorkout": "...", "postWorkout": "...", "antesDormir": "..." }
  },
  "analisis": { "puntosFuertes": ["..."], "puntosMejora": ["..."], "ajustes": "..." },
  "semanas": [
    {
      "semana": 1, "tipo": "Acumulación", "rpe": "7", "rir": "3",
      "dias": [
        {
          "dia": 1, "titulo": "nombre",
          "ejercicios": [
            { "nombre": "...", "series": "4", "reps": "10-12", "rir": "2", "pesoSugerido": "Xkg", "imgKey": "press_banca" }
          ]
        }
      ]
    }
  ],
  "suplementacion": [{ "nombre": "...", "dosis": "Xg", "timing": "...", "motivo": "..." }]
}

=== REGLAS CRÍTICAS ===
1. Usa los datos reales de 1RM para calcular pesos sugeridos (usa 70-85% del 1RM según la fase)
2. Si ${masFlojo} es el músculo más débil, aumenta su volumen un 25-30%
3. La semana ${semanas} SIEMPRE es Deload (reduce volumen 40%, intensidad 50%)
4. imgKey debe ser el más específico para cada ejercicio. Opciones:
press_banca, press_inclinado, press_declinado, aperturas, fondos, push_up, press_mancuernas,
peso_muerto, dominadas, remo, jalon, remo_sentado, face_pull, buenos_dias, remo_mancuerna,
press_hombros, press_militar, elevaciones_laterales, elevaciones_frontales, vuelo_posterior,
curls, curl_martillo, curl_concentrado, curl_barra, extension_triceps, triceps_frances, patada_triceps,
sentadilla, sentadilla_goblet, zancadas, prensa, extension_cuadriceps, curl_femoral, hip_thrust, gemelos, peso_muerto_rumano, sentadilla_bulgara,
pilates_core, abdominales, russian_twist, leg_raise, superman, mountain_climber,
muscle_up, fondos_paralelas, australian_row, pike_push, pistol_squat, burpees, salto_caja,
cardio_burn, yoga_stretch, flex_stretch, yoga_warrior, hip_flexor
5. Adapta el plan a las lesiones: ${lesiones || 'ninguna restricción'}
6. Con estrés ${nivelEstres || 'moderado'} y ${horasSueno || '7-8h'} de sueño, ajusta el volumen apropiadamente
7. Genera exactamente ${semanas} semanas con progresión lógica
8. El array "dias" de CADA semana debe tener EXACTAMENTE ${diasSemana} objetos
9. Genera EXACTAMENTE ${maxEjerciciosU} ejercicios por día (ajustado a la duración: 30-45min→4, 60min→5, 90min→7, 2h→9). Respuesta compacta, sin campos opcionales extra`;

        const contents = [{ parts: [{ text: systemPrompt }] }];
        const response = await tryGeminiForPlans(contents);

        let planJson;
        try {
            const allPartsU = response.data?.candidates?.[0]?.content?.parts || [];
            const jsonPartU = allPartsU.find(p => !p.thought && p.text) || allPartsU[allPartsU.length - 1] || {};
            let cleanText = (jsonPartU.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
            const start = cleanText.indexOf('{');
            const end = cleanText.lastIndexOf('}');
            if (start !== -1 && end !== -1) cleanText = cleanText.slice(start, end + 1);
            const opens  = (cleanText.match(/\{/g) || []).length;
            const closes = (cleanText.match(/\}/g) || []).length;
            const openBr  = (cleanText.match(/\[/g) || []).length;
            const closeBr = (cleanText.match(/\]/g) || []).length;
            if (openBr > closeBr)  cleanText += ']'.repeat(openBr - closeBr);
            if (opens  > closes)   cleanText += '}'.repeat(opens - closes);
            planJson = JSON.parse(cleanText);
        } catch (e) {
            const rawPartsU = response.data?.candidates?.[0]?.content?.parts || [];
            console.error('[Ultimate] Error parsing JSON:', e.message);
            console.error('[Ultimate] Parts count:', rawPartsU.length, '| thought flags:', rawPartsU.map(p => !!p.thought));
            console.error('[Ultimate] Raw text (500c):', rawPartsU.map(p => p.text || '').join('').slice(0, 500));
            throw new Error('La IA no generó un formato compatible. Reintenta.');
        }

        res.json(planJson);
    } catch (error) {
        console.error('[Ultimate] Error:', error);
        res.status(500).json({ error: error.message });
    }
};

const PRO_BASE_PRICE = 4.99;
const MAX_DISCOUNT_INVITES = 3;
const MAX_DISCOUNT_PERCENT = 0.50;
const DISCOUNT_PER_INVITE = (PRO_BASE_PRICE * MAX_DISCOUNT_PERCENT) / MAX_DISCOUNT_INVITES;

function getProgressivePrice(invites) {
    const discount = Math.min(invites, MAX_DISCOUNT_INVITES) * DISCOUNT_PER_INVITE;
    const minPrice = PRO_BASE_PRICE * (1 - MAX_DISCOUNT_PERCENT);
    return Math.max(minPrice, Math.round((PRO_BASE_PRICE - discount) * 100) / 100);
}

function getNextDiscountInfo(invites) {
    const currentPrice = getProgressivePrice(invites);
    const invitesNeeded = invites >= MAX_DISCOUNT_INVITES ? 0 : MAX_DISCOUNT_INVITES - invites;
    const nextPrice = invites < MAX_DISCOUNT_INVITES ? getProgressivePrice(invites + 1) : 0;
    const savedAmount = Math.round((PRO_BASE_PRICE - currentPrice) * 100) / 100;
    const maxReached = invites >= MAX_DISCOUNT_INVITES;
    const savedPercent = Math.round((savedAmount / PRO_BASE_PRICE) * 100);
    return {
        currentPrice,
        nextPrice,
        invitesNeeded,
        savedAmount,
        savedPercent,
        maxReached,
        totalInvites: invites,
        invitesForMax: MAX_DISCOUNT_INVITES,
        discountPerInvite: Math.round(DISCOUNT_PER_INVITE * 100) / 100,
    };
}

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

        const invites = user.invitacionesExitosas || 0;
        const pricing = getNextDiscountInfo(invites);

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
            hasDiscount: invites > 0,
            hasMaxDiscount: pricing.maxReached,
            renewPrice: pricing.currentPrice,
            invites,
            pricing,
        });
    } catch (error) {
        console.error("TrialStatus Error:", error);
        res.status(500).json({ error: "Error al verificar estado del trial" });
    }
};

const useReferral = async (req, res) => {
    try {
        const { referralCode } = req.body;
        if (!referralCode) {
            return res.status(400).json({ error: "Código de referido requerido" });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        if (user.referralCode === referralCode.trim().toUpperCase()) {
            return res.status(400).json({ error: "No puedes usar tu propio código de referido" });
        }

        const referrer = await prisma.user.findUnique({
            where: { referralCode: referralCode.trim().toUpperCase() }
        });

        if (!referrer) {
            return res.status(404).json({ error: "Código de referido inválido" });
        }

        // Beneficio para el dueño del código
        await prisma.user.update({
            where: { id: referrer.id },
            data: { invitacionesExitosas: { increment: 1 } }
        });

        // Beneficio para quien aplica el código + marcar como usado
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { invitacionesExitosas: { increment: 1 } }
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        const pricing = getProgressivePrice(updatedUser.invitacionesExitosas);
        res.json({
            success: true,
            message: "Código de referido aplicado correctamente",
            user: userWithoutPassword,
            newPrice: pricing,
            invites: updatedUser.invitacionesExitosas,
        });
    } catch (error) {
        console.error("useReferral Error:", error);
        res.status(500).json({ error: "Error al procesar el código de referido" });
    }
};

const registerShare = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        const currentInvites = user.invitacionesExitosas || 0;
        const nextInvites = Math.min(currentInvites + 1, MAX_DISCOUNT_INVITES);

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { invitacionesExitosas: nextInvites }
        });

        const pricing = getNextDiscountInfo(nextInvites);
        const { password: _, ...userWithoutPassword } = updatedUser;

        res.json({
            success: true,
            user: userWithoutPassword,
            invites: nextInvites,
            pricing,
            renewPrice: pricing.currentPrice,
            hasDiscount: nextInvites > 0,
            hasMaxDiscount: pricing.maxReached,
        });
    } catch (error) {
        console.error("registerShare Error:", error);
        res.status(500).json({ error: "Error al registrar el compartido" });
    }
};

const cancelSubscription = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        if (user.plan === 'Gratis') {
            return res.status(400).json({ error: 'Ya estás en el plan gratuito' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { plan: 'Gratis', haUsadoTrial: true },
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('cancelSubscription Error:', error);
        res.status(500).json({ error: 'Error al cancelar la suscripción' });
    }
};

const updatePlan = async (req, res) => {
    const { plan } = req.body;
    const validPlans = ['Gratis', 'Pro', 'Ultimate'];
    if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ error: 'Plan no válido' });
    }
    try {
        const updatedUser = await prisma.user.update({
            where: { id: req.user.id },
            data: { plan },
        });
        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('updatePlan Error:', error);
        res.status(500).json({ error: 'Error al actualizar el plan' });
    }
};

module.exports = { downloadPDF, generatePDF, generatePlanInteractive, generateUltimatePlan, savePlan, getSavedPlans, getSavedPlanById, updateSavedPlan, deleteSavedPlan, startTrial, getTrialStatus, useReferral, registerShare, cancelSubscription, updatePlan };
