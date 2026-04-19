const express = require('express');
const router = express.Router();
const { getExerciseGifs, proxyGif } = require('../controllers/exerciseController');

router.get('/exercises/gifs', getExerciseGifs);
router.get('/exercises/gif/:id', proxyGif);

module.exports = router;
