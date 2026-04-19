const fs = require('fs');
const path = require('path');

const GIFS_PATH = path.join(__dirname, '../../data/exercise_gifs.json');

let cachedGifs = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

function loadGifs() {
    const now = Date.now();
    if (cachedGifs && now - cacheTime < CACHE_TTL) return cachedGifs;
    try {
        const raw = fs.readFileSync(GIFS_PATH, 'utf8');
        cachedGifs = JSON.parse(raw);
        cacheTime = now;
    } catch {
        cachedGifs = {};
    }
    return cachedGifs;
}

exports.getExerciseGifs = (req, res) => {
    const gifs = loadGifs();
    res.json(gifs);
};
