const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { generateDigitalTwin, generateDigitalTwinImage } = require('../controllers/digitalTwinController');
const { analyzeForm } = require('../controllers/formAnalysisController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/biometrics', authenticateToken, userController.updateBiometrics);
router.put('/update-profile', authenticateToken, userController.updateProfile);
router.post('/push-token', authenticateToken, userController.updatePushToken);
router.post('/health-sync', authenticateToken, userController.updateHealthSync);
router.post('/health-data', authenticateToken, userController.updateHealthData);
router.post('/sync-steps', authenticateToken, userController.syncSteps);
router.put('/avatar', authenticateToken, userController.updateAvatar);
router.put('/change-password', authenticateToken, userController.changePassword);
router.get('/ranking', authenticateToken, userController.getRanking);
router.post('/digital-twin', authenticateToken, generateDigitalTwin);
router.post('/digital-twin/image', authenticateToken, generateDigitalTwinImage);
router.post('/form-analysis', authenticateToken, analyzeForm);

module.exports = router;
