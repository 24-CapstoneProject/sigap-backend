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
    console.log('🔄 Checking unique_booking constraint in bookings table...');
    
    // Attempt to drop the unique index
    try {
      await connection.query('ALTER TABLE bookings DROP INDEX unique_booking');
      console.log('✅ dropped unique_booking index constraint successfully!');
    } catch (indexErr) {
      if (indexErr.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️ unique_booking index constraint does not exist. Skipping.');
      } else {
        throw indexErr;
      }
    }
  } catch (err) {
    console.error('❌ Failed to modify constraint:', err.message);
  } finally {
    await connection.end();
  }
}
run();
