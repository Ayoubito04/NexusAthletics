const axios = require('axios');

const PAYPAL_API = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const getAccessToken = async () => {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    try {
        const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Error obteniendo PayPal access token:', error.message);
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

module.exports = {
    verifyOrder,
};
