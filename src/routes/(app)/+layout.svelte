<script lang="ts">
	import { page } from '$app/state';
	let { data, children } = $props();
	const initials = $derived(
		(data.user?.displayName ?? '?')
			.split(/\s+/)
			.map((w) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
	const path = $derived(page.url.pathname);
	const tabs = [
		{ href: '/', label: 'Calendrier', icon: 'gift' },
		{ href: '/classement', label: 'Classement', icon: 'podium' },
		{ href: '/attente', label: 'Prochaine', icon: 'clock' }
	];
	const isCurrent = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
</script>

<header class="top">
	<a href="/" class="brand">
		{#if data.brand.hasLogo}
			<img src="/img/logo" alt="" class="logo" />
		{:else}
			<span class="logo gift-logo" aria-hidden="true"></span>
		{/if}
		<span class="title-on-bg name">{data.brand.eventName}</span>
	</a>
	<nav aria-label="Navigation principale" class="desk-nav">
		<a href="/" class="btn small {isCurrent('/') ? '' : 'secondary'}" aria-current={isCurrent('/') ? 'page' : undefined}>Calendrier</a>
		<a href="/classement" class="btn small {isCurrent('/classement') ? '' : 'secondary'}" aria-current={isCurrent('/classement') ? 'page' : undefined}>Classement</a>
		{#if data.isAdmin}<a href="/admin" class="btn small secondary">Admin</a>{/if}
	</nav>
	<div class="me">
		<span class="avatar" aria-hidden="true">{initials}</span>
		<span class="who">
			<strong>{data.user?.displayName}</strong>
			<span>{data.me.points} pts{data.me.rank ? ` · ${data.me.rank}e` : ''}</span>
		</span>
	</div>
</header>

<div class="page">{@render children()}</div>

<!-- Pas de barre d'onglets sur la quête : elle a son bouton retour, et la barre fixe recouvrirait le champ
     de réponse quand le clavier du téléphone est ouvert. -->
<nav aria-label="Navigation principale" class="tabbar" class:hidden={path.startsWith('/jour/')}>
	{#each tabs as t (t.href)}
		<a href={t.href} aria-current={isCurrent(t.href) ? 'page' : undefined}>
			<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
				{#if t.icon === 'gift'}<rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 13h18M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1" />
				{:else if t.icon === 'podium'}<path d="M8 21V11H3v10zM15 21V5H9v16zM21 21v-7h-5v7z" />
				{:else}<circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" />{/if}
			</svg>
			{t.label}
		</a>
	{/each}
</nav>

<style>
	.top { max-width: 1240px; margin: 0 auto; padding: 18px 24px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 22px; }
	.brand { display: flex; align-items: center; gap: 12px; text-decoration: none; min-width: 0; }
	.logo { width: 52px; height: 52px; flex: none; transform: rotate(-6deg); border: 3.5px solid var(--ink); border-radius: 14px; background: var(--paper); box-shadow: 4px 4px 0 var(--ink); object-fit: contain; }
	.gift-logo { background: var(--paper) url('/favicon.svg') center / 34px no-repeat; }
	.name { font-family: var(--font-title); font-weight: 700; font-size: clamp(20px, 4.5vw, 30px); line-height: 1.05; }
	.desk-nav { display: flex; gap: 10px; flex-wrap: wrap; }
	.desk-nav .btn { border-radius: 999px; }
	.me { margin-left: auto; display: flex; align-items: center; gap: 10px; padding: 5px 14px 5px 5px; border: 3px solid var(--ink); border-radius: 999px; background: var(--paper); box-shadow: 0 4px 0 var(--ink); }
	.avatar { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--ink); background: var(--green-dark); color: var(--white); font: 600 15px var(--font-title); display: flex; align-items: center; justify-content: center; }
	.who { display: flex; flex-direction: column; line-height: 1.15; font-size: 13px; }
	.who strong { font-family: var(--font-title); font-weight: 600; font-size: 15px; }
	.page { max-width: 1240px; margin: 0 auto; padding: 24px 24px 64px; }
	.tabbar { display: none; }

	@media (max-width: 700px) {
		.top { padding: 14px 14px 0; }
		.logo { width: 42px; height: 42px; }
		.desk-nav, .who { display: none; }
		.me { padding: 0; border-radius: 50%; }
		.page { padding: 18px 14px 120px; }
		.tabbar {
			position: fixed; left: 12px; right: 12px; bottom: max(12px, env(safe-area-inset-bottom));
			z-index: 10; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; padding: 6px;
			border: 3.5px solid var(--ink); border-radius: 22px; background: var(--paper); box-shadow: 0 5px 0 var(--ink);
		}
		.tabbar a {
			min-height: 56px; border: 3px solid transparent; border-radius: 16px; text-decoration: none;
			display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
			font: 600 13px var(--font-title);
		}
		.tabbar a[aria-current='page'] { background: var(--gold); border-color: var(--ink); }
		.tabbar.hidden { display: none; }
	}
</style>
