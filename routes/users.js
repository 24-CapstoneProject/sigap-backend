import express from 'express';
import { getProfile, updateProfile, getAllUsers, getUserById, createUser, changePassword, resetPassword } from '../controllers/userController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.post('/change-password', authenticateToken, changePassword);
router.get('/', authenticateToken, authorizeRole(['admin']), getAllUsers);
router.post('/', authenticateToken, authorizeRole(['admin']), createUser);
router.post('/:userId/reset-password', authenticateToken, authorizeRole(['admin']), resetPassword);
router.get('/:userId', authenticateToken, getUserById);

export default router;
