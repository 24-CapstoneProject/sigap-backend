import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Memuat variabel lingkungan dari file .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sigap_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

// =========================================================================
// ✍️ UBAH DAFTAR MATA KULIAH & DOSEN DI SINI SESUAI KEBUTUHAN PRESENTASI
// =========================================================================
const courses = [
  { code: 'F09252005', name: 'Struktur Data', lecturer: 'Yuri Yudhaswana Joefrie, Ph.D.' },
  { code: 'F14252017', name: 'Sistem Pendukukung Cerdas', lecturer: 'Dr. Deny Wiria Nugraha, S.T., M.Eng.' },
  { code: 'F08252006', name: 'Dasar Elektronika (A)', lecturer: 'Ir. Mery Subito, MT' },
  { code: 'F13242002', name: 'Kalkulus', lecturer: 'Abdul Mukaddas, S.Si., M.T' },
  { code: 'F09252019', name: 'Jaringan Komputer', lecturer: 'Rizka Ardiansyah, S.Kom., M.Kom.' },
  { code: 'F14252031', name: 'Cloud Computing', lecturer: 'Ayu Hernita, M.Kom.' },
  { code: 'F14252037', name: 'Teknologi loT', lecturer: 'Yusuf Anshori, S.T., M.T.' },
  { code: 'F09252008', name: 'Analisis Kompleksitas Algoritma', lecturer: 'Dr. Anita Ahmad Kasim, S.Kom., M.Cs.' },
  { code: 'F09252009', name: 'Metode Numerik', lecturer: 'Rahmah Laila, S.Si., M.Kom.' },
  { code: 'F14252034', name: 'Desain Sistem Informasi Publik', lecturer: 'Septiano Anggun Pratama, M.I.Kom., M.Kom.' }
];

async function seedSchedules() {
  console.log(`🔌 Menghubungkan ke database [${config.database}] di ${config.host}:${config.port}...`);
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('✅ Berhasil terhubung ke database!');

    // 1. Membersihkan jadwal lama khusus bulan Juni 2026
    console.log('🧹 Membersihkan jadwal lama di bulan Juni 2026...');
    const [delRes] = await conn.query(
      "DELETE FROM bookings WHERE booking_date BETWEEN '2026-06-01' AND '2026-06-30'"
    );
    console.log(`🗑️ Berhasil menghapus ${delRes.affectedRows} jadwal lama.`);

    // 2. Ambil data semua ruangan
    const [rooms] = await conn.query('SELECT id, name FROM rooms');
    if (rooms.length === 0) {
      throw new Error("Tabel 'rooms' kosong. Silakan jalankan 'npm run seed' terlebih dahulu untuk mengisi data ruangan.");
    }
    console.log(`🏫 Menemukan ${rooms.length} ruangan di database.`);

    // 3. Ambil data admin user ID
    const [users] = await conn.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminUserId = users.length > 0 ? users[0].id : 'admin-001';

    const bookingsToInsert = [];
    
    // Slot waktu kuliah standar
    const timeSlots = [
      { start: '07:30:00', end: '10:00:00', duration: 2 },
      { start: '10:15:00', end: '12:45:00', duration: 2 },
      { start: '13:00:00', end: '15:30:00', duration: 2 },
      { start: '15:45:00', end: '18:15:00', duration: 2 }
    ];

    // Buat jadwal untuk setiap hari kerja di bulan Juni 2026
    for (let day = 1; day <= 30; day++) {
      const dateString = `2026-06-${day.toString().padStart(2, '0')}`;
      const date = new Date(dateString);
      const dayOfWeek = date.getDay(); // 0 = Minggu, 6 = Sabtu

      // Lewati hari Sabtu & Minggu
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      rooms.forEach((room, roomIdx) => {
        timeSlots.forEach((slot, slotIdx) => {
          // Sisakan sekitar 33% slot kosong secara acak/terpola untuk simulasi reschedule
          if ((roomIdx + slotIdx + day) % 3 !== 0) {
            const courseIdx = (roomIdx + slotIdx + day) % courses.length;
            const course = courses[courseIdx];

            bookingsToInsert.push({
              id: uuidv4(),
              user_id: adminUserId,
              room_id: room.id,
              booking_date: dateString,
              start_time: slot.start,
              end_time: slot.end,
              duration: slot.duration,
              course_code: course.code,
              course_name: course.name,
              lecturer: course.lecturer,
              status: 'approved'
            });
          }
        });
      });
    }

    console.log(`📝 Menyiapkan ${bookingsToInsert.length} jadwal untuk dimasukkan...`);

    // Memasukkan data dengan batch sistem (per 100 baris) agar cepat
    const batchSize = 100;
    for (let i = 0; i < bookingsToInsert.length; i += batchSize) {
      const batch = bookingsToInsert.slice(i, i + batchSize);
      const values = batch.map(b => [
        b.id, b.user_id, b.room_id, b.booking_date, b.start_time, b.end_time, 
        b.duration, b.course_code, b.course_name, b.lecturer, b.status
      ]);

      await conn.query(
        `INSERT INTO bookings (
          id, user_id, room_id, booking_date, start_time, end_time, 
          duration, course_code, course_name, lecturer, status
        ) VALUES ?`,
        [values]
      );
    }

    console.log('🎉 SUKSES: Database berhasil di-seeding dengan jadwal baru bulan Juni 2026!');
  } catch (err) {
    console.error('❌ GAGAL melakukan seeding:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

seedSchedules();
