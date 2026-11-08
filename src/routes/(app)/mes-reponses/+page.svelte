<script lang="ts">
	import { dayLabel } from '$lib/dates';
	let { data } = $props();
	const STATE = {
		ok: { label: 'réussie', cls: 'ok' },
		part: { label: 'presque', cls: 'part' },
		ko: { label: 'ratée', cls: 'ko' },
		today: { label: 'à jouer', cls: 'todo' },
		catch: { label: 'à rattraper', cls: 'todo' },
		closed: { label: 'pas répondu', cls: 'ko' },
		wrapped: { label: '', cls: '' },
		empty: { label: '', cls: '' }
	} as const;
	const TYPES: Record<string, string> = { list: 'Liste', choice: 'QCM', number: 'Estimation', order: 'Ordre', zone: 'Zone', match: 'Associer', blur: 'Photo floue' };
</script>

<div class="page">
	<div class="top">
		<h1 class="title-on-bg">Mes réponses</h1>
		<p class="hand sub">
			{data.recap.points} pts · {data.recap.correct} juste{data.recap.correct > 1 ? 's' : ''} sur {data.recap.total} quête{data.recap.total > 1 ? 's' : ''} ouverte{data.recap.total > 1 ? 's' : ''}
		</p>
		{#if data.ended}
			<a class="btn" href="/bilan">Voir mon bilan de fin</a>
		{:else}
			<p class="note">Les bonnes réponses s'afficheront ici à la fin de l'événement.</p>
		{/if}
	</div>

	{#if data.rows.length === 0}
		<div class="card"><p class="hand">aucune case ouverte pour l'instant… patience !</p></div>
	{:else}
		<ol class="list">
			{#each data.rows as r (r.date)}
				<li class="card item {STATE[r.state].cls}">
					<div class="head">
						<span class="num">{r.number}</span>
						<span class="when">{dayLabel(r.date)}</span>
						<span class="pill">{TYPES[r.type]}</span>
						{#if r.state !== 'today' && r.state !== 'catch'}<span class="pill state">{STATE[r.state].label}</span>{/if}
						{#if r.points}<strong class="pts">+{r.points} pts</strong>{/if}
					</div>
					<p class="q">{r.text}</p>
					<dl>
						{#if r.answer !== null}
							<div><dt>ta réponse</dt><dd>{r.answer}</dd></div>
						{:else if r.state === 'ok' || r.state === 'part' || r.state === 'ko'}
							<div><dt>ta réponse</dt><dd>un clic sur l'image</dd></div>
						{/if}
						{#if r.solution}<div class="sol"><dt>la bonne réponse</dt><dd>{r.solution}</dd></div>{/if}
					</dl>
					{#if r.state === 'today' || r.state === 'catch'}
						<a class="btn small" href="/jour/{r.date}">{r.state === 'today' ? 'Jouer' : 'Rattraper'}</a>
					{:else}
						<a class="more" href="/jour/{r.date}">revoir la quête →</a>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.page { max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
	.top { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
	h1 { font-size: clamp(34px, 7vw, 46px); }
	.sub { margin: 0; color: var(--white); font-size: 22px; }
	.note { margin: 0; color: var(--white); font-size: 14px; }
	.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
	.item { display: flex; flex-direction: column; gap: 10px; padding: 18px 20px; border-radius: 22px; }
	.item.ok { background: #e8f6ee; }
	.item.part { background: #fff6d6; }
	.item.ko { background: #f2ede6; }
	.item.todo { border-style: dashed; }
	.head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
	.num { width: 34px; height: 34px; border: 3px solid var(--ink); border-radius: 50%; background: var(--gold); display: flex; align-items: center; justify-content: center; font: 700 15px var(--font-title); }
	.when { font: 600 16px var(--font-title); }
	.when::first-letter { text-transform: uppercase; }
	.ok .state { background: var(--green); }
	.part .state { background: #fff0b8; }
	.ko .state { background: var(--grey); }
	.pts { margin-left: auto; font: 700 18px var(--font-title); }
	.q { margin: 0; font: 600 18px/1.3 var(--font-title); }
	dl { margin: 0; display: flex; flex-direction: column; gap: 6px; }
	dl div { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
	dt { font: 400 18px var(--font-hand); }
	dd { margin: 0; font-weight: 700; }
	.sol dd { color: var(--green-dark); }
	.more { align-self: flex-start; font: 400 18px var(--font-hand); }
	.btn { align-self: flex-start; }
</style>
