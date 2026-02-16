const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friendController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/friends/request', authenticateToken, friendController.requestFriend);
router.get('/friends/list', authenticateToken, friendController.getFriends);
router.get('/friends/pending', authenticateToken, friendController.getPendingRequests);
router.post('/friends/accept', authenticateToken, friendController.acceptFriend);
router.post('/friends/decline', authenticateToken, friendController.declineRequest);
router.get('/notifications/count', authenticateToken, friendController.getNotificationsCount);
router.get('/notifications', authenticateToken, friendController.getNotifications);
router.get('/users/search', authenticateToken, friendController.searchUsers);
router.get('/friends/suggested', authenticateToken, friendController.getSuggestedFriends);

module.exports = router;
