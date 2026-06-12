import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

export const createReport = async (req, res) => {
  const cleanupFile = () => {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Failed to delete uploaded file:', e);
      }
    }
  };

  try {
    const userId = req.user.id;
    const { type, itemName, description, location, date, category, contact } = req.body;

    if (!['lost', 'found'].includes(type)) {
      cleanupFile();
      return res.status(400).json({ error: 'Invalid report type' });
    }

    let reportCategory = category;
    if (type === 'found' && (!category || !category.trim() || category === 'Umum')) {
      reportCategory = 'Dititipkan di penjaga SG';
    }

    const reportId = uuidv4();
    const image = req.file ? req.file.filename : null;

    await query(
      `INSERT INTO lost_found (id, user_id, type, item_name, description, location, date_occurred, category, admin_notes, image, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [reportId, userId, type, itemName, description, location, date, reportCategory || null, contact || null, image, 'pending']
    );

    res.status(201).json({
      message: 'Report created successfully',
      reportId
    });
  } catch (err) {
    cleanupFile();
    console.error('Create report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const { type, status, category } = req.query;

    let sql = `SELECT l.*, u.name as user_name, u.nim
               FROM lost_found l
               JOIN users u ON l.user_id = u.id
               WHERE 1=1`;
    const params = [];

    if (type) {
      sql += ' AND l.type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    if (category) {
      sql += ' AND l.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY l.created_at DESC';

    const reports = await query(sql, params);
    res.json({ reports });
  } catch (err) {
    console.error('Get all reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const userId = req.user.id;

    const reports = await query(
      `SELECT * FROM lost_found WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ reports });
  } catch (err) {
    console.error('Get my reports error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    const reports = await query(
      `SELECT l.*, u.name as user_name, u.nim, u.email, u.phone
       FROM lost_found l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = ?`,
      [reportId]
    );

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Get claims if it's a found item
    let claims = [];
    if (reports[0].type === 'found') {
      const claimRecords = await query(
        `SELECT c.*, u.name as claimer_name, u.nim as claimer_nim
         FROM lost_found_claims c
         JOIN users u ON c.user_id = u.id
         WHERE c.lost_found_id = ?
         ORDER BY c.created_at DESC`,
        [reportId]
      );
      claims = claimRecords;
    }

    res.json({
      report: reports[0],
      claims
    });
  } catch (err) {
    console.error('Get report by ID error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;

    const reports = await query('SELECT * FROM lost_found WHERE id = ?', [reportId]);
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await query(
      'UPDATE lost_found SET status = ?, admin_notes = ?, updated_at = NOW() WHERE id = ?',
      [status, adminNotes || null, reportId]
    );

    res.json({ message: 'Report updated successfully' });
  } catch (err) {
    console.error('Update report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const reportId = req.params.reportId;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const reports = isAdmin
      ? await query('SELECT * FROM lost_found WHERE id = ?', [reportId])
      : await query('SELECT * FROM lost_found WHERE id = ? AND user_id = ?', [reportId, userId]);

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await query('DELETE FROM lost_found WHERE id = ?', [reportId]);

    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Delete report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const claimItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reportId } = req.params;
    const { message } = req.body;

    const reports = await query('SELECT * FROM lost_found WHERE id = ?', [reportId]);
    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (reports[0].type !== 'found') {
      return res.status(400).json({ error: 'Only found items can be claimed' });
    }

    // Check if already claimed
    const existing = await query(
      'SELECT * FROM lost_found_claims WHERE lost_found_id = ? AND user_id = ? AND status = "pending"',
      [reportId, userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already have a pending claim for this item' });
    }

    const claimId = uuidv4();
    await query(
      'INSERT INTO lost_found_claims (id, lost_found_id, user_id, message, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [claimId, reportId, userId, message || null, 'pending']
    );

    res.status(201).json({
      message: 'Claim submitted successfully',
      claimId
    });
  } catch (err) {
    console.error('Claim item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveClaim = async (req, res) => {
  try {
    const { claimId } = req.params;

    const claims = await query('SELECT * FROM lost_found_claims WHERE id = ?', [claimId]);
    if (claims.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Update claim status
    await query(
      'UPDATE lost_found_claims SET status = ?, approved_at = NOW() WHERE id = ?',
      ['approved', claimId]
    );

    // Update report status
    await query(
      'UPDATE lost_found SET status = ? WHERE id = ?',
      ['claimed', claims[0].lost_found_id]
    );

    res.json({ message: 'Claim approved successfully' });
  } catch (err) {
    console.error('Approve claim error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectClaim = async (req, res) => {
  try {
    const { claimId } = req.params;
    const { reason } = req.body;

    const claims = await query('SELECT * FROM lost_found_claims WHERE id = ?', [claimId]);
    if (claims.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    await query(
      'UPDATE lost_found_claims SET status = ?, reject_reason = ?, rejected_at = NOW() WHERE id = ?',
      ['rejected', reason || null, claimId]
    );

    res.json({ message: 'Claim rejected successfully' });
  } catch (err) {
    console.error('Reject claim error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
