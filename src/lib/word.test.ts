import { describe, expect, it } from 'vitest';
import { normalizeWord, wordMarks } from './word';

describe('wordMarks', () => {
	it('suit la règle Wordle, lettres en double comprises', () => {
		expect(wordMarks('ATLAS', 'ATLAS')).toEqual([2, 2, 2, 2, 2]);
		expect(wordMarks('LASSO', 'ATLAS')).toEqual([1, 1, 1, 0, 0]); // un seul S dans ATLAS
		expect(wordMarks('SALSA', 'ATLAS')).toEqual([1, 1, 2, 0, 1]);
		expect(wordMarks('AAAAA', 'ATLAS')).toEqual([2, 0, 0, 2, 0]);
	});
	it('normalise la saisie', () => expect(normalizeWord('é-té 2')).toBe('ETE'));
});
