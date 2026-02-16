const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.count();
        console.log(`✅ Tablas verificadas. Total de usuarios: ${users}`);
    } catch (e) {
        console.error('❌ Error al acceder a la tabla User:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
