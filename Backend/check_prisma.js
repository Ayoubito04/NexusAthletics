const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log("Modelos disponibles en Prisma Client:");
console.log(Object.keys(prisma).filter(key => !key.startsWith('_')));
process.exit(0);
