import { eq } from 'drizzle-orm';
import { db, settings } from '$lib/server/db';

export type Settings = typeof settings.$inferSelect;

// ponytail: cache process, invalidé par l'admin quand il enregistre (un seul pod, cf. SPECS §7.6).
let cached: Promise<Settings> | null = null;

export function getSettings(): Promise<Settings> {
	cached ??= db
		.select()
		.from(settings)
		.where(eq(settings.id, 1))
		.then(([s]) => {
			if (!s) throw new Error('Ligne settings absente : migrations non appliquées ?');
			return s;
		})
		.catch((e) => {
			cached = null;
			throw e;
		});
	return cached;
}

export const invalidateSettings = () => {
	cached = null;
};
