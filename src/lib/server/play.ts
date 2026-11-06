// Accès base côté joueur : calendrier, question, soumission, classement. Règles pures dans game.ts.
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { answerLists, answers, days, db, listItems, questionAnswers, questions, users } from '$lib/server/db';
import { eventEnd, isSameDay, points } from './game';
import { BadAnswer, answerText, scoreAnswer, solutionText, type ZoneSolution } from './questionTypes';
import type { QuestionType } from './db/schema';
import { getAnswered, getRanking, onAnswer } from './live';
import { getSettings } from './settings';

// ---------- Question (même contenu pour tous : cache process) ----------

/** Ce que reçoit le navigateur : jamais la solution (elle reste dans `secret`, côté serveur). */
export type QuestionPayload = {
	id: number;
	type: QuestionType;
	text: string;
	hasImage: boolean;
	/** Type « list » : nom de la liste et ses valeurs (autocomplétion). */
	listName: string | null;
	items: { id: number; label: string }[];
	/** Autres types : propositions du QCM, éléments mélangés, unité… */
	config: unknown;
};
type CachedQuestion = QuestionPayload & { secret: unknown };

// ponytail: cache sans TTL, vidé par l'admin à chaque enregistrement (un seul pod, SPECS §7.6).
// À 9h, 2 000 chargements de la même question = 1 lecture en base.
const questionCache = new Map<number, Promise<CachedQuestion>>();

export function invalidateQuestions() {
	questionCache.clear();
}

function loadQuestion(id: number): Promise<CachedQuestion> {
	let p = questionCache.get(id);
	if (!p) {
		p = (async () => {
			const [q] = await db
				.select({
					id: questions.id,
					type: questions.type,
					text: questions.text,
					mime: questions.imageMime,
					listId: questions.listId,
					listName: answerLists.name,
					config: questions.config,
					solution: questions.solution
				})
				.from(questions)
				.leftJoin(answerLists, eq(answerLists.id, questions.listId))
				.where(eq(questions.id, id));
			if (!q) throw new Error(`question ${id} introuvable`);
			const items =
				q.type === 'list' && q.listId
					? await db.select({ id: listItems.id, label: listItems.label }).from(listItems).where(eq(listItems.listId, q.listId)).orderBy(asc(listItems.label))
					: [];
			return { id: q.id, type: q.type, text: q.text, hasImage: q.mime !== null, listName: q.listName, items, config: q.config, secret: q.solution };
		})();
		p.catch(() => questionCache.delete(id));
		questionCache.set(id, p);
	}
	return p;
}

/** La question telle qu'on peut l'envoyer au navigateur (sans la solution). */
export async function getQuestion(id: number): Promise<QuestionPayload> {
	const { secret: _secret, ...pub } = await loadQuestion(id);
	return pub;
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
		.select({ questionId: answers.questionId, itemId: answers.itemId, value: answers.value, score: answers.score, isCorrect: answers.isCorrect, points: answers.points })
		.from(answers)
		.where(eq(answers.userId, userId));
}

/** Nombre de réponses à une question (compteur en mémoire, cf. live.ts). */
export const answeredCount = getAnswered;

/** La réponse d'un joueur, en texte (zone : null, elle se dessine sur l'image). */
export function myAnswerText(q: QuestionPayload, a: { itemId: number | null; value: unknown }): string | null {
	if (q.type === 'list') return q.items.find((i) => i.id === a.itemId)?.label ?? '?';
	return answerText(q.type, q.config, a.value);
}

/**
 * La solution, à n'appeler qu'une fois l'événement terminé : texte, et rectangle pour une zone.
 */
export async function reveal(questionId: number): Promise<{ text: string | null; zone: ZoneSolution | null }> {
	const q = await loadQuestion(questionId);
	if (q.type === 'zone') return { text: null, zone: q.secret as ZoneSolution };
	if (q.type !== 'list') return { text: solutionText(q.type, q.config, q.secret), zone: null };
	const rows = await db
		.select({ label: listItems.label })
		.from(questionAnswers)
		.innerJoin(listItems, eq(listItems.id, questionAnswers.itemId))
		.where(eq(questionAnswers.questionId, questionId))
		.orderBy(asc(listItems.label));
	return { text: rows.map((r) => r.label).join(' · '), zone: null };
}

// ---------- Soumission ----------

export type AnswerResult =
	| { ok: true; score: number; points: number; dryRun: boolean }
	| { ok: false; status: 400 | 403 | 404 | 409; error: string };

/**
 * Enregistre la réponse d'un joueur (SPECS §7.3), lue dans le formulaire selon le type de question.
 * `dryRun` (aperçu admin) : valide et calcule sans écrire. L'heure qui compte est celle du serveur.
 */
export async function submitAnswer(
	user: { id: string; displayName: string },
	date: string,
	fd: FormData,
	opts: { dryRun: boolean }
): Promise<AnswerResult> {
	const s = await getSettings();
	const now = new Date();
	const day = await getDay(date);
	if (!day?.questionId) return { ok: false, status: 404, error: 'Pas de quête ce jour-là.' };
	if (!opts.dryRun && day.opensAt > now) return { ok: false, status: 403, error: 'Cette case n’est pas encore ouverte.' };
	if (!opts.dryRun && now >= eventEnd(s.endDate, s.timezone)) return { ok: false, status: 403, error: 'L’événement est terminé.' };

	const q = await loadQuestion(day.questionId);
	let score: number;
	let itemId: number | null = null;
	let value: unknown = null;
	if (q.type === 'list') {
		itemId = Number(fd.get('itemId'));
		if (!q.items.some((i) => i.id === itemId)) return { ok: false, status: 400, error: 'Choisis une réponse dans la liste.' };
		const [{ n }] = await db
			.select({ n: count() })
			.from(questionAnswers)
			.where(and(eq(questionAnswers.questionId, q.id), eq(questionAnswers.itemId, itemId)));
		score = n > 0 ? 1 : 0;
	} else {
		try {
			({ score, value } = scoreAnswer(q.type, q.config, q.secret, fd));
		} catch (e) {
			if (e instanceof BadAnswer) return { ok: false, status: 400, error: e.message };
			throw e;
		}
	}
	// Aperçu d'une case pas encore ouverte : on simule une réponse à la seconde d'ouverture.
	const early = day.opensAt > now;
	const elapsedMs = early ? 0 : now.getTime() - day.opensAt.getTime();
	const pts = points(score, early || isSameDay(day.date, now, s.timezone), elapsedMs, s);
	if (opts.dryRun) return { ok: true, score, points: pts, dryRun: true };

	// La clé primaire (user, question) EST la règle « une seule tentative » : pas de course possible.
	const correct = score >= 1;
	const inserted = await db
		.insert(answers)
		.values({ userId: user.id, questionId: q.id, itemId, value, score, isCorrect: correct, points: pts, elapsedMs })
		.onConflictDoNothing()
		.returning({ points: answers.points });
	if (inserted.length === 0) return { ok: false, status: 409, error: 'Tu as déjà répondu à cette quête.' };
	onAnswer({ userId: user.id, name: user.displayName, questionId: q.id, points: pts, correct, elapsedMs });
	return { ok: true, score, points: pts, dryRun: false };
}

// ---------- Classement ----------

/** Classement général, tenu en mémoire et poussé en SSE (live.ts). */
export const getStandings = getRanking;

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
