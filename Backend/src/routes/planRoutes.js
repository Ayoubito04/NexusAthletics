const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Generación de planes
router.get('/download-pdf', authenticateToken, planController.downloadPDF);
router.post('/generate-pdf', authenticateToken, planController.generatePDF);
router.post('/generate-plan-interactive', authenticateToken, planController.generatePlanInteractive);

// CRUD Completo de Planes Guardados
router.post('/save-plan', authenticateToken, planController.savePlan);
router.get('/saved-plans', authenticateToken, planController.getSavedPlans);
router.get('/saved-plans/:id', authenticateToken, planController.getSavedPlanById);
router.put('/saved-plans/:id', authenticateToken, planController.updateSavedPlan);
router.delete('/saved-plans/:id', authenticateToken, planController.deleteSavedPlan);

// Trial
router.post('/plans/start-trial', authenticateToken, planController.startTrial);

module.exports = router;
