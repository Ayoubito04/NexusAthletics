const fs = require('fs');
const path = require('path');
const axios = require('axios');

const GIFS_PATH = path.join(__dirname, '../../data/exercise_gifs.json');
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

let cachedIds = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;

function loadIds() {
    const now = Date.now();
    if (cachedIds && now - cacheTime < CACHE_TTL) return cachedIds;
    try {
        cachedIds = JSON.parse(fs.readFileSync(GIFS_PATH, 'utf8'));
        cacheTime = now;
    } catch {
        cachedIds = {};
    }
    return cachedIds;
}

// GET /exercises/gifs  → { imgKey: exerciseId, ... }
exports.getExerciseGifs = (req, res) => {
    res.json(loadIds());
};

// GET /exercises/gif/:id  → proxy GIF desde ExerciseDB
exports.proxyGif = async (req, res) => {
    const { id } = req.params;
    if (!RAPIDAPI_KEY) return res.status(503).send('API key not configured');
    if (!/^\w+$/.test(id)) return res.status(400).send('Invalid id');

    try {
        const upstream = await axios.get(
            `https://exercisedb.p.rapidapi.com/image?exerciseId=${id}&resolution=360`,
            {
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
                },
                responseType: 'stream',
                timeout: 15000,
            }
        );
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        upstream.data.pipe(res);
    } catch (e) {
        res.status(502).send('GIF fetch failed');
    }
};
