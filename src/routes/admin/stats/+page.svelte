<script lang="ts">
	import { dayShort } from '$lib/dates';
	let { data } = $props();
	const duration = (s: number | null) => (s === null ? '–' : s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`);
	const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));
</script>

<h1 class="title-on-bg">Statistiques</h1>

<div class="tiles">
	<div class="tile gold"><strong>{data.players}</strong><span class="hand">joueurs ont répondu</span></div>
	<div class="tile white"><strong>{data.users}</strong><span class="hand">comptes connectés au moins une fois</span></div>
	<div class="tile green"><strong>{data.live.online}</strong><span class="hand">en ligne en ce moment</span></div>
	<div class="tile white"><strong>{data.subscribed}</strong><span class="hand">abonnés aux notifications</span></div>
</div>

<section class="card stack" aria-labelledby="days-title">
	<h2 id="days-title">Par quête</h2>
	{#if data.days.length === 0}
		<p class="hand">aucune quête rattachée à une case pour l'instant.</p>
	{:else}
		<ul class="list-rows">
			{#each data.days as d (d.date)}
				<li>
					<span class="pill {d.open ? 'gold' : 'grey'}">{dayShort(d.date)}</span>
					<a href="/admin/questions/{d.questionId}" class="text">{d.text}</a>
					{#if d.open}
						<span class="figures">
							<span><strong>{d.answered}</strong> réponses</span>
							<span class="rate" title="Taux de bonnes réponses">
								<span class="bar"><span style:width="{pct(d.correct, d.answered)}%"></span></span>
								<strong>{pct(d.correct, d.answered)} %</strong> justes
							</span>
							<span>médiane <strong>{duration(d.medianSec)}</strong></span>
						</span>
					{:else}
						<span class="muted">pas encore ouverte</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
	<p class="muted">Médiane : temps entre l'ouverture de la case et la réponse (la moitié des joueurs a répondu plus vite).</p>
</section>

<style>
	h2 { font-size: 22px; }
	.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
	.tile { border: 4px solid var(--ink); border-radius: 20px; box-shadow: 6px 6px 0 var(--ink); padding: 14px 18px; display: flex; flex-direction: column; }
	.tile strong { font: 700 40px/1 var(--font-title); }
	.tile.gold { background: var(--gold); transform: rotate(-1.5deg); }
	.tile.white { background: var(--white); transform: rotate(1deg); }
	.tile.green { background: var(--green); transform: rotate(-1deg); }
	.text { flex: 1 1 240px; font-family: var(--font-title); font-weight: 500; }
	.figures { display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: center; font-size: 14px; }
	.rate { display: inline-flex; align-items: center; gap: 8px; }
	.bar { width: 80px; height: 12px; border: 2.5px solid var(--ink); border-radius: 999px; background: var(--white); overflow: hidden; }
	.bar > span { display: block; height: 100%; background: var(--green-dark); }
	p { margin: 0; }
</style>
