import express from 'express';
import { body } from 'express-validator';
import { register, login, verifyToken, sendAuthResponse, logout } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { v4 as uuidv4 } from 'uuid';
import { generateToken, hashPassword } from '../utils/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

const demoAccounts = [
  {
    identifier: 'admin_sigap',
    password: 'sigap123',
    user: {
      id: 'admin-hardcode-01',
      nim: 'admin_sigap',
      name: 'Penjaga SG Gedung',
      email: 'penjagasg@student.untad.ac.id',
      role: 'admin',
      prodi: 'Penjaga SG',
    },
  },
  {
    identifier: 'penjagasg@student.untad.ac.id',
    password: 'sigap123',
    user: {
      id: 'admin-hardcode-01',
      nim: 'admin_sigap',
      name: 'Penjaga SG Gedung',
      email: 'penjagasg@student.untad.ac.id',
      role: 'admin',
      prodi: 'Penjaga SG',
    },
  },
  {
    identifier: 'F55123015',
    password: 'mahasiswa123',
    user: {
      id: 'mhs-hardcode-01',
      nim: 'F55123015',
      name: 'Octavia Ramadhani (Demo)',
      email: 'octavia.demo@student.untad.ac.id',
      role: 'mahasiswa',
      prodi: 'Teknik Informatika',
    },
  },
];

router.post(
  '/register',
  [
    body('nim').notEmpty().withMessage('NIM is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  handleValidationErrors,
  register
);

router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('NIM or email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    const { identifier, password } = req.body;

    const demo = demoAccounts.find(
      (account) => account.identifier === identifier && account.password === password
    );

    if (demo) {
      try {
        let users = await query(
          'SELECT id, nim, email, name, role, phone, prodi FROM users WHERE nim = ? OR email = ? LIMIT 1',
          [identifier, identifier]
        );

        if (users.length === 0) {
          const userId = uuidv4();
          const passwordHash = await hashPassword(password);
          await query(
            'INSERT INTO users (id, nim, email, name, password_hash, phone, prodi, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, demo.user.nim, demo.user.email, demo.user.name, passwordHash, null, demo.user.prodi, demo.user.role]
          );
          users = [{ id: userId, ...demo.user, phone: null }];
        }

        const user = {
          id: users[0].id,
          nim: users[0].nim,
          email: users[0].email,
          name: users[0].name,
          role: users[0].role,
          phone: users[0].phone,
          prodi: users[0].prodi,
        };

        const token = generateToken(user);
        return sendAuthResponse(res, 200, 'Login successful', token, user);
      } catch (err) {
        console.error('Demo login error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    next();
  },
  login
);

router.get('/verify', authenticateToken, verifyToken);
router.post('/logout', logout);

export default router;
