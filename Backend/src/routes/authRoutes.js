const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Rutas publicas de autenticacion
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify', authController.verify2FA); // Mantenemos /verify para compatibilidad con el frontend
router.post('/resend-code', authController.resend2FACode);
router.post('/social', authController.socialLogin);
router.post('/supabase-sync', authController.supabaseSync);

// Rutas de refresh y logout
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticateToken, authController.logout);

// Rutas protegidas
router.get('/me', authenticateToken, authController.getMe);

// Rutas de account linking (requieren autenticacion)
router.post('/link-account', authenticateToken, authController.linkAccount);
router.post('/unlink-account', authenticateToken, authController.unlinkAccount);
router.get('/linked-accounts', authenticateToken, authController.getLinkedAccounts);

module.exports = router;
