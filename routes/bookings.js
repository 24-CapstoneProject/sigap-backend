import express from 'express';
import { body } from 'express-validator';
import { createBooking, getMyBookings, getAllBookings, getBookingById, updateBooking, approveBooking, rejectBooking, cancelBooking, getPublicSchedule, bulkImportBookings, createRescheduleRequest, exportBookingsExcel } from '../controllers/bookingController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

import { upload, uploadExcel } from '../middleware/upload.js';

const router = express.Router();

router.post(
  '/',
  authenticateToken,
  upload.single('proof_image'),
  [
    body('roomId').notEmpty().withMessage('Room ID is required'),
    body('bookingDate').notEmpty().withMessage('Booking date is required'),
    body('startTime').notEmpty().withMessage('Start time is required'),
    body('endTime').notEmpty().withMessage('End time is required'),
  ],
  handleValidationErrors,
  createBooking
);

router.get('/my-bookings', authenticateToken, getMyBookings);
router.get('/export-excel', authenticateToken, authorizeRole(['admin']), exportBookingsExcel);
router.post('/bulk-import', authenticateToken, authorizeRole(['admin']), uploadExcel.single('file'), bulkImportBookings);
router.get('/', authenticateToken, authorizeRole(['admin']), getAllBookings);
router.get('/public-schedule', getPublicSchedule);
router.get('/:bookingId', authenticateToken, getBookingById);

router.put(
  '/:bookingId',
  authenticateToken,
  updateBooking
);

router.post(
  '/:bookingId/approve',
  authenticateToken,
  authorizeRole(['admin']),
  approveBooking
);

router.post(
  '/:bookingId/reject',
  authenticateToken,
  authorizeRole(['admin']),
  [
    body('rejectReason').notEmpty().withMessage('Reject reason is required'),
  ],
  handleValidationErrors,
  rejectBooking
);

router.post(
  '/:bookingId/cancel',
  authenticateToken,
  cancelBooking
);

router.post(
  '/:bookingId/reschedule',
  authenticateToken,
  [
    body('newRoomId').notEmpty().withMessage('New Room ID is required'),
    body('newBookingDate').notEmpty().withMessage('New Booking date is required'),
    body('newStartTime').notEmpty().withMessage('New Start time is required'),
    body('newEndTime').notEmpty().withMessage('New End time is required'),
  ],
  handleValidationErrors,
  createRescheduleRequest
);

export default router;
