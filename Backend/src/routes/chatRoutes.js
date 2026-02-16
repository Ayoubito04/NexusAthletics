const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.get('/sessions', authenticateToken, chatController.getSessions);
router.post('/sessions', authenticateToken, chatController.createSession);
router.get('/sessions/:sessionId/messages', authenticateToken, chatController.getSessionMessages);
router.delete('/sessions/:sessionId', authenticateToken, chatController.deleteSession);
router.get('/dm/:friendId', authenticateToken, chatController.getDMs);
router.post('/dm', authenticateToken, chatController.sendDM);
router.post('/', authenticateToken, chatController.sendChat);

module.exports = router;
