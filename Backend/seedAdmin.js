const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin@nexus.com';
    const adminPassword = 'adminpassword123'; // Cámbiala después
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    console.log('🚀 Iniciando creación de administrador en Supabase...');

    try {
        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                role: 'ADMIN',
                plan: 'Ultimate',
                isVerified: true
            },
            create: {
                email: adminEmail,
                password: hashedPassword,
                nombre: 'Nexus',
                apellido: 'Admin',
                role: 'ADMIN',
                plan: 'Ultimate',
                isVerified: true,
                twoFactorEnabled: false
            }
        });

        console.log('✅ Administrador creado/actualizado con éxito:');
        console.log(`📧 Email: ${admin.email}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log('🌟 Rol: ADMIN | Plan: Ultimate');
    } catch (error) {
        console.error('❌ Error creando el admin:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
