import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  try {
    console.log('🔄 Running database migration...\n');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
      waitForConnections: true,
      connectionLimit: 10,
    });

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('📝 Executing schema.sql...');
    await connection.query(schema);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Database tables created:');
    console.log('   - users');
    console.log('   - rooms');
    console.log('   - bookings');
    console.log('   - inventory');
    console.log('   - inventory_loans');
    console.log('   - lost_found');
    console.log('   - lost_found_claims');
    console.log('   - Views: available_rooms_today, pending_bookings, active_loans\n');

    await connection.end();
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
