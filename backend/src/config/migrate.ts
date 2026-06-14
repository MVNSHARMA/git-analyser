import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getClient } from './db';

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found at: ${migrationsDir}`);
    process.exit(1);
  }

  const client = await getClient();
  
  try {
    // 1. Create schema_migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. Fetch applied migrations
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r: { filename: string }) => r.filename));

    // 3. Read migration files and sort alphabetically
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏭  Skipped (already applied): ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute the migration SQL file inside a transaction
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error applying migration ${file}:`, err);
        throw err;
      }
    }

    console.log('🎉 All migrations processed.');
  } catch (err) {
    console.error('❌ Migration runner failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations().then(() => {
  process.exit(0);
});
