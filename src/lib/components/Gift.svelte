<script lang="ts" module>
	export type Cell = {
		date: string;
		num: number;
		dow: string;
		state: 'wrapped' | 'empty' | 'today' | 'catch' | 'ok' | 'ko' | 'closed';
		points: number;
		next: boolean;
	};
</script>

<script lang="ts">
	// Une case du calendrier (maquette « 1 · Calendrier ») : paquet cadeau tant qu'elle est fermée,
	// carte de résultat une fois répondue.
	let { cell, index }: { cell: Cell; index: number } = $props();

	const PAPERS = [['#1F8A55', '#FFC542'], ['#C62F3B', '#FFF8EC'], ['#2D4B9A', '#FFC542'], ['#FFC542', '#C62F3B'], ['#FFF8EC', '#1F8A55']];
	const TILTS = [-2, 1.5, -1, 2, -1.5, 1];
	const paper = $derived(PAPERS[index % PAPERS.length]);
	const tilt = $derived(cell.state === 'today' ? -3 : TILTS[index % TILTS.length]);
	const href = $derived(
		cell.state === 'wrapped' ? (cell.next ? '/attente' : null) : cell.state === 'empty' ? null : `/jour/${cell.date}`
	);
	const label = $derived(
		{
			wrapped: cell.next ? 'prochaine case' : 'pas encore ouverte',
			empty: 'pas de quête',
			today: 'ouverte, à toi de jouer',
			catch: 'à rattraper',
			ok: `réussie, ${cell.points} points`,
			ko: 'ratée',
			closed: 'terminée sans réponse'
		}[cell.state]
	);
</script>

<svelte:element
	this={href ? 'a' : 'div'}
	{href}
	class="cell {cell.state}"
	style:--tilt="{tilt}deg"
	style:--wrap={paper[0]}
	style:--ribbon={paper[1]}
	aria-label="{cell.num} décembre, {label}"
>
	{#if cell.state === 'wrapped' || cell.state === 'empty' || cell.state === 'today'}
		<span class="ribbon v" aria-hidden="true"></span>
		<span class="ribbon h" aria-hidden="true"></span>
		<span class="num-badge">{cell.num}</span>
		{#if cell.state === 'today'}<span class="tag wob">OUVRE-MOI</span>{/if}
		{#if cell.next}<span class="soon">bientôt !</span>{/if}
	{:else}
		<span class="head">
			{cell.dow}
			{#if cell.state === 'ok'}
				<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l5 5L20 6" /></svg>
			{:else if cell.state === 'ko'}
				<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
			{:else if cell.state === 'catch'}
				<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
			{/if}
		</span>
		<span class="num">{cell.num}</span>
		<span class="foot">
			{#if cell.state === 'ok'}+{cell.points} pts{:else if cell.state === 'ko'}raté…{:else if cell.state === 'catch'}à rattraper{:else}terminée{/if}
		</span>
	{/if}
</svelte:element>

<style>
	.cell {
		position: relative;
		height: 128px;
		border: 3.5px solid var(--ink);
		border-radius: 18px;
		box-shadow: 4px 4px 0 var(--ink);
		transform: rotate(var(--tilt));
		text-decoration: none;
		color: var(--ink);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 10px 12px;
		transition: transform 0.15s;
	}
	a.cell:hover { transform: rotate(0deg) scale(1.04); }

	/* Paquet cadeau */
	.wrapped, .empty, .today { background: var(--wrap); padding: 0; display: block; }
	.today { background: var(--gold); border-width: 4px; box-shadow: 5px 6px 0 var(--ink); }
	.empty { opacity: 0.75; }
	.ribbon { position: absolute; background: var(--ribbon); border: 0 solid var(--ink); }
	.today .ribbon { background: #c62f3b; }
	.ribbon.v { left: calc(50% - 8px); top: 0; bottom: 0; width: 16px; border-width: 0 3px; }
	.ribbon.h { top: calc(50% - 8px); left: 0; right: 0; height: 16px; border-width: 3px 0; }
	.num-badge {
		position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
		width: 50px; height: 50px; border-radius: 50%; border: 3px solid var(--ink); background: #fff8ec;
		display: flex; align-items: center; justify-content: center; font: 700 24px var(--font-title);
	}
	.today .num-badge { width: 58px; height: 58px; font-size: 30px; }
	.tag { position: absolute; top: -16px; right: -10px; padding: 3px 10px; border: 3px solid var(--ink); border-radius: 10px; background: var(--green-dark); color: var(--white); font: 700 13px var(--font-title); }
	.soon { position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%) rotate(2deg); white-space: nowrap; padding: 2px 10px; border: 2.5px solid var(--ink); border-radius: 8px; background: var(--white); font: 400 16px var(--font-hand); }

	/* Case ouverte */
	.ok { background: var(--green); }
	.ko { background: var(--grey); }
	.catch { background: var(--white); border-style: dashed; box-shadow: none; }
	.closed { background: var(--grey); opacity: 0.7; }
	.head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; text-transform: uppercase; }
	.num { font: 700 46px/1 var(--font-title); }
	.ko .num { color: #6b5a55; }
	.foot { font: 400 19px/1 var(--font-hand); }
	.catch .foot { color: var(--red-ink); }

	@media (max-width: 500px) {
		.cell { height: 96px; border-width: 3px; border-radius: 14px; padding: 6px 8px; box-shadow: 3px 3px 0 var(--ink); }
		.num-badge { width: 38px; height: 38px; font-size: 18px; }
		.today .num-badge { width: 44px; height: 44px; font-size: 22px; }
		.ribbon.v { left: calc(50% - 6px); width: 12px; }
		.ribbon.h { top: calc(50% - 6px); height: 12px; }
		.num { font-size: 32px; }
		.foot { font-size: 15px; }
		.head { font-size: 11px; }
		.tag { font-size: 11px; padding: 1px 7px; top: -13px; right: -8px; }
		.soon { font-size: 14px; bottom: -13px; }
	}
</style>
