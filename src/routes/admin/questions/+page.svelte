<script lang="ts">
	import { dayShort } from '$lib/dates';
	const TYPE_LABELS: Record<string, string> = { choice: 'QCM', number: 'Estimation', order: 'Ordre', zone: 'Zone', match: 'Associer', blur: 'Photo floue' };
	let { data } = $props();
</script>

<div class="row">
	<h1 class="title-on-bg">Questions</h1>
	<a class="btn" href="/admin/questions/new" style="margin-left: auto">+ Nouvelle question</a>
</div>

<section class="card stack">
	{#if data.questions.length === 0}
		<p class="hand">aucune quête pour l'instant… crée la première !</p>
	{:else}
		<ul class="list-rows">
			{#each data.questions as q (q.id)}
				<li>
					{#if q.day}<span class="pill gold">{dayShort(q.day)}</span>{:else}<span class="pill grey">sans jour</span>{/if}
					<a href="/admin/questions/{q.id}" class="text">{q.text}</a>
					{#if q.type === 'list' || q.type === 'blur'}
						{#if q.type === 'blur'}<span class="pill green">Photo floue</span>{/if}
						<span class="pill">{q.list}</span>
						<span class="pill {q.correct ? 'green' : ''}">{q.correct} bonne{q.correct > 1 ? 's' : ''} réponse{q.correct > 1 ? 's' : ''}</span>
					{:else}
						<span class="pill green">{TYPE_LABELS[q.type]}</span>
					{/if}
					{#if q.hasImage}<span class="pill">image</span>{/if}
					{#if q.answered}<span class="pill">{q.answered} réponse{q.answered > 1 ? 's' : ''} de joueurs</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.text { flex: 1 1 280px; font-family: var(--font-title); font-weight: 600; font-size: 17px; }
</style>
