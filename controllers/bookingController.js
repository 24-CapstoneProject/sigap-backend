import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import xlsx from 'xlsx';

export const createBooking = async (req, res) => {
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
    if (!req.file) {
      return res.status(400).json({ error: 'Bukti foto wajib diunggah untuk peminjaman ruangan.' });
    }

    const userId = req.user.id;
    const { roomId, bookingDate, startTime, endTime, courseCode, courseName, lecturer, duration, wantsInfocus } = req.body;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (bookingDate < todayStr) {
      cleanupFile();
      return res.status(400).json({ error: 'Tidak dapat memesan ruangan di tanggal yang sudah terlewat.' });
    } else if (bookingDate === todayStr) {
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
      if (startTime < currentTimeStr) {
        cleanupFile();
        return res.status(400).json({ error: 'Tidak dapat memesan ruangan untuk waktu yang sudah terlewat hari ini.' });
      }
    }

    const users = await query('SELECT id FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      cleanupFile();
      return res.status(401).json({ error: 'Akun tidak ditemukan di database. Silakan login ulang.' });
    }

    // Check if room exists
    const rooms = await query('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) {
      cleanupFile();
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check availability
    const conflicts = await query(
      `SELECT * FROM bookings 
       WHERE room_id = ? 
       AND DATE(booking_date) = ? 
       AND status IN ('approved', 'pending')
       AND (
         (start_time < ? AND end_time > ?)
         OR (start_time < ? AND end_time > ?)
         OR (start_time >= ? AND end_time <= ?)
       )`,
      [roomId, bookingDate, endTime, startTime, endTime, startTime, startTime, endTime]
    );

    if (conflicts.length > 0) {
      cleanupFile();
      return res.status(409).json({ error: 'Time slot already booked' });
    }

    // Create booking
    const bookingId = uuidv4();
    const proofImage = req.file.filename;
    await query(
      `INSERT INTO bookings (id, user_id, room_id, booking_date, start_time, end_time, course_code, course_name, lecturer, duration, status, proof_image, wants_infocus, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        bookingId, 
        userId, 
        roomId, 
        bookingDate, 
        startTime, 
        endTime, 
        courseCode || null, 
        courseName || null, 
        lecturer || null, 
        duration || null, 
        'pending', 
        proofImage,
        wantsInfocus === 'true' || wantsInfocus === true || wantsInfocus === 1 ? 1 : 0
      ]
    );

    res.status(201).json({
      message: 'Booking created successfully',
      bookingId
    });
  } catch (err) {
    cleanupFile();
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let sql = `SELECT b.*, r.name as room_name, r.capacity, u.name as user_name, u.nim,
                      orig_r.name as orig_room_name, b_orig.booking_date as orig_booking_date,
                      b_orig.start_time as orig_start_time, b_orig.end_time as orig_end_time,
                      inv.name as assigned_infocus_name
               FROM bookings b
               JOIN rooms r ON b.room_id = r.id
               JOIN users u ON b.user_id = u.id
               LEFT JOIN bookings b_orig ON b.rescheduled_from_booking_id = b_orig.id
               LEFT JOIN rooms orig_r ON b_orig.room_id = orig_r.id
               LEFT JOIN inventory inv ON b.assigned_infocus_id = inv.id
               WHERE b.user_id = ?`;
    const params = [userId];

    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.booking_date DESC, b.start_time DESC';

    const bookings = await query(sql, params);
    res.json({ bookings });
  } catch (err) {
    console.error('Get my bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const { status, roomId, date } = req.query;

    let sql = `SELECT b.*, r.name as room_name, r.capacity, r.floor, u.name as user_name, u.nim,
                      orig_r.name as orig_room_name, b_orig.booking_date as orig_booking_date,
                      b_orig.start_time as orig_start_time, b_orig.end_time as orig_end_time,
                      inv.name as assigned_infocus_name
               FROM bookings b
               JOIN rooms r ON b.room_id = r.id
               JOIN users u ON b.user_id = u.id
               LEFT JOIN bookings b_orig ON b.rescheduled_from_booking_id = b_orig.id
               LEFT JOIN rooms orig_r ON b_orig.room_id = orig_r.id
               LEFT JOIN inventory inv ON b.assigned_infocus_id = inv.id
               WHERE 1=1`;
    const params = [];

    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    if (roomId) {
      sql += ' AND b.room_id = ?';
      params.push(roomId);
    }

    if (date) {
      sql += ' AND DATE(b.booking_date) = ?';
      params.push(date);
    }

    sql += ' ORDER BY b.booking_date DESC, b.start_time DESC';

    const bookings = await query(sql, params);
    res.json({ bookings });
  } catch (err) {
    console.error('Get all bookings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const bookings = await query(
      `SELECT b.*, r.name as room_name, r.capacity, r.floor, u.name as user_name, u.nim, u.email
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking: bookings[0] });
  } catch (err) {
    console.error('Get booking by ID error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { roomId, bookingDate, startTime, endTime, courseCode, courseName, lecturer, duration } = req.body;

    // Get current booking
    const bookings = await query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    // Check if status is not pending
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending bookings can be updated' });
    }

    // Check availability for new time slot
    if (roomId !== booking.room_id || startTime !== booking.start_time || endTime !== booking.end_time || bookingDate !== booking.booking_date) {
      const conflicts = await query(
        `SELECT * FROM bookings 
         WHERE room_id = ? 
         AND id != ?
         AND DATE(booking_date) = ? 
         AND status IN ('approved', 'pending')
         AND (
           (start_time < ? AND end_time > ?)
           OR (start_time < ? AND end_time > ?)
           OR (start_time >= ? AND end_time <= ?)
         )`,
        [roomId || booking.room_id, bookingId, bookingDate || booking.booking_date, endTime || booking.end_time, startTime || booking.start_time, endTime || booking.end_time, startTime || booking.start_time, startTime || booking.start_time, endTime || booking.end_time]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({ error: 'Time slot already booked' });
      }
    }

    await query(
      `UPDATE bookings SET room_id = ?, booking_date = ?, start_time = ?, end_time = ?, course_code = ?, course_name = ?, lecturer = ?, duration = ?, updated_at = NOW()
       WHERE id = ?`,
      [roomId || booking.room_id, bookingDate || booking.booking_date, startTime || booking.start_time, endTime || booking.end_time, courseCode || booking.course_code, courseName || booking.course_name, lecturer || booking.lecturer, duration || booking.duration, bookingId]
    );

    res.json({ message: 'Booking updated successfully' });
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { adminNotes, assignedInfocusId } = req.body;

    const bookings = await query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];

    let assignedId = null;
    if (assignedInfocusId) {
      const invItems = await query('SELECT * FROM inventory WHERE id = ?', [assignedInfocusId]);
      if (invItems.length === 0) {
        return res.status(404).json({ error: 'Projector not found in inventory' });
      }
      if (invItems[0].quantity <= 0) {
        return res.status(400).json({ error: 'Projector is currently unavailable (out of stock)' });
      }
      assignedId = assignedInfocusId;
    }

    // Jika ini adalah pengajuan reschedule
    if (booking.rescheduled_from_booking_id) {
      // Ambil data booking lama untuk memeriksa apakah ada infokus yang dipinjam sebelumnya
      const [origBooking] = await query('SELECT * FROM bookings WHERE id = ?', [booking.rescheduled_from_booking_id]);
      if (origBooking && origBooking.assigned_infocus_id) {
        const activeLoans = await query(
          'SELECT id FROM inventory_loans WHERE user_id = ? AND inventory_id = ? AND status = "borrowed" LIMIT 1',
          [booking.user_id, origBooking.assigned_infocus_id]
        );
        if (activeLoans.length > 0) {
          await query(
            'UPDATE inventory_loans SET status = "returned", returned_at = NOW(), condition_returned = "Baik" WHERE id = ?',
            [activeLoans[0].id]
          );
          await query('UPDATE inventory SET quantity = quantity + 1 WHERE id = ?', [origBooking.assigned_infocus_id]);
        }
      }

      // 1. Hapus booking asli (jadwal lama)
      await query('DELETE FROM bookings WHERE id = ?', [booking.rescheduled_from_booking_id]);
      
      // 2. Setujui booking baru dan hilangkan relasi reschedule agar menjadi booking reguler
      await query(
        'UPDATE bookings SET status = ?, rescheduled_from_booking_id = NULL, admin_notes = ?, assigned_infocus_id = ?, approved_at = NOW() WHERE id = ?',
        ['approved', adminNotes || null, assignedId, bookingId]
      );
    } else {
      // Standard approval
      await query(
        'UPDATE bookings SET status = ?, admin_notes = ?, assigned_infocus_id = ?, approved_at = NOW() WHERE id = ?',
        ['approved', adminNotes || null, assignedId, bookingId]
      );
    }

    // Catat peminjaman di inventory_loans jika admin menetapkan infokus
    if (assignedId) {
      const loanId = uuidv4();
      await query(
        'INSERT INTO inventory_loans (id, user_id, inventory_id, ktp_number, status, condition_borrowed, borrowed_at) VALUES (?, ?, ?, NULL, "borrowed", "Baik", NOW())',
        [loanId, booking.user_id, assignedId]
      );
      await query('UPDATE inventory SET quantity = quantity - 1 WHERE id = ?', [assignedId]);
    }

    res.json({ message: 'Booking approved successfully' });
  } catch (err) {
    console.error('Approve booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { rejectReason } = req.body;

    const bookings = await query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await query(
      'UPDATE bookings SET status = ?, reject_reason = ?, rejected_at = NOW() WHERE id = ?',
      ['rejected', rejectReason || null, bookingId]
    );

    res.json({ message: 'Booking rejected successfully' });
  } catch (err) {
    console.error('Reject booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const userId = req.user.id;

    const bookings = await query('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, userId]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[0];
    if (booking.status !== 'pending' && booking.status !== 'approved') {
      return res.status(400).json({ error: 'Cannot cancel this booking' });
    }

    // Jika memiliki infokus yang ditugaskan, kembalikan infokus tersebut
    if (booking.assigned_infocus_id) {
      const activeLoans = await query(
        'SELECT id FROM inventory_loans WHERE user_id = ? AND inventory_id = ? AND status = "borrowed" LIMIT 1',
        [userId, booking.assigned_infocus_id]
      );
      if (activeLoans.length > 0) {
        await query(
          'UPDATE inventory_loans SET status = "returned", returned_at = NOW(), condition_returned = "Baik" WHERE id = ?',
          [activeLoans[0].id]
        );
        await query('UPDATE inventory SET quantity = quantity + 1 WHERE id = ?', [booking.assigned_infocus_id]);
      }
      await query('UPDATE bookings SET assigned_infocus_id = NULL WHERE id = ?', [bookingId]);
    }

    await query('UPDATE bookings SET status = ?, cancelled_at = NOW() WHERE id = ?', ['cancelled', bookingId]);

    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPublicSchedule = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const rooms = await query('SELECT * FROM rooms ORDER BY floor, name');

    const bookings = await query(
      `SELECT b.id, b.room_id, b.start_time, b.end_time, b.course_name, b.lecturer, b.duration, r.name as room_name, u.name as user_name
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN users u ON b.user_id = u.id
       WHERE DATE(b.booking_date) = ?
       AND b.status = 'approved'`,
      [targetDate]
    );

    res.json({ rooms, bookings });
  } catch (err) {
    console.error('Get public schedule error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const bulkImportBookings = async (req, res) => {
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
    if (!req.file) {
      return res.status(400).json({ error: 'File Excel/CSV wajib diunggah.' });
    }

    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      cleanupFile();
      return res.status(400).json({ error: 'Tanggal Mulai dan Tanggal Selesai Semester wajib diisi.' });
    }

    const userId = req.user.id;

    // Load workbook
    let workbook;
    try {
      workbook = xlsx.readFile(req.file.path);
    } catch (err) {
      cleanupFile();
      return res.status(400).json({ error: 'Gagal membaca file. Pastikan format file .xlsx atau .csv valid.' });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      cleanupFile();
      return res.status(400).json({ error: 'File Excel/CSV tidak memiliki sheet data.' });
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      cleanupFile();
      return res.status(400).json({ error: 'Sheet data tidak ditemukan di dalam berkas.' });
    }
    // Read sheet row by row (as raw arrays) to handle complex/merged headers and section titles
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawRows.length === 0) {
      cleanupFile();
      return res.status(400).json({ error: 'File kosong atau tidak memiliki data.' });
    }

    // Retrieve all rooms to map name to id
    const dbRooms = await query('SELECT id, name FROM rooms');
    const roomMap = {}; // name (uppercase) -> id
    dbRooms.forEach(room => {
      roomMap[room.name.trim().toUpperCase()] = room.id;
    });

    // Indeks Kolom Dinamis (diisi hasil deteksi baris header)
    let ruangIdx = -1;
    let hariIdx = -1;
    let jamIdx = -1;
    let dosenIdx = -1;
    let kodeIdx = -1;
    let namaIdx = -1;

    let headerRowFound = false;
    let startRowIndex = 0;

    // Deteksi letak baris header utama secara dinamis
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;

      const rowStr = Array.from(row).map(c => String(c || '').trim().toUpperCase());
      
      // Jika terdapat kolom RUANG dan HARI atau JAM, kita temukan baris header utama
      if (rowStr.includes('RUANG') && (rowStr.includes('JAM') || rowStr.includes('HARI'))) {
        ruangIdx = rowStr.indexOf('RUANG');
        hariIdx = rowStr.indexOf('HARI');
        jamIdx = rowStr.indexOf('JAM');
        
        const timDosenIdx = rowStr.findIndex(c => c && (c.includes('DOSEN') || c.includes('TIM DOSEN')));
        if (timDosenIdx !== -1) dosenIdx = timDosenIdx;
        
        // Cek baris berikutnya untuk kolom sub-header (KODE, NAMA, SKS)
        const nextRow = rawRows[i + 1];
        const nextRowStr = nextRow ? Array.from(nextRow).map(c => String(c || '').trim().toUpperCase()) : [];
        
        kodeIdx = rowStr.indexOf('KODE');
        namaIdx = rowStr.indexOf('NAMA');

        if (kodeIdx === -1) kodeIdx = nextRowStr.indexOf('KODE');
        if (namaIdx === -1) namaIdx = nextRowStr.indexOf('NAMA');
        
        // Pencarian fallback berisi kata kunci
        if (kodeIdx === -1) kodeIdx = nextRowStr.findIndex(c => c && c.includes('KODE'));
        if (namaIdx === -1) namaIdx = nextRowStr.findIndex(c => c && (c.includes('NAMA') || c.includes('MATA KULIAH')));

        headerRowFound = true;
        // Data dimulai 2 baris setelah header utama (melewati sub-headers)
        startRowIndex = i + 2; 
        break;
      }
    }

    if (!headerRowFound || ruangIdx === -1 || hariIdx === -1 || jamIdx === -1 || namaIdx === -1) {
      cleanupFile();
      return res.status(400).json({ 
        error: 'Format kolom Excel tidak sesuai template. Pastikan kolom HARI, JAM, RUANG, dan NAMA MATA KULIAH tersedia.' 
      });
    }

    const errors = [];
    const validBookings = [];

    // Helper: Parsing rentang waktu JAM (e.g., "08:00 - 10:00" atau "08.00-10.00")
    const parseJamRange = (jamStr) => {
      if (!jamStr) return null;
      
      // Handle Excel time fraction (sometimes numeric if cell only has time value, though usually string for range)
      if (typeof jamStr === 'number') {
        return null; // A range must have start and end, so it can't be a single number
      }

      // Normalisasi titik menjadi titik dua (e.g. 08.00 -> 08:00)
      const cleaned = String(jamStr).trim().replace(/\./g, ':');
      // Split by - atau s/d
      const parts = cleaned.split(/[-–—]|\bs\/d\b/i);
      if (parts.length >= 2) {
        const startPart = parts[0].trim();
        const endPart = parts[1].trim();
        
        // Match format jam
        const matchStart = startPart.match(/^(\d{1,2}):(\d{2})/);
        const matchEnd = endPart.match(/^(\d{1,2}):(\d{2})/);
        if (matchStart && matchEnd) {
          const startH = matchStart[1].padStart(2, '0');
          const startM = matchStart[2];
          const endH = matchEnd[1].padStart(2, '0');
          const endM = matchEnd[2];
          
          const startTime = `${startH}:${startM}`;
          const endTime = `${endH}:${endM}`;
          
          // Hitung durasi desimal dalam jam
          const startMins = parseInt(startH) * 60 + parseInt(startM);
          const endMins = parseInt(endH) * 60 + parseInt(endM);
          const duration = Math.max(0.5, (endMins - startMins) / 60);
          
          return { startTime, endTime, duration };
        }
      }
      return null;
    };

    // Helper: Mencari semua tanggal kalender untuk Hari tertentu dalam rentang Tanggal Semester
    const getDatesForDayOfWeek = (startDateStr, endDateStr, targetDayName) => {
      const dayMap = {
        'SENIN': 1,
        'SELASA': 2,
        'RABU': 3,
        'KAMIS': 4,
        'JUMAT': 5,
        'JUM\'AT': 5,
        'SABTU': 6,
        'MINGGU': 0
      };
      
      const cleanDayName = targetDayName.toUpperCase().trim().replace(/['`]/g, '');
      let targetDayNum = dayMap[cleanDayName];
      if (targetDayNum === undefined) {
        // Fallback untuk typo penulisan hari
        if (cleanDayName.includes('JUMAT') || cleanDayName.includes('JUMAT')) targetDayNum = 5;
        else return [];
      }

      const dates = [];
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);

      const current = new Date(start);
      while (current <= end) {
        if (current.getDay() === targetDayNum) {
          dates.push(current.toISOString().split('T')[0]);
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    const isOverlapping = (startA, endA, startB, endB) => {
      return startA < endB && endA > startB;
    };

    // Proses data baris demi baris
    for (let index = startRowIndex; index < rawRows.length; index++) {
      const row = rawRows[index];
      const rowNum = index + 1; // 1-based index baris excel untuk pelaporan error

      if (!row || !Array.isArray(row) || row.length === 0) continue;

      // Ambil nilai mentah
      const rawRuangan = row[ruangIdx];
      const rawHari = row[hariIdx];
      const rawJam = row[jamIdx];
      const rawDosen = dosenIdx !== -1 ? row[dosenIdx] : null;
      const rawKode = kodeIdx !== -1 ? row[kodeIdx] : null;
      const rawNama = row[namaIdx];

      // Jika kolom-kolom utama kosong, abaikan (mungkin baris kosong, header berulang, atau subtotal/notes)
      if (!rawRuangan || !rawHari || !rawJam || !rawNama) {
        continue;
      }

      // Abaikan jika terulang teks header
      if (String(rawRuangan).trim().toUpperCase() === 'RUANG') {
        continue;
      }

      // Cocokkan ruangan ke database
      let roomNameUpper = String(rawRuangan).trim().toUpperCase();
      
      // Normalisasi nama ruangan F.F (contoh: "F.F01", "F.F.01", "FF 01", "F.F 1" -> "F.F 01")
      const cleanName = roomNameUpper.replace(/[\s\.-]+/g, '');
      if (cleanName.startsWith('FF')) {
        const numPart = cleanName.substring(2);
        const num = parseInt(numPart, 10);
        if (!isNaN(num)) {
          roomNameUpper = `F.F ${String(num).padStart(2, '0')}`;
        }
      }

      const roomId = roomMap[roomNameUpper];
      if (!roomId) {
        // Jika ruangan bukan bagian dari Gedung F.F (misal FT.07, Lab Mektan, dll.), abaikan baris ini
        continue;
      }

      // Ekspansi Hari kuliah ke Tanggal Semester
      const targetDay = String(rawHari).trim().toUpperCase();
      const bookingDates = getDatesForDayOfWeek(startDate, endDate, targetDay);
      if (bookingDates.length === 0) {
        errors.push(`Baris ${rowNum}: Hari '${rawHari}' tidak valid. Gunakan nama hari Indonesia (Senin, Selasa, dll.).`);
        continue;
      }

      // Parsing interval jam kuliah
      const timeInfo = parseJamRange(rawJam);
      if (!timeInfo) {
        errors.push(`Baris ${rowNum}: Format jam '${rawJam}' tidak valid. Gunakan format HH:MM - HH:MM.`);
        continue;
      }

      const { startTime, endTime, duration } = timeInfo;

      // Validasi bentrok untuk setiap tanggal kalender hasil ekspansi
      for (const bookingDate of bookingDates) {
        // 1. Cek bentrok internal dalam file Excel (self-conflict)
        let hasSelfConflict = false;
        for (const valid of validBookings) {
          if (valid.roomId === roomId && valid.bookingDate === bookingDate) {
            if (isOverlapping(startTime, endTime, valid.startTime, valid.endTime)) {
              errors.push(`Baris ${rowNum}: Bentrok jadwal di dalam berkas Excel sendiri untuk ruang '${rawRuangan}' pada tanggal ${bookingDate} jam ${startTime}-${endTime}.`);
              hasSelfConflict = true;
              break;
            }
          }
        }

        if (hasSelfConflict) continue;

        // 2. Cek bentrok dengan database
        const dbConflicts = await query(
          `SELECT b.*, r.name AS room_name FROM bookings b
           JOIN rooms r ON b.room_id = r.id
           WHERE b.room_id = ? 
           AND DATE(b.booking_date) = ? 
           AND b.status IN ('approved', 'pending')
           AND (
             (b.start_time < ? AND b.end_time > ?)
             OR (b.start_time < ? AND b.end_time > ?)
             OR (b.start_time >= ? AND b.end_time <= ?)
           )`,
          [roomId, bookingDate, endTime, startTime, endTime, startTime, startTime, endTime]
        );

        if (dbConflicts.length > 0) {
          const conflict = dbConflicts[0];
          errors.push(`Baris ${rowNum}: Bentrok dengan database pada tanggal ${bookingDate} untuk ruang '${rawRuangan}' jam ${startTime}-${endTime} (Sudah terisi: '${conflict.course_name}' oleh ${conflict.lecturer}).`);
          continue;
        }

        // Tambah ke daftar siap import jika lolos semua validasi
        validBookings.push({
          id: uuidv4(),
          roomId,
          bookingDate,
          startTime,
          endTime,
          duration,
          courseCode: rawKode ? String(rawKode).trim() : null,
          courseName: String(rawNama).trim(),
          lecturer: rawDosen ? String(rawDosen).trim() : 'Tim Dosen'
        });
      }
    }

    // Prinsip All-or-Nothing: batalkan import dan kembalikan semua error jika ditemukan baris bermasalah
    if (errors.length > 0) {
      cleanupFile();
      return res.status(400).json({
        error: 'Proses import dibatalkan karena terdapat beberapa baris tidak valid atau bentrok.',
        details: errors
      });
    }

    // Simpan seluruh data valid ke database
    for (const booking of validBookings) {
      await query(
        `INSERT INTO bookings (id, user_id, room_id, booking_date, start_time, end_time, course_code, course_name, lecturer, duration, status, proof_image, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', NULL, NOW())`,
        [
          booking.id,
          userId,
          booking.roomId,
          booking.bookingDate,
          booking.startTime,
          booking.endTime,
          booking.courseCode,
          booking.courseName,
          booking.lecturer,
          booking.duration
        ]
      );
    }

    cleanupFile();
    res.status(200).json({
      message: `Berhasil mengimpor ${validBookings.length} entri jadwal ruangan secara massal ke kalender.`,
      count: validBookings.length
    });

  } catch (err) {
    cleanupFile();
    console.error('Bulk import error:', err);
    res.status(500).json({ 
      error: `Internal Server Error: ${err.message}`, 
      details: [err.stack] 
    });
  }
};

export const createRescheduleRequest = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { newRoomId, newBookingDate, newStartTime, newEndTime, reason } = req.body;
    const userId = req.user.id;

    // Cek apakah booking asli ada, disetujui, dan milik user tersebut
    const originalBookings = await query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = ?',
      [bookingId, userId, 'approved']
    );

    if (originalBookings.length === 0) {
      return res.status(404).json({ error: 'Jadwal asli tidak ditemukan atau tidak berstatus disetujui.' });
    }

    const origBooking = originalBookings[0];

    // Cek apakah ruangan baru ada
    const rooms = await query('SELECT * FROM rooms WHERE id = ?', [newRoomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Ruangan baru tidak ditemukan.' });
    }

    // Cek bentrok waktu di database untuk slot baru (kecuali booking yang sedang kita reschedule)
    const conflicts = await query(
      `SELECT * FROM bookings 
       WHERE room_id = ? 
       AND DATE(booking_date) = ? 
       AND status IN ('approved', 'pending')
       AND id <> ?
       AND (
         (start_time < ? AND end_time > ?)
         OR (start_time < ? AND end_time > ?)
         OR (start_time >= ? AND end_time <= ?)
       )`,
      [newRoomId, newBookingDate, bookingId, newEndTime, newStartTime, newEndTime, newStartTime, newStartTime, newEndTime]
    );

    if (conflicts.length > 0) {
      return res.status(409).json({ error: 'Slot waktu di ruangan baru tersebut sudah dipesan.' });
    }

    // Hitung durasi baru
    const [startH, startM] = newStartTime.split(':').map(Number);
    const [endH, endM] = newEndTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const duration = Math.max(0.5, (endMins - startMins) / 60);

    const newBookingId = uuidv4();

    // Buat record booking baru dengan link reschedule_from_booking_id
    await query(
      `INSERT INTO bookings (id, user_id, room_id, booking_date, start_time, end_time, course_code, course_name, lecturer, duration, status, proof_image, rescheduled_from_booking_id, reschedule_reason, wants_infocus, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW())`,
      [
        newBookingId,
        userId,
        newRoomId,
        newBookingDate,
        newStartTime,
        newEndTime,
        origBooking.course_code,
        origBooking.course_name,
        origBooking.lecturer,
        duration,
        origBooking.proof_image,
        bookingId,
        reason || null,
        origBooking.wants_infocus || 0
      ]
    );

    res.status(201).json({
      message: 'Pengajuan pindah jadwal berhasil dikirim dan menunggu verifikasi admin.',
      bookingId: newBookingId
    });
  } catch (err) {
    console.error('Create reschedule request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const exportBookingsExcel = async (req, res) => {
  try {
    const bookings = await query(
      `SELECT b.*, r.name as room_name, r.floor, u.name as user_name, u.nim, u.prodi, u.phone,
              orig_r.name as orig_room_name, b_orig.booking_date as orig_booking_date,
              b_orig.start_time as orig_start_time, b_orig.end_time as orig_end_time,
              inv.name as assigned_infocus_name
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN users u ON b.user_id = u.id
       LEFT JOIN bookings b_orig ON b.rescheduled_from_booking_id = b_orig.id
       LEFT JOIN rooms orig_r ON b_orig.room_id = orig_r.id
       LEFT JOIN inventory inv ON b.assigned_infocus_id = inv.id
       ORDER BY b.booking_date DESC, b.start_time DESC`
    );

    const rooms = await query(
      `SELECT r.id, r.name, r.floor, r.capacity, r.status,
              SUM(CASE WHEN b.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
              SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
              SUM(CASE WHEN b.status IN ('rejected', 'cancelled') THEN 1 ELSE 0 END) as other_count
       FROM rooms r
       LEFT JOIN bookings b ON r.id = b.room_id
       GROUP BY r.id
       ORDER BY r.floor ASC, r.name ASC`
    );

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

    const formatTime = (timeVal) => {
      if (!timeVal) return '-';
      if (typeof timeVal === 'string') {
        return timeVal.substring(0, 5);
      }
      try {
        const d = new Date(timeVal);
        if (isNaN(d.getTime())) return '-';
        return d.toTimeString().split(' ')[0].substring(0, 5);
      } catch {
        return '-';
      }
    };

    // Sheet 1: Data Peminjaman
    const sheet1Data = bookings.map((b, index) => {
      let statusText = 'Menunggu';
      if (b.status === 'approved') statusText = 'Disetujui';
      if (b.status === 'rejected') statusText = 'Ditolak';
      if (b.status === 'cancelled') statusText = 'Dibatalkan';

      const wantsInfocusText = b.wants_infocus ? 'Ya' : 'Tidak';
      const assignedInfocusText = b.assigned_infocus_name ? `Ya (${b.assigned_infocus_name})` : wantsInfocusText;

      let rescheduleText = '-';
      if (b.rescheduled_from_booking_id) {
        rescheduleText = `Pindah dari ${b.orig_room_name || '-'} (${formatDate(b.orig_booking_date)} ${formatTime(b.orig_start_time)}-${formatTime(b.orig_end_time)})`;
      }

      return {
        'No': index + 1,
        'Nama Peminjam': b.user_name || '-',
        'NIM': b.nim || '-',
        'Program Studi': b.prodi || '-',
        'No HP': b.phone || '-',
        'Ruangan': b.room_name || '-',
        'Lantai': b.floor ? `Lantai ${b.floor}` : '-',
        'Tanggal Booking': formatDate(b.booking_date),
        'Jam Mulai': formatTime(b.start_time),
        'Jam Selesai': formatTime(b.end_time),
        'Durasi (Jam)': b.duration || '-',
        'Mata Kuliah': b.course_name || '-',
        'Dosen Pengampu': b.lecturer || '-',
        'Peminjaman Proyektor': assignedInfocusText,
        'Status': statusText,
        'Alasan Penolakan': b.reject_reason || '-',
        'Catatan Admin': b.admin_notes || '-',
        'Info Reschedule': rescheduleText,
        'Alasan Reschedule': b.reschedule_reason || '-',
        'Tanggal Pengajuan': formatDate(b.created_at)
      };
    });

    // Sheet 2: Statistik Ruangan
    const sheet2Data = rooms.map((r, index) => {
      let statusText = 'Tersedia';
      if (r.status === 'unavailable') statusText = 'Tidak Tersedia';
      if (r.status === 'maintenance') statusText = 'Pemeliharaan';

      return {
        'No': index + 1,
        'Nama Ruangan': r.name || '-',
        'Lantai': r.floor ? `Lantai ${r.floor}` : '-',
        'Kapasitas': r.capacity || 0,
        'Status Ruangan': statusText,
        'Total Disetujui': r.approved_count || 0,
        'Total Menunggu': r.pending_count || 0,
        'Total Ditolak/Batal': r.other_count || 0
      };
    });

    const wb = xlsx.utils.book_new();

    const ws1 = xlsx.utils.json_to_sheet(sheet1Data);
    xlsx.utils.book_append_sheet(wb, ws1, 'Riwayat Peminjaman');

    const ws2 = xlsx.utils.json_to_sheet(sheet2Data);
    xlsx.utils.book_append_sheet(wb, ws2, 'Statistik Ruangan');

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Laporan_Peminjaman_Ruangan_SIGAP.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('Export bookings Excel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

