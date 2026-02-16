const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function connectDB() {
    try {
        await prisma.$connect();
        console.log("💎 Base de Datos conectada con éxito (Prisma)");
    } catch (e) {
        console.error("❌ ERROR: No se pudo conectar a la Base de Datos:", e.message);
    }
}

module.exports = { prisma, connectDB };
