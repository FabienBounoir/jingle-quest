import type { RequestHandler } from './$types';
import { connect, type View } from '$lib/server/live';

const VIEWS = new Set<View>(['calendar', 'question', 'waiting', 'board']);
// Au-delà, le client ne lit plus (onglet gelé, réseau coupé) : on coupe plutôt que d'empiler en mémoire.
const MAX_BUFFERED = 64;

// Flux SSE (SPECS §7.4). Une connexion par onglet, ouverte par le layout joueur. hooks.server.ts
// garantit déjà une session (401 sinon).
export const GET: RequestHandler = async ({ locals, url, request }) => {
	const raw = url.searchParams.get('view') as View;
	const view = VIEWS.has(raw) ? raw : 'calendar';
	const enc = new TextEncoder();
	let disconnect = () => {};

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			let closed = false;
			const close = () => {
				if (closed) return;
				closed = true;
				disconnect();
				try {
					controller.close();
				} catch {
					/* déjà fermé */
				}
			};
			const send = (chunk: string) => {
				if (closed) return false;
				if ((controller.desiredSize ?? 0) < -MAX_BUFFERED) {
					close();
					return false;
				}
				controller.enqueue(enc.encode(chunk));
				return true;
			};
			disconnect = await connect(locals.user!.id, locals.user!.displayName, view, send);
			request.signal.addEventListener('abort', close);
		},
		cancel() {
			disconnect();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no' // aucun proxy ne doit bufferiser le flux
		}
	});
};
