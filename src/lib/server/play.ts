// Accès base côté joueur : calendrier, question, soumission, classement. Règles pures dans game.ts.
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { answerLists, answers, days, db, listItems, questionAnswers, questions, reveals, users } from '$lib/server/db';
import { BLUR_MULTIPLIERS, LAST_STAGE } from '$lib/blur';
import { cellState, endOf, isSameDay, points, recap, type CellState } from './game';
import { inArray } from 'drizzle-orm';
import { BadAnswer, answerText, scoreAnswer, solutionText, type PinSolution, type Point, type TypedQuestion, type WordSolution, type ZoneSolution } from './questionTypes';
import { LIST_TYPES, STAGED_TYPES, type QuestionType } from './db/schema';
import { WORD_TRIES, normalizeWord, wordMarks } from '$lib/word';
import { getAnswered, getRanking, onAnswer } from './live';
import { getSettings } from './settings';

// ---------- Question (même contenu pour tous : cache process) ----------

/** Ce que reçoit le navigateur : jamais la solution (elle reste dans `secret`, côté serveur). */
export type QuestionPayload = {
	id: number;
	type: QuestionType;
	text: string;
	hasImage: boolean;
	/** Types « list » et « blur » : nom de la liste et ses valeurs (autocomplétion). `id` est le jeton
	 * aléatoire de la valeur, jamais son id en base (qui suit l'ordre de création, cf. schema.ts). */
	listName: string | null;
	items: { id: string; label: string }[];
	/** Autres types : propositions du QCM, éléments mélangés, unité… */
	config: unknown;
};
type CachedQuestion = QuestionPayload & { secret: unknown; itemIdByToken: Map<string, number> };

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
			const rows =
				LIST_TYPES.includes(q.type) && q.listId
					? await db
							.select({ id: listItems.id, token: listItems.token, label: listItems.label })
							.from(listItems)
							.where(eq(listItems.listId, q.listId))
							.orderBy(asc(listItems.label))
					: [];
			return {
				id: q.id,
				type: q.type,
				text: q.text,
				hasImage: q.mime !== null,
				listName: q.listName,
				items: rows.map((r) => ({ id: r.token, label: r.label })),
				config: q.config,
				secret: q.solution,
				itemIdByToken: new Map(rows.map((r) => [r.token, r.id]))
			};
		})();
		p.catch(() => questionCache.delete(id));
		questionCache.set(id, p);
	}
	return p;
}

/** La question telle qu'on peut l'envoyer au navigateur (sans la solution). */
export async function getQuestion(id: number): Promise<QuestionPayload> {
	const { secret: _secret, itemIdByToken: _ids, ...pub } = await loadQuestion(id);
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
		.select({
			questionId: answers.questionId,
			itemId: answers.itemId,
			value: answers.value,
			score: answers.score,
			isCorrect: answers.isCorrect,
			points: answers.points,
			elapsedMs: answers.elapsedMs,
			answeredAt: answers.answeredAt
		})
		.from(answers)
		.where(eq(answers.userId, userId));
}

/** Nombre de réponses à une question (compteur en mémoire, cf. live.ts). */
export const answeredCount = getAnswered;

/** La réponse d'un joueur, en texte (zone : null, elle se dessine sur l'image). */
export async function myAnswerText(q: QuestionPayload, a: { itemId: number | null; value: unknown }): Promise<string | null> {
	if (LIST_TYPES.includes(q.type)) {
		if (a.itemId === null) return '?';
		const [it] = await db.select({ label: listItems.label }).from(listItems).where(eq(listItems.id, a.itemId));
		return it?.label ?? '?';
	}
	return answerText(q.type as TypedQuestion, q.config, a.value);
}

/**
 * La solution, à n'appeler qu'une fois l'événement terminé : texte, rectangle d'une zone ou cible.
 */
export async function reveal(questionId: number): Promise<{ text: string | null; zone: ZoneSolution | null; pin: Point | null }> {
	const q = await loadQuestion(questionId);
	if (q.type === 'zone') return { text: null, zone: q.secret as ZoneSolution, pin: null };
	if (q.type === 'pin') {
		const { x, y } = q.secret as PinSolution;
		return { text: null, zone: null, pin: { x, y } };
	}
	if (!LIST_TYPES.includes(q.type)) return { text: solutionText(q.type as TypedQuestion, q.config, q.secret), zone: null, pin: null };
	const rows = await db
		.select({ label: listItems.label })
		.from(questionAnswers)
		.innerJoin(listItems, eq(listItems.id, questionAnswers.itemId))
		.where(eq(questionAnswers.questionId, questionId))
		.orderBy(asc(listItems.label));
	return { text: rows.map((r) => r.label).join(' · '), zone: null, pin: null };
}

// ---------- Historique et bilan ----------

export type HistoryRow = {
	date: string;
	number: number;
	type: QuestionType;
	text: string;
	state: CellState;
	answer: string | null; // texte de la réponse du joueur (null : pas répondu, ou zone)
	points: number;
	solution: string | null; // seulement une fois l'événement terminé
};

/**
 * Toutes les cases déjà ouvertes avec une quête, et ce que le joueur y a fait. Les solutions ne sont
 * jointes qu'après la fin de l'événement (même règle que la page de la quête).
 */
export async function history(userId: string) {
	const s = await getSettings();
	const now = new Date();
	const end = endOf(s);
	const ended = now >= end;
	const all = await getDays();
	const opened = all.filter((d) => d.questionId && d.opensAt <= now);
	const mine = await userAnswers(userId);
	const byQuestion = new Map(mine.map((a) => [a.questionId, a]));
	// Libellés des réponses « liste » en une requête (pas une par case).
	const itemIds = mine.map((a) => a.itemId).filter((x): x is number => x !== null);
	const labels = new Map(
		itemIds.length ? (await db.select({ id: listItems.id, label: listItems.label }).from(listItems).where(inArray(listItems.id, itemIds))).map((r) => [r.id, r.label]) : []
	);

	const rows: HistoryRow[] = [];
	const recapAnswers = [];
	for (const d of opened) {
		const q = await getQuestion(d.questionId!);
		const a = byQuestion.get(q.id) ?? null;
		const answer = !a ? null : LIST_TYPES.includes(q.type) ? (labels.get(a.itemId ?? -1) ?? '?') : answerText(q.type as TypedQuestion, q.config, a.value);
		rows.push({
			date: d.date,
			number: all.findIndex((x) => x.date === d.date) + 1,
			type: q.type,
			text: q.text,
			state: cellState({ date: d.date, opensAt: d.opensAt, hasQuestion: true }, a, now, end, s.timezone),
			answer,
			points: a?.points ?? 0,
			solution: ended ? (await reveal(q.id)).text : null
		});
		if (a) recapAnswers.push({ date: d.date, points: a.points, isCorrect: a.isCorrect, elapsedMs: a.elapsedMs, sameDay: isSameDay(d.date, a.answeredAt, s.timezone) });
	}
	return { rows, ended, recap: recap(opened.map((d) => d.date), recapAnswers) };
}

// ---------- Photo qui se dévoile, zoom mystère ----------

/** Niveau de dévoilement atteint par ce joueur sur cette question (0 = le plus caché). */
export async function revealStage(userId: string, questionId: number): Promise<number> {
	const [r] = await db
		.select({ stage: reveals.stage })
		.from(reveals)
		.where(and(eq(reveals.userId, userId), eq(reveals.questionId, questionId)));
	return r?.stage ?? 0;
}

export type UnblurResult = { ok: true; stage: number } | { ok: false; status: 400 | 403 | 404 | 409; error: string };

/**
 * Défloute d'un niveau (définitif : les points max baissent). Refusé une fois la réponse envoyée, avant
 * l'ouverture ou après la fin. Un seul UPDATE atomique : deux clics simultanés comptent bien pour deux.
 */
export async function unblur(userId: string, date: string): Promise<UnblurResult> {
	const s = await getSettings();
	const now = new Date();
	const day = await getDay(date);
	if (!day?.questionId) return { ok: false, status: 404, error: 'Pas de quête ce jour-là.' };
	if (day.opensAt > now || now >= endOf(s)) return { ok: false, status: 403, error: 'Cette case n’est pas jouable.' };
	const q = await loadQuestion(day.questionId);
	if (!STAGED_TYPES.includes(q.type)) return { ok: false, status: 400, error: 'Pas de photo à dévoiler ici.' };
	const [done] = await db
		.select({ n: count() })
		.from(answers)
		.where(and(eq(answers.userId, userId), eq(answers.questionId, q.id)));
	if (done.n > 0) return { ok: false, status: 409, error: 'Tu as déjà répondu.' };
	const [r] = await db
		.insert(reveals)
		.values({ userId, questionId: q.id, stage: 1 })
		.onConflictDoUpdate({ target: [reveals.userId, reveals.questionId], set: { stage: sql`least(${reveals.stage} + 1, ${LAST_STAGE})` } })
		.returning({ stage: reveals.stage });
	return { ok: true, stage: r.stage };
}

// ---------- Mot mystère ----------

export type WordGuess = { guess: string; marks: number[] };

const withMarks = (guesses: string[], word: string): WordGuess[] => guesses.map((guess) => ({ guess, marks: wordMarks(guess, word) }));

/** Essais déjà joués par ce joueur, avec leurs indices. */
export async function wordGuesses(userId: string, questionId: number): Promise<WordGuess[]> {
	const q = await loadQuestion(questionId);
	return withMarks(await storedGuesses(userId, questionId), (q.secret as WordSolution).word);
}

export type GuessResult = { ok: true; guesses: WordGuess[]; answer: AnswerResult | null } | { ok: false; status: 400 | 403 | 404 | 409; error: string };

/**
 * Un essai au mot mystère. Enregistré (atomiquement, 6 au plus) puis, si le mot est trouvé ou les essais
 * épuisés, la réponse est enregistrée comme les autres types. Aperçu admin (`dryRun`) : rien n'est écrit,
 * les essais précédents viennent du formulaire.
 */
export async function guessWord(user: { id: string; displayName: string }, date: string, fd: FormData, opts: { dryRun: boolean }): Promise<GuessResult> {
	const s = await getSettings();
	const now = new Date();
	const day = await getDay(date);
	if (!day?.questionId) return { ok: false, status: 404, error: 'Pas de quête ce jour-là.' };
	if ((!opts.dryRun && day.opensAt > now) || now >= endOf(s)) return { ok: false, status: 403, error: 'Cette case n’est pas jouable.' };
	const q = await loadQuestion(day.questionId);
	if (q.type !== 'word') return { ok: false, status: 400, error: 'Pas de mot mystère ici.' };
	const word = (q.secret as WordSolution).word;
	const guess = normalizeWord(String(fd.get('guess') ?? ''));
	if (guess.length !== word.length) return { ok: false, status: 400, error: `Le mot fait ${word.length} lettres.` };

	let guesses: string[];
	if (opts.dryRun) {
		guesses = [...fd.getAll('previous').map((g) => normalizeWord(String(g))), guess].slice(0, WORD_TRIES);
	} else {
		const [done] = await db
			.select({ n: count() })
			.from(answers)
			.where(and(eq(answers.userId, user.id), eq(answers.questionId, q.id)));
		if (done.n > 0) return { ok: false, status: 409, error: 'Tu as déjà répondu.' };
		// Un seul UPDATE conditionnel : deux essais simultanés ne dépassent jamais la limite.
		const [r] = await db
			.insert(reveals)
			.values({ userId: user.id, questionId: q.id, stage: 0, guesses: [guess] })
			.onConflictDoUpdate({
				target: [reveals.userId, reveals.questionId],
				set: { guesses: sql`${reveals.guesses} || ${JSON.stringify([guess])}::jsonb` },
				setWhere: sql`jsonb_array_length(${reveals.guesses}) < ${WORD_TRIES} and not ${reveals.guesses} ? ${word}`
			})
			.returning({ guesses: reveals.guesses });
		if (!r) return { ok: false, status: 409, error: 'Plus d’essai possible.' };
		guesses = r.guesses;
	}
	const finished = guesses.includes(word) || guesses.length >= WORD_TRIES;
	const answer = finished ? await submitAnswer(user, date, wordForm(guesses), opts) : null;
	return { ok: true, guesses: withMarks(guesses, word), answer };
}

function wordForm(guesses: string[]) {
	const fd = new FormData();
	for (const g of guesses) fd.append('guess', g);
	return fd;
}

// ---------- Soumission ----------

export type AnswerResult =
	| { ok: true; score: number; correct: boolean; points: number; dryRun: boolean }
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
	if (!opts.dryRun && now >= endOf(s)) return { ok: false, status: 403, error: 'L’événement est terminé.' };

	const q = await loadQuestion(day.questionId);
	let score: number;
	let correct: boolean;
	let itemId: number | null = null;
	let value: unknown = null;
	if (LIST_TYPES.includes(q.type)) {
		itemId = q.itemIdByToken.get(String(fd.get('itemId') ?? '')) ?? null;
		if (itemId === null) return { ok: false, status: 400, error: 'Choisis une réponse dans la liste.' };
		const [{ n }] = await db
			.select({ n: count() })
			.from(questionAnswers)
			.where(and(eq(questionAnswers.questionId, q.id), eq(questionAnswers.itemId, itemId)));
		correct = n > 0;
		score = correct ? 1 : 0;
		if (STAGED_TYPES.includes(q.type)) {
			// Photo défloutée ou dézoomée : une bonne réponse rapporte moins. Niveau lu en base (jamais celui du client),
			// sauf en aperçu admin où rien n'est enregistré et où la page envoie le niveau affiché.
			const stage = opts.dryRun ? Math.min(LAST_STAGE, Math.max(0, Number(fd.get('stage')) || 0)) : await revealStage(user.id, q.id);
			score = correct ? BLUR_MULTIPLIERS[stage] : 0;
			value = { stage };
		}
	} else {
		try {
			// Mot mystère : les essais sont lus en base, jamais dans le formulaire (sauf aperçu admin).
			const form = q.type === 'word' && !opts.dryRun ? wordForm(await storedGuesses(user.id, q.id)) : fd;
			const r = scoreAnswer(q.type as TypedQuestion, q.config, q.secret, form);
			({ score, value } = r);
			correct = r.correct ?? score >= 1;
		} catch (e) {
			if (e instanceof BadAnswer) return { ok: false, status: 400, error: e.message };
			throw e;
		}
	}
	// Aperçu d'une case pas encore ouverte : on simule une réponse à la seconde d'ouverture.
	const early = day.opensAt > now;
	const elapsedMs = early ? 0 : now.getTime() - day.opensAt.getTime();
	const pts = points(score, early || isSameDay(day.date, now, s.timezone), elapsedMs, s);
	if (opts.dryRun) return { ok: true, score, correct, points: pts, dryRun: true };

	// La clé primaire (user, question) EST la règle « une seule tentative » : pas de course possible.
	const inserted = await db
		.insert(answers)
		.values({ userId: user.id, questionId: q.id, itemId, value, score, isCorrect: correct, points: pts, elapsedMs })
		.onConflictDoNothing()
		.returning({ points: answers.points });
	if (inserted.length === 0) return { ok: false, status: 409, error: 'Tu as déjà répondu à cette quête.' };
	onAnswer({ userId: user.id, name: user.displayName, questionId: q.id, points: pts, correct, elapsedMs });
	return { ok: true, score, correct, points: pts, dryRun: false };
}

async function storedGuesses(userId: string, questionId: number): Promise<string[]> {
	const [r] = await db
		.select({ guesses: reveals.guesses })
		.from(reveals)
		.where(and(eq(reveals.userId, userId), eq(reveals.questionId, questionId)));
	return r?.guesses ?? [];
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
