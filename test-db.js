import mysql from 'mysql2/promise';

async function testConnection() {
  try {
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'sigap_db'
    });

    const connection = await pool.getConnection();
    console.log('✅ Koneksi ke database berhasil!');
    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error koneksi:', err.message);
    process.exit(1);
  }
}

testConnection();
