import express from 'express';
import { body } from 'express-validator';
import { createReport, getAllReports, getMyReports, getReportById, updateReport, deleteReport, claimItem, approveClaim, rejectClaim } from '../controllers/lostFoundController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post(
  '/',
  authenticateToken,
  upload.single('image'),
  [
    body('type').isIn(['lost', 'found']).withMessage('Type must be lost or found'),
    body('itemName').notEmpty().withMessage('Item name is required'),
    body('location').notEmpty().withMessage('Location is required'),
  ],
  handleValidationErrors,
  createReport
);

router.get('/', authenticateToken, getAllReports);
router.get('/my-reports', authenticateToken, getMyReports);
router.get('/:reportId', authenticateToken, getReportById);

router.put(
  '/:reportId',
  authenticateToken,
  authorizeRole(['admin']),
  updateReport
);

router.delete(
  '/:reportId',
  authenticateToken,
  authorizeRole(['admin']),
  deleteReport
);

router.post(
  '/:reportId/claim',
  authenticateToken,
  claimItem
);

router.post(
  '/claims/:claimId/approve',
  authenticateToken,
  authorizeRole(['admin']),
  approveClaim
);

router.post(
  '/claims/:claimId/reject',
  authenticateToken,
  authorizeRole(['admin']),
  rejectClaim
);

export default router;
