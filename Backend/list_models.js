const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    console.log("DEBUG: Buscando .env en:", path.join(__dirname, '.env'));
    console.log("DEBUG: API KEY length:", GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
    if (!GEMINI_API_KEY) {
        console.error("❌ Error: No se encontró GEMINI_API_KEY en el .env");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    
    try {
        console.log("🔍 Consultando modelos disponibles...");
        const response = await axios.get(url);
        console.log("\n=== MODELOS DISPONIBLES ===");
        response.data.models.forEach(model => {
            console.log(`- Nombre: ${model.name}`);
            console.log(`  Descripción: ${model.description}`);
            console.log(`  Métodos: ${model.supportedGenerationMethods.join(', ')}`);
            console.log('---------------------------');
        });
    } catch (error) {
        console.error("❌ Error al consultar modelos:");
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

listModels();
