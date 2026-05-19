const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { paymentLimiter } = require('../middlewares/security');

// SECURITY: Payment routes are rate-limited (10 attempts per hour per user)
router.post('/paypal', authenticateToken, paymentLimiter, paymentController.processPayPal);
router.post('/stripe', authenticateToken, paymentLimiter, paymentController.processStripe);
router.post('/create-intent', authenticateToken, paymentLimiter, paymentController.createPaymentIntent);
router.post('/paypal-create', authenticateToken, paymentLimiter, paymentController.createPayPalOrder);
router.post('/paypal-capture', authenticateToken, paymentLimiter, paymentController.capturePayPalOrder);
router.get('/paypal-return', paymentController.paypalReturn);
router.get('/paypal-cancel', paymentController.paypalCancel);

module.exports = router;
