// Les types de question hors « list » (autocomplétion, gérée par listes + question_answers).
// Pur (pas de base) : testé dans questionTypes.test.ts. Pour chaque type :
//   - config   : ce que voit le joueur
//   - solution : la réponse, jamais envoyée au client avant la fin de l'événement
//   - parseAdmin : formulaire admin → { config, solution }
//   - score : réponse du joueur → part des points (0 à 1)
import { randomInt } from 'node:crypto';
import { fold } from '$lib/text';
import type { QuestionType } from './db/schema';

export class BadAnswer extends Error {}

export type ChoiceConfig = { options: string[] };
export type ChoiceSolution = { correct: number };
export type NumberConfig = { unit: string };
export type NumberSolution = { value: number };
/** `items` est déjà mélangé : l'ordre affiché ne trahit pas la solution. */
export type OrderConfig = { items: string[] };
/** Indices de `items`, dans le bon ordre. */
export type OrderSolution = { order: number[] };
/** Rectangle en fractions de l'image (0 à 1), donc indépendant de la taille d'affichage. */
export type ZoneSolution = { x: number; y: number; w: number; h: number };

export const TYPE_LABELS: Record<QuestionType, string> = {
	list: 'Liste (autocomplétion)',
	choice: 'QCM',
	number: 'Estimation',
	order: "Remettre dans l'ordre",
	zone: "Zone sur l'image"
};

// ---------- Admin : formulaire → config + solution ----------

const texts = (fd: FormData, name: string) =>
	fd
		.getAll(name)
		.map((v) => String(v).trim().replace(/\s+/g, ' '))
		.filter(Boolean);

function num(raw: FormDataEntryValue | null): number {
	const t = String(raw ?? '').trim().replace(',', '.').replace(/\s/g, '');
	if (t === '') return NaN; // Number('') vaut 0 : un champ vide n'est pas « zéro »
	const n = Number(t);
	return Number.isFinite(n) ? n : NaN;
}

/** Mélange au hasard (crypto) en évitant l'ordre d'origine, sinon la solution serait l'ordre affiché. */
export function shuffledOrder(n: number): number[] {
	for (;;) {
		const idx = [...Array(n).keys()];
		for (let i = n - 1; i > 0; i--) {
			const j = randomInt(i + 1);
			[idx[i], idx[j]] = [idx[j], idx[i]];
		}
		if (n < 2 || idx.some((v, i) => v !== i)) return idx;
	}
}

export function parseAdmin(type: Exclude<QuestionType, 'list'>, fd: FormData): { config: object; solution: object } {
	if (type === 'choice') {
		const options = texts(fd, 'option');
		if (options.length < 2 || options.length > 6) throw new BadAnswer('QCM : entre 2 et 6 propositions.');
		if (options.some((o) => o.length > 120)) throw new BadAnswer('QCM : 120 caractères maximum par proposition.');
		if (new Set(options.map(fold)).size !== options.length) throw new BadAnswer('QCM : deux propositions identiques.');
		const raw = fd.get('correct');
		// Number(null) vaut 0 : sans ce test, « rien de coché » deviendrait « la 1re proposition ».
		const correct = raw === null || raw === '' ? NaN : Number(raw);
		if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) throw new BadAnswer('QCM : coche la bonne proposition.');
		return { config: { options } satisfies ChoiceConfig, solution: { correct } satisfies ChoiceSolution };
	}
	if (type === 'number') {
		const value = num(fd.get('value'));
		if (Number.isNaN(value) || Math.abs(value) > 1e12) throw new BadAnswer('Estimation : la bonne valeur doit être un nombre.');
		const unit = String(fd.get('unit') ?? '').trim().slice(0, 20);
		return { config: { unit } satisfies NumberConfig, solution: { value } satisfies NumberSolution };
	}
	if (type === 'order') {
		const inOrder = texts(fd, 'item'); // saisis par l'admin dans le BON ordre
		if (inOrder.length < 3 || inOrder.length > 5) throw new BadAnswer('Ordre : entre 3 et 5 éléments.');
		if (inOrder.some((o) => o.length > 120)) throw new BadAnswer('Ordre : 120 caractères maximum par élément.');
		if (new Set(inOrder.map(fold)).size !== inOrder.length) throw new BadAnswer('Ordre : deux éléments identiques.');
		const shown = shuffledOrder(inOrder.length); // shown[k] = indice d'origine de l'élément affiché en k
		const items = shown.map((i) => inOrder[i]);
		const order = inOrder.map((_, rank) => shown.indexOf(rank));
		return { config: { items } satisfies OrderConfig, solution: { order } satisfies OrderSolution };
	}
	// zone
	const [x, y, w, h] = ['zx', 'zy', 'zw', 'zh'].map((k) => num(fd.get(k)));
	const ok = [x, y, w, h].every((v) => v >= 0 && v <= 1) && w >= 0.01 && h >= 0.01 && x + w <= 1.0001 && y + h <= 1.0001;
	if (!ok) throw new BadAnswer('Zone : dessine le rectangle sur l’image.');
	return { config: {}, solution: { x, y, w, h } satisfies ZoneSolution };
}

/** Garde l'ordre des éléments déjà mélangés si l'admin n'a rien changé (évite de remélanger à chaque enregistrement). */
export function sameOrderQuestion(prev: { config: unknown; solution: unknown }, next: { config: unknown; solution: unknown }) {
	const p = prev as { config: OrderConfig; solution: OrderSolution };
	const n = next as { config: OrderConfig; solution: OrderSolution };
	if (!p.config?.items || !p.solution?.order) return false;
	const asText = (q: typeof p) => q.solution.order.map((i) => q.config.items[i]).join('\u0000');
	return asText(p) === asText(n);
}

// ---------- Joueur : réponse → score ----------

/** Paliers de l'estimation : écart relatif max → part des points. */
export const NUMBER_TIERS: [number, number][] = [
	[0.01, 1],
	[0.1, 0.7],
	[0.25, 0.4]
];

export function numberScore(answer: number, target: number): number {
	if (target === 0) return answer === 0 ? 1 : 0;
	const rel = Math.abs(answer - target) / Math.abs(target);
	return NUMBER_TIERS.find(([max]) => rel <= max)?.[1] ?? 0;
}

/**
 * Lit la réponse du joueur dans le formulaire et la note. Lève BadAnswer si elle est mal formée
 * (on ne compte jamais une réponse illisible comme une mauvaise réponse : le joueur peut corriger).
 */
export function scoreAnswer(type: Exclude<QuestionType, 'list'>, config: unknown, solution: unknown, fd: FormData): { score: number; value: unknown } {
	if (type === 'choice') {
		const c = config as ChoiceConfig;
		const rawChoice = fd.get('choice');
		const choice = rawChoice === null || rawChoice === '' ? NaN : Number(rawChoice);
		if (!Number.isInteger(choice) || choice < 0 || choice >= c.options.length) throw new BadAnswer('Choisis une proposition.');
		return { score: choice === (solution as ChoiceSolution).correct ? 1 : 0, value: { choice } };
	}
	if (type === 'number') {
		const value = num(fd.get('value'));
		if (Number.isNaN(value) || Math.abs(value) > 1e12) throw new BadAnswer('Tape un nombre.');
		return { score: numberScore(value, (solution as NumberSolution).value), value: { value } };
	}
	if (type === 'order') {
		const n = (config as OrderConfig).items.length;
		const order = String(fd.get('order') ?? '')
			.split(',')
			.map(Number);
		if (order.length !== n || new Set(order).size !== n || order.some((i) => !Number.isInteger(i) || i < 0 || i >= n))
			throw new BadAnswer('Classe tous les éléments.');
		const good = (solution as OrderSolution).order.filter((v, i) => order[i] === v).length;
		return { score: good / n, value: { order } };
	}
	const [x, y] = [num(fd.get('x')), num(fd.get('y'))];
	if (![x, y].every((v) => v >= 0 && v <= 1)) throw new BadAnswer('Clique sur l’image.');
	const z = solution as ZoneSolution;
	const inside = x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;
	return { score: inside ? 1 : 0, value: { x, y } };
}

// ---------- Affichage ----------

const fmtNumber = (n: number, unit: string) => `${n.toLocaleString('fr-FR')}${unit ? ` ${unit}` : ''}`;

/** La réponse d'un joueur, en texte (zone : null, elle se dessine sur l'image). */
export function answerText(type: Exclude<QuestionType, 'list'>, config: unknown, value: unknown): string | null {
	const v = value as { choice?: number; value?: number; order?: number[] };
	if (type === 'choice') return (config as ChoiceConfig).options[v.choice ?? -1] ?? '?';
	if (type === 'number') return fmtNumber(v.value ?? 0, (config as NumberConfig).unit);
	if (type === 'order') return (v.order ?? []).map((i) => (config as OrderConfig).items[i]).join(' → ');
	return null;
}

/** La solution, en texte, pour la révélation de fin (zone : null, elle se dessine sur l'image). */
export function solutionText(type: Exclude<QuestionType, 'list'>, config: unknown, solution: unknown): string | null {
	if (type === 'choice') return (config as ChoiceConfig).options[(solution as ChoiceSolution).correct];
	if (type === 'number') return fmtNumber((solution as NumberSolution).value, (config as NumberConfig).unit);
	if (type === 'order') return (solution as OrderSolution).order.map((i) => (config as OrderConfig).items[i]).join(' → ');
	return null;
}
