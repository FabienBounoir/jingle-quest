<script lang="ts">
	let { data } = $props();
	const messages: Record<string, string> = {
		error: 'Oups, la connexion a échoué. Réessaie !',
		domain: "Ce compte ne fait pas partie de l'entreprise."
	};
	const message = $derived(data.sso ? (messages[data.sso] ?? messages.error) : null);
</script>

<main>
	<div class="gift wob" aria-hidden="true">
		<span class="ribbon-v"></span><span class="ribbon-h"></span><span class="bow l"></span><span class="bow r"></span>
	</div>

	<h1 class="title-on-bg">{data.brand.eventName}</h1>
	<p class="hand tagline">une quête par jour, jusqu'à Noël !</p>

	<div class="card">
		{#if message}
			<p class="alert" role="alert">{message}</p>
		{:else if data.bye}
			<p class="hand">à bientôt, lutin !</p>
		{/if}
		<a class="btn big" href="/auth/login?next={encodeURIComponent(data.next)}">Se connecter</a>
		<p class="hint">avec ton compte entreprise</p>
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		max-width: 480px;
		margin: 0 auto;
		padding: 48px 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 18px;
		text-align: center;
	}
	h1 { font-size: clamp(34px, 9vw, 52px); }
	.tagline { margin: -6px 0 8px; color: var(--white); font-size: 24px; }
	.card { width: 100%; display: flex; flex-direction: column; gap: 10px; align-items: stretch; }
	.hint { margin: 0; font-size: 14px; }
	.alert {
		margin: 0 0 6px;
		padding: 10px 14px;
		border: 3px solid var(--ink);
		border-radius: 12px;
		background: #ffb3a8;
	}

	.gift { position: relative; width: 120px; height: 104px; margin-bottom: 8px; }
	.gift::before {
		content: '';
		position: absolute;
		inset: 26px 0 0;
		border: 4px solid var(--ink);
		border-radius: 16px;
		background: var(--green-dark);
		box-shadow: var(--shadow);
	}
	.ribbon-v, .ribbon-h { position: absolute; background: var(--gold); border: 0 solid var(--ink); }
	.ribbon-v { left: calc(50% - 11px); top: 26px; bottom: 0; width: 22px; border-width: 0 4px; }
	.ribbon-h { left: 0; right: 0; top: 52px; height: 20px; border-width: 4px 4px; }
	.bow {
		position: absolute;
		top: 2px;
		width: 34px;
		height: 28px;
		border: 4px solid var(--ink);
		background: var(--gold);
	}
	.bow.l { left: calc(50% - 36px); border-radius: 50% 50% 10% 50%; transform: rotate(-20deg); }
	.bow.r { left: calc(50% + 2px); border-radius: 50% 50% 50% 10%; transform: rotate(20deg); }
</style>
