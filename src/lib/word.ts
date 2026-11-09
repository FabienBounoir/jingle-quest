// Partagé client/serveur : mot mystère (façon Wordle). Le serveur seul connaît le mot et calcule les
// indices ; le client ne fait que normaliser la saisie et colorier le clavier.

export const WORD_TRIES = 6;
/** Part des points d'une bonne réponse selon l'essai qui trouve le mot (1er, 2e…). */
export const WORD_POINTS = [1, 0.9, 0.8, 0.65, 0.5, 0.35] as const;
export const WORD_MIN = 3;
export const WORD_MAX = 12;

/** Majuscules sans accents ; tout ce qui n'est pas une lettre est retiré (espaces, tirets…). */
export const normalizeWord = (s: string) =>
	s
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toUpperCase()
		.replace(/[^A-Z]/g, '');

/**
 * Indices d'un essai, une lettre par case : 2 = bien placée, 1 = présente ailleurs, 0 = absente.
 * Les lettres en double ne sont comptées qu'autant de fois qu'elles sont dans le mot (règle Wordle).
 */
export function wordMarks(guess: string, word: string): number[] {
	const marks = Array<number>(guess.length).fill(0);
	const left = new Map<string, number>();
	for (let i = 0; i < word.length; i++) {
		if (guess[i] === word[i]) marks[i] = 2;
		else left.set(word[i], (left.get(word[i]) ?? 0) + 1);
	}
	for (let i = 0; i < guess.length; i++) {
		const n = left.get(guess[i]) ?? 0;
		if (marks[i] === 0 && n > 0) {
			marks[i] = 1;
			left.set(guess[i], n - 1);
		}
	}
	return marks;
}
