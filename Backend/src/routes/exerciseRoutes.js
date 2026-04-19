const express = require('express');
const router = express.Router();
const { getExerciseGifs } = require('../controllers/exerciseController');

// Público — no requiere auth. Devuelve mapa imgKey → gifUrl
router.get('/exercises/gifs', getExerciseGifs);

module.exports = router;
