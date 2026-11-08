// Flux temps réel côté client : UNE connexion SSE par onglet (ouverte par le layout joueur), dont les
// pages lisent l'état. Côté serveur ce module n'est jamais modifié (EventSource n'existe qu'au
// navigateur), donc aucun état ne fuit d'un utilisateur à l'autre pendant le rendu SSR.

export type View = 'calendar' | 'question' | 'waiting' | 'board';
export type TopEntry = { userId: string; rank: number; name: string; points: number; ok: number; answered: number; delta: number | null };
export type Me = { rank: number; points: number; ok: number; answered: number } | null;

export const live = $state({
	connected: false,
	presence: null as { online: number; waiting: number } | null,
	answered: null as { questionId: number; count: number } | null,
	top: null as TopEntry[] | null,
	me: undefined as Me | undefined, // undefined = pas encore reçu, null = pas encore classé
	ranked: 0,
	/** Dernière case ouverte (date) et compteur, pour réagir à chaque ouverture. */
	opened: { date: '', seq: 0 }
});

export function connectLive(view: View): () => void {
	live.top = null; // la taille du top dépend de la page : on attend celui de la nouvelle connexion
	const es = new EventSource(`/api/events?view=${view}`);
	const on = <T>(event: string, fn: (data: T) => void) => es.addEventListener(event, (e) => fn(JSON.parse((e as MessageEvent).data)));
	es.onopen = () => (live.connected = true);
	es.onerror = () => (live.connected = false); // EventSource se reconnecte tout seul (retry: 3000)
	on<typeof live.presence>('presence', (d) => (live.presence = d));
	on<typeof live.answered>('answered', (d) => (live.answered = d));
	on<{ top: TopEntry[]; me: Me; ranked: number }>('leaderboard', (d) => {
		live.top = d.top;
		live.me = d.me;
		live.ranked = d.ranked;
	});
	on<{ date: string }>('opening', (d) => (live.opened = { date: d.date, seq: live.opened.seq + 1 }));
	return () => es.close();
}
