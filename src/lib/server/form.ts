import { fail, type ActionFailure } from '@sveltejs/kit';

// Validation des formulaires admin : quelques lecteurs typés qui lèvent BadInput, et `guard` qui
// transforme BadInput en fail(400). Pas de lib de validation pour une dizaine de champs.

export class BadInput extends Error {}

export function str(fd: FormData, name: string, opts: { max: number; label: string; optional?: boolean }): string {
	const v = String(fd.get(name) ?? '').trim();
	if (!v && !opts.optional) throw new BadInput(`${opts.label} : obligatoire.`);
	if (v.length > opts.max) throw new BadInput(`${opts.label} : ${opts.max} caractères maximum.`);
	return v;
}

export function int(fd: FormData, name: string, opts: { min: number; max: number; label: string }): number {
	const v = Number(fd.get(name));
	if (!Number.isInteger(v) || v < opts.min || v > opts.max)
		throw new BadInput(`${opts.label} : un entier entre ${opts.min} et ${opts.max}.`);
	return v;
}

export function isoDate(fd: FormData, name: string, label: string): string {
	const v = String(fd.get(name) ?? '');
	if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) throw new BadInput(`${label} : date invalide.`);
	return v;
}

export function hhmm(fd: FormData, name: string, label: string): string {
	const v = String(fd.get(name) ?? '').slice(0, 5);
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new BadInput(`${label} : heure invalide.`);
	return v;
}

/** Fichier envoyé, ou null si le champ est vide. */
export async function file(fd: FormData, name: string): Promise<Buffer | null> {
	const f = fd.get(name);
	if (!(f instanceof File) || f.size === 0) return null;
	return Buffer.from(await f.arrayBuffer());
}

export async function guard<T>(fn: () => Promise<T>): Promise<T | ActionFailure<{ error: string }>> {
	try {
		return await fn();
	} catch (e) {
		if (e instanceof BadInput) return fail(400, { error: e.message });
		// Violations de contrainte Postgres attendues (FK, unicité) : message lisible plutôt qu'une 500.
		// drizzle-orm enveloppe l'erreur postgres (DrizzleQueryError) : le code SQLSTATE est dans `cause`.
		const err = e as { code?: string; cause?: { code?: string } };
		const code = err?.code ?? err?.cause?.code;
		if (code === '23503') return fail(409, { error: 'Impossible : cet élément est encore utilisé ailleurs.' });
		if (code === '23505') return fail(409, { error: 'Ça existe déjà.' });
		throw e;
	}
}
