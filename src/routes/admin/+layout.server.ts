import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Toutes les pages /admin : 403 dans la page d'erreur du site. (Les actions et les routes +server sont
// bloquées plus tôt, dans hooks.server.ts, car elles ne passent pas par ce load.)
export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.isAdmin) error(403, 'Réservé aux admins');
};
