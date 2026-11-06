// Repris de rae. Applique les migrations Drizzle au démarrage du container — via drizzle-orm (déjà en
// dependency de prod), pas drizzle-kit (dev-only, absent de l'image runtime).
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

// onnotice : coupe les « schema drizzle already exists, skipping » à chaque démarrage.
const sql = postgres(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
await sql.end();
console.log('Migrations OK.');
