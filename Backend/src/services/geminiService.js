const axios = require('axios');

const GEMINI_TIMEOUT_MS = 55000; // 55s — justo por debajo del timeout de Render (60s)

async function tryGeminiWithFallback(contents, generationConfig = {}) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada");

    const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const models = [...new Set([
        preferredModel,
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
    ])];

    for (const model of models) {
        console.log(`[Nexus AI] Intentando: ${model}`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            const response = await axios.post(url, { contents, generationConfig }, { timeout: GEMINI_TIMEOUT_MS });
            console.log(`[Nexus AI] ✓ Éxito con ${model}`);
            return response;
        } catch (error) {
            lastError = error;
            const status = error.response?.status;
            const msg = error.response?.data?.error?.message || error.message || '';
            console.log(`[Nexus AI] ✗ ${model} → ${status || 'timeout'}: ${msg.slice(0, 80)}`);

            const isQuotaExhausted = msg.includes('Quota exceeded') || msg.includes('quota');
            const isUnavailable = status === 503 || status === 500 || status === 429;
            const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';

            if (isQuotaExhausted || isUnavailable || isTimeout) {
                if (status === 429) await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            throw error;
        }
    }

    throw new Error('Servicio de IA temporalmente no disponible. Inténtalo de nuevo en unos minutos.');
}

module.exports = { tryGeminiWithFallback };
