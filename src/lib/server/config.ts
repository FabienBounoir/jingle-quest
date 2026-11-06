import { env } from '$env/dynamic/private';

// Rien de propre à une entreprise ici : tout vient de l'env (ConfigMap/Secret OpenShift, .env en local).
// Ce qui se règle en cours d'événement (dates, barème, marque) vit en base (table settings), pas ici.

const list = (raw: string | undefined) =>
	(raw ?? '')
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);

export const config = {
	publicBaseUrl: (env.ORIGIN ?? 'http://localhost:5173').replace(/\/$/, ''),
	oidcIssuerUrl: (env.OIDC_ISSUER_URL ?? '').replace(/\/$/, ''),
	oidcClientId: env.OIDC_CLIENT_ID ?? '',
	oidcClientSecret: env.OIDC_CLIENT_SECRET ?? '',
	/** Vide = tous les comptes que l'IdP authentifie (le tenant fait déjà le filtre). */
	allowedEmailDomains: list(env.ALLOWED_EMAIL_DOMAINS),
	adminEmails: new Set(list(env.ADMIN_EMAILS)),
	vapidPublic: env.VAPID_PUBLIC ?? '',
	vapidPrivate: env.VAPID_PRIVATE ?? '',
	vapidSubject: env.VAPID_SUBJECT ?? 'mailto:admin@example.com'
};

export const isAdmin = (email: string) => config.adminEmails.has(email.toLowerCase());

export function emailAllowed(email: string): boolean {
	if (config.allowedEmailDomains.length === 0) return true;
	const domain = email.toLowerCase().split('@')[1] ?? '';
	return config.allowedEmailDomains.includes(domain);
}
