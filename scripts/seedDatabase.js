import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seed() {
  try {
    console.log('🌱 Seeding database with sample data...\n');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sigap_db',
      multipleStatements: true,
    });

    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedData = fs.readFileSync(seedPath, 'utf8');

    console.log('📝 Executing seed.sql...');
    await connection.query(seedData);

    console.log('✅ Seeding completed successfully!\n');
    console.log('📊 Sample data inserted:');
    console.log('   - 1 Admin user');
    console.log('   - 4 Student users');
    console.log('   - 12 Rooms');
    console.log('   - 4 Bookings');
    console.log('   - 7 Inventory items');
    console.log('   - 2 Inventory loans');
    console.log('   - 3 Lost & Found reports');
    console.log('   - 2 Lost & Found claims\n');
    console.log('🔐 Test Credentials:');
    console.log('   Admin: ADMIN001 / admin123');
    console.log('   Student: F55123064 / 123456\n');

    await connection.end();
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
