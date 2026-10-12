// Local PostgreSQL for development, no Docker required. Production uses DATABASE_URL (e.g. Neon).
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';

const dataDir = new URL('../.pgdata', import.meta.url).pathname;
const pg = new EmbeddedPostgres({ databaseDir: dataDir, user: 'postgres', password: 'postgres', port: 5433, persistent: true });

if (!existsSync(dataDir)) await pg.initialise();
await pg.start();
try { await pg.createDatabase('coastal'); } catch { /* already exists */ }
console.log('Postgres ready: postgresql://postgres:postgres@localhost:5433/coastal');

const stop = async () => { await pg.stop(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
