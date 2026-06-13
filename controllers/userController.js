import { query } from '../config/database.js';
import { hashPassword, comparePasswords } from '../utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      user: {
        id: user.id,
        nim: user.nim,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        prodi: user.prodi,
        address: user.address,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone, address, prodi } = req.body;

    await query(
      'UPDATE users SET phone = ?, address = ?, prodi = ? WHERE id = ?',
      [phone || null, address || null, prodi || null, userId]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    let sql = 'SELECT id, nim, email, name, role, phone, prodi, created_at FROM users';
    const params = [];

    if (role) {
      sql += ' WHERE role = ?';
      params.push(role);
    }

    sql += ' ORDER BY created_at DESC';

    const users = await query(sql, params);
    res.json({ users });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await query('SELECT id, nim, email, name, role, phone, prodi FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUser = async (req, res) => {
  try {
    let { nim, email, name, password, phone, prodi, role = 'mahasiswa' } = req.body;

    // If password is not provided or empty, default it to nim
    if (!password || !password.trim()) {
      password = nim;
    }

    // Validate required fields
    if (!nim || !email || !name || !password) {
      return res.status(400).json({ error: 'NIM, email, name, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }

    // Check if user already exists
    const existing = await query('SELECT * FROM users WHERE nim = ? OR email = ?', [nim, email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User with this NIM or email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, nim, email, name, password_hash, phone, prodi, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, nim, email, name, hashedPassword, phone || null, prodi || null, role]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: userId,
        nim,
        email,
        name,
        role,
        phone,
        prodi
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    // Get user and verify old password
    const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const isPasswordValid = await comparePasswords(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user
    const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // Default password is NIM
    const defaultPassword = user.nim;
    const hashedPassword = await hashPassword(defaultPassword);

    // Update password
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: `Password ${user.name} berhasil di-reset ke password default (NIM: ${user.nim})` });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Prevent admin from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' });
    }

    // Delete user
    await query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: `Akun ${user.name} berhasil dihapus.` });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


