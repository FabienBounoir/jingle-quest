<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import { dayLabel } from '$lib/dates';
	import { ordinal } from '$lib/text';
	let { data } = $props();
	const r = $derived(data.recap);
	const COLORS = ['#1F8A55', '#2D4B9A', '#6B3FA0'];
	const first = (n: string) => n.split(/\s+/)[0];
	const order = [1, 0, 2]; // podium : 2e, 1er, 3e
	function duration(ms: number) {
		const s = Math.round(ms / 1000);
		if (s < 60) return `${s} s`;
		const m = Math.floor(s / 60);
		return m < 60 ? `${m} min ${String(s % 60).padStart(2, '0')}` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
	}
	// Pluie de confettis décorative, tirée une fois.
	const CONF = ['#ffc542', '#7fd1a6', '#ffffff', '#ff8a7a', '#9db7ff'];
	const confetti = Array.from({ length: 36 }, (_, i) => ({
		left: Math.random() * 100,
		delay: -Math.random() * 6,
		dur: 5 + Math.random() * 4,
		size: 8 + Math.random() * 10,
		color: CONF[i % CONF.length],
		round: i % 3 === 0
	}));
	const pct = $derived(r.total ? Math.round((r.correct / r.total) * 100) : 0);
</script>

<div class="rain" aria-hidden="true">
	{#each confetti as c, i (i)}
		<span class:round={c.round} style:left="{c.left}%" style:--s="{c.size}px" style:--c={c.color} style:animation-delay="{c.delay}s" style:animation-duration="{c.dur}s"></span>
	{/each}
</div>

<div class="page">
	{#if data.preview}
		<p class="notice preview" role="status">Aperçu admin : les joueurs verront ce bilan après la fin de l'événement.</p>
	{/if}

	<header class="hero">
		<p class="hand kicker">c'est fini !</p>
		<h1 class="title-on-bg">Joyeux Noël !</h1>
		<p class="hand sub">merci d'avoir ouvert les cadeaux avec nous</p>
	</header>

	{#if data.podium.length}
		<section class="podium" aria-label="Podium final">
			{#each order as i (i)}
				{#if data.podium[i]}
					{@const p = data.podium[i]}
					<div class="step s{i + 1}">
						{#if i === 0}<svg class="crown" aria-hidden="true" width="56" height="44" viewBox="0 0 56 44"><path d="M4 14l12 12 12-22 12 22 12-12-4 26H8z" fill="#FFC542" stroke="#2A1A1F" stroke-width="4" stroke-linejoin="round" /></svg>{/if}
						<Avatar class="av" style="background: {COLORS[i]}" userId={p.userId} name={p.name} />
						<span class="who" class:me={p.userId === data.userId}>{first(p.name)} · {p.points}</span>
						<span class="block">{i + 1}</span>
					</div>
				{/if}
			{/each}
		</section>
	{/if}

	<section class="card mine" aria-labelledby="mine-title">
		<h2 id="mine-title">Ton bilan</h2>
		{#if r.answered === 0}
			<p class="hand">tu n'as ouvert aucun cadeau cette année… on t'attend l'an prochain !</p>
		{:else}
			<div class="stats">
				<div class="st gold"><span class="hand">classement</span><strong>{data.rank}<small>{ordinal(data.rank ?? 0)}</small></strong><em>sur {data.ranked}</em></div>
				<div class="st white"><span class="hand">points</span><strong>{r.points}</strong><em>au total</em></div>
				<div class="st green"><span class="hand">bonnes réponses</span><strong>{r.correct}<small>/{r.total}</small></strong><em>{pct} %</em></div>
				<div class="st white"><span class="hand">meilleure série</span><strong>{r.bestStreak}</strong><em>juste{r.bestStreak > 1 ? 's' : ''} d'affilée</em></div>
				{#if r.topDay}
					<div class="st gold"><span class="hand">ta meilleure quête</span><strong>+{r.topDay.points}</strong><em>{dayLabel(r.topDay.date)}</em></div>
				{/if}
				{#if r.fastest}
					<div class="st green"><span class="hand">le plus rapide</span><strong>{duration(r.fastest.elapsedMs)}</strong><em>{dayLabel(r.fastest.date)}</em></div>
				{/if}
			</div>
		{/if}
		<div class="row actions">
			<a class="btn" href="/mes-reponses">Revoir mes réponses</a>
			<a class="btn secondary" href="/classement">Classement complet</a>
		</div>
	</section>
</div>

<style>
	.page { position: relative; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
	.preview { background: var(--gold); }
	.hero { text-align: center; }
	.kicker { margin: 0; color: var(--white); font-size: 26px; }
	h1 { font-size: clamp(44px, 10vw, 72px); }
	.sub { margin: 4px 0 0; color: var(--white); font-size: 22px; }
	h2 { font-size: 28px; }

	.podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: end; }
	.step { display: flex; flex-direction: column; align-items: center; gap: 8px; }
	.step :global(.av) { width: 70px; height: 70px; border: 4px solid var(--ink); border-radius: 50%; color: var(--white); display: flex; align-items: center; justify-content: center; font: 700 22px var(--font-title); }
	.s1 :global(.av) { width: 88px; height: 88px; font-size: 28px; }
	.who { max-width: 100%; padding: 3px 10px; border: 3px solid var(--ink); border-radius: 10px; background: var(--white); font: 600 15px var(--font-title); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.who.me { background: var(--gold); }
	.block { width: 100%; border: 4px solid var(--ink); border-radius: 18px 18px 8px 8px; box-shadow: 6px 6px 0 var(--ink); display: flex; align-items: center; justify-content: center; font: 700 52px var(--font-title); }
	.s1 .block { height: 170px; background: var(--gold); font-size: 68px; }
	.s2 .block { height: 120px; background: #e7e2da; }
	.s3 .block { height: 88px; background: #f2b48a; font-size: 44px; }
	@keyframes wob6 { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
	.crown { animation: wob6 1.6s ease-in-out infinite; }

	.mine { display: flex; flex-direction: column; gap: 18px; }
	.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
	.st { border: 4px solid var(--ink); border-radius: 20px; box-shadow: 5px 5px 0 var(--ink); padding: 12px 16px; display: flex; flex-direction: column; }
	.st:nth-child(odd) { transform: rotate(-1.5deg); }
	.st:nth-child(even) { transform: rotate(1.2deg); }
	.st strong { font: 700 40px/1.05 var(--font-title); }
	.st small { font-size: 20px; }
	.st em { font-style: normal; font-size: 14px; }
	.st em::first-letter { text-transform: uppercase; }
	.st.gold { background: var(--gold); }
	.st.white { background: var(--white); }
	.st.green { background: var(--green); }
	.actions { justify-content: center; }

	/* Pluie de confettis derrière tout le contenu. */
	.rain { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
	.rain span { position: absolute; top: -20px; width: var(--s); height: calc(var(--s) * 0.6); background: var(--c); border: 2px solid var(--ink); border-radius: 3px; animation: fall linear infinite; }
	.rain span.round { height: var(--s); border-radius: 50%; }
	@keyframes fall {
		0% { transform: translateY(0) rotate(0deg); }
		100% { transform: translateY(110vh) rotate(720deg); }
	}

	@media (max-width: 500px) {
		.step :global(.av) { width: 52px; height: 52px; font-size: 17px; border-width: 3px; }
		.s1 :global(.av) { width: 64px; height: 64px; font-size: 21px; }
		.who { font-size: 13px; }
		.block { font-size: 36px; box-shadow: 4px 4px 0 var(--ink); }
		.s1 .block { height: 120px; font-size: 48px; }
		.s2 .block { height: 86px; }
		.s3 .block { height: 64px; font-size: 32px; }
		.stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
		.st strong { font-size: 30px; }
	}
</style>
