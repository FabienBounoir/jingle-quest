import { describe, expect, it } from 'vitest';
import { BadAnswer, answerText, numberScore, parseAdmin, sameOrderQuestion, scoreAnswer, shuffledOrder, solutionText, type OrderConfig, type OrderSolution } from './questionTypes';

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
		expect(sameOrderQuestion(parseAdmin('order', form(items)), parseAdmin('order', form(items)))).toBe(true);
		expect(sameOrderQuestion(parseAdmin('order', form(items)), parseAdmin('order', form([...items].reverse())))).toBe(false);
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
