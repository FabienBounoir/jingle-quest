import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db, users } from '$lib/server/db';

/** Réencode en 96px webp : taille fixe, et plus aucune métadonnée (EXIF, GPS…) ni contenu piégé. */
export const normalizeAvatar = (img: Buffer) =>
	sharp(img, { limitInputPixels: 4096 * 4096 }).resize(96, 96, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();

/**
 * Relit la photo Entra du joueur qui vient de se connecter, côté serveur, avec son access token (jeté
 * ensuite). Pas de photo → on efface l'ancienne. Erreur réseau/Graph → on garde l'ancienne, et le login
 * passe quand même.
 */
export async function refreshAvatar(userId: string, accessToken: string): Promise<void> {
	try {
		const res = await fetch('https://graph.microsoft.com/v1.0/me/photos/96x96/$value', {
			headers: { Authorization: `Bearer ${accessToken}` },
			signal: AbortSignal.timeout(3000)
		});
		if (res.status !== 404 && !res.ok) throw new Error(`Graph photo HTTP ${res.status}`);
		const avatar = res.ok ? await normalizeAvatar(Buffer.from(await res.arrayBuffer())) : null;
		await db.update(users).set({ avatar }).where(eq(users.id, userId));
	} catch (e) {
		console.warn('avatar_refresh_failed', e instanceof Error ? e.message : e);
	}
}
