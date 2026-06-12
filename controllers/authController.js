import { query } from '../config/database.js';
import { hashPassword, comparePasswords, generateToken } from '../utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const sendAuthResponse = (res, statusCode, message, token, user) => {
  setAuthCookie(res, token);
  return res.status(statusCode).json({ message, token, user });
};

export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
};

export const register = async (req, res) => {
  try {
    const { nim, email, name, password, phone, prodi } = req.body;

    // Check if user exists
    const existing = await query('SELECT * FROM users WHERE nim = ? OR email = ?', [nim, email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, nim, email, name, password_hash, phone, prodi, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [userId, nim, email, name, hashedPassword, phone || null, prodi || null, 'mahasiswa']
    );

    const user = { id: userId, nim, email, name, role: 'mahasiswa' };
    const token = generateToken(user);

    sendAuthResponse(res, 201, 'Registration successful', token, user);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by NIM or email
    const users = await query(
      'SELECT * FROM users WHERE nim = ? OR email = ?',
      [identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await comparePasswords(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    sendAuthResponse(res, 200, 'Login successful', token, {
      id: user.id,
      nim: user.nim,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      prodi: user.prodi,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyToken = async (req, res) => {
  try {
    res.json({
      message: 'Token valid',
      user: req.user
    });
  } catch (err) {
    res.status(401).json({ error: 'Token verification failed' });
  }
};
