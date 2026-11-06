// Repris de rae. Applique les migrations Drizzle au démarrage du container — via drizzle-orm (déjà en
// dependency de prod), pas drizzle-kit (dev-only, absent de l'image runtime).
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

// onnotice : coupe les « schema drizzle already exists, skipping » à chaque démarrage.
const sql = postgres(url, { max: 1, onnotice: () => {} });

// La base peut démarrer après l'app (premier déploiement, redémarrage de Postgres) : son service
// headless n'a pas d'adresse tant qu'elle n'est pas prête. On l'attend jusqu'à 60 s au lieu de
// planter et de laisser OpenShift redémarrer le pod en boucle.
for (let i = 1; ; i++) {
	try {
		await sql`select 1`;
		break;
	} catch (e) {
		if (i >= 30) throw e;
		console.log(`Base pas encore joignable (${e.code ?? e.message}), nouvel essai dans 2 s…`);
		await new Promise((r) => setTimeout(r, 2000));
	}
}
await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
await sql.end();
console.log('Migrations OK.');
