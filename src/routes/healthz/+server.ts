import type { RequestHandler } from './$types';
import { sql } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	await sql`select 1`;
	return new Response('ok');
};
