import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import xlsx from 'xlsx';

export const getAllInventory = async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT i.*, 
             il.id AS loan_id, il.user_id, il.ktp_number, il.status AS loan_status, il.borrowed_at, il.returned_at, il.condition_borrowed,
             u.nim, u.name AS borrower_name, u.phone, u.prodi,
             b.course_name AS mata_kuliah, b.lecturer AS dosen, r.name AS ruangan, b.start_time AS jam_pinjam, b.end_time AS estimasi_kembali
      FROM inventory i
      LEFT JOIN inventory_loans il ON il.id = (
        SELECT id FROM inventory_loans 
        WHERE inventory_id = i.id 
        ORDER BY borrowed_at DESC, created_at DESC 
        LIMIT 1
      )
      LEFT JOIN users u ON il.user_id = u.id
      LEFT JOIN bookings b ON b.assigned_infocus_id = i.id AND b.status = 'approved'
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      if (status === 'borrowed') {
        sql += ' AND il.status = "borrowed"';
      } else if (status === 'available') {
        sql += ' AND (il.id IS NULL OR il.status != "borrowed") AND i.status = "available"';
      } else if (status === 'broken') {
        sql += ' AND i.status = "unavailable"';
      } else {
        sql += ' AND i.status = ?';
        params.push(status);
      }
    }

    sql += ' ORDER BY i.created_at DESC';

    const rawItems = await query(sql, params);

    const items = rawItems.map(item => {
      const isBorrowed = item.loan_status === 'borrowed';
      return {
        id: item.id,
        serialNumber: item.id,
        loanId: isBorrowed ? item.loan_id : null,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        category: item.category,
        location: item.location,
        status: isBorrowed ? 'borrowed' : (item.status === 'unavailable' ? 'broken' : item.status),
        borrowedBy: item.borrower_name || null,
        nim: item.nim || null,
        phone: item.phone || null,
        prodi: item.prodi || null,
        date: item.borrowed_at ? new Date(item.borrowed_at).toISOString().split('T')[0] : null,
        time: item.jam_pinjam || (item.borrowed_at ? new Date(item.borrowed_at).toTimeString().split(' ')[0].substring(0, 5) : null),
        estimasiKembali: isBorrowed ? item.estimasi_kembali : null,
        dosen: isBorrowed ? item.dosen : null,
        mataKuliah: isBorrowed ? item.mata_kuliah : null,
        ruangan: isBorrowed ? item.ruangan : null,
        ktpVerified: isBorrowed ? (item.ktp_number ? true : false) : false,
      };
    });

    res.json({ items });
  } catch (err) {
    console.error('Get all inventory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInventoryById = async (req, res) => {
  try {
    const { itemId } = req.params;

    const items = await query('SELECT * FROM inventory WHERE id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get loan history
    const loans = await query(
      `SELECT * FROM inventory_loans 
       WHERE inventory_id = ? 
       ORDER BY borrowed_at DESC`,
      [itemId]
    );

    res.json({
      item: items[0],
      loanHistory: loans
    });
  } catch (err) {
    console.error('Get inventory by ID error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createInventory = async (req, res) => {
  try {
    const { name, description, quantity, category, location, status } = req.body;

    const itemId = uuidv4();

    // Map frontend status to database ENUM('available', 'maintenance', 'unavailable')
    let dbStatus = 'available';
    if (status === 'broken' || status === 'unavailable') {
      dbStatus = 'unavailable';
    } else if (status === 'maintenance') {
      dbStatus = 'maintenance';
    }

    await query(
      'INSERT INTO inventory (id, name, description, quantity, category, location, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [itemId, name, description, quantity, category, location, dbStatus]
    );

    res.status(201).json({
      message: 'Inventory item created successfully',
      itemId
    });
  } catch (err) {
    console.error('Create inventory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateInventory = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, description, quantity, category, location, status } = req.body;

    // Map frontend status to database ENUM('available', 'maintenance', 'unavailable')
    let dbStatus = 'available';
    if (status === 'broken' || status === 'unavailable') {
      dbStatus = 'unavailable';
    } else if (status === 'maintenance') {
      dbStatus = 'maintenance';
    } else if (status === 'available' || status === 'borrowed') {
      dbStatus = 'available';
    }

    await query(
      'UPDATE inventory SET name = ?, description = ?, quantity = ?, category = ?, location = ?, status = ? WHERE id = ?',
      [name, description, quantity, category, location, dbStatus, itemId]
    );

    res.json({ message: 'Inventory updated successfully' });
  } catch (err) {
    console.error('Update inventory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteInventory = async (req, res) => {
  try {
    const { itemId } = req.params;

    await query('DELETE FROM inventory WHERE id = ?', [itemId]);

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    console.error('Delete inventory error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const borrowItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { ktpNumber } = req.body;

    // Check if item exists and available
    const items = await query('SELECT * FROM inventory WHERE id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (items[0].quantity <= 0) {
      return res.status(400).json({ error: 'Item out of stock' });
    }

    // Check if user has unreturned items
    const unreturned = await query(
      'SELECT * FROM inventory_loans WHERE user_id = ? AND status = "borrowed"',
      [userId]
    );

    if (unreturned.length > 0) {
      return res.status(400).json({ error: 'Please return previous borrowed items first' });
    }

    // Create loan record
    const loanId = uuidv4();
    await query(
      'INSERT INTO inventory_loans (id, user_id, inventory_id, ktp_number, status, borrowed_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [loanId, userId, itemId, ktpNumber, 'borrowed']
    );

    // Decrease quantity
    await query('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?', [itemId]);

    res.status(201).json({
      message: 'Item borrowed successfully',
      loanId
    });
  } catch (err) {
    console.error('Borrow item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const returnItem = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { condition, returnTime } = req.body;

    const loans = await query('SELECT * FROM inventory_loans WHERE id = ?', [loanId]);
    if (loans.length === 0) {
      return res.status(404).json({ error: 'Loan record not found' });
    }

    const loan = loans[0];
    if (loan.status !== 'borrowed') {
      return res.status(400).json({ error: 'Item already returned' });
    }

    let loanStatus = 'returned';
    let invStatus = 'available';
    let shouldIncreaseQuantity = true;

    if (condition === 'Rusak') {
      loanStatus = 'damaged';
      invStatus = 'unavailable';
    } else if (condition === 'Hilang') {
      loanStatus = 'lost';
      invStatus = 'unavailable';
      shouldIncreaseQuantity = false;
    }

    // Process return date and custom time
    let returnedAtStr = null;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    if (returnTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3])[:.][0-5][0-9]$/;
      if (timeRegex.test(returnTime)) {
        const normalizedTime = returnTime.replace('.', ':');
        returnedAtStr = `${year}-${month}-${day} ${normalizedTime}:00`;
      }
    }

    if (!returnedAtStr) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      returnedAtStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    await query(
      'UPDATE inventory_loans SET status = ?, returned_at = ?, condition_returned = ? WHERE id = ?',
      [loanStatus, returnedAtStr, condition || null, loanId]
    );

    if (shouldIncreaseQuantity) {
      await query(
        'UPDATE inventory SET quantity = quantity + 1, status = ? WHERE id = ?',
        [invStatus, loan.inventory_id]
      );
    } else {
      await query(
        'UPDATE inventory SET status = ? WHERE id = ?',
        [invStatus, loan.inventory_id]
      );
    }

    res.json({ message: 'Item returned successfully' });
  } catch (err) {
    console.error('Return item error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLoanHistory = async (req, res) => {
  try {
    const { userId } = req.query;

    let sql = `SELECT l.*, i.name as item_name, u.name as user_name, u.nim
               FROM inventory_loans l
               JOIN inventory i ON l.inventory_id = i.id
               JOIN users u ON l.user_id = u.id
               WHERE 1=1`;
    const params = [];

    if (userId) {
      sql += ' AND l.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY l.borrowed_at DESC';

    const loans = await query(sql, params);
    res.json({ loans });
  } catch (err) {
    console.error('Get loan history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAvailableProjectors = async (req, res) => {
  try {
    const projectors = await query(
      `SELECT * FROM inventory 
       WHERE (category = 'Elektronik' OR name LIKE '%Proyektor%' OR name LIKE '%Infocus%') 
       AND quantity > 0 
       AND status = 'available'`
    );
    // Map id to serialNumber just in case
    const mapped = projectors.map(p => ({
      ...p,
      serialNumber: p.id
    }));
    res.json({ projectors: mapped });
  } catch (err) {
    console.error('Get available projectors error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportInventoryExcel = async (req, res) => {
  try {
    const loans = await query(
      `SELECT il.id AS loan_id, 
              il.ktp_number, 
              il.status AS loan_status, 
              il.condition_borrowed, 
              il.condition_returned, 
              il.borrowed_at, 
              il.returned_at,
              i.name AS item_name, 
              i.category AS item_category,
              u.name AS borrower_name, 
              u.nim, 
              u.prodi, 
              u.phone
       FROM inventory_loans il
       JOIN inventory i ON il.inventory_id = i.id
       JOIN users u ON il.user_id = u.id
       ORDER BY il.borrowed_at DESC`
    );

    const items = await query('SELECT * FROM inventory ORDER BY name ASC');

    const formatDate = (dateVal) => {
      if (!dateVal) return '-';
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '-';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return '-';
      }
    };

    const formatTime = (dateVal) => {
      if (!dateVal) return '-';
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return '-';
        return d.toTimeString().split(' ')[0].substring(0, 5);
      } catch {
        return '-';
      }
    };

    // Sheet 1: Data Peminjaman
    const sheet1Data = loans.map((l, index) => {
      let statusText = 'Dipinjam';
      if (l.loan_status === 'returned') statusText = 'Dikembalikan';
      if (l.loan_status === 'damaged') statusText = 'Dikembalikan (Rusak)';
      if (l.loan_status === 'lost') statusText = 'Hilang';

      return {
        'No': index + 1,
        'Nama Peminjam': l.borrower_name || '-',
        'NIM': l.nim || '-',
        'Program Studi': l.prodi || '-',
        'No HP': l.phone || '-',
        'Nama Barang': l.item_name || '-',
        'Tanggal Pinjam': formatDate(l.borrowed_at),
        'Jam Pinjam': formatTime(l.borrowed_at),
        'Tanggal Kembali': formatDate(l.returned_at),
        'Jam Kembali': formatTime(l.returned_at),
        'Status': statusText
      };
    });

    // Sheet 2: Kondisi Barang
    const sheet2Data = loans.map((l, index) => {
      return {
        'No': index + 1,
        'Nama Barang': l.item_name || '-',
        'Kategori': l.item_category || '-',
        'Peminjam': l.borrower_name || '-',
        'NIM': l.nim || '-',
        'Kondisi Awal': l.condition_borrowed || 'Baik',
        'Kondisi Kembali': l.condition_returned || '-',
        'Tanggal Pinjam': formatDate(l.borrowed_at),
        'Tanggal Kembali': formatDate(l.returned_at)
      };
    });

    // Sheet 3: Data Barang
    const sheet3Data = items.map((i, index) => {
      let statusText = 'Tersedia';
      if (i.status === 'unavailable') statusText = 'Rusak';
      if (i.status === 'maintenance') statusText = 'Dalam Pemeliharaan';

      return {
        'No': index + 1,
        'Nama Barang': i.name || '-',
        'Deskripsi': i.description || '-',
        'Jumlah Stok': i.quantity || 0,
        'Kategori': i.category || '-',
        'Lokasi': i.location || '-',
        'Status': statusText
      };
    });

    const wb = xlsx.utils.book_new();

    const ws1 = xlsx.utils.json_to_sheet(sheet1Data);
    xlsx.utils.book_append_sheet(wb, ws1, 'Data Peminjaman');

    const ws2 = xlsx.utils.json_to_sheet(sheet2Data);
    xlsx.utils.book_append_sheet(wb, ws2, 'Kondisi Barang');

    const ws3 = xlsx.utils.json_to_sheet(sheet3Data);
    xlsx.utils.book_append_sheet(wb, ws3, 'Data Barang');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Laporan_Inventaris_SIGAP.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('Export Excel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
