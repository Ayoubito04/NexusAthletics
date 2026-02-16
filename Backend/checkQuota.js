const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function checkModelsDetail() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const response = await axios.get(url);

        console.log("\n--- MODELOS COMPATIBLES CON TU LLAVE ---");
        const flashModels = response.data.models.filter(m =>
            m.name.includes('flash') && m.supportedGenerationMethods.includes('generateContent')
        );

        if (flashModels.length === 0) {
            console.log("❌ No se encontraron modelos 'flash' con permiso de generación.");
        } else {
            flashModels.forEach(m => {
                console.log(`✅ Modelo: ${m.name}`);
                console.log(`   Versión: ${m.version}`);
                console.log(`   Límite Input: ${m.inputTokenLimit}`);
            });
        }
    } catch (error) {
        console.error("❌ Error al consultar Google:", error.response?.data || error.message);
    }
}

checkModelsDetail();
