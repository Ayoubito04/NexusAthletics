const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin@admin.com';
    const adminPassword = 'admin';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const user = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            plan: 'Ultimate',
            role: 'ADMIN',
            password: hashedPassword,
        },
        create: {
            email: adminEmail,
            nombre: 'Admin',
            apellido: 'User',
            password: hashedPassword,
            plan: 'Ultimate',
            role: 'ADMIN',
        },
    });

    console.log('Admin user created/updated:', user.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
