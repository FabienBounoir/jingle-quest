// Temps réel (SPECS §7.4) : tout l'état vit en mémoire de l'unique pod, reconstruit depuis Postgres
// au démarrage. Une boucle d'une seconde ouvre les cases, et diffuse classement, compteurs et présence
// au plus une fois par seconde, quel que soit le nombre de réponses reçues entre-temps.
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { answers, days, db, users } from '$lib/server/db';
import { rankBoard, type BoardEntry, type Ranked } from './game';
import { sendToAll } from './push';
import { getSettings } from './settings';

export type View = 'calendar' | 'question' | 'waiting' | 'board';
type Client = { userId: string; view: View; send: (chunk: string) => boolean };

/** Nombre d'entrées du classement envoyées selon la page (0 = seulement « moi »). */
const TOP: Record<View, number> = { calendar: 5, board: 50, question: 0, waiting: 0 };
const HEARTBEAT_MS = 25_000; // sous le timeout de la Route OpenShift (SPECS §5.3)
const OPEN_BROADCAST_WINDOW_MS = 5 * 60_000; // au démarrage, une case ouverte il y a plus longtemps ne « s'ouvre » plus
// ponytail: rappel push fixe à 5 min avant l'ouverture ; à passer dans les réglages admin si on veut le faire varier.
const REMINDER_LEAD_MS = 5 * 60_000;

type Schedule = { date: string; opensAt: number; questionId: number | null; notified: boolean; reminded: boolean }[];

const state = {
	clients: new Set<Client>(),
	board: new Map<string, BoardEntry>(),
	answered: new Map<number, number>(), // questionId → nombre de réponses
	latestQuestion: null as number | null, // dernière case ouverte qui a une quête
	ranked: [] as Ranked[],
	schedule: [] as Schedule,
	dirtyBoard: true,
	dirtyAnswered: false,
	lastPresence: '',
	lastBeat: Date.now()
};

// ---------- Chargement ----------

let ready: Promise<void> | null = null;

/** Charge l'état depuis la base et démarre la boucle, une seule fois (jamais à l'import : le build importe ce module). */
export function ensureLive(): Promise<void> {
	ready ??= (async () => {
		await loadSchedule();
		await loadBoard();
		startTicker();
	})().catch((e) => {
		ready = null;
		throw e;
	});
	return ready;
}

async function loadSchedule() {
	const rows = await db
		.select({ date: days.date, opensAt: days.opensAt, questionId: days.questionId, notifiedAt: days.notifiedAt, remindedAt: days.remindedAt })
		.from(days)
		.where(eq(days.excluded, false))
		.orderBy(asc(days.date));
	state.schedule = rows.map((r) => ({
		date: r.date,
		opensAt: r.opensAt.getTime(),
		questionId: r.questionId,
		notified: r.notifiedAt !== null,
		reminded: r.remindedAt !== null
	}));
	const now = Date.now();
	state.latestQuestion = state.schedule.filter((d) => d.opensAt <= now && d.questionId).at(-1)?.questionId ?? null;
}

async function loadBoard() {
	const latest = state.latestQuestion ?? -1;
	const rows = await db
		.select({
			userId: users.id,
			name: users.displayName,
			points: sql<number>`sum(${answers.points})::int`,
			ok: sql<number>`count(*) filter (where ${answers.isCorrect})::int`,
			answered: sql<number>`count(*)::int`,
			elapsed: sql<number>`sum(${answers.elapsedMs})::float8`,
			latestPoints: sql<number>`coalesce(sum(${answers.points}) filter (where ${answers.questionId} = ${latest}), 0)::int`,
			latestAnswered: sql<boolean>`bool_or(${answers.questionId} = ${latest})`
		})
		.from(answers)
		.innerJoin(users, eq(users.id, answers.userId))
		.groupBy(users.id);
	state.board = new Map(rows.map((r) => [r.userId, { ...r, elapsed: Number(r.elapsed) }]));
	const counts = await db
		.select({ q: answers.questionId, n: sql<number>`count(*)::int` })
		.from(answers)
		.groupBy(answers.questionId);
	state.answered = new Map(counts.map((c) => [c.q, c.n]));
	state.dirtyBoard = true;
}

/** Recharge tout depuis la base (après une remise à zéro des réponses ou un import). */
export async function reloadLive() {
	if (!ready) return;
	await loadSchedule();
	await loadBoard();
	state.dirtyAnswered = true;
}

/** À appeler quand l'admin modifie le calendrier (heures, exclusions, quêtes rattachées). */
export function refreshSchedule() {
	if (ready) loadSchedule().catch((e) => console.error('live_schedule_failed', e));
}

// ---------- Lecture (pages SSR) ----------

function ranking(): Ranked[] {
	if (state.dirtyBoard) {
		state.ranked = rankBoard([...state.board.values()]);
		state.dirtyBoard = false;
	}
	return state.ranked;
}

export async function getRanking(): Promise<Ranked[]> {
	await ensureLive();
	return ranking();
}

export async function getAnswered(questionId: number): Promise<number> {
	await ensureLive();
	return state.answered.get(questionId) ?? 0;
}

export function presence() {
	const online = new Set<string>();
	const waiting = new Set<string>();
	for (const c of state.clients) {
		online.add(c.userId);
		if (c.view === 'waiting') waiting.add(c.userId);
	}
	return { online: online.size, waiting: waiting.size };
}

// ---------- Écriture ----------

/** Appelé après l'insertion d'une réponse en base (jamais avant : la base reste la source de vérité). */
export function onAnswer(a: { userId: string; name: string; questionId: number; points: number; correct: boolean; elapsedMs: number }) {
	const e = state.board.get(a.userId) ?? { userId: a.userId, name: a.name, points: 0, ok: 0, answered: 0, elapsed: 0, latestPoints: 0, latestAnswered: false };
	e.name = a.name;
	e.points += a.points;
	e.ok += a.correct ? 1 : 0;
	e.answered += 1;
	e.elapsed += a.elapsedMs;
	if (a.questionId === state.latestQuestion) {
		e.latestPoints += a.points;
		e.latestAnswered = true;
	}
	state.board.set(a.userId, e);
	state.answered.set(a.questionId, (state.answered.get(a.questionId) ?? 0) + 1);
	state.dirtyBoard = true;
	state.dirtyAnswered = true;
}

// ---------- Connexions SSE ----------

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

function leaderboardFor(c: Client, ranked: Ranked[], tops: Map<number, string>) {
	const me = ranked.find((r) => r.userId === c.userId);
	const mine = JSON.stringify(me ? { rank: me.rank, points: me.points, ok: me.ok, answered: me.answered } : null);
	// Le top est sérialisé une fois par taille, pas une fois par client.
	return `event: leaderboard\ndata: {"top":${tops.get(TOP[c.view]) ?? '[]'},"me":${mine},"ranked":${ranked.length}}\n\n`;
}

function topsFor(ranked: Ranked[]) {
	const tops = new Map<number, string>();
	for (const n of new Set(Object.values(TOP)))
		tops.set(n, JSON.stringify(ranked.slice(0, n).map((r) => ({ userId: r.userId, rank: r.rank, name: r.name, points: r.points, ok: r.ok, answered: r.answered, delta: r.delta }))));
	return tops;
}

function todayAnswered() {
	const q = state.latestQuestion;
	return q === null ? null : { questionId: q, count: state.answered.get(q) ?? 0 };
}

export async function connect(userId: string, view: View, send: Client['send']): Promise<() => void> {
	await ensureLive();
	const client: Client = { userId, view, send };
	state.clients.add(client);
	const ranked = ranking();
	send(`retry: 3000\n\n`);
	send(sse('presence', presence()));
	send(sse('answered', todayAnswered()));
	send(leaderboardFor(client, ranked, topsFor(ranked)));
	return () => state.clients.delete(client);
}

function broadcast(build: (c: Client) => string | null) {
	for (const c of state.clients) {
		const chunk = build(c);
		// send() renvoie false pour un client qui ne lit plus (onglet gelé, réseau coupé) : on le lâche,
		// il se reconnectera tout seul s'il revient.
		if (chunk && !c.send(chunk)) state.clients.delete(c);
	}
}

// ---------- Boucle ----------

/**
 * Rappel push 5 min avant l'ouverture, qui mène à la salle d'attente : on arrive en avance pour le
 * bonus de rapidité. Uniquement avant l'heure (un pod redémarré après l'ouverture ne prévient pas en
 * retard), une seule fois par case grâce à reminded_at en base.
 */
async function remindDueDays(now: number) {
	for (const d of state.schedule) {
		if (d.reminded || !d.questionId || d.opensAt - REMINDER_LEAD_MS > now) continue;
		d.reminded = true;
		const claimed = await db
			.update(days)
			.set({ remindedAt: new Date(now) })
			.where(and(eq(days.date, d.date), isNull(days.remindedAt)))
			.returning({ date: days.date });
		if (claimed.length === 0 || now >= d.opensAt) continue;
		const minutes = Math.max(1, Math.round((d.opensAt - now) / 60_000));
		getSettings()
			.then((s) =>
				sendToAll({
					title: s.eventName,
					body: `La case du jour s'ouvre dans ${minutes} min ! Rejoins la salle d'attente pour décrocher le bonus.`,
					url: '/attente',
					tag: 'jq-reminder'
				})
			)
			.then((r) => r.sent + r.failed > 0 && console.log('push_reminder', d.date, r))
			.catch((e) => console.error('push_reminder_failed', e));
	}
}

async function openDueDays(now: number) {
	for (const d of state.schedule) {
		if (d.notified || d.opensAt > now) continue;
		d.notified = true;
		// notified_at en base : un redémarrage ne rejoue jamais une ouverture.
		const claimed = await db
			.update(days)
			.set({ notifiedAt: new Date(now) })
			.where(and(eq(days.date, d.date), isNull(days.notifiedAt)))
			.returning({ date: days.date });
		if (claimed.length === 0 || now - d.opensAt > OPEN_BROADCAST_WINDOW_MS) continue;
		if (d.questionId && d.questionId !== state.latestQuestion) {
			// Nouvelle quête : le « classement d'avant » (flèches d'évolution) se fige ici.
			state.latestQuestion = d.questionId;
			for (const e of state.board.values()) {
				e.latestPoints = 0;
				e.latestAnswered = false;
			}
			state.dirtyBoard = true;
		}
		state.dirtyAnswered = true;
		broadcast(() => sse('opening', { date: d.date })); // pas « open » : c'est déjà l'événement natif d'EventSource
	}
}

async function tick() {
	const now = Date.now();
	await remindDueDays(now);
	await openDueDays(now);

	if (state.dirtyBoard) {
		const ranked = ranking();
		const tops = topsFor(ranked);
		broadcast((c) => leaderboardFor(c, ranked, tops));
	}
	if (state.dirtyAnswered) {
		state.dirtyAnswered = false;
		const msg = sse('answered', todayAnswered());
		broadcast(() => msg);
	}
	const p = presence();
	const key = `${p.online}/${p.waiting}`;
	if (key !== state.lastPresence) {
		state.lastPresence = key;
		const msg = sse('presence', p);
		broadcast(() => msg);
	}
	if (now - state.lastBeat >= HEARTBEAT_MS) {
		state.lastBeat = now;
		broadcast(() => `: ping\n\n`);
	}
}

function startTicker() {
	// En dev, le rechargement à chaud réimporte ce module : on arrête la boucle de l'ancienne version.
	const g = globalThis as { __jqTicker?: ReturnType<typeof setInterval> };
	if (g.__jqTicker) clearInterval(g.__jqTicker);
	let running = false;
	g.__jqTicker = setInterval(() => {
		if (running) return; // une boucle lente (base lente) ne s'empile pas sur la suivante
		running = true;
		tick()
			.catch((e) => console.error('live_tick_failed', e))
			.finally(() => (running = false));
	}, 1000);
}
