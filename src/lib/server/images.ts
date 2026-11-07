// Nettoyage des images envoyées par l'admin, avant stockage. Les joueurs sont des développeurs : une
// photo de téléphone porte souvent un titre, un auteur, une date ou des coordonnées GPS dans ses
// métadonnées (« Julien au marathon de Paris »…), lisibles en deux clics. On réencode donc chaque image :
// sharp n'écrit aucune métadonnée par défaut (EXIF, XMP, IPTC, miniature intégrée).
import sharp from 'sharp';
import { sniffImage } from './upload';

const MAX_SIDE = 2000; // plus grand qu'un écran : inutile, et ça allège la base

export async function sanitizeImage(buf: Buffer): Promise<{ data: Buffer; mime: string } | null> {
	const mime = sniffImage(buf);
	if (!mime) return null;
	const animated = mime === 'image/gif' || mime === 'image/webp';
	// rotate() sans argument : applique l'orientation EXIF avant qu'elle ne disparaisse avec les métadonnées.
	let img = sharp(buf, { animated, failOn: 'error' }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
	if (mime === 'image/jpeg') img = img.jpeg({ quality: 88, mozjpeg: true });
	else if (mime === 'image/png') img = img.png();
	else if (mime === 'image/webp') img = img.webp({ quality: 88 });
	else img = img.gif();
	return { data: await img.toBuffer(), mime };
}
