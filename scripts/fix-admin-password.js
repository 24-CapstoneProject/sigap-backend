import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { hashPassword } from '../utils/auth.js';

dotenv.config();

const password = process.argv[2] || 'sigap123';

try {
  const hash = await hashPassword(password);
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sigap_db',
  });

  await connection.query(
    'UPDATE users SET password_hash = ? WHERE role = ? OR nim = ?',
    [hash, 'admin', 'admin_sigap']
  );

  console.log(`✅ Password admin di database diperbarui ke: ${password}`);
  await connection.end();
} catch (err) {
  console.error('❌ Gagal memperbarui password admin:', err.message);
  process.exit(1);
}
