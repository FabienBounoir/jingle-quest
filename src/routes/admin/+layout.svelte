<script lang="ts">
	import { page } from '$app/state';
	let { children } = $props();
	const nav = [
		{ href: '/admin', label: 'Calendrier' },
		{ href: '/admin/questions', label: 'Questions' },
		{ href: '/admin/listes', label: 'Listes de réponses' },
		{ href: '/admin/reglages', label: 'Réglages' }
	];
	const current = (href: string) =>
		href === '/admin' ? page.url.pathname === '/admin' : page.url.pathname.startsWith(href);
</script>

<div class="wrap">
	<header class="row">
		<span class="title-on-bg brand">L'atelier du Père Noël</span>
		<span class="sticker tilt">ADMIN</span>
		<a class="btn secondary small" href="/" style="margin-left: auto">Voir le site joueur →</a>
	</header>

	<div class="layout">
		<nav aria-label="Administration" class="card side">
			{#each nav as n (n.href)}
				<a href={n.href} aria-current={current(n.href) ? 'page' : undefined}>{n.label}</a>
			{/each}
		</nav>
		<main>{@render children()}</main>
	</div>
</div>

<style>
	.wrap { max-width: 1320px; margin: 0 auto; padding: 20px 20px 56px; display: flex; flex-direction: column; gap: 22px; }
	.brand { font-family: var(--font-title); font-size: clamp(24px, 5vw, 30px); }
	.tilt { transform: rotate(-4deg); background: var(--gold); color: var(--ink); }
	.layout { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
	.side { flex: 1 1 200px; max-width: 260px; padding: 10px; display: flex; flex-direction: column; gap: 4px; border-radius: 22px; }
	.side a { padding: 10px 14px; border: 3px solid transparent; border-radius: 12px; font-family: var(--font-title); font-weight: 500; text-decoration: none; }
	.side a[aria-current='page'] { background: var(--gold); border-color: var(--ink); font-weight: 600; }
	main { flex: 999 1 600px; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
	/* Téléphone : le menu passe en ligne au-dessus du contenu. */
	@media (max-width: 700px) {
		.side { max-width: none; flex-direction: row; flex-wrap: wrap; }
	}
</style>
