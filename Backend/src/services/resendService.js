const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía un correo electrónico usando Resend
 * @param {string} to - Correo del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} html - Contenido HTML del correo
 * @returns {Promise<Object>} - Resultado del envío
 */
const sendEmail = async (to, subject, html) => {
    try {
        const data = await resend.emails.send({
            from: 'Nexus Athletics <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: html,
        });
        return data;
    } catch (error) {
        console.error('Error en ResendService:', error.message);
        throw error;
    }
};

module.exports = {
    sendEmail,
};
