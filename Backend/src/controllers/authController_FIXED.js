const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/prisma');
const axios = require('axios');
const { Resend } = require('resend');
const oauthService = require('../services/oauthService');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

// SECURITY FIX: Fail fast if JWT_SECRET not configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 64) {
    throw new Error('FATAL: JWT_SECRET not configured or too weak (minimum 64 chars)');
}

// SECURITY FIX: Short-lived access tokens (15 min) + refresh tokens (7 days)
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

// Google OAuth client for signature verification
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Inicialización segura de Resend
const resendApiKey = process.env.RESEND_API_KEY;
const resend = (resendApiKey && resendApiKey !== 're_tu_api_key') ? new Resend(resendApiKey) : null;

function generateVCode() {
    // SECURITY FIX: Use 8-digit code (100M combinations) instead of 6-digit (1M)
    // This makes brute force attacks significantly harder
    return crypto.randomInt(10000000, 99999999).toString();
}

function generateReferralCode(nombre) {
    const prefix = nombre ? nombre.slice(0, 3).toUpperCase() : 'NEX';
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}-${suffix}`;
}

// SECURITY FIX: Token generation helpers with proper expiration
function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
    );
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

        // Input validation
        if (!email || !password || !nombre) {
            return res.status(400).json({ error: "Email, nombre y contraseña son requeridos" });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: "Contraseña debe tener al menos 8 caracteres" });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "El email ya está registrado" });

        // SECURITY FIX: Increase bcrypt cost factor to 12 (from 10)
        const hashedPassword = await bcrypt.hash(password, 12);
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

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // SECURITY FIX: Never return password
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            user: userWithoutPassword,
            accessToken,
            refreshToken,
            expiresIn: 15 * 60 // 15 minutes in seconds
        });
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

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const { password: _, ...userWithoutPassword } = user;
        res.json({
            user: userWithoutPassword,
            accessToken,
            refreshToken,
            expiresIn: 15 * 60
        });
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

            const accessToken = generateAccessToken(updatedUser);
            const refreshToken = generateRefreshToken(updatedUser);

            const { password: _, ...userWithoutPassword } = updatedUser;
            res.json({
                user: userWithoutPassword,
                accessToken,
                refreshToken,
                expiresIn: 15 * 60
            });
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
    console.log("-----------------------------------------");
    try {
        const { provider, accessToken, idToken } = req.body;
        let userData = null;

        if (provider === 'google') {
            // SECURITY FIX: Verify Google ID token signature with Google's public keys
            if (idToken) {
                console.log("✅ Validando ID token de Google con Google");
                try {
                    if (!googleClient) {
                        return res.status(500).json({ error: "Google OAuth no está configurado en el servidor" });
                    }

                    // Verify signature using Google's public keys
                    const ticket = await googleClient.verifyIdToken({
                        idToken: idToken,
                        audience: GOOGLE_CLIENT_ID
                    });

                    const payload = ticket.getPayload();

                    // Verify critical claims
                    if (payload.aud !== GOOGLE_CLIENT_ID) {
                        return res.status(401).json({ error: "Token audience mismatch" });
                    }

                    if (payload.iss !== 'https://accounts.google.com' &&
                        payload.iss !== 'accounts.google.com') {
                        return res.status(401).json({ error: "Invalid token issuer" });
                    }

                    // Only accept verified emails
                    if (!payload.email_verified) {
                        console.warn(`[SECURITY] Google login attempted with unverified email: ${payload.email}`);
                        return res.status(401).json({
                            error: "Email no verificado en Google. Por favor verifica tu email primero."
                        });
                    }

                    userData = {
                        id: payload.sub,
                        email: payload.email,
                        email_verified: payload.email_verified,
                        nombre: payload.given_name || payload.name?.split(' ')[0] || 'Usuario',
                        apellido: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
                        avatar: payload.picture
                    };

                } catch (verifyError) {
                    console.error("Error validando Google ID token:", verifyError.message);
                    return res.status(401).json({
                        error: "Token de Google inválido. " + verifyError.message
                    });
                }
            }
            // Fallback: if we have access token, use it to call userinfo endpoint
            else if (accessToken) {
                console.log("✅ Usando access_token de Google");
                try {
                    const response = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo`, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                        timeout: 5000
                    });
                    userData = {
                        id: response.data.sub,
                        email: response.data.email,
                        email_verified: response.data.verified_email,
                        nombre: response.data.given_name,
                        apellido: response.data.family_name,
                        avatar: response.data.picture
                    };
                } catch (err) {
                    console.error("Error validating Google access token:", err.message);
                    return res.status(401).json({ error: "Google access token inválido" });
                }
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
            try {
                const response = await axios.get(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
                userData = {
                    id: response.data.id,
                    email: `${response.data.username}@instagram.com`,
                    nombre: response.data.username,
                    apellido: '',
                    avatar: null
                };
            } catch (err) {
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
            const response = await axios.get(`https://api.twitter.com/2/users/me?user.fields=profile_image_url`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            userData = {
                id: response.data.data.id,
                email: `${response.data.data.username}@x.com`,
                nombre: response.data.data.name || response.data.data.username,
                apellido: '',
                avatar: response.data.data.profile_image_url
            };
        }

        if (!userData || !userData.email) {
            console.error("❌ No se pudo obtener email del usuario");
            return res.status(400).json({ error: "No se pudo obtener la información del usuario" });
        }

        console.log("✅ Datos de usuario extraídos y validados:", userData);

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
                    isVerified: userData.email_verified === true,
                    referralCode: generateReferralCode(userData.nombre)
                }
            });
            isNewUser = true;
            console.log("✅ Usuario creado:", user.id);
        } else {
            console.log("✅ Usuario existente encontrado:", user.id);
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

        const accessTokenNew = generateAccessToken(user);
        const refreshTokenNew = generateRefreshToken(user);
        const { password: _, ...userWithoutPassword } = user;

        console.log("✅ Login social exitoso, devolviendo token");
        res.json({
            user: userWithoutPassword,
            accessToken: accessTokenNew,
            refreshToken: refreshTokenNew,
            expiresIn: 15 * 60,
            isNewUser
        });

    } catch (error) {
        console.error("❌ Error en login social:", error.response?.data || error.message);
        console.error("Stack:", error.stack);
        res.status(500).json({
            error: "Error en login social: " + (error.response?.data?.error?.message || error.message)
        });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                nombre: true,
                apellido: true,
                avatar: true,
                plan: true,
                role: true,
                createdAt: true,
                // Exclude sensitive fields: password, 2FA codes, verification codes
            }
        });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(user);
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

        const accessTokenNew = generateAccessToken(user);
        const refreshTokenNew = generateRefreshToken(user);

        const { password: _, ...userWithoutPassword } = user;
        res.json({
            user: userWithoutPassword,
            accessToken: accessTokenNew,
            refreshToken: refreshTokenNew,
            expiresIn: 15 * 60,
            isNewUser
        });

    } catch (error) {
        console.error("❌ Error en supabaseSync:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: "Error sincronizando sesión con Supabase",
            details: error.response?.data || error.message
        });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken: oldRefreshToken } = req.body;

        if (!oldRefreshToken) {
            return res.status(400).json({
                error: 'Refresh token requerido',
                code: 'MISSING_REFRESH_TOKEN'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                error: 'Refresh token invalido o expirado',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        await oauthService.logAuthAction(user.id, 'token_refresh', 'jwt', true, null, req);

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: 15 * 60
        });

    } catch (error) {
        console.error('Error en refreshToken:', error);
        res.status(500).json({
            error: 'Error al refrescar el token',
            code: 'REFRESH_ERROR'
        });
    }
};

const logout = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { provider, oauthToken } = req.body;

        if (oauthToken && provider) {
            await oauthService.revokeOAuthToken(provider, oauthToken);
        }

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

        const tokenType = idToken ? 'idToken' : 'accessToken';
        const token = idToken || accessToken;

        const validation = await oauthService.validateToken(provider, token, tokenType);

        if (!validation.valid) {
            return res.status(401).json({
                error: oauthService.getErrorMessage(validation.error),
                code: validation.error
            });
        }

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

        const oauthToken = await oauthService.getValidOAuthToken(userId, provider);

        if (oauthToken?.accessToken) {
            await oauthService.revokeOAuthToken(provider, oauthToken.accessToken);
        }

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
                linkedAt: new Date()
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
    refreshToken,
    logout,
    linkAccount,
    unlinkAccount,
    getLinkedAccounts,
};
