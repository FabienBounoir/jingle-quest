import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { BLUR_LEVELS } from '$lib/blur';
import { pixelated } from './blur';

describe('pixelated', () => {
	it('produit une mosaïque de la taille de l’original, avec peu de couleurs distinctes', async () => {
		const noise = Buffer.from(Array.from({ length: 200 * 100 * 3 }, (_, i) => (i * 7919) % 256));
		const original = await sharp(noise, { raw: { width: 200, height: 100, channels: 3 } }).png().toBuffer();
		const out = await pixelated(999, 0, original);
		const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
		expect([info.width, info.height]).toEqual([200, 100]);
		const colors = new Set<string>();
		for (let i = 0; i < data.length; i += info.channels) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
		// Niveau 0 : blocs de BLUR_LEVELS[0].block × largeur ; au plus autant de couleurs que de cases.
		const block = Math.round(200 * BLUR_LEVELS[0].block);
		expect(colors.size).toBeLessThanOrEqual(Math.ceil(200 / block) * Math.ceil(100 / block));
		expect(colors.size).toBeLessThan(200); // et bien moins que l'original (bruit : des milliers de couleurs)
	});
});
