const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// CRUD Completo de Actividades
router.post('/', authenticateToken, activityController.createActivity);
router.get('/', authenticateToken, activityController.getActivities);
router.get('/stats', authenticateToken, activityController.getStats);
router.get('/stats/ai-analysis', authenticateToken, activityController.getAIAnalysis);
router.get('/:id', authenticateToken, activityController.getActivityById);
router.post('/review-workout', authenticateToken, activityController.reviewWorkout);
router.put('/:id', authenticateToken, activityController.updateActivity);
router.delete('/:id', authenticateToken, activityController.deleteActivity);

module.exports = router;
