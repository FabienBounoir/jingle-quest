// Valeurs d'une liste de réponses à partir d'un CSV ou d'un texte collé, et validation d'images.

export const MAX_LABEL = 120;

/**
 * Une valeur par ligne. On garde la première colonne d'un CSV (`,` ou `;`), sans guillemets,
 * sans doublons (insensible à la casse) ni lignes vides.
 */
export function parseValues(text: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of text.replace(/^﻿/, '').split(/\r?\n/)) {
		let v = raw.trim();
		if (v.startsWith('"')) {
			const close = v.indexOf('"', 1);
			v = close > 0 ? v.slice(1, close) : v.slice(1);
		} else {
			v = v.split(/[;,\t]/)[0];
		}
		v = v.trim().replace(/\s+/g, ' ').slice(0, MAX_LABEL);
		const key = v.toLocaleLowerCase('fr');
		if (!v || seen.has(key)) continue;
		seen.add(key);
		out.push(v);
	}
	return out;
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Type réel d'une image d'après ses premiers octets (on ne croit pas le type annoncé par le navigateur). */
export function sniffImage(buf: Buffer): string | null {
	if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
	if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
	if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
	if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString('ascii', 0, 6))) return 'image/gif';
	// Pas de SVG : il peut embarquer du script.
	return null;
}
