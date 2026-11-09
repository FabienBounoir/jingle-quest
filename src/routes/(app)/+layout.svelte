<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { connectLive, live, type View } from '$lib/live.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import SoundToggle from '$lib/components/SoundToggle.svelte';
	import { ordinal } from '$lib/text';
	let { data, children } = $props();

	const view = $derived<View>(
		page.url.pathname.startsWith('/attente') ? 'waiting'
		: page.url.pathname.startsWith('/jour/') ? 'question'
		: page.url.pathname.startsWith('/classement') ? 'board'
		: 'calendar'
	);
	// Une connexion par onglet, rouverte quand on change de page (la présence et le top en dépendent).
	$effect(() => connectLive(view));

	// Ouverture d'une case poussée par le serveur : la salle d'attente file sur la quête, les autres pages se rechargent.
	let seenSeq = 0;
	$effect(() => {
		const { seq, date } = live.opened;
		if (seq === seenSeq) return;
		seenSeq = seq;
		// Salle d'attente : on laisse voir « C'est parti ! » (cf. attente/+page.svelte) ; elle bascule d'elle-même.
		if (page.url.pathname.startsWith('/attente')) setTimeout(() => goto(`/jour/${date}`, { invalidateAll: true }), 800);
		else invalidateAll();
	});
	// Calendrier modifié par l'admin (heure décalée…) : salle d'attente et calendrier se remettent à jour.
	let seenSchedule = 0;
	$effect(() => {
		if (live.scheduleSeq === seenSchedule) return;
		seenSchedule = live.scheduleSeq;
		invalidateAll();
	});
	let dismissed = $state(0);
	const me = $derived(live.me !== undefined ? (live.me ?? { points: 0, rank: null }) : data.me);
	const path = $derived(page.url.pathname);
	const tabs = [
		{ href: '/', label: 'Calendrier', icon: 'gift' },
		{ href: '/classement', label: 'Classement', icon: 'podium' },
		{ href: '/mes-reponses', label: 'Réponses', icon: 'list' },
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
		<a href="/mes-reponses" class="btn small {isCurrent('/mes-reponses') ? '' : 'secondary'}" aria-current={isCurrent('/mes-reponses') ? 'page' : undefined}>Mes réponses</a>
		{#if data.isAdmin}<a href="/admin" class="btn small secondary">Admin</a>{/if}
	</nav>
	<div class="right">
	<SoundToggle />
	<div class="me">
		<Avatar class="avatar" userId={data.user!.id} name={data.user!.displayName} />
		<span class="who">
			<strong>{data.user?.displayName}</strong>
			<span>{me.points} pts{me.rank ? ` · ${me.rank}${ordinal(me.rank)}` : ''}</span>
		</span>
	</div>
	</div>
</header>

{#if live.announce && live.announce.id !== dismissed}
	<div class="announce" role="status" aria-live="polite">
		<span class="megaphone" aria-hidden="true">📣</span>
		<p>{live.announce.text}</p>
		<button type="button" class="close" aria-label="Fermer l'annonce" onclick={() => (dismissed = live.announce!.id)}>✕</button>
	</div>
{/if}

<div class="page">{@render children()}</div>

<!-- Pas de barre d'onglets sur la quête : elle a son bouton retour, et la barre fixe recouvrirait le champ
     de réponse quand le clavier du téléphone est ouvert. -->
<nav aria-label="Navigation principale" class="tabbar" class:hidden={path.startsWith('/jour/')}>
	{#each tabs as t (t.href)}
		<a href={t.href} aria-current={isCurrent(t.href) ? 'page' : undefined}>
			<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
				{#if t.icon === 'gift'}<rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 13h18M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1" />
				{:else if t.icon === 'podium'}<path d="M8 21V11H3v10zM15 21V5H9v16zM21 21v-7h-5v7z" />
				{:else if t.icon === 'list'}<path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
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
	.right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
	.me { display: flex; align-items: center; gap: 10px; padding: 5px 14px 5px 5px; border: 3px solid var(--ink); border-radius: 999px; background: var(--paper); box-shadow: 0 4px 0 var(--ink); }
	.me :global(.avatar) { width: 40px; height: 40px; border-radius: 50%; border: 3px solid var(--ink); background: var(--green-dark); color: var(--white); font: 600 15px var(--font-title); display: flex; align-items: center; justify-content: center; }
	.who { display: flex; flex-direction: column; line-height: 1.15; font-size: 13px; }
	.who strong { font-family: var(--font-title); font-weight: 600; font-size: 15px; }
	.page { max-width: 1240px; margin: 0 auto; padding: 24px 24px 64px; }
	.tabbar { display: none; }
	.announce {
		max-width: 1192px; margin: 18px auto 0; padding: 12px 14px 12px 18px; display: flex; align-items: center; gap: 12px;
		border: 3.5px solid var(--ink); border-radius: 18px; background: var(--gold); box-shadow: 5px 5px 0 var(--ink);
		transform: rotate(-0.6deg); animation: drop 0.35s ease-out;
	}
	.announce p { margin: 0; flex: 1; font: 600 17px/1.3 var(--font-title); white-space: pre-line; }
	.megaphone { font-size: 24px; }
	.close { flex: none; width: 36px; height: 36px; border: 3px solid var(--ink); border-radius: 50%; background: var(--paper); font: 700 15px var(--font-title); cursor: pointer; }
	@keyframes drop { from { transform: translateY(-14px) rotate(-0.6deg); opacity: 0; } }

	@media (max-width: 700px) {
		.top { padding: 14px 14px 0; }
		.logo { width: 42px; height: 42px; }
		.desk-nav, .who { display: none; }
		.me { padding: 0; border-radius: 50%; }
		.page { padding: 18px 14px 120px; }
		.announce { margin: 14px 14px 0; }
		.tabbar {
			position: fixed; left: 12px; right: 12px; bottom: max(12px, env(safe-area-inset-bottom));
			z-index: 10; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 6px;
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
