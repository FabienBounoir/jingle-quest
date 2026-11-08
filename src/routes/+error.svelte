<script lang="ts">
	// Page d'erreur dans la DA (404, 403…) : jamais le texte brut de SvelteKit dans un coin.
	import { page } from '$app/state';

	const MESSAGES: Record<number, { title: string; hand: string; text: string }> = {
		404: { title: 'Cadeau introuvable', hand: 'le lutin a cherché partout…', text: 'Cette page n’existe pas, ou ce cadeau n’a pas encore été emballé.' },
		403: { title: 'Atelier réservé', hand: 'pas de lutin non autorisé ici !', text: 'Cette page est réservée aux organisateurs.' },
		401: { title: 'Qui va là ?', hand: 'il faut te reconnecter', text: 'Ta session a expiré : reconnecte-toi pour continuer.' }
	};
	const status = $derived(page.status);
	const m = $derived(MESSAGES[status] ?? { title: 'Le traîneau a calé', hand: 'on répare et on revient…', text: 'Une erreur inattendue est survenue. Réessaie dans un instant.' });
	// Message du serveur seulement s'il a été écrit pour les joueurs (pas de détail technique en 500).
	const detail = $derived(status < 500 && page.error?.message && !['Not Found', 'Forbidden', 'Unauthorized'].includes(page.error.message) ? page.error.message : null);
</script>

<svelte:head><title>{m.title}</title></svelte:head>

<main>
	<div class="gift wob" aria-hidden="true">
		<span class="box"></span><span class="rib-v"></span><span class="rib-h"></span>
		<span class="tag">{status}</span>
	</div>

	<h1 class="title-on-bg">{m.title}</h1>
	<p class="hand tagline">{m.hand}</p>

	<div class="card">
		<p>{detail ?? m.text}</p>
		<div class="row actions">
			{#if status === 401}
				<a class="btn big" href="/login?next={encodeURIComponent(page.url.pathname)}">Se reconnecter</a>
			{:else}
				<a class="btn big" href="/">Retour au calendrier</a>
				{#if status >= 500}<button class="btn secondary" type="button" onclick={() => location.reload()}>Réessayer</button>{/if}
			{/if}
		</div>
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		max-width: 520px;
		margin: 0 auto;
		padding: 48px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		text-align: center;
	}
	h1 { font-size: clamp(34px, 9vw, 52px); }
	.tagline { margin: -4px 0 8px; color: var(--white); font-size: 24px; }
	.card { width: 100%; display: flex; flex-direction: column; gap: 16px; }
	.card p { margin: 0; }
	.actions { justify-content: center; }

	/* Le paquet cadeau du site, ouvert de travers, avec le code d'erreur en étiquette. */
	.gift { position: relative; width: 130px; height: 110px; margin-bottom: 12px; }
	.box { position: absolute; inset: 0; border: 4px solid var(--ink); border-radius: 16px; background: var(--paper); box-shadow: var(--shadow); }
	.rib-v, .rib-h { position: absolute; background: #c62f3b; border: 0 solid var(--ink); }
	.rib-v { left: calc(50% - 10px); top: 0; bottom: 0; width: 20px; border-width: 0 4px; }
	.rib-h { left: 0; right: 0; top: calc(50% - 10px); height: 20px; border-width: 4px 0; }
	.tag {
		position: absolute;
		right: -46px;
		top: -14px;
		transform: rotate(12deg);
		padding: 4px 12px;
		border: 3.5px solid var(--ink);
		border-radius: 12px;
		background: var(--gold);
		box-shadow: 0 4px 0 var(--ink);
		font: 700 22px var(--font-title);
	}
</style>
