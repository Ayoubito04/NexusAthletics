const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Crea un PaymentIntent para Stripe
 * @param {number} amount - Cantidad en euros
 * @param {string} currency - Moneda (default 'eur')
 * @param {Object} metadata - Información adicional
 * @returns {Promise<Object>} - El objeto PaymentIntent
 */
const createPaymentIntent = async (amount, currency = 'eur', metadata = {}) => {
    try {
        return await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convertir a céntimos
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });
    } catch (error) {
        console.error('Error en StripeService:', error.message);
        throw error;
    }
};

module.exports = {
    createPaymentIntent,
};
