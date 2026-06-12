import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sigap_db',
  });

  try {
    console.log('Finding a valid user and rooms...');
    
    // Get a student user
    const [users] = await connection.query("SELECT id FROM users WHERE role = 'mahasiswa' LIMIT 1");
    if (users.length === 0) {
      console.log('❌ No student users found in database. Please register/create one first.');
      process.exit(1);
    }
    const studentUserId = users[0].id;
    console.log(`Using student user ID: ${studentUserId}`);

    // Get rooms
    const [rooms] = await connection.query("SELECT id, name FROM rooms LIMIT 2");
    if (rooms.length < 2) {
      console.log('❌ Not enough rooms found in database (need at least 2 rooms).');
      process.exit(1);
    }
    const room1Id = rooms[0].id;
    const room2Id = rooms[1].id;
    console.log(`Using Room 1: ${rooms[0].name} (${room1Id}), Room 2: ${rooms[1].name} (${room2Id})`);

    console.log('Seeding reschedule dummy...');
    // Delete existing
    await connection.query("DELETE FROM bookings WHERE id IN ('booking-approved-001', 'booking-reschedule-001')");

    // Insert original approved booking
    await connection.query(`
      INSERT INTO bookings (id, user_id, room_id, booking_date, start_time, end_time, duration, course_code, course_name, lecturer, status)
      VALUES (
        'booking-approved-001', 
        ?, 
        ?, 
        DATE_ADD(CURDATE(), INTERVAL 1 DAY), 
        '08:00:00', 
        '10:00:00', 
        2, 
        'IF001', 
        'Capstone Project', 
        'Dr. Ir. Ahmad Fauzi, M.T.', 
        'approved'
      )
    `, [studentUserId, room1Id]);

    // Insert reschedule request booking
    await connection.query(`
      INSERT INTO bookings (id, user_id, room_id, booking_date, start_time, end_time, duration, course_code, course_name, lecturer, status, rescheduled_from_booking_id, reschedule_reason)
      VALUES (
        'booking-reschedule-001', 
        ?, 
        ?, 
        DATE_ADD(CURDATE(), INTERVAL 1 DAY), 
        '10:00:00', 
        '12:00:00', 
        2, 
        'IF001', 
        'Data Mining', 
        'Dr. Dessy Santi, S.Kom., M.T.', 
        'pending', 
        'booking-approved-001', 
        'Pindah karena tabrakan jadwal kuliah umum di ruangan sebelumnya.'
      )
    `, [studentUserId, room2Id]);

    console.log('✅ Seeded reschedule dummy successfully!');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    await connection.end();
  }
}
run();
