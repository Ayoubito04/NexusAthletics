const { prisma } = require('../config/prisma');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createOrder, captureOrder } = require('../services/paypalService');

const getPlanData = (plan) => ({
    plan,
    trialEndDate: plan === 'Ultimate'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : null,
});

const processPayPal = async (req, res) => {
    const { amount, plan, orderId } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: getPlanData(plan)
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword, message: "Pago procesado exitosamente con PayPal" });
    } catch (error) {
        res.status(500).json({ error: "Error al procesar pago con PayPal" });
    }
};

const processStripe = async (req, res) => {
    const { amount, plan, paymentMethodId } = req.body;
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'eur',
            payment_method: paymentMethodId,
            confirm: true,
            description: `Suscripción Nexus Athletics - ${plan}`,
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
        });

        if (paymentIntent.status === 'succeeded') {
            const user = await prisma.user.update({
                where: { id: req.user.id },
                data: getPlanData(plan)
            });
            const { password: _, ...userWithoutPassword } = user;
            res.json({ success: true, user: userWithoutPassword, message: "Pago real procesado con éxito" });
        } else {
            res.status(400).json({ error: "El pago no pudo completarse" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error en Stripe: " + error.message });
    }
};

const createPaymentIntent = async (req, res) => {
    const { amount, plan, isTrial } = req.body;
    try {
        if (isTrial) {
            // Trial: guardar tarjeta sin cobrar nada (SetupIntent)
            const setupIntent = await stripe.setupIntents.create({
                automatic_payment_methods: { enabled: true },
                metadata: { userId: String(req.user.id), plan, isTrial: 'true' }
            });
            return res.json({ clientSecret: setupIntent.client_secret, isSetupIntent: true });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'eur',
            automatic_payment_methods: { enabled: true },
            metadata: { userId: String(req.user.id), plan, isTrial: 'false' }
        });

        res.json({ clientSecret: paymentIntent.client_secret, isSetupIntent: false });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const createPayPalOrder = async (req, res) => {
    const { amount, plan } = req.body;
    try {
        const order = await createOrder(parseFloat(amount));
        const approveLink = order.links?.find(l => l.rel === 'payer-action')?.href
            || order.links?.find(l => l.rel === 'approve')?.href;
        if (!approveLink) throw new Error('PayPal no devolvió enlace de aprobación');
        res.json({ orderID: order.id, approveLink });
    } catch (error) {
        console.error('PayPal create error:', error.message);
        res.status(500).json({ error: 'Error creando orden PayPal: ' + error.message });
    }
};

const capturePayPalOrder = async (req, res) => {
    const { orderID, plan } = req.body;
    try {
        const capture = await captureOrder(orderID);
        if (capture.status === 'COMPLETED') {
            const user = await prisma.user.update({
                where: { id: req.user.id },
                data: getPlanData(plan)
            });
            const { password: _, ...userWithoutPassword } = user;
            res.json({ success: true, user: userWithoutPassword });
        } else {
            res.status(400).json({ error: `Pago en estado: ${capture.status}` });
        }
    } catch (error) {
        console.error('PayPal capture error:', error.message);
        res.status(500).json({ error: 'Error capturando pago PayPal: ' + error.message });
    }
};

const paypalReturn = (req, res) => {
    const { token, PayerID } = req.query;
    res.redirect(`nexus-fitness://paypal?token=${token}&PayerID=${PayerID}`);
};

const paypalCancel = (req, res) => {
    res.redirect(`nexus-fitness://paypal?cancelled=true`);
};

module.exports = { processPayPal, processStripe, createPaymentIntent, createPayPalOrder, capturePayPalOrder, paypalReturn, paypalCancel };
