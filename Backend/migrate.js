/**
 * migrate.js - Crea las tablas nuevas sin usar prisma db push
 * Evita el error de cross-schema de Supabase (auth.users)
 */
const { prisma } = require('./src/config/prisma');

async function migrate() {
  console.log('🔄 Ejecutando migraciones...');
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
    console.log('✅ Tabla OAuthToken lista');

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
    console.log('✅ Tabla AuthLog lista');

    console.log('✅ Migraciones completadas');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    // No salimos con error para no bloquear el servidor si las tablas ya existen
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
