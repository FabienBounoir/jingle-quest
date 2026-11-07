import { describe, expect, it } from 'vitest';
import { BadAnswer, answerText, numberScore, parseAdmin, sameShuffledQuestion, scoreAnswer, shuffledOrder, solutionText, type MatchConfig, type MatchSolution, type OrderConfig, type OrderSolution } from './questionTypes';

const form = (entries: [string, string][]) => {
	const fd = new FormData();
	for (const [k, v] of entries) fd.append(k, v);
	return fd;
};

describe('QCM', () => {
	it('valide les propositions et note juste ou faux', () => {
		const q = parseAdmin('choice', form([['option', 'Lyon'], ['option', ' Paris '], ['option', ''], ['option', 'Nantes'], ['correct', '1']]));
		expect(q.config).toEqual({ options: ['Lyon', 'Paris', 'Nantes'] });
		expect(scoreAnswer('choice', q.config, q.solution, form([['choice', '1']])).score).toBe(1);
		expect(scoreAnswer('choice', q.config, q.solution, form([['choice', '0']])).score).toBe(0);
		expect(() => scoreAnswer('choice', q.config, q.solution, form([['choice', '7']]))).toThrow(BadAnswer);
		expect(solutionText('choice', q.config, q.solution)).toBe('Paris');
	});
	it('refuse un QCM incohérent', () => {
		expect(() => parseAdmin('choice', form([['option', 'Seul'], ['correct', '0']]))).toThrow(/entre 2 et 6/);
		expect(() => parseAdmin('choice', form([['option', 'Lyon'], ['option', 'lyon'], ['correct', '0']]))).toThrow(/identiques/);
		expect(() => parseAdmin('choice', form([['option', 'A'], ['option', 'B']]))).toThrow(/coche/);
	});
});

describe('Estimation', () => {
	it('donne des points selon la proximité', () => {
		expect(numberScore(1000, 1000)).toBe(1);
		expect(numberScore(1008, 1000)).toBe(1); // à 1 % près
		expect(numberScore(1090, 1000)).toBe(0.7);
		expect(numberScore(800, 1000)).toBe(0.4);
		expect(numberScore(700, 1000)).toBe(0);
		expect(numberScore(0, 0)).toBe(1);
		expect(numberScore(1, 0)).toBe(0);
	});
	it('accepte la virgule et les espaces des claviers français', () => {
		const q = parseAdmin('number', form([['value', '12 500,5'], ['unit', 'cafés']]));
		expect(q.solution).toEqual({ value: 12500.5 });
		expect(scoreAnswer('number', q.config, q.solution, form([['value', '12500']])).score).toBe(1);
		expect(() => scoreAnswer('number', q.config, q.solution, form([['value', 'beaucoup']]))).toThrow(BadAnswer);
		expect(() => scoreAnswer('number', q.config, q.solution, form([['value', '']]))).toThrow(BadAnswer);
		expect(answerText('number', q.config, { value: 12000 })).toBe('12 000 cafés');
	});
});

describe('Remettre dans l’ordre', () => {
	it('mélange sans jamais garder l’ordre d’origine', () => {
		for (let i = 0; i < 50; i++) expect(shuffledOrder(3)).not.toEqual([0, 1, 2]);
	});
	it('retrouve la solution à partir des éléments mélangés et note les positions justes', () => {
		const q = parseAdmin('order', form([['item', '2015'], ['item', '2018'], ['item', '2021'], ['item', '2024']]));
		const c = q.config as OrderConfig;
		const sol = q.solution as OrderSolution;
		expect(sol.order.map((i) => c.items[i])).toEqual(['2015', '2018', '2021', '2024']);
		const perfect = sol.order.join(',');
		expect(scoreAnswer('order', c, sol, form([['order', perfect]])).score).toBe(1);
		const swapped = [sol.order[1], sol.order[0], sol.order[2], sol.order[3]].join(',');
		expect(scoreAnswer('order', c, sol, form([['order', swapped]])).score).toBe(0.5);
		expect(() => scoreAnswer('order', c, sol, form([['order', '0,0,1,2']]))).toThrow(BadAnswer);
		expect(solutionText('order', c, sol)).toBe('2015 → 2018 → 2021 → 2024');
	});
	it('reconnaît une question inchangée malgré un autre mélange', () => {
		const items = [['item', 'A'], ['item', 'B'], ['item', 'C']] as [string, string][];
		expect(sameShuffledQuestion('order', parseAdmin('order', form(items)), parseAdmin('order', form(items)))).toBe(true);
		expect(sameShuffledQuestion('order', parseAdmin('order', form(items)), parseAdmin('order', form([...items].reverse())))).toBe(false);
	});
});

describe('Zone', () => {
	it('juste dans le rectangle, faux dehors', () => {
		const q = parseAdmin('zone', form([['zx', '0.2'], ['zy', '0.3'], ['zw', '0.1'], ['zh', '0.2']]));
		expect(scoreAnswer('zone', q.config, q.solution, form([['x', '0.25'], ['y', '0.4']])).score).toBe(1);
		expect(scoreAnswer('zone', q.config, q.solution, form([['x', '0.35'], ['y', '0.4']])).score).toBe(0);
		expect(() => scoreAnswer('zone', q.config, q.solution, form([['x', '2'], ['y', '0.4']]))).toThrow(BadAnswer);
		expect(() => scoreAnswer('zone', q.config, q.solution, form([]))).toThrow(BadAnswer);
		expect(() => parseAdmin('zone', form([['zx', '0.9'], ['zy', '0'], ['zw', '0.5'], ['zh', '0.5']]))).toThrow(/rectangle/);
	});
});

describe('Associer', () => {
	const rows: [string, string][] = [['left', 'Julien'], ['right', 'Lyon'], ['left', 'Inès'], ['right', 'Nantes'], ['left', 'Hugo'], ['right', 'Lille'], ['left', ''], ['right', '']];
	it('mélange la colonne de droite et note les paires justes', () => {
		const q = parseAdmin('match', form(rows));
		const c = q.config as MatchConfig;
		const sol = q.solution as MatchSolution;
		expect(c.left).toEqual(['Julien', 'Inès', 'Hugo']);
		expect(c.right).not.toEqual(['Lyon', 'Nantes', 'Lille']);
		expect(sol.pairs.map((j, i) => `${c.left[i]}=${c.right[j]}`)).toEqual(['Julien=Lyon', 'Inès=Nantes', 'Hugo=Lille']);
		const perfect = sol.pairs.map(String).map((v) => ['pair', v] as [string, string]);
		expect(scoreAnswer('match', c, sol, form(perfect)).score).toBe(1);
		const swapped = [sol.pairs[1], sol.pairs[0], sol.pairs[2]].map((v) => ['pair', String(v)] as [string, string]);
		expect(scoreAnswer('match', c, sol, form(swapped)).score).toBeCloseTo(1 / 3);
		expect(() => scoreAnswer('match', c, sol, form([['pair', '0'], ['pair', '0'], ['pair', '1']]))).toThrow(/qu’une fois/);
		expect(() => scoreAnswer('match', c, sol, form([['pair', '0'], ['pair', '']]))).toThrow(BadAnswer);
		expect(solutionText('match', c, sol)).toBe('Julien → Lyon · Inès → Nantes · Hugo → Lille');
		expect(answerText('match', c, { pairs: swapped.map(([, v]) => Number(v)) })).toContain('Julien → Nantes');
	});
	it('refuse une ligne à moitié remplie, trop peu de paires ou des doublons', () => {
		expect(() => parseAdmin('match', form([...rows.slice(0, 6), ['left', 'Nina'], ['right', '']]))).toThrow(/deux éléments/);
		expect(() => parseAdmin('match', form(rows.slice(0, 4)))).toThrow(/entre 3 et 5/);
		expect(() => parseAdmin('match', form([...rows.slice(0, 4), ['left', 'Hugo'], ['right', 'lyon']]))).toThrow(/identiques/);
	});
	it('reconnaît une association inchangée malgré un autre mélange', () => {
		expect(sameShuffledQuestion('match', parseAdmin('match', form(rows)), parseAdmin('match', form(rows)))).toBe(true);
	});
});
