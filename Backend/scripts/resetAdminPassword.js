const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAdminPassword() {
    try {
        const email = 'admin@nexusfitness.com';
        const newPassword = 'Admin123!'; // NUEVA CONTRASEÑA

        console.log('🔍 Buscando administrador...');
        const admin = await prisma.user.findUnique({
            where: { email }
        });

        if (!admin) {
            console.log('❌ No se encontró el administrador con email:', email);
            console.log('📝 Creando nuevo administrador...');

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const newAdmin = await prisma.user.create({
                data: {
                    email,
                    nombre: 'Admin',
                    apellido: 'NexusFitness',
                    password: hashedPassword,
                    role: 'ADMIN',
                    plan: 'Ultimate',
                    isVerified: true,
                    twoFactorEnabled: false,
                    referralCode: 'ADMIN-001'
                }
            });

            console.log('✅ Administrador creado exitosamente!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📧 Email:', email);
            console.log('🔑 Password:', newPassword);
            console.log('👤 ID:', newAdmin.id);
            console.log('🎭 Role:', newAdmin.role);
            console.log('🔒 2FA Enabled:', newAdmin.twoFactorEnabled);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return;
        }

        console.log('✅ Administrador encontrado');
        console.log('📊 Datos actuales:');
        console.log('   ID:', admin.id);
        console.log('   Email:', admin.email);
        console.log('   Role:', admin.role);
        console.log('   2FA Enabled:', admin.twoFactorEnabled);
        console.log('   Password Hash:', admin.password ? 'Existe' : 'No existe');

        console.log('\n🔄 Reseteando contraseña y desactivando 2FA...');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedAdmin = await prisma.user.update({
            where: { id: admin.id },
            data: {
                password: hashedPassword,
                twoFactorEnabled: false,
                twoFactorCode: null,
                twoFactorExpires: null,
                isVerified: true
            }
        });

        console.log('\n✅ Contraseña reseteada exitosamente!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', email);
        console.log('🔑 Nueva Password:', newPassword);
        console.log('👤 ID:', updatedAdmin.id);
        console.log('🎭 Role:', updatedAdmin.role);
        console.log('🔒 2FA Enabled:', updatedAdmin.twoFactorEnabled);
        console.log('✅ Verified:', updatedAdmin.isVerified);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n💡 Ahora puedes iniciar sesión con:');
        console.log('   Email: admin@nexusfitness.com');
        console.log('   Password: Admin123!');
        console.log('\n⚠️  IMPORTANTE: Cambia esta contraseña después del primer login');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdminPassword();
