const axios = require('axios');

const GEMINI_TIMEOUT_MS = 55000; // 55s — justo por debajo del timeout de Render (60s)
const GEMINI_PLAN_TIMEOUT_MS = 90000; // planes complejos pueden tardar más

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

// Para generación de planes: usa gemini-2.5-pro (32k tokens) con fallback a flash
async function tryGeminiForPlans(contents, generationConfig = {}) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada");

    const models = ['gemini-2.5-pro', 'gemini-2.5-pro-preview-06-05', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    const config = { maxOutputTokens: 32768, temperature: 0.7, ...generationConfig };

    for (const model of models) {
        console.log(`[Nexus Plans] Intentando: ${model}`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            const response = await axios.post(url, { contents, generationConfig: config }, { timeout: GEMINI_PLAN_TIMEOUT_MS });
            console.log(`[Nexus Plans] ✓ Éxito con ${model}`);
            return response;
        } catch (error) {
            lastError = error;
            const status = error.response?.status;
            const msg = error.response?.data?.error?.message || error.message || '';
            console.log(`[Nexus Plans] ✗ ${model} → ${status || 'timeout'}: ${msg.slice(0, 100)}`);

            const shouldRetry = msg.includes('quota') || msg.includes('Quota') || status === 503 || status === 500 || status === 429 || status === 404 || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
            if (shouldRetry) {
                if (status === 429) await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            throw error;
        }
    }
    throw new Error('Servicio de IA temporalmente no disponible. Inténtalo de nuevo en unos minutos.');
}

async function generateImage(prompt) {
    const HF_KEY = process.env.HUGGINGFACE_API_KEY;
    if (!HF_KEY) throw new Error("HUGGINGFACE_API_KEY no configurada");

    console.log('[ImageGen] Generando con HuggingFace FLUX.1-schnell...');
    const response = await axios.post(
        'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
        { inputs: prompt },
        {
            headers: { Authorization: `Bearer ${HF_KEY}`, 'Content-Type': 'application/json' },
            responseType: 'arraybuffer',
            timeout: 60000,
        }
    );
    const base64 = Buffer.from(response.data).toString('base64');
    console.log('[ImageGen] ✓ Imagen generada');
    return { data: base64, mimeType: 'image/jpeg' };
}

module.exports = { tryGeminiWithFallback, tryGeminiForPlans, generateImage };
