const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

const keys = Object.keys(prisma).filter(key => !key.startsWith('_'));
const output = "Modelos disponibles en Prisma Client:\n" + keys.join('\n');
fs.writeFileSync('prisma_models_list.txt', output);
console.log("Completado.");
process.exit(0);
