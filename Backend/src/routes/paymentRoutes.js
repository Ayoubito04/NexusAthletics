const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { paymentLimiter } = require('../middlewares/security');

// SECURITY: Payment routes are rate-limited (10 attempts per hour per user)
router.post('/paypal', authenticateToken, paymentLimiter, paymentController.processPayPal);
router.post('/stripe', authenticateToken, paymentLimiter, paymentController.processStripe);
router.post('/create-intent', authenticateToken, paymentLimiter, paymentController.createPaymentIntent);

module.exports = router;
