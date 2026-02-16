require('dotenv').config();
const cloudinary = require('./src/config/cloudinary');

console.log('Probando conexión a Cloudinary...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.api.ping()
    .then(result => {
        console.log('✅ Conexión exitosa:', result);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error de conexión:', err);
        process.exit(1);
    });
