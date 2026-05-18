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

// Para generación de planes: gemini-2.5-pro (thinking mode nativo) + 32k tokens
async function tryGeminiForPlans(contents, generationConfig = {}) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada");

    // gemini-2.5-pro requiere thinking mode activo (no se puede desactivar con budget=0)
    // El fix de parts[0].thought=true en planController maneja el output con thinking
    const models = [
        { name: 'gemini-2.5-pro',       tokens: 32768 },
        { name: 'gemini-2.5-flash',      tokens: 16384 },
        { name: 'gemini-2.0-flash',      tokens: 8192  },
    ];

    for (const { name, tokens } of models) {
        console.log(`[Nexus Plans] Intentando: ${name} (maxTokens=${tokens})`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent?key=${GEMINI_API_KEY}`;
            const cfg = { maxOutputTokens: tokens, temperature: 0.7, ...generationConfig };
            const response = await axios.post(url, { contents, generationConfig: cfg }, { timeout: GEMINI_PLAN_TIMEOUT_MS });
            console.log(`[Nexus Plans] ✓ Éxito con ${name}`);
            return response;
        } catch (error) {
            const status = error.response?.status;
            const msg = error.response?.data?.error?.message || error.message || '';
            console.log(`[Nexus Plans] ✗ ${name} → ${status || 'timeout'}: ${msg.slice(0, 120)}`);

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

async function tryClaudeForPlans(promptText) {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY no configurada");

    const Anthropic = require('@anthropic-ai/sdk');
    const AnthropicClient = Anthropic.default || Anthropic;
    const client = new AnthropicClient({ apiKey: ANTHROPIC_API_KEY, timeout: 90000 });

    const models = [
        { name: 'claude-haiku-4-5',  tokens: 16000 },
        { name: 'claude-sonnet-4-6', tokens: 16000 },
    ];

    let lastError;
    for (const { name, tokens } of models) {
        console.log(`[Nexus Plans Claude] Intentando: ${name}`);
        try {
            const response = await client.messages.create({
                model: name,
                max_tokens: tokens,
                messages: [{ role: 'user', content: promptText }],
            });
            console.log(`[Nexus Plans Claude] ✓ Éxito con ${name} | stop_reason: ${response.stop_reason}`);
            return response;
        } catch (error) {
            lastError = error;
            const status = error.status;
            const msg = error.message || '';
            console.log(`[Nexus Plans Claude] ✗ ${name} → ${status || 'error'}: ${msg.slice(0, 120)}`);
            const shouldRetry = status === 529 || status === 503 || status === 500 || status === 429 || status === 404;
            if (shouldRetry) {
                if (status === 429) await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            throw error;
        }
    }
    throw lastError || new Error('Servicio de IA temporalmente no disponible.');
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

module.exports = { tryGeminiWithFallback, tryGeminiForPlans, tryClaudeForPlans, generateImage };
