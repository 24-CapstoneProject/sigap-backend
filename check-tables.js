import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('Checking tables in sigap_db...\n');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'sigap_db'
    `);

    if (tables.length === 0) {
      console.log('❌ Tidak ada tables di database sigap_db');
    } else {
      console.log('✅ Tables yang ada:');
      tables.forEach(t => console.log('  -', t.TABLE_NAME));
    }

    await connection.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTables();
