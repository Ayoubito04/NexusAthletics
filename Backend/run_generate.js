const { execSync } = require('child_process');
const fs = require('fs');

try {
    const output = execSync('npx prisma generate', { encoding: 'utf8' });
    fs.writeFileSync('prisma_generate_output.txt', output);
} catch (error) {
    fs.writeFileSync('prisma_generate_error.txt', error.toString() + "\n" + error.stdout + "\n" + error.stderr);
}
