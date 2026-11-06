/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Uniquement les notifications push : pas de cache hors ligne (inutile ici, et un cache périmé
// servirait une vieille version du jeu le jour J).
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', () => sw.skipWaiting());
sw.addEventListener('activate', (event) => event.waitUntil(sw.clients.claim()));

sw.addEventListener('push', (event) => {
	let data: { title?: string; body?: string; url?: string; tag?: string } = {};
	try {
		if (event.data) data = event.data.json();
	} catch {
		/* payload non JSON : ignoré */
	}
	event.waitUntil(
		sw.registration.showNotification(data.title ?? "Calendrier de l'Avent", {
			body: data.body ?? '',
			icon: '/favicon.svg',
			tag: data.tag, // même tag = remplace la notif précédente au lieu de s'empiler
			data: { url: data.url ?? '/' }
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url: string = event.notification.data?.url ?? '/';
	event.waitUntil(
		(async () => {
			const tabs = (await sw.clients.matchAll({ type: 'window', includeUncontrolled: true })) as WindowClient[];
			const tab = tabs.find((c) => c.visibilityState === 'visible') ?? tabs[0];
			if (tab) {
				await tab.focus();
				await tab.navigate(url);
			} else {
				await sw.clients.openWindow(url);
			}
		})()
	);
});
