const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const response = await axios.get(url);
        console.log("Modelos disponibles:");
        response.data.models.forEach(m => console.log("- " + m.name));
    } catch (error) {
        console.error("Error listando modelos:", error.response?.data || error.message);
    }
}

listModels();
