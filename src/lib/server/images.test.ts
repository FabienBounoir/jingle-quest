import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { sanitizeImage } from './images';

describe('sanitizeImage', () => {
	it('retire les métadonnées EXIF (titre, auteur, GPS…) d’une photo', async () => {
		const photo = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#c62f3b' } })
			.jpeg()
			.withExif({ IFD0: { ImageDescription: 'Julien au marathon de Paris', Artist: 'Inès' } })
			.toBuffer();
		expect((await sharp(photo).metadata()).exif).toBeDefined();
		const clean = await sanitizeImage(photo);
		expect(clean?.mime).toBe('image/jpeg');
		const meta = await sharp(clean!.data).metadata();
		expect(meta.exif).toBeUndefined();
		expect(clean!.data.includes(Buffer.from('marathon'))).toBe(false);
	});
	it('refuse ce qui n’est pas une image', async () => {
		expect(await sanitizeImage(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
	});
});
