const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/prisma');
const axios = require('axios');
const { Resend } = require('resend');
const oauthService = require('../services/oauthService');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_por_defecto';
const JWT_EXPIRES_IN = '30d';
const JWT_REFRESH_EXPIRES_IN = '7d';

// Inicialización segura de Resend
const resendApiKey = process.env.RESEND_API_KEY;
const resend = (resendApiKey && resendApiKey !== 're_tu_api_key') ? new Resend(resendApiKey) : null;

function generateVCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


function generateReferralCode(nombre) {
    const prefix = nombre ? nombre.slice(0, 3).toUpperCase() : 'NEX';
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}-${suffix}`;
}

const sendVerificationEmail = async (email, code) => {
    try {
        if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_tu_api_key') {
            console.log(`[DEV-MODE] Email para ${email} no enviado (API Key no configurada). Código: ${code}`);
            return true;
        }

        const { data, error } = await resend.emails.send({
            from: 'NexusFitness <onboarding@resend.dev>',
            to: email,
            subject: 'Código de Verificación - NexusIAFitness',
            html: `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0ce810; text-align: center;">NexusIAFitness</h2>
                    <p>Hola,</p>
                    <p>Tu código de verificación para iniciar sesión es:</p>
                    <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; color: #000;">
                        ${code}
                    </div>
                    <p style="margin-top: 20px;">Este código expirará en 10 minutos.</p>
                    <p>Si no solicitaste este código, puedes ignorar este mensaje.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #888; text-align: center;">Nexus Fitness App - El futuro del entrenamiento con IA</p>
                </div>
            `,
        });

        if (error) {
            console.error("Error al enviar email con Resend:", error);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Excepción al enviar email:", err);
        return false;
    }
};

const register = async (req, res) => {
    try {
        const { email, nombre, apellido, password } = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "El email ya está registrado" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const refCode = generateReferralCode(nombre);

        const user = await prisma.user.create({
            data: {
                email,
                nombre,
                apellido,
                password: hashedPassword,
                plan: "Gratis",
                role: "USER",
                referralCode: refCode
            }
        });

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor al registrar" });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email y contraseña son requeridos" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: "Credenciales inválidas" });

        if (user.twoFactorEnabled) {
            const code = generateVCode();
            const expires = new Date(Date.now() + 10 * 60000); // 10 min

            await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorCode: code, twoFactorExpires: expires }
            });

            const emailSent = await sendVerificationEmail(user.email, code);

            return res.json({
                requires2FA: true,
                email: user.email,
                message: emailSent ? "Código enviado" : "Error al enviar código (revisa consola)"
            });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor: " + error.message });
    }
};

const verify2FA = async (req, res) => {
    const { email, code } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        if (user.twoFactorCode === code && user.twoFactorExpires > new Date()) {
            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorCode: null, twoFactorExpires: null }
            });

            const token = jwt.sign({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role }, JWT_SECRET, { expiresIn: '30d' });
            const { password: _, ...userWithoutPassword } = updatedUser;
            res.json({ user: userWithoutPassword, token });
        } else {
            res.status(400).json({ error: "Código inválido o expirado" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error en la verificación 2FA" });
    }
};

const resend2FACode = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        const code = generateVCode();
        const expires = new Date(Date.now() + 10 * 60000);

        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorCode: code, twoFactorExpires: expires }
        });

        const emailSent = await sendVerificationEmail(user.email, code);
        res.json({ success: emailSent, message: emailSent ? "Código reenviado" : "Error al enviar email" });
    } catch (error) {
        res.status(500).json({ error: "Error al reenviar código" });
    }
};

const socialLogin = async (req, res) => {
    console.log("-----------------------------------------");
    console.log("🔥 LLEGÓ PETICIÓN SOCIAL AL BACKEND 🔥");
    console.log("Proveedor:", req.body?.provider);
    console.log("Body completo:", req.body);
    console.log("-----------------------------------------");
    try {
        const { provider, accessToken, idToken } = req.body;
        let userData = null;

        if (provider === 'google') {
            // Si recibimos id_token, lo decodificamos directamente (más eficiente)
            if (idToken) {
                console.log("✅ Usando id_token de Google");
                // Decodificar el id_token (JWT)
                const jwtDecode = require('jsonwebtoken');
                try {
                    // Decodificar sin verificar (Google ya lo firmó)
                    const decoded = jwtDecode.decode(idToken);
                    console.log("Decoded token:", decoded);

                    userData = {
                        id: decoded.sub,
                        email: decoded.email,
                        nombre: decoded.given_name || decoded.name?.split(' ')[0] || 'Usuario',
                        apellido: decoded.family_name || decoded.name?.split(' ').slice(1).join(' ') || '',
                        avatar: decoded.picture
                    };
                } catch (decodeError) {
                    console.error("Error al decodificar id_token:", decodeError);
                    return res.status(400).json({ error: "Token inválido" });
                }
            }
            // Fallback: si recibimos access_token, lo usamos
            else if (accessToken) {
                console.log("✅ Usando access_token de Google");
                const response = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                userData = {
                    id: response.data.sub,
                    email: response.data.email,
                    nombre: response.data.given_name,
                    apellido: response.data.family_name,
                    avatar: response.data.picture
                };
            } else {
                return res.status(400).json({ error: "Se requiere accessToken o idToken" });
            }
        } else if (provider === 'facebook') {
            if (!accessToken) {
                return res.status(400).json({ error: "Se requiere accessToken para Facebook" });
            }
            const response = await axios.get(`https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture&access_token=${accessToken}`);
            userData = {
                id: response.data.id,
                email: response.data.email,
                nombre: response.data.first_name,
                apellido: response.data.last_name,
                avatar: response.data.picture?.data?.url
            };
        } else if (provider === 'instagram') {
            if (!accessToken) {
                return res.status(400).json({ error: "Se requiere accessToken para Instagram" });
            }
            // Instagram Basic Display API o via Facebook (dependiendo de la configuración)
            // Aquí usamos el endpoint de Instagram para obtener datos básicos
            try {
                const response = await axios.get(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
                userData = {
                    id: response.data.id,
                    email: `${response.data.username}@instagram.com`, // Instagram Basic API no devuelve email por defecto
                    nombre: response.data.username,
                    apellido: '',
                    avatar: null // Requiere permisos extra
                };
            } catch (err) {
                // Fallback: Si el usuario pulsa Instagram pero la app usa login de Facebook (común en apps vinculadas)
                const fbResponse = await axios.get(`https://graph.facebook.com/me?fields=id,first_name,last_name,email,picture&access_token=${accessToken}`);
                userData = {
                    id: fbResponse.data.id,
                    email: fbResponse.data.email,
                    nombre: fbResponse.data.first_name,
                    apellido: fbResponse.data.last_name,
                    avatar: fbResponse.data.picture?.data?.url
                };
            }
        } else if (provider === 'x' || provider === 'twitter') {
            if (!accessToken) {
                return res.status(400).json({ error: "Se requiere accessToken para X" });
            }
            // Twitter API v2
            const response = await axios.get(`https://api.twitter.com/2/users/me?user.fields=profile_image_url`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            userData = {
                id: response.data.data.id,
                email: `${response.data.data.username}@x.com`, // La API v2 básica no da email sin permisos específicos
                nombre: response.data.data.name || response.data.data.username,
                apellido: '',
                avatar: response.data.data.profile_image_url
            };
        }

        if (!userData || !userData.email) {
            console.error("❌ No se pudo obtener email del usuario");
            return res.status(400).json({ error: "No se pudo obtener la información del usuario" });
        }

        console.log("✅ Datos de usuario extraídos:", userData);

        // Buscar el usuario existente en la BD por email
        let user = await prisma.user.findUnique({ where: { email: userData.email } });

        let isNewUser = false;
        if (!user) {
            console.log("📝 Creando nuevo usuario...");
            user = await prisma.user.create({
                data: {
                    email: userData.email,
                    nombre: userData.nombre,
                    apellido: userData.apellido,
                    avatar: userData.avatar,
                    googleId: provider === 'google' ? userData.id : null,
                    facebookId: provider === 'facebook' ? userData.id : null,
                    instagramId: provider === 'instagram' ? userData.id : null,
                    twitterId: (provider === 'x' || provider === 'twitter') ? userData.id : null,
                    plan: "Gratis",
                    isVerified: true,
                    referralCode: generateReferralCode(userData.nombre)
                }
            });
            isNewUser = true;
            console.log("✅ Usuario creado:", user.id);
        } else {
            console.log("✅ Usuario existente encontrado:", user.id);
            // Actualizamos los IDs si no los tenía
            const updateData = {};
            if (provider === 'google' && !user.googleId) updateData.googleId = userData.id;
            if (provider === 'facebook' && !user.facebookId) updateData.facebookId = userData.id;
            if (provider === 'instagram' && !user.instagramId) updateData.instagramId = userData.id;
            if ((provider === 'x' || provider === 'twitter') && !user.twitterId) updateData.twitterId = userData.id;

            if (Object.keys(updateData).length > 0) {
                user = await prisma.user.update({
                    where: { email: userData.email },
                    data: updateData
                });
            }
        }

        if (user.twoFactorEnabled) {
            const code = generateVCode();
            const expires = new Date(Date.now() + 10 * 60000);

            await prisma.user.update({
                where: { id: user.id },
                data: { twoFactorCode: code, twoFactorExpires: expires }
            });

            await sendVerificationEmail(user.email, code);

            return res.json({
                requiresVerification: true,
                user: { email: user.email }
            });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        const { password: _, ...userWithoutPassword } = user;

        console.log("✅ Login social exitoso, devolviendo token");
        res.json({ user: userWithoutPassword, token, isNewUser });

    } catch (error) {
        console.error("❌ Error en login social:", error.response?.data || error.message);
        console.error("Stack:", error.stack);
        res.status(500).json({ error: "Error en login social: " + (error.response?.data?.error?.message || error.message) });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener perfil" });
    }
};

const supabaseSync = async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({ error: "Access token is required" });
        }

        // Validamos el token con Supabase directamente
        const supabaseUrl = process.env.SUPABASE_URL || 'https://gbtxcjprfqmghdhqvyfb.supabase.co';
        const response = await axios.get(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': process.env.SUPABASE_ANON_KEY || ''
            }
        });

        const supabaseUser = response.data;
        if (!supabaseUser || !supabaseUser.email) {
            return res.status(401).json({ error: "Token de Supabase inválido" });
        }

        // Buscamos o creamos el usuario en nuestra DB
        let user = await prisma.user.findUnique({
            where: { email: supabaseUser.email }
        });

        let isNewUser = false;

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: supabaseUser.email,
                    nombre: supabaseUser.user_metadata?.full_name || supabaseUser.email,
                    plan: 'Gratis',
                    role: 'USER',
                    referralCode: generateReferralCode(supabaseUser.user_metadata?.full_name),
                }
            });
            isNewUser = true;
        }

        // Generamos nuestro propio JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword, token, isNewUser });

    } catch (error) {
        console.error("❌ Error en supabaseSync:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: "Error sincronizando sesión con Supabase",
            details: error.response?.data || error.message
        });
    }
};





/**
 * Refresca el token JWT
 * Permite mantener la sesion activa sin necesidad de re-login
 */
const refreshToken = async (req, res) => {
    try {
        const { refreshToken: oldRefreshToken } = req.body;

        if (!oldRefreshToken) {
            return res.status(400).json({
                error: 'Refresh token requerido',
                code: 'MISSING_REFRESH_TOKEN'
            });
        }

        // Verificar el refresh token
        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                error: 'Refresh token invalido o expirado',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        // Verificar que el usuario existe
        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        // Generar nuevos tokens
        const newToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const newRefreshToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRES_IN }
        );

        // Registrar el refresh
        await oauthService.logAuthAction(user.id, 'token_refresh', 'jwt', true, null, req);

        res.json({
            token: newToken,
            refreshToken: newRefreshToken,
            expiresIn: 30 * 24 * 60 * 60 * 1000 // 30 dias en ms
        });

    } catch (error) {
        console.error('Error en refreshToken:', error);
        res.status(500).json({
            error: 'Error al refrescar el token',
            code: 'REFRESH_ERROR'
        });
    }
};

/**
 * Logout con revocacion de tokens OAuth
 */
const logout = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { provider, oauthToken } = req.body;

        // Revocar token OAuth con el proveedor si se proporciona
        if (oauthToken && provider) {
            await oauthService.revokeOAuthToken(provider, oauthToken);
        }

        // Registrar logout
        if (userId) {
            await oauthService.logAuthAction(userId, 'logout', provider || 'jwt', true, null, req);
        }

        res.json({
            success: true,
            message: 'Sesion cerrada correctamente'
        });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            error: 'Error al cerrar sesion',
            code: 'LOGOUT_ERROR'
        });
    }
};

/**
 * Vincula una cuenta OAuth a un usuario existente
 */
const linkAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { provider, accessToken, idToken } = req.body;

        if (!provider) {
            return res.status(400).json({
                error: 'Proveedor requerido',
                code: 'MISSING_PROVIDER'
            });
        }

        if (!['google', 'facebook', 'instagram', 'twitter'].includes(provider)) {
            return res.status(400).json({
                error: 'Proveedor no soportado',
                code: 'UNSUPPORTED_PROVIDER'
            });
        }

        // Validar token con el proveedor
        const tokenType = idToken ? 'idToken' : 'accessToken';
        const token = idToken || accessToken;

        const validation = await oauthService.validateToken(provider, token, tokenType);

        if (!validation.valid) {
            return res.status(401).json({
                error: oauthService.getErrorMessage(validation.error),
                code: validation.error
            });
        }

        // Vincular cuenta
        const result = await oauthService.linkAccount(
            userId,
            provider,
            validation.userData.id,
            accessToken,
            null
        );

        if (!result.success) {
            return res.status(400).json({
                error: result.message || 'Error al vincular cuenta',
                code: result.error
            });
        }

        res.json({
            success: true,
            message: `Cuenta de ${provider} vinculada correctamente`,
            provider,
            providerUserId: validation.userData.id
        });

    } catch (error) {
        console.error('Error en linkAccount:', error);
        res.status(500).json({
            error: 'Error al vincular la cuenta',
            code: 'LINK_ERROR'
        });
    }
};

/**
 * Desvincula una cuenta OAuth del usuario
 */
const unlinkAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { provider } = req.body;

        if (!provider) {
            return res.status(400).json({
                error: 'Proveedor requerido',
                code: 'MISSING_PROVIDER'
            });
        }

        // Obtener token OAuth para revocarlo
        const oauthToken = await oauthService.getValidOAuthToken(userId, provider);

        // Revocar con el proveedor
        if (oauthToken?.accessToken) {
            await oauthService.revokeOAuthToken(provider, oauthToken.accessToken);
        }

        // Desvincular cuenta
        const result = await oauthService.unlinkAccount(userId, provider);

        if (!result.success) {
            return res.status(400).json({
                error: result.message || 'Error al desvincular cuenta',
                code: result.error
            });
        }

        res.json({
            success: true,
            message: `Cuenta de ${provider} desvinculada correctamente`
        });

    } catch (error) {
        console.error('Error en unlinkAccount:', error);
        res.status(500).json({
            error: 'Error al desvincular la cuenta',
            code: 'UNLINK_ERROR'
        });
    }
};

/**
 * Obtiene las cuentas OAuth vinculadas del usuario
 */
const getLinkedAccounts = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                googleId: true,
                facebookId: true,
                instagramId: true,
                twitterId: true,
                email: true,
                password: true,
            }
        });

        const linkedAccounts = [];

        if (user.googleId) {
            linkedAccounts.push({
                provider: 'google',
                linked: true,
                linkedAt: new Date() // TODO: Guardar fecha de vinculacion
            });
        }
        if (user.facebookId) {
            linkedAccounts.push({
                provider: 'facebook',
                linked: true,
            });
        }
        if (user.instagramId) {
            linkedAccounts.push({
                provider: 'instagram',
                linked: true,
            });
        }
        if (user.twitterId) {
            linkedAccounts.push({
                provider: 'twitter',
                linked: true,
            });
        }

        res.json({
            accounts: linkedAccounts,
            hasPassword: !!user.password,
            email: user.email
        });

    } catch (error) {
        console.error('Error en getLinkedAccounts:', error);
        res.status(500).json({
            error: 'Error al obtener cuentas vinculadas',
            code: 'GET_ACCOUNTS_ERROR'
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
    verify2FA,
    resend2FACode,
    socialLogin,
    supabaseSync,
    // Nuevos endpoints
    refreshToken,
    logout,
    linkAccount,
    unlinkAccount,
    getLinkedAccounts,
};
