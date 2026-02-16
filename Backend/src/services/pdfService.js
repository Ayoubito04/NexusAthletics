const PDFDocument = require('pdfkit');
const axios = require('axios');

async function getBufferFromUrl(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    } catch (e) {
        return null;
    }
}

const generateElitePDF = async (user, planText) => {
    return new Promise(async (resolve) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // --- DISEÑO PREMIUM ---
        doc.rect(0, 0, 612, 120).fill('#0a0a0a');
        doc.fillColor('#63ff15').fontSize(28).font('Helvetica-Bold').text('NEXUS ATHLETICS AI', 50, 45);
        doc.fillColor('#ffffff').fontSize(12).font('Helvetica').text('PLAN DE TRANSFORMACION ELITE 2026', 50, 75);

        doc.moveDown(5);
        doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text(`${user.nombre} ${user.apellido}`, 50, 140);
        doc.strokeColor('#63ff15').lineWidth(3).moveTo(50, 180).lineTo(560, 180).stroke();

        doc.y = 200;
        const lines = planText.split('\n');
        for (const line of lines) {
            if (doc.y > 700) doc.addPage().y = 50;
            doc.fillColor('#333').fontSize(10).text(line);
        }

        doc.end();
    });
};

module.exports = { generateElitePDF };
