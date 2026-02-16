const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const response = await axios.get(url);
        let output = "Modelos disponibles:\n";
        response.data.models.forEach(m => {
            output += "- " + m.name + " (" + m.displayName + ")\n";
        });
        fs.writeFileSync('models_list.txt', output);
        console.log("Completado. Lista guardada en models_list.txt");
    } catch (error) {
        const errorMsg = "Error listando modelos: " + (error.response?.data?.error?.message || error.message);
        fs.writeFileSync('models_list.txt', errorMsg);
        console.error(errorMsg);
    }
}

listModels();
