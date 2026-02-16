const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify', authController.verify2FA); // Mantenemos /verify para compatibilidad con el frontend
router.post('/resend-code', authController.resend2FACode);
router.post('/social', authController.socialLogin);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
