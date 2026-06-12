import express from 'express';
import { body } from 'express-validator';
import { getAllRooms, getRoomById, createRoom, updateRoom, deleteRoom, checkRoomAvailability } from '../controllers/roomController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

router.get('/', authenticateToken, getAllRooms);
router.get('/:roomId', authenticateToken, getRoomById);

router.post(
  '/',
  authenticateToken,
  authorizeRole(['admin']),
  [
    body('name').notEmpty().withMessage('Room name is required'),
    body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive number'),
    body('floor').isInt({ min: 1 }).withMessage('Floor must be a positive number'),
  ],
  handleValidationErrors,
  createRoom
);

router.put(
  '/:roomId',
  authenticateToken,
  authorizeRole(['admin']),
  updateRoom
);

router.delete(
  '/:roomId',
  authenticateToken,
  authorizeRole(['admin']),
  deleteRoom
);

router.post(
  '/check-availability',
  authenticateToken,
  [
    body('roomId').notEmpty().withMessage('Room ID is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('startTime').notEmpty().withMessage('Start time is required'),
    body('endTime').notEmpty().withMessage('End time is required'),
  ],
  handleValidationErrors,
  checkRoomAvailability
);

export default router;
