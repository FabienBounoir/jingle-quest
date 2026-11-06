import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { db, settings } from '$lib/server/db';

// Public (page de connexion). no-cache : le navigateur revalide, un nouveau logo apparaît tout de suite.
export const GET: RequestHandler = async () => {
	const [s] = await db.select({ logo: settings.logo, mime: settings.logoMime }).from(settings).where(eq(settings.id, 1));
	if (!s?.logo || !s.mime) error(404);
	return new Response(new Uint8Array(s.logo), {
		headers: { 'Content-Type': s.mime, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }
	});
};
