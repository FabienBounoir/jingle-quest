<script lang="ts">
	import { enhance } from '$app/forms';
	import Notice from '$lib/components/Notice.svelte';
	import { dayLabel } from '$lib/dates';
	let { data, form } = $props();
	const active = $derived(data.days.filter((d) => !d.excluded));
	const missing = $derived(active.filter((d) => !d.questionId).length);
</script>

<h1 class="title-on-bg">Calendrier</h1>
<Notice {form} />

{#if data.days.length === 0}
	<section class="card stack">
		<p>Pas encore de cases. Règle les dates puis génère le calendrier.</p>
		<a class="btn" href="/admin/reglages">Aller aux réglages</a>
	</section>
{:else}
	<p class="summary hand">
		{active.length} cases · {missing === 0 ? 'toutes ont leur quête !' : `${missing} sans quête`} · heures en {data.timezone}
	</p>
	<section class="card">
		<ul class="list-rows">
			{#each data.days as d (d.date)}
				<li class:excluded={d.excluded}>
					<form method="POST" action="?/day" use:enhance={() => ({ update }) => update({ reset: false })} class="day row">
						<input type="hidden" name="date" value={d.date} />
						<span class="date">{dayLabel(d.date)}</span>
						<input type="time" name="time" value={d.time} aria-label="Heure d'ouverture du {dayLabel(d.date)}" required />
						<label class="check"><input type="checkbox" name="excluded" checked={d.excluded} /> exclu</label>
						<button class="btn secondary small" type="submit">OK</button>
					</form>
					<div class="q">
						{#if d.questionId}
							<a href="/admin/questions/{d.questionId}">{d.text}</a>
						{:else if !d.excluded}
							<a class="btn small" href="/admin/questions/new?day={d.date}">+ Créer la quête</a>
						{/if}
						{#if d.open}<span class="pill green">ouverte</span>{/if}
					</div>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.summary { margin: -8px 0 0; color: var(--white); }
	.day { flex: 0 1 auto; gap: 10px; }
	.date { min-width: 170px; font-family: var(--font-title); font-weight: 600; }
	.date::first-letter { text-transform: uppercase; }
	.day input[type='time'] { width: 112px; }
	.q { flex: 1 1 260px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
	.q a:not(.btn) { font-family: var(--font-title); font-weight: 500; }
	li.excluded { background: var(--grey); }
</style>
