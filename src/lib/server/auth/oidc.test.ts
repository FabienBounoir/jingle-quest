import { describe, it, expect } from 'vitest';
import { formatName, identityFromIdToken } from './oidc';

const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`;
const expected = { issuer: 'https://idp.example/v2.0', clientId: 'client-1', nonce: 'n1' };
const now = 1_800_000_000_000;
const valid = { iss: expected.issuer, aud: 'client-1', nonce: 'n1', exp: now / 1000 + 60, email: 'Jane.Doe@Example.com', name: 'Jane Doe' };
const id = (claims: object) => identityFromIdToken(jwt(claims), expected, now);

describe('identityFromIdToken', () => {
	it("renvoie l'email en minuscules et le nom pour un token valide", () => {
		expect(id(valid)).toEqual({ email: 'jane.doe@example.com', name: 'Jane Doe' });
		expect(id({ ...valid, aud: ['other', 'client-1'] })?.email).toBe('jane.doe@example.com');
	});

	it('se replie sur preferred_username pour l’email et sur given/family puis la partie locale pour le nom', () => {
		expect(id({ ...valid, email: undefined, preferred_username: 'x@example.com' })?.email).toBe('x@example.com');
		expect(id({ ...valid, name: undefined, given_name: 'Jane', family_name: 'Doe' })?.name).toBe('Jane Doe');
		expect(id({ ...valid, name: '  ' })?.name).toBe('jane.doe');
	});

	it('rejette mauvais émetteur, audience, nonce, token expiré, email absent ou token illisible', () => {
		expect(id({ ...valid, iss: 'https://evil.example' })).toBeNull();
		expect(id({ ...valid, aud: 'other' })).toBeNull();
		expect(id({ ...valid, nonce: 'replay' })).toBeNull();
		expect(id({ ...valid, exp: now / 1000 - 1 })).toBeNull();
		expect(id({ ...valid, email: undefined })).toBeNull();
		expect(identityFromIdToken('pas-un-jwt', expected, now)).toBeNull();
	});
});

describe('formatName', () => {
	it('remet « NOM Prénom » dans l’ordre et en casse normale', () => {
		expect(formatName('BOUNOIR Fabien')).toBe('Fabien Bounoir');
		expect(formatName('DE LA FONTAINE Jean-Pierre')).toBe('Jean-Pierre De La Fontaine');
		expect(formatName("O'NEIL Siobhán")).toBe("Siobhán O'Neil");
		expect(formatName('LEFÈVRE Inès')).toBe('Inès Lefèvre');
	});
	it('laisse les noms déjà corrects, et ne touche pas aux initiales', () => {
		expect(formatName('Jane Doe')).toBe('Jane Doe');
		expect(formatName('Jean DUPONT')).toBe('Jean Dupont');
		expect(formatName('Marie J. Curie')).toBe('Marie J. Curie');
		expect(formatName('JEAN DUPONT')).toBe('Jean Dupont'); // tout en majuscules : ordre gardé
		expect(formatName('  ')).toBe('');
	});
	it('préfère given_name + family_name quand l’IdP les envoie', () => {
		expect(id({ ...valid, name: 'DOE Jane', given_name: 'Jane', family_name: 'DOE' })?.name).toBe('Jane Doe');
		expect(id({ ...valid, name: 'BOUNOIR Fabien' })?.name).toBe('Fabien Bounoir');
	});
});
