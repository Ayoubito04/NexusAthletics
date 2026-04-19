const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { logWorkoutSession, getStrengthRanking, getMyStrength } = require('../controllers/strengthController');

router.post('/log', authenticateToken, logWorkoutSession);
router.get('/ranking', authenticateToken, getStrengthRanking);
router.get('/me', authenticateToken, getMyStrength);

module.exports = router;
