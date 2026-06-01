const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupTester() {
    try {
        const email = 'tester@nexusathletics.com';
        const password = 'NexusTest2024!';

        const existing = await prisma.user.findUnique({ where: { email } });

        const hashedPassword = await bcrypt.hash(password, 10);
        const data = {
            email,
            password: hashedPassword,
            nombre: 'Tester',
            apellido: 'Google',
            plan: 'Ultimate',
            role: 'USER',
            isVerified: true,
            twoFactorEnabled: false,
            referralCode: 'TESTER-001',
        };

        if (existing) {
            await prisma.user.update({ where: { email }, data });
            console.log('✅ Cuenta tester actualizada');
        } else {
            await prisma.user.create({ data });
            console.log('✅ Cuenta tester creada');
        }

        console.log('📧 Email:    tester@nexusathletics.com');
        console.log('🔑 Password: NexusTest2024!');
        console.log('📦 Plan:     Ultimate');
        console.log('✔️  2FA:      Desactivado');
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

setupTester();
