const { prisma } = require('../config/prisma');
const { tryGeminiWithFallback } = require('../services/geminiService');

const generateDigitalTwin = async (req, res) => {
    try {
        const { scanData, scanHistory } = req.body;

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                muscleStrengths: true,
                workoutSessions: { orderBy: { date: 'desc' }, take: 30 },
            },
        });

        if (user.plan !== 'Ultimate') {
            return res.status(403).json({ error: 'Esta función es exclusiva del Plan Ultimate.' });
        }

        const fuerzaCtx = user.muscleStrengths.length > 0
            ? user.muscleStrengths
                .map(m => `${m.muscle}: 1RM=${m.bestOneRM}kg, Volumen=${Math.round(m.totalVolume)}kg, Sesiones=${m.sessions}`)
                .join(' | ')
            : 'Sin datos de fuerza registrados';

        const totalSessions = user.workoutSessions.length;
        const avgDuration = totalSessions > 0
            ? Math.round(user.workoutSessions.reduce((s, w) => s + (w.duration || 0), 0) / totalSessions / 60)
            : 0;

        const muscleRanking = scanData?.ranking_muscular || {};
        const scanCtx = scanData
            ? `Ranking muscular actual (Body Scanner): ${JSON.stringify(muscleRanking)}
Grasa corporal estimada: ${scanData.grasa_estimada || '?'}
Nivel físico: ${scanData.nivel || '?'}
Forma de cuerpo: ${scanData.forma_cuerpo || '?'}
Puntuación estética actual: ${scanData.estetica_score || '?'}/10`
            : 'Sin escaneo corporal reciente';

        const historyCtx = scanHistory && scanHistory.length > 1
            ? `Historial de escaneos (${scanHistory.length} escaneos): ${scanHistory.slice(0, 3).map(s =>
                `[${new Date(s.timestamp).toLocaleDateString('es-ES')}: estética ${s.estetica_score}/10, grasa ${s.grasa_estimada}]`
              ).join(' → ')}`
            : 'Sin historial de escaneos previos';

        const prompt = `Eres el sistema de análisis genético-deportivo más avanzado del mundo. Genera un "Digital Twin" ultra-personalizado para este atleta.

=== PERFIL DEL ATLETA ===
Nombre: ${user.nombre} | Edad: ${user.edad || '?'} | Peso: ${user.peso || '?'}kg | Altura: ${user.altura || '?'}cm
Género: ${user.genero || 'No especificado'} | Objetivo: ${user.objetivo || '?'} | Nivel: ${user.nivelActividad || '?'}

=== ESTADO FÍSICO ACTUAL ===
${scanCtx}

=== HISTORIAL EVOLUTIVO ===
${historyCtx}

=== DATOS REALES DE ENTRENAMIENTO ===
Sesiones totales completadas: ${totalSessions}
Duración media por sesión: ${avgDuration} min
Fuerza por grupo muscular: ${fuerzaCtx}

RESPONDE SOLO CON JSON VÁLIDO. SIN TEXTO EXTRA.

{
  "geneticPotential": {
    "score": <0-100, basado en edad, proporciones, progresión>,
    "nivel": "Bajo|Medio|Alto|Elite",
    "somatotipo": "Ectomorfo|Mesomorfo|Endomorfo|Ecto-Meso|Endo-Meso",
    "descripcion": "2 frases específicas sobre el potencial genético REAL de este atleta",
    "ventajas": ["ventaja genética específica 1", "ventaja 2"],
    "limitantes": ["factor limitante real 1", "factor 2"]
  },
  "proyeccion3Meses": {
    "pesoProyectado": <kg exacto con consistencia total>,
    "grasaProyectada": "X%",
    "musculoGanado": <kg músculo, realista>,
    "esteticaScore": <1-10 proyectado>,
    "forma": "V-Shape|X-Shape|Rectangular|Trapecio",
    "descripcion": "4 frases ESPECÍFICAS describiendo cómo se verá físicamente en 3 meses de consistencia máxima. Menciona grupos musculares concretos.",
    "cambiosMasculares": {
      "pecho": <delta entero en %>,
      "espalda": <delta %>,
      "hombros": <delta %>,
      "biceps": <delta %>,
      "triceps": <delta %>,
      "piernas": <delta %>,
      "abdomen": <delta %>
    }
  },
  "proyeccion12Meses": {
    "pesoProyectado": <kg>,
    "grasaProyectada": "X%",
    "musculoGanado": <kg acumulado>,
    "esteticaScore": <1-10>,
    "forma": "V-Shape|X-Shape|Rectangular|Trapecio",
    "descripcion": "4 frases sobre la transformación total en 12 meses. Compara con el estado actual de forma específica."
  },
  "diasRecomendados": <3-6>,
  "mensajePersonal": "Mensaje motivacional de 2 frases DIRECTAMENTE dirigido a ${user.nombre}, basado en sus datos reales"
}

REGLAS: Principiante (< 10 sesiones) → ganancias más rápidas. Avanzado (> 50 sesiones) → ganancias más conservadoras.
Prioriza cambios en músculos más débiles del atleta. Sé ESPECÍFICO, no genérico.`;

        const contents = [{ parts: [{ text: prompt }] }];
        const response = await tryGeminiWithFallback(contents, { maxOutputTokens: 4096 });

        let twinJson;
        try {
            let raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
            const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
            if (s !== -1 && e !== -1) raw = raw.slice(s, e + 1);
            twinJson = JSON.parse(raw);
        } catch (err) {
            console.error('[DigitalTwin] Parse error:', err.message);
            throw new Error('Error al generar el Digital Twin. Inténtalo de nuevo.');
        }

        // Generate future physique image with Imagen 3
        let imageBase64 = null;
        try {
            const generoEn = user.genero === 'Femenino' ? 'female' : 'male';
            const somatotipo = twinJson.geneticPotential?.somatotipo || 'Mesomorfo';
            const forma = twinJson.proyeccion3Meses?.forma || 'Athletic';
            const grasa = twinJson.proyeccion3Meses?.grasaProyectada || '15%';
            const estetica = twinJson.proyeccion3Meses?.esteticaScore || 7;

            const imagePrompt = `Professional fitness photography, ultra-realistic. ${generoEn} athlete with ${somatotipo} body type and ${forma} physique. ${grasa} body fat, aesthetics score ${estetica}/10, highly defined muscles. Front-facing athletic standing pose, arms slightly away from body. Pure black studio background with dramatic neon green (#63ff15) rim lighting from behind. Sharp muscle definition, fitness magazine quality. Do not show the face. Full body shot from head to knees.`;

            const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GEMINI_API_KEY}`;
            const imagenRes = await require('axios').post(imagenUrl, {
                instances: [{ prompt: imagePrompt }],
                parameters: {
                    sampleCount: 1,
                    aspectRatio: '3:4',
                    personGeneration: 'allow_adult',
                    safetyFilterLevel: 'block_only_high',
                },
            }, { timeout: 45000 });

            imageBase64 = imagenRes.data?.predictions?.[0]?.bytesBase64Encoded || null;
            console.log('[DigitalTwin] Image generated:', imageBase64 ? 'ok' : 'empty');
        } catch (imgErr) {
            console.error('[DigitalTwin] Image generation failed (non-fatal):', imgErr.response?.data?.error?.message || imgErr.message);
        }

        res.json({ ...twinJson, userName: user.nombre, currentWeight: user.peso, currentHeight: user.altura, imageBase64 });
    } catch (error) {
        console.error('[DigitalTwin]', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { generateDigitalTwin };
