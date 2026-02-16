const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkAndTestAdmin() {
    try {
        const email = 'admin@nexusfitness.com';
        const testPassword = 'Admin123!';

        console.log('🔍 Buscando admin en la base de datos...\n');

        const admin = await prisma.user.findUnique({
            where: { email }
        });

        if (!admin) {
            console.log('❌ No existe ningún admin con ese email');
            return;
        }

        console.log('✅ Admin encontrado:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('ID:', admin.id);
        console.log('Email:', admin.email);
        console.log('Nombre:', admin.nombre, admin.apellido);
        console.log('Role:', admin.role);
        console.log('Plan:', admin.plan);
        console.log('2FA Enabled:', admin.twoFactorEnabled);
        console.log('Verified:', admin.isVerified);
        console.log('Password Hash (primeros 20 chars):', admin.password?.substring(0, 20) + '...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        // Probar la contraseña
        console.log('🔐 Probando contraseña "Admin123!"...');
        const isMatch = await bcrypt.compare(testPassword, admin.password);

        if (isMatch) {
            console.log('✅ ¡La contraseña es CORRECTA! Debería funcionar el login.');
        } else {
            console.log('❌ La contraseña NO coincide. Voy a resetearla...\n');

            // Resetear la contraseña
            const newHash = await bcrypt.hash(testPassword, 10);
            await prisma.user.update({
                where: { id: admin.id },
                data: {
                    password: newHash,
                    twoFactorEnabled: false,
                    twoFactorCode: null,
                    twoFactorExpires: null,
                    isVerified: true
                }
            });

            console.log('✅ Contraseña reseteada exitosamente!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 Email: admin@nexusfitness.com');
            console.log('🔑 Password: Admin123!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAndTestAdmin();
