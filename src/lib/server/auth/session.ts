import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, sessions, users } from '$lib/server/db';
import { generateToken, hashToken } from './tokens';

// Repris de rae, sans la notion de workspace.

export const SESSION_COOKIE = 'jq_session';
// Session glissante : 30 jours sans visite → reconnexion SSO (transparente si l'IdP a encore une
// session). Prolongée dès qu'il en reste moins de la moitié : une écriture tous les ~15 jours par
// joueur, pas à chaque requête — compte à 9h quand tout le monde arrive en même temps.
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const RENEW_BELOW_MS = SESSION_TTL_MS / 2;

export async function createSession(userId: string) {
	const { token, hash } = generateToken();
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await db.insert(sessions).values({ id: hash, userId, expiresAt });
	return { token, expiresAt };
}

export async function validateSession(token: string) {
	const id = hashToken(token);
	const [row] = await db
		.select({ expiresAt: sessions.expiresAt, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, id));
	if (!row) return null;
	const left = row.expiresAt.getTime() - Date.now();
	if (left < 0) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}
	if (left >= RENEW_BELOW_MS) return { user: row.user, renewedUntil: null };
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
	// renewedUntil : l'appelant doit réémettre le cookie, sinon le navigateur le jette à l'ancienne date.
	return { user: row.user, renewedUntil: expiresAt };
}

export async function invalidateSession(token: string) {
	await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt
	});
}

export function deleteSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Chemin de retour après connexion : uniquement un chemin local, jamais une redirection ouverte. */
export function safeNext(raw: string | null | undefined): string {
	return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : '/';
}
