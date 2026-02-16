const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// CRUD Completo de Posts
router.post('/posts', authenticateToken, communityController.createPost);
router.get('/posts', authenticateToken, communityController.getPosts);
router.put('/posts/:postId', authenticateToken, communityController.updatePost);
router.delete('/posts/:postId', authenticateToken, communityController.deletePost);

// Likes
router.post('/posts/:postId/like', authenticateToken, communityController.toggleLike);

// Comentarios
router.post('/posts/:postId/comment', authenticateToken, communityController.addComment);
router.delete('/comments/:commentId', authenticateToken, communityController.deleteComment);

module.exports = router;
