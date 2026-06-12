import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { ensureDefaultRooms } from '../utils/ensureRooms.js';

export const getAllRooms = async (req, res) => {
  try {
    await ensureDefaultRooms();

    const { status, floor } = req.query;

    let sql = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (floor) {
      sql += ' AND floor = ?';
      params.push(floor);
    }

    sql += ' ORDER BY floor, name';

    const rooms = await query(sql, params);

    const enrichedRooms = await Promise.all(rooms.map(async (room) => {
      try {
        const bookings = await query(
          `SELECT b.*, u.name AS user_name
           FROM bookings b
           JOIN users u ON b.user_id = u.id
           WHERE b.room_id = ?
           AND DATE(b.booking_date) = CURDATE()
           AND b.status = 'approved'
           AND b.end_time > CURTIME()
           ORDER BY b.start_time`,
          [room.id]
        );

        return { ...room, currentBookings: bookings };
      } catch {
        return { ...room, currentBookings: [] };
      }
    }));

    res.json({ rooms: enrichedRooms });
  } catch (err) {
    console.error('Get all rooms error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;

    const rooms = await query('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const room = rooms[0];

    // Get current bookings joined with user details
    const bookings = await query(
      `SELECT b.*, u.name AS student_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.room_id = ? 
       AND DATE(b.booking_date) = CURDATE() 
       AND b.status = 'approved'
       ORDER BY b.start_time`,
      [roomId]
    );

    res.json({
      room: {
        ...room,
        currentBookings: bookings,
        schedules: bookings.map(b => ({
          student_name: b.student_name,
          start_time: b.start_time,
          end_time: b.end_time
        }))
      }
    });
  } catch (err) {
    console.error('Get room by ID error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRoom = async (req, res) => {
  try {
    const { name, capacity, floor, features } = req.body;

    const roomId = uuidv4();
    await query(
      'INSERT INTO rooms (id, name, capacity, floor, features, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [roomId, name, capacity, floor, JSON.stringify(features || []), 'available']
    );

    res.status(201).json({
      message: 'Room created successfully',
      roomId
    });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, capacity, floor, features, status } = req.body;

    await query(
      'UPDATE rooms SET name = ?, capacity = ?, floor = ?, features = ?, status = ? WHERE id = ?',
      [name, capacity, floor, JSON.stringify(features || []), status, roomId]
    );

    res.json({ message: 'Room updated successfully' });
  } catch (err) {
    console.error('Update room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    await query('DELETE FROM rooms WHERE id = ?', [roomId]);

    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkRoomAvailability = async (req, res) => {
  try {
    const { roomId, date, startTime, endTime } = req.body;

    const bookings = await query(
      `SELECT * FROM bookings 
       WHERE room_id = ? 
       AND DATE(booking_date) = ? 
       AND status = 'approved'
       AND (
         (start_time < ? AND end_time > ?)
         OR (start_time < ? AND end_time > ?)
         OR (start_time >= ? AND end_time <= ?)
       )`,
      [roomId, date, endTime, startTime, endTime, startTime, startTime, endTime]
    );

    const isAvailable = bookings.length === 0;

    res.json({
      available: isAvailable,
      conflictingBookings: bookings
    });
  } catch (err) {
    console.error('Check availability error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
