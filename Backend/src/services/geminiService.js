const axios = require('axios');

async function callGeminiWithRetry(url, payload, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.post(url, payload);
            return response;
        } catch (error) {
            const errorMessage = error.response?.data?.error?.message || error.message || "";
            const isQuotaExceeded = errorMessage.includes('Quota exceeded');
            const isRateLimit = error.response?.status === 429 || errorMessage.includes('rate limit') || error.response?.status === 503;

            // Log detallado del error
            console.error(`[Gemini Error] Status: ${error.response?.status}, Message: ${errorMessage}`);

            if (isQuotaExceeded) {
                console.log(`[Gemini] Cuota diaria agotada para este modelo.`);
                const err = new Error("DAILY_QUOTA_EXHAUSTED");
                err.status = 429;
                throw err;
            }

            if (isRateLimit) {
                const retryAfterMatch = errorMessage.match(/([\d.]+)s/);
                let waitTime = retryAfterMatch ? Math.ceil(parseFloat(retryAfterMatch[1])) : Math.pow(2, attempt) * 2;

                if (attempt < maxRetries) {
                    console.log(`[Gemini] Servidor saturado (${error.response?.status}). Reintentando en ${waitTime}s... (Intento ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }
    }
}

async function tryGeminiWithFallback(contents, generationConfig = {}) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY no encontrada en variables de entorno");
    }

    const preferredModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const models = [
        preferredModel,
        "gemini-2.5-pro",
        "gemini-2.0-flash",
        "gemini-pro-latest",
        "gemini-2.0-flash-lite"
    ];

    const uniqueModels = [...new Set(models)];
    let lastError = null;

    for (const model of uniqueModels) {
        try {
            const cleanModelName = model.startsWith('models/') ? model.split('/')[1] : model;
            console.log(`[Nexus AI] Intentando: ${cleanModelName}`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${GEMINI_API_KEY}`;

            const response = await callGeminiWithRetry(url, { contents, generationConfig }, 2);
            console.log(`[Nexus AI] ✓ Éxito con ${cleanModelName}`);
            return response;
        } catch (error) {
            lastError = error;
            const errorMsg = error.response?.data?.error?.message || error.message;
            console.log(`[Nexus AI] ✗ Falló ${model}: ${errorMsg}`);

            // Si es cuota agotada, intentar con el siguiente modelo inmediatamente
            if (error.message === "DAILY_QUOTA_EXHAUSTED" || error.response?.status === 429) {
                console.log(`[Nexus AI] Probando siguiente modelo...`);
                continue;
            } else {
                // Para otros errores, lanzar inmediatamente
                throw error;
            }
        }
    }

    // Si todos los modelos fallan
    console.error(`[Nexus AI] FALLO TOTAL. Último error:`, lastError?.message);
    throw new Error(`Todos los modelos de Gemini fallaron. Último error: ${lastError?.message || 'Desconocido'}`);
}

module.exports = { tryGeminiWithFallback };
