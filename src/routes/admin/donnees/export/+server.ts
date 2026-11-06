import type { RequestHandler } from './$types';
import { exportData } from '$lib/server/transfer';

// Le nom finit en .export.json : ignoré par git (.gitignore), pour ne jamais committer le contenu d'une entreprise.
export const GET: RequestHandler = async () => {
	const file = await exportData();
	return new Response(JSON.stringify(file, null, 2), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="jingle-quest-${file.exportedAt.slice(0, 10)}.export.json"`,
			'Cache-Control': 'no-store'
		}
	});
};
