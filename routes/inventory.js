import express from 'express';
import { body } from 'express-validator';
import { getAllInventory, getInventoryById, createInventory, updateInventory, deleteInventory, borrowItem, returnItem, getLoanHistory, getAvailableProjectors, exportInventoryExcel } from '../controllers/inventoryController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

router.get('/', authenticateToken, getAllInventory);
router.get('/history', authenticateToken, authorizeRole(['admin']), getLoanHistory);
router.get('/available-projectors', authenticateToken, getAvailableProjectors);
router.get('/export-excel', authenticateToken, authorizeRole(['admin']), exportInventoryExcel);
router.get('/:itemId', authenticateToken, getInventoryById);

router.post(
  '/',
  authenticateToken,
  authorizeRole(['admin']),
  [
    body('name').notEmpty().withMessage('Item name is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative number'),
  ],
  handleValidationErrors,
  createInventory
);

router.put(
  '/:itemId',
  authenticateToken,
  authorizeRole(['admin']),
  updateInventory
);

router.delete(
  '/:itemId',
  authenticateToken,
  authorizeRole(['admin']),
  deleteInventory
);

router.post(
  '/:itemId/borrow',
  authenticateToken,
  [
    body('ktpNumber').notEmpty().withMessage('KTP number is required'),
  ],
  handleValidationErrors,
  borrowItem
);

router.post(
  '/:loanId/return',
  authenticateToken,
  returnItem
);

export default router;
