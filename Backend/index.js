require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { connectDB, prisma } = require('./src/config/prisma');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Database + Auto-migrate nuevas tablas
async function startServer() {
    await connectDB();

    // Crear tablas OAuthToken y AuthLog si no existen
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "OAuthToken" (
                "id" SERIAL PRIMARY KEY,
                "userId" INTEGER NOT NULL,
                "provider" TEXT NOT NULL,
                "accessToken" TEXT,
                "refreshToken" TEXT,
                "tokenType" TEXT,
                "expiresAt" TIMESTAMP(3),
                "scope" TEXT,
                "providerId" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "OAuthToken_userId_provider_key" UNIQUE ("userId", "provider"),
                CONSTRAINT "OAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
            );
        `);
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "AuthLog" (
                "id" SERIAL PRIMARY KEY,
                "userId" INTEGER,
                "action" TEXT NOT NULL,
                "provider" TEXT,
                "ipAddress" TEXT,
                "userAgent" TEXT,
                "success" BOOLEAN NOT NULL DEFAULT TRUE,
                "errorMessage" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "AuthLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
            );
        `);
        console.log('✅ Tablas OAuthToken y AuthLog verificadas');
    } catch (e) {
        console.error('⚠️ Auto-migrate warning:', e.message);
    }
}

startServer();

// Logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// --- ROUTES MODULARES ---
let authRoutes, userRoutes, activityRoutes, chatRoutes, communityRoutes,
    paymentRoutes, planRoutes, adminRoutes, socialRoutes, voiceRoutes;

try { authRoutes = require('./src/routes/authRoutes'); console.log('✅ authRoutes cargado'); }
catch (e) { console.error('❌ authRoutes FALLÓ:', e.message); }

try { userRoutes = require('./src/routes/userRoutes'); } catch (e) { console.error('❌ userRoutes FALLÓ:', e.message); }
try { activityRoutes = require('./src/routes/activityRoutes'); } catch (e) { console.error('❌ activityRoutes FALLÓ:', e.message); }
try { chatRoutes = require('./src/routes/chatRoutes'); } catch (e) { console.error('❌ chatRoutes FALLÓ:', e.message); }
try { communityRoutes = require('./src/routes/communityRoutes'); } catch (e) { console.error('❌ communityRoutes FALLÓ:', e.message); }
try { paymentRoutes = require('./src/routes/paymentRoutes'); } catch (e) { console.error('❌ paymentRoutes FALLÓ:', e.message); }
try { planRoutes = require('./src/routes/planRoutes'); } catch (e) { console.error('❌ planRoutes FALLÓ:', e.message); }
try { adminRoutes = require('./src/routes/adminRoutes'); } catch (e) { console.error('❌ adminRoutes FALLÓ:', e.message); }
try { socialRoutes = require('./src/routes/socialRoutes'); } catch (e) { console.error('❌ socialRoutes FALLÓ:', e.message); }
try { voiceRoutes = require('./src/routes/voiceRoutes'); } catch (e) { console.error('❌ voiceRoutes FALLÓ:', e.message); }

if (authRoutes) app.use('/auth', authRoutes);
if (userRoutes) app.use('/user', userRoutes);
if (activityRoutes) app.use('/activities', activityRoutes);
if (chatRoutes) app.use('/chat', chatRoutes);
if (communityRoutes) app.use('/', communityRoutes);
if (paymentRoutes) app.use('/payments', paymentRoutes);
if (planRoutes) app.use('/', planRoutes);
if (adminRoutes) app.use('/admin', adminRoutes);
if (socialRoutes) app.use('/', socialRoutes);
if (voiceRoutes) app.use('/voice', voiceRoutes);

// --- CUALQUIER OTRA RUTA QUE QUEDE EN INDEX.JS ---
// (Aquí irán pagos, admin y PDF por ahora hasta que los movamos)

app.get('/', (req, res) => res.json({ status: "Nexus AI Server running", version: "2.0-supabase-sync" }));

app.listen(port, () => {
    console.log(`🚀 Servidor MODULAR corriendo en http://localhost:${port}`);
});