const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { getUsersRanking } = require('../controllers/rankingController');

router.get('/users', authenticateToken, getUsersRanking);

module.exports = router;
