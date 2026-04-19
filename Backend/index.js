require('dotenv').config();

// SECURITY: Validate environment variables FIRST, before anything else
const validateEnv = require('./src/config/validateEnv');
validateEnv();

const express = require('express');
const morgan = require('morgan');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { connectDB, prisma } = require('./src/config/prisma');
const errorHandler = require('./src/middlewares/errorHandler');
const {
  helmetConfig,
  corsOptions,
  globalLimiter,
  authLimiter,
  paymentLimiter
} = require('./src/middlewares/security');

const app = express();
const port = process.env.PORT || 3000;

// SECURITY: Disable x-powered-by header to avoid information disclosure
app.disable('x-powered-by');

// SECURITY: Trust proxy (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// SECURITY: Helmet - HTTP headers hardening
app.use(helmetConfig);

// SECURITY: CORS - whitelist origins
app.use(corsOptions);

// SECURITY: Morgan - request logging
const morganFormat = process.env.NODE_ENV === 'production'
  ? 'combined' // Production: more detail
  : 'dev'; // Development: short format

app.use(morgan(morganFormat, {
  // Skip health checks from logging to reduce noise
  skip: (req) => req.path === '/health' || req.path === '/'
}));

// SECURITY: Global rate limiter (must come after trust proxy)
app.use(globalLimiter);

// Body parsing
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

        // WorkoutSession y MuscleStrength para fuerza y rankings
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "WorkoutSession" (
                "id" SERIAL PRIMARY KEY,
                "userId" INTEGER NOT NULL,
                "exercises" JSONB NOT NULL DEFAULT '[]',
                "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "duration" INTEGER,
                "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
            );
        `);
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "MuscleStrength" (
                "id" SERIAL PRIMARY KEY,
                "userId" INTEGER NOT NULL,
                "muscle" TEXT NOT NULL,
                "bestOneRM" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "sessions" INTEGER NOT NULL DEFAULT 0,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "MuscleStrength_userId_muscle_key" UNIQUE ("userId", "muscle"),
                CONSTRAINT "MuscleStrength_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
            );
        `);
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "exerciseData" JSONB;
            ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPR" BOOLEAN NOT NULL DEFAULT false;
        `);
        console.log('✅ Tablas WorkoutSession, MuscleStrength verificadas y Post actualizado');
    } catch (e) {
        console.error('⚠️ Auto-migrate warning:', e.message);
    }
}

startServer();

// --- ROUTES MODULARES ---
let authRoutes, userRoutes, activityRoutes, chatRoutes, communityRoutes,
    paymentRoutes, planRoutes, adminRoutes, socialRoutes, voiceRoutes, strengthRoutes, rankingRoutes;

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
try { strengthRoutes = require('./src/routes/strengthRoutes'); } catch (e) { console.error('❌ strengthRoutes FALLÓ:', e.message); }
try { rankingRoutes = require('./src/routes/rankingRoutes'); } catch (e) { console.error('❌ rankingRoutes FALLÓ:', e.message); }

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
if (strengthRoutes) app.use('/strength', strengthRoutes);
if (rankingRoutes) app.use('/ranking', rankingRoutes);

// --- CUALQUIER OTRA RUTA QUE QUEDE EN INDEX.JS ---
// (Aquí irán pagos, admin y PDF por ahora hasta que los movamos)

app.get('/', (req, res) => res.json({ status: "Nexus AI Server running", version: "2.0-supabase-sync" }));

// SECURITY: 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// SECURITY: Global error handler - MUST be last middleware
app.use(errorHandler);

app.listen(port, () => {
    console.log(`🚀 Servidor MODULAR corriendo en http://localhost:${port}`);
});