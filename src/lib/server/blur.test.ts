import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { BLUR_STAGES, blurStage, pixelated } from './blur';

describe('blurStage', () => {
	it('part de l’étape la plus floue et devient nette au bout de la durée', () => {
		expect(blurStage(-1000, 60)).toBe(0); // aperçu admin avant l'ouverture
		expect(blurStage(0, 60)).toBe(0);
		expect(blurStage(11 * 60_000, 60)).toBe(0);
		expect(blurStage(12 * 60_000, 60)).toBe(1);
		expect(blurStage(59 * 60_000, 60)).toBe(BLUR_STAGES - 2);
		expect(blurStage(60 * 60_000, 60)).toBe(BLUR_STAGES - 1);
		expect(blurStage(10 * 3600_000, 60)).toBe(BLUR_STAGES - 1);
	});
});

describe('pixelated', () => {
	it('produit une mosaïque de la taille de l’original, avec peu de couleurs distinctes', async () => {
		const noise = Buffer.from(Array.from({ length: 200 * 100 * 3 }, (_, i) => (i * 7919) % 256));
		const original = await sharp(noise, { raw: { width: 200, height: 100, channels: 3 } }).png().toBuffer();
		const out = await pixelated(999, 0, original);
		const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
		expect([info.width, info.height]).toEqual([200, 100]);
		const colors = new Set<string>();
		for (let i = 0; i < data.length; i += info.channels) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
		expect(colors.size).toBeLessThanOrEqual(8 * 4); // blocs de 25 px : 8 × 4 cases au plus
	});
});
