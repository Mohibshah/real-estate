// Usage: node --env-file=.env.local scripts/migrate.mjs   (or: npm run db:migrate with env vars set)
import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';

const sql = await fs.readFile(path.join(process.cwd(), 'db/schema.sql'), 'utf8');
const conn = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});
await conn.query(sql);
await conn.end();
console.log('Migration complete: leads table is ready.');
