const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
    try {
        const email = 'admin@nexusfitness.com';
        const password = 'Admin123!'; // CAMBIA ESTO después
        const nombre = 'Admin';
        const apellido = 'NexusFitness';

        console.log('🔍 Verificando si el admin ya existe...');
        const existingAdmin = await prisma.user.findUnique({
            where: { email }
        });

        if (existingAdmin) {
            console.log('⚠️  El admin ya existe con email:', email);
            console.log('ID:', existingAdmin.id);
            console.log('Role:', existingAdmin.role);
            return;
        }

        console.log('📝 Creando nuevo administrador...');
        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await prisma.user.create({
            data: {
                email,
                nombre,
                apellido,
                password: hashedPassword,
                role: 'ADMIN',
                plan: 'Ultimate',
                isVerified: true,
                twoFactorEnabled: false, // Desactivado para facilitar el acceso
                referralCode: 'ADMIN-001'
            }
        });

        console.log('✅ Administrador creado exitosamente!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('👤 ID:', admin.id);
        console.log('🎭 Role:', admin.role);
        console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('❌ Error al crear administrador:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
