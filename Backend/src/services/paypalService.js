const axios = require('axios');

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const getAccessToken = async () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    console.log('[PayPal] Mode:', process.env.PAYPAL_MODE || 'sandbox (default)');
    console.log('[PayPal] API URL:', PAYPAL_API);
    console.log('[PayPal] Client ID presente:', !!clientId, '| Secret presente:', !!secret);
    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
    try {
        const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('[PayPal] Error auth:', error.response?.status, JSON.stringify(error.response?.data));
        throw error;
    }
};

/**
 * Verifica un pago de PayPal (Order)
 * @param {string} orderId - ID de la orden de PayPal
 * @returns {Promise<Object>} - Datos de la orden verificada
 */
const verifyOrder = async (orderId) => {
    try {
        const accessToken = await getAccessToken();
        const response = await axios.get(`${PAYPAL_API}/v2/checkout/orders/${orderId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error verificando orden de PayPal:', error.message);
        throw error;
    }
};

const createOrder = async (amount, currency = 'EUR') => {
    const accessToken = await getAccessToken();
    const backendUrl = process.env.BACKEND_URL || 'https://nexusathletics.onrender.com';
    const response = await axios.post(`${PAYPAL_API}/v2/checkout/orders`, {
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }],
        application_context: {
            return_url: `${backendUrl}/payments/paypal-return`,
            cancel_url: `${backendUrl}/payments/paypal-cancel`,
            user_action: 'PAY_NOW',
            brand_name: 'Nexus Athletics',
        }
    }, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
    return response.data;
};

const captureOrder = async (orderId) => {
    const accessToken = await getAccessToken();
    const response = await axios.post(
        `${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
};

module.exports = { verifyOrder, createOrder, captureOrder };
