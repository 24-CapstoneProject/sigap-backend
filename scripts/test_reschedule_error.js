import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sigap_db',
  });

  const query = async (sql, params) => {
    const [rows] = await connection.query(sql, params);
    return rows;
  };

  try {
    const bookingId = '7cacfbbe-b178-44ae-9df6-00949889b39c';
    const userId = 'dc5dc6e8-f74c-42f2-80e1-45422dc9a4fe'; 
    const newRoomId = 'room-002';
    const newBookingDate = '2026-06-12';
    const newStartTime = '13:00';
    const newEndTime = '15:00';
    const reason = 'Test reschedule with real data';

    console.log('1. Checking original booking...');
    const originalBookings = await query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ? AND status = ?',
      [bookingId, userId, 'approved']
    );
    console.log('Original booking found:', originalBookings.length > 0);
    if (originalBookings.length === 0) {
      console.log('Could not find original booking.');
      return;
    }

    const origBooking = originalBookings[0];

    console.log('2. Checking new room...');
    const rooms = await query('SELECT * FROM rooms WHERE id = ?', [newRoomId]);
    console.log('Room found:', rooms.length > 0);

    console.log('3. Checking conflicts...');
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
    console.log('Conflicts count:', conflicts.length);

    console.log('4. Calculating duration...');
    const [startH, startM] = newStartTime.split(':').map(Number);
    const [endH, endM] = newEndTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;
    const duration = Math.max(0.5, (endMins - startMins) / 60);
    console.log('Duration:', duration);

    console.log('5. Inserting new booking...');
    const newBookingId = uuidv4();
    await query(
      `INSERT INTO bookings (id, user_id, room_id, booking_date, start_time, end_time, course_code, course_name, lecturer, duration, status, proof_image, rescheduled_from_booking_id, reschedule_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW())`,
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
        reason || null
      ]
    );

    console.log('✅ Inserted successfully!');
  } catch (err) {
    console.error('❌ Error caught:', err);
  } finally {
    await connection.end();
  }
}
run();
