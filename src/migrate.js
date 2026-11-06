import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'analytics.db');
const schemaPath = path.join(__dirname, '..', 'migrate-schema.sql');

const db = new Database(dbPath);
const migration = fs.readFileSync(schemaPath, 'utf8');

db.exec('PRAGMA foreign_keys = ON;');
db.exec(migration);

console.log('Database migrated successfully.');
