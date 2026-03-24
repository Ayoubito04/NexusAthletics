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
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const activityRoutes = require('./src/routes/activityRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const communityRoutes = require('./src/routes/communityRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const planRoutes = require('./src/routes/planRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const socialRoutes = require('./src/routes/socialRoutes');
const voiceRoutes = require('./src/routes/voiceRoutes');

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/activities', activityRoutes);
app.use('/chat', chatRoutes);
app.use('/', communityRoutes);
app.use('/payments', paymentRoutes);
app.use('/', planRoutes);
app.use('/admin', adminRoutes);
app.use('/', socialRoutes);
app.use('/voice', voiceRoutes);

// --- CUALQUIER OTRA RUTA QUE QUEDE EN INDEX.JS ---
// (Aquí irán pagos, admin y PDF por ahora hasta que los movamos)

app.get('/', (req, res) => res.json({ status: "Nexus AI Server running" }));

app.listen(port, () => {
    console.log(`🚀 Servidor MODULAR corriendo en http://localhost:${port}`);
});