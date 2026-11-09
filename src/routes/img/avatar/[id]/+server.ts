import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db, users } from '$lib/server/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hors de PUBLIC (hooks.server.ts) : seuls les joueurs connectés voient les photos. Adressé par l'uuid
// (impossible à deviner), jamais par l'email. « Pas de photo » et « photo masquée » donnent la même
// réponse : rien ne trahit le choix du joueur. private : jamais dans un cache partagé ; 5 min pour
// qu'une photo masquée disparaisse vite chez les autres.
export const GET: RequestHandler = async ({ params }) => {
	const [u] = UUID.test(params.id)
		? await db.select({ avatar: users.avatar }).from(users).where(and(eq(users.id, params.id), eq(users.avatarHidden, false)))
		: [];
	const headers = { 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' };
	if (!u?.avatar) return new Response(null, { status: 404, headers });
	return new Response(new Uint8Array(u.avatar), { headers: { ...headers, 'Content-Type': 'image/webp' } });
};
