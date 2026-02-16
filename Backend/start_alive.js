const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Server is alive!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

setInterval(() => {
    console.log('Heartbeat: Server process still active...');
}, 60000);
