const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { saveNutritionPlan, getNutritionPlans, deleteNutritionPlan } = require('../controllers/nutritionPlanController');

router.post('/nutrition-plans', authenticateToken, saveNutritionPlan);
router.get('/nutrition-plans', authenticateToken, getNutritionPlans);
router.delete('/nutrition-plans/:id', authenticateToken, deleteNutritionPlan);

module.exports = router;
