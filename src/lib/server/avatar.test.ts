import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { normalizeAvatar } from './avatar';

describe('normalizeAvatar', () => {
	it('réencode en webp 96x96 sans métadonnées', async () => {
		const jpeg = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#c00' } })
			.jpeg()
			.withMetadata({ exif: { IFD0: { Artist: 'fuite' } } })
			.toBuffer();
		const out = await normalizeAvatar(jpeg);
		const m = await sharp(out).metadata();
		expect([m.format, m.width, m.height]).toEqual(['webp', 96, 96]);
		expect(m.exif).toBeUndefined();
		expect(out.includes('fuite')).toBe(false);
	});

	it('refuse ce qui n’est pas une image', async () => {
		await expect(normalizeAvatar(Buffer.from('<svg onload=alert(1)>'))).rejects.toThrow();
	});
});
