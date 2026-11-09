<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dayLabel } from '$lib/dates';
	import { live } from '$lib/live.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	let { data } = $props();

	// Vue générale : le flux SSE remplace les lignes à chaque changement ; « aujourd'hui » reste statique.
	const rows = $derived(
		(data.view === 'general' && live.top
			? live.top.map((t) => ({ userId: t.userId, rank: t.rank, name: t.name, points: t.points, detail: `${t.ok}/${t.answered} justes`, delta: t.delta }))
			: data.rows
		).map((r) => ({ ...r, me: r.userId === data.userId }))
	);
	const mine = $derived.by(() => {
		if (data.view !== 'general') return null;
		const m = live.me;
		if (m === undefined) return data.mine ? { ...data.mine, me: true } : null;
		return m && m.rank > rows.length ? { userId: data.userId, rank: m.rank, name: 'Toi', points: m.points, detail: `${m.ok}/${m.answered} justes`, delta: null, me: true } : null;
	});
	const podium = $derived(rows.slice(0, 3));
	const rest = $derived(rows.slice(3));
	const COLORS = ['#1F8A55', '#2D4B9A', '#6B3FA0'];
	const short = (n: string) => n.split(/\s+/)[0];
	// Ordre visuel du podium : 2e, 1er, 3e.
	const order = [1, 0, 2];
</script>

{#snippet delta(d: number | null)}
	{#if d !== null && d !== 0}
		<span class="delta {d > 0 ? 'up' : 'down'}" aria-label="{d > 0 ? 'gagne' : 'perd'} {Math.abs(d)} place{Math.abs(d) > 1 ? 's' : ''} depuis la dernière case">
			<svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
				{#if d > 0}<path d="M12 19V5M5 12l7-7 7 7" />{:else}<path d="M12 5v14M5 12l7 7 7-7" />{/if}
			</svg>{Math.abs(d)}
		</span>
	{:else if d === 0}
		<span class="delta same" aria-label="même place">=</span>
	{/if}
{/snippet}

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

	{#if rows.length === 0}
		<div class="card"><p class="hand">personne n'a encore répondu… sois le premier !</p></div>
	{:else}
		<section class="podium" aria-label="Podium">
			{#each order as i (i)}
				{#if podium[i]}
					<div class="step s{i + 1}">
						{#if i === 0}<svg class="crown" aria-hidden="true" width="56" height="44" viewBox="0 0 56 44"><path d="M4 14l12 12 12-22 12 22 12-12-4 26H8z" fill="#FFC542" stroke="#2A1A1F" stroke-width="4" stroke-linejoin="round" /></svg>{/if}
						<Avatar class="av" style="background: {COLORS[i]}" userId={podium[i].userId} name={podium[i].name} />
						<span class="who" class:me={podium[i].me}>{short(podium[i].name)} · {podium[i].points}</span>
						<span class="block">{i + 1}</span>
					</div>
				{/if}
			{/each}
		</section>

		{#if rest.length || mine}
			<ol class="card list" start="4">
				{#each rest as r (r.userId)}
					<li class:me={r.me} animate:flip={{ duration: 400 }}>
						<span class="rk">{r.rank}</span>
						<Avatar class="mini" userId={r.userId} name={r.name} />
						<span class="nm"><strong>{r.name}{r.me ? ' (toi)' : ''}</strong><small>{r.detail}</small></span>
						{@render delta(r.delta)}
						<span class="pts">{r.points}</span>
					</li>
				{/each}
				{#if mine}
					<li class="sep hand" aria-hidden="true">· · ·</li>
					<li class="me">
						<span class="rk">{mine.rank}</span>
						<Avatar class="mini" userId={mine.userId} name={data.user?.displayName ?? mine.name} />
						<span class="nm"><strong>{mine.name} (toi)</strong><small>{mine.detail}</small></span>
						{@render delta(mine.delta)}
						<span class="pts">{mine.points}</span>
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
	.step :global(.av) { width: 76px; height: 76px; border: 4px solid var(--ink); border-radius: 50%; color: var(--white); display: flex; align-items: center; justify-content: center; font: 700 24px var(--font-title); }
	.s1 :global(.av) { width: 92px; height: 92px; font-size: 30px; }
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
	.list :global(.mini) { width: 40px; height: 40px; flex: none; border: 3px solid var(--ink); border-radius: 50%; background: var(--green-dark); color: var(--white); display: flex; align-items: center; justify-content: center; font: 600 14px var(--font-title); }
	.nm { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.2; }
	.nm strong { font: 600 18px var(--font-title); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.nm small { font-size: 13px; }
	.pts { font: 700 22px var(--font-title); font-variant-numeric: tabular-nums; }
	.delta { display: inline-flex; align-items: center; gap: 2px; padding: 2px 8px; border: 2.5px solid var(--ink); border-radius: 8px; font-size: 14px; }
	.delta.up { background: var(--green); }
	.delta.down { background: #ffb3a8; }
	.delta.same { border: 0; font: 400 20px var(--font-hand); }

	@media (max-width: 500px) {
		.tabs { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
		.tabs a { justify-content: center; }
		.podium { gap: 8px; }
		.step :global(.av) { width: 54px; height: 54px; font-size: 18px; border-width: 3px; }
		.s1 :global(.av) { width: 66px; height: 66px; font-size: 22px; }
		.who { font-size: 13px; padding: 2px 8px; }
		.block { border-width: 3.5px; box-shadow: 4px 4px 0 var(--ink); font-size: 38px; }
		.s1 .block { height: 120px; font-size: 50px; }
		.s2 .block { height: 86px; }
		.s3 .block { height: 64px; font-size: 32px; }
		.crown { width: 42px; height: 34px; }
		.list { padding: 10px; }
		.rk { width: 34px; height: 34px; font-size: 15px; }
		.list :global(.mini) { width: 34px; height: 34px; font-size: 12px; }
		.list li { gap: 10px; }
		.nm strong { font-size: 16px; }
		.pts { font-size: 19px; }
	}
</style>
