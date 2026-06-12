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
    console.log('DB Config:', {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'sigap_db'
    });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });

    console.log('✅ Koneksi berhasil!\n');

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log('Schema path:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ schema.sql tidak ditemukan');
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('📝 Schema size:', schema.length, 'bytes\n');

    console.log('📝 Executing schema.sql...');
    await connection.query(schema);

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Database tables created');

    await connection.end();
  } catch (err) {
    console.error('❌ Migration failed:');
    console.error('Error:', err.message);
    console.error('Code:', err.code);
    if (err.sql) console.error('SQL:', err.sql);
    process.exit(1);
  }
}

migrate();
