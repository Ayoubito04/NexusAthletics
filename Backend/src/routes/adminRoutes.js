const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');

router.get('/users', authenticateToken, isAdmin, adminController.getUsers);
router.put('/users/:id/plan', authenticateToken, isAdmin, adminController.updateUserPlan);
router.delete('/users/:id', authenticateToken, isAdmin, adminController.deleteUser);

module.exports = router;
