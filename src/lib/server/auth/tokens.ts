import { randomBytes, createHash } from 'node:crypto';

/** Génère un token brut (à transmettre) et son hash (à stocker). */
export function generateToken(bytes = 32): { token: string; hash: string } {
	const token = randomBytes(bytes).toString('base64url');
	return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}
