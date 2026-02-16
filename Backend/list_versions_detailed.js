const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModelsWithVersions() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const response = await axios.get(url);
        let output = "\n======= MODELOS DISPONIBLES Y VERSIONES =======\n";
        response.data.models.forEach(m => {
            output += `- ID: ${m.name}\n`;
            output += `  Nombre: ${m.displayName}\n`;
            output += `  Versión: ${m.version}\n`;
            output += `  Descripción: ${m.description?.substring(0, 100)}...\n`;
            output += "-----------------------------------------------\n";
        });
        const fs = require('fs');
        fs.writeFileSync('versions_output.txt', output);
        console.log("Resultados guardados en versions_output.txt");
    } catch (error) {
        const fs = require('fs');
        const errorDetail = `ERROR: ${error.message}\nDATA: ${JSON.stringify(error.response?.data || {})}`;
        fs.writeFileSync('versions_error.txt', errorDetail);
        console.error("Error listando modelos:", error.response?.data || error.message);
    }
}

listModelsWithVersions();
