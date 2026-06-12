import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  let connection;
  try {
    console.log('🔄 Running reschedule migration...');
    const dbName = process.env.DB_NAME || 'sigap_db';
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
    });

    const [columns] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'rescheduled_from_booking_id'
    `, [dbName]);

    if (columns.length > 0) {
      console.log('✅ Columns already exist in bookings table. Skipping alter.');
    } else {
      console.log('Adding rescheduled_from_booking_id and reschedule_reason columns to bookings...');
      await connection.query(`
        ALTER TABLE bookings 
        ADD COLUMN rescheduled_from_booking_id VARCHAR(36) NULL,
        ADD COLUMN reschedule_reason TEXT NULL
      `);
      
      console.log('Adding foreign key constraint for rescheduled_from_booking_id...');
      await connection.query(`
        ALTER TABLE bookings
        ADD CONSTRAINT fk_bookings_rescheduled_from
        FOREIGN KEY (rescheduled_from_booking_id) REFERENCES bookings(id)
        ON DELETE SET NULL
      `);
      console.log('✅ Migration completed successfully!');
    }

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (connection) {
      try {
        await connection.end();
      } catch (e) {}
    }
    process.exit(1);
  }
}

run();
