<script lang="ts">
	import { dayLabel } from '$lib/dates';
	let { data } = $props();
	const podium = $derived(data.rows.slice(0, 3));
	const rest = $derived(data.rows.slice(3));
	const COLORS = ['#1F8A55', '#2D4B9A', '#6B3FA0'];
	const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
	const short = (n: string) => n.split(/\s+/)[0];
	// Ordre visuel du podium : 2e, 1er, 3e.
	const order = [1, 0, 2];
</script>

<div class="board">
	<div class="top row">
		<div>
			<h1 class="title-on-bg">Classement</h1>
			<p class="hand sub">
				{data.view === 'jour' && data.dayDate ? dayLabel(data.dayDate) : `${data.players} lutins inscrits`}
			</p>
		</div>
		<nav class="tabs" aria-label="Période">
			<a href="/classement" aria-current={data.view === 'general' ? 'page' : undefined}>Général</a>
			<a href="/classement?vue=jour" aria-current={data.view === 'jour' ? 'page' : undefined}>Aujourd'hui</a>
		</nav>
	</div>

	{#if data.rows.length === 0}
		<div class="card"><p class="hand">personne n'a encore répondu… sois le premier !</p></div>
	{:else}
		<section class="podium" aria-label="Podium">
			{#each order as i (i)}
				{#if podium[i]}
					<div class="step s{i + 1}">
						{#if i === 0}<svg class="crown" aria-hidden="true" width="56" height="44" viewBox="0 0 56 44"><path d="M4 14l12 12 12-22 12 22 12-12-4 26H8z" fill="#FFC542" stroke="#2A1A1F" stroke-width="4" stroke-linejoin="round" /></svg>{/if}
						<span class="av" style:background={COLORS[i]} aria-hidden="true">{initials(podium[i].name)}</span>
						<span class="who" class:me={podium[i].me}>{short(podium[i].name)} · {podium[i].points}</span>
						<span class="block">{i + 1}</span>
					</div>
				{/if}
			{/each}
		</section>

		{#if rest.length || data.mine}
			<ol class="card list" start="4">
				{#each rest as r (r.rank)}
					<li class:me={r.me}>
						<span class="rk">{r.rank}</span>
						<span class="nm"><strong>{r.name}{r.me ? ' (toi)' : ''}</strong><small>{r.detail}</small></span>
						<span class="pts">{r.points}</span>
					</li>
				{/each}
				{#if data.mine}
					<li class="sep hand" aria-hidden="true">· · ·</li>
					<li class="me">
						<span class="rk">{data.mine.rank}</span>
						<span class="nm"><strong>{data.mine.name} (toi)</strong><small>{data.mine.detail}</small></span>
						<span class="pts">{data.mine.points}</span>
					</li>
				{/if}
			</ol>
		{/if}
	{/if}
</div>

<style>
	.board { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 26px; }
	.top { justify-content: space-between; }
	h1 { font-size: clamp(38px, 8vw, 50px); }
	.sub { margin: 0; color: var(--white); }
	.sub::first-letter { text-transform: uppercase; }
	.tabs { display: inline-flex; gap: 8px; padding: 6px; border: 3.5px solid var(--ink); border-radius: 18px; background: var(--paper); box-shadow: 0 5px 0 var(--ink); }
	.tabs a { min-height: 44px; padding: 8px 18px; border: 3px solid transparent; border-radius: 12px; display: inline-flex; align-items: center; text-decoration: none; font: 600 16px var(--font-title); }
	.tabs a[aria-current='page'] { background: var(--gold); border-color: var(--ink); }

	.podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: end; padding-top: 10px; }
	.step { display: flex; flex-direction: column; align-items: center; gap: 10px; }
	.av { width: 76px; height: 76px; border: 4px solid var(--ink); border-radius: 50%; color: var(--white); display: flex; align-items: center; justify-content: center; font: 700 24px var(--font-title); }
	.s1 .av { width: 92px; height: 92px; font-size: 30px; }
	.who { max-width: 100%; padding: 4px 12px; border: 3px solid var(--ink); border-radius: 10px; background: var(--white); font: 600 16px var(--font-title); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.who.me { background: var(--gold); }
	.block { width: 100%; border: 4px solid var(--ink); border-radius: 20px 20px 8px 8px; box-shadow: 6px 6px 0 var(--ink); display: flex; align-items: center; justify-content: center; font: 700 56px var(--font-title); }
	.s1 .block { height: 180px; background: var(--gold); font-size: 72px; }
	.s2 .block { height: 130px; background: #e7e2da; }
	.s3 .block { height: 96px; background: #f2b48a; font-size: 48px; }
	@keyframes wob6 { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
	.crown { animation: wob6 1.6s ease-in-out infinite; }

	.list { list-style: none; margin: 0; padding: 16px; display: flex; flex-direction: column; gap: 10px; border-radius: 26px; }
	.list li { display: flex; align-items: center; gap: 14px; padding: 10px 14px; border: 3px solid var(--ink); border-radius: 16px; background: var(--white); }
	.list li.me { background: var(--gold); box-shadow: 0 5px 0 var(--ink); }
	.list li.sep { border: 0; background: none; justify-content: center; padding: 0; }
	.rk { width: 40px; height: 40px; flex: none; border: 3px solid var(--ink); border-radius: 50%; background: var(--white); display: flex; align-items: center; justify-content: center; font: 700 18px var(--font-title); }
	.nm { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
	.nm strong { font: 600 18px var(--font-title); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.nm small { font-size: 13px; }
	.pts { font: 700 22px var(--font-title); font-variant-numeric: tabular-nums; }

	@media (max-width: 500px) {
		.tabs { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
		.tabs a { justify-content: center; }
		.podium { gap: 8px; }
		.av { width: 54px; height: 54px; font-size: 18px; border-width: 3px; }
		.s1 .av { width: 66px; height: 66px; font-size: 22px; }
		.who { font-size: 13px; padding: 2px 8px; }
		.block { border-width: 3.5px; box-shadow: 4px 4px 0 var(--ink); font-size: 38px; }
		.s1 .block { height: 120px; font-size: 50px; }
		.s2 .block { height: 86px; }
		.s3 .block { height: 64px; font-size: 32px; }
		.crown { width: 42px; height: 34px; }
		.list { padding: 10px; }
		.rk { width: 34px; height: 34px; font-size: 15px; }
		.nm strong { font-size: 16px; }
		.pts { font-size: 19px; }
	}
</style>
