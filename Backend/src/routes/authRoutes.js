const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/security');

// SECURITY: Rate-limited authentication routes (5 attempts per 15 minutes)
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
// SECURITY: /verify y /resend-code también bajo rate limit — previene brute force de OTP
router.post('/verify', authLimiter, authController.verify2FA);
router.post('/resend-code', authLimiter, authController.resend2FACode);
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
