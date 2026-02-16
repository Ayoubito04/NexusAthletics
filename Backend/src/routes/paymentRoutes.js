const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/paypal', authenticateToken, paymentController.processPayPal);
router.post('/stripe', authenticateToken, paymentController.processStripe);
router.post('/create-intent', authenticateToken, paymentController.createPaymentIntent);

module.exports = router;
