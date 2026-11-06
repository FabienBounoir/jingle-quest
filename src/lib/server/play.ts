// Accès base côté joueur : calendrier, question, soumission, classement. Règles pures dans game.ts.
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { answerLists, answers, days, db, listItems, questionAnswers, questions, users } from '$lib/server/db';
import { eventEnd, isSameDay, points } from './game';
import { getSettings } from './settings';

// ---------- Question (même contenu pour tous : cache process) ----------

export type QuestionPayload = {
	id: number;
	text: string;
	hasImage: boolean;
	listName: string;
	items: { id: number; label: string }[];
};

// ponytail: cache sans TTL, vidé par l'admin à chaque enregistrement (un seul pod, SPECS §7.6).
// À 9h, 2 000 chargements de la même question = 1 lecture en base.
const questionCache = new Map<number, Promise<QuestionPayload>>();

export function invalidateQuestions() {
	questionCache.clear();
}

export function getQuestion(id: number): Promise<QuestionPayload> {
	let p = questionCache.get(id);
	if (!p) {
		p = (async () => {
			const [q] = await db
				.select({ id: questions.id, text: questions.text, mime: questions.imageMime, listId: questions.listId, listName: answerLists.name })
				.from(questions)
				.innerJoin(answerLists, eq(answerLists.id, questions.listId))
				.where(eq(questions.id, id));
			if (!q) throw new Error(`question ${id} introuvable`);
			const items = await db
				.select({ id: listItems.id, label: listItems.label })
				.from(listItems)
				.where(eq(listItems.listId, q.listId))
				.orderBy(asc(listItems.label));
			return { id: q.id, text: q.text, hasImage: q.mime !== null, listName: q.listName, items };
		})();
		p.catch(() => questionCache.delete(id));
		questionCache.set(id, p);
	}
	return p;
}

// ---------- Calendrier ----------

export async function getDays() {
	return db
		.select({ date: days.date, opensAt: days.opensAt, questionId: days.questionId })
		.from(days)
		.where(eq(days.excluded, false))
		.orderBy(asc(days.date));
}

export async function getDay(date: string) {
	const [d] = await db
		.select({ date: days.date, opensAt: days.opensAt, questionId: days.questionId, excluded: days.excluded })
		.from(days)
		.where(eq(days.date, date));
	return d && !d.excluded ? d : null;
}

export async function userAnswers(userId: string) {
	return db
		.select({ questionId: answers.questionId, itemId: answers.itemId, isCorrect: answers.isCorrect, points: answers.points })
		.from(answers)
		.where(eq(answers.userId, userId));
}

export async function answeredCount(questionId: number): Promise<number> {
	const [{ n }] = await db.select({ n: count() }).from(answers).where(eq(answers.questionId, questionId));
	return n;
}

export async function correctLabels(questionId: number): Promise<string[]> {
	const rows = await db
		.select({ label: listItems.label })
		.from(questionAnswers)
		.innerJoin(listItems, eq(listItems.id, questionAnswers.itemId))
		.where(eq(questionAnswers.questionId, questionId))
		.orderBy(asc(listItems.label));
	return rows.map((r) => r.label);
}

// ---------- Soumission ----------

export type AnswerResult =
	| { ok: true; correct: boolean; points: number; dryRun: boolean }
	| { ok: false; status: 400 | 403 | 404 | 409; error: string };

/**
 * Enregistre la réponse d'un joueur (SPECS §7.3). `dryRun` (aperçu admin) : valide et calcule sans écrire.
 * L'heure qui compte est celle du serveur, jamais celle du client.
 */
export async function submitAnswer(userId: string, date: string, itemId: number, opts: { dryRun: boolean }): Promise<AnswerResult> {
	const s = await getSettings();
	const now = new Date();
	const day = await getDay(date);
	if (!day?.questionId) return { ok: false, status: 404, error: 'Pas de quête ce jour-là.' };
	if (!opts.dryRun && day.opensAt > now) return { ok: false, status: 403, error: 'Cette case n’est pas encore ouverte.' };
	if (!opts.dryRun && now >= eventEnd(s.endDate, s.timezone)) return { ok: false, status: 403, error: 'L’événement est terminé.' };

	const q = await getQuestion(day.questionId);
	if (!q.items.some((i) => i.id === itemId)) return { ok: false, status: 400, error: 'Choisis une réponse dans la liste.' };

	const [{ n }] = await db
		.select({ n: count() })
		.from(questionAnswers)
		.where(and(eq(questionAnswers.questionId, q.id), eq(questionAnswers.itemId, itemId)));
	const correct = n > 0;
	// Aperçu d'une case pas encore ouverte : on simule une réponse à la seconde d'ouverture.
	const early = day.opensAt > now;
	const elapsedMs = early ? 0 : now.getTime() - day.opensAt.getTime();
	const pts = points(correct, early || isSameDay(day.date, now, s.timezone), elapsedMs, s);
	if (opts.dryRun) return { ok: true, correct, points: pts, dryRun: true };

	// La clé primaire (user, question) EST la règle « une seule tentative » : pas de course possible.
	const inserted = await db
		.insert(answers)
		.values({ userId, questionId: q.id, itemId, isCorrect: correct, points: pts, elapsedMs })
		.onConflictDoNothing()
		.returning({ points: answers.points });
	if (inserted.length === 0) return { ok: false, status: 409, error: 'Tu as déjà répondu à cette quête.' };
	invalidateStandings();
	return { ok: true, correct, points: pts, dryRun: false };
}

// ---------- Classement ----------

export type Standing = { userId: string; name: string; points: number; ok: number; answered: number; rank: number };

// ponytail: classement recalculé en SQL, mis en cache 2 s (au pic de 9h, ~1 calcul/2 s au lieu d'un par
// page). Le lot 4 le remplace par un classement en mémoire poussé en SSE.
let standingsCache: { at: number; rows: Promise<Standing[]> } | null = null;
const invalidateStandings = () => (standingsCache = null);

export function getStandings(): Promise<Standing[]> {
	if (standingsCache && Date.now() - standingsCache.at < 2000) return standingsCache.rows;
	const rows = db
		.select({
			userId: users.id,
			name: users.displayName,
			points: sql<number>`sum(${answers.points})::int`,
			ok: sql<number>`count(*) filter (where ${answers.isCorrect})::int`,
			answered: sql<number>`count(*)::int`,
			elapsed: sql<number>`sum(${answers.elapsedMs})::bigint`
		})
		.from(answers)
		.innerJoin(users, eq(users.id, answers.userId))
		.groupBy(users.id)
		// Égalité de points : le plus rapide en cumulé passe devant (SPECS §3.4).
		.orderBy(sql`sum(${answers.points}) desc`, sql`sum(${answers.elapsedMs}) asc`)
		.then((r) => r.map((x, i) => ({ userId: x.userId, name: x.name, points: x.points, ok: x.ok, answered: x.answered, rank: i + 1 })));
	rows.catch(() => invalidateStandings());
	standingsCache = { at: Date.now(), rows };
	return rows;
}

/** Classement du jour : réponses à une question, par points puis par heure de réponse. */
export async function getDayStandings(questionId: number, limit = 50) {
	const rows = await db
		.select({ userId: users.id, name: users.displayName, points: answers.points, isCorrect: answers.isCorrect })
		.from(answers)
		.innerJoin(users, eq(users.id, answers.userId))
		.where(eq(answers.questionId, questionId))
		.orderBy(sql`${answers.points} desc`, asc(answers.answeredAt))
		.limit(limit);
	return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function playerCount(): Promise<number> {
	const [{ n }] = await db.select({ n: count() }).from(users);
	return n;
}
