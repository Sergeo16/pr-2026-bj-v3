import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool, closePool } from '../lib/db';

async function migrate() {
  const pool = getPool();
  
  try {
    console.log('🔄 Démarrage des migrations...');
    
    const migrationFile = readFileSync(
      join(process.cwd(), 'migrations', '001_initial_schema.sql'),
      'utf-8'
    );
    
    await pool.query(migrationFile);
    
    console.log('✅ Migrations terminées avec succès');
  } catch (error) {
    console.error('❌ Erreur lors des migrations:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();

