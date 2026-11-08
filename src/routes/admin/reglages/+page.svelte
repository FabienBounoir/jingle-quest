<script lang="ts">
	import { enhance } from '$app/forms';
	import Notice from '$lib/components/Notice.svelte';
	import { dayLabel } from '$lib/dates';
	let { data, form } = $props();
	const s = $derived(data.s);
	// svelte-ignore state_referenced_locally
	let color = $state(data.s.bgColor);
	const presets = ['#C62F3B', '#1F7A4D', '#2D4B9A', '#6B3FA0'];
</script>

<h1 class="title-on-bg">Réglages</h1>
<Notice {form} />

<form method="POST" action="?/save" enctype="multipart/form-data" use:enhance={() => ({ update }) => update({ reset: false })} class="stack">
	<section class="card stack" aria-labelledby="brand-title">
		<h2 id="brand-title">Marque</h2>
		<label class="field">
			<span>nom de l'événement</span>
			<input type="text" name="eventName" value={s.eventName} maxlength="80" required />
		</label>
		<div class="field">
			<span>couleur de fond</span>
			<div class="row">
				{#each presets as p (p)}
					<button type="button" class="swatch" style:background={p} aria-label="Couleur {p}" aria-pressed={color.toLowerCase() === p.toLowerCase()} onclick={() => (color = p)}></button>
				{/each}
				<input type="color" bind:value={color} aria-label="Couleur personnalisée" />
				<input type="text" name="bgColor" bind:value={color} pattern={"#[0-9a-fA-F]{6}"} style="max-width: 130px" aria-label="Code couleur" />
				<span class="preview" style:background-color={color} aria-hidden="true"><span class="title-on-bg">Aperçu</span></span>
			</div>
		</div>
		<div class="field">
			<span>logo (optionnel)</span>
			<div class="row">
				{#if s.hasLogo}<img src="/img/logo" alt="Logo actuel" class="logo" />{/if}
				<input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/gif" />
				{#if s.hasLogo}<label class="check"><input type="checkbox" name="removeLogo" /> retirer le logo</label>{/if}
			</div>
		</div>
	</section>

	<section class="card stack" aria-labelledby="cal-title">
		<h2 id="cal-title">Calendrier</h2>
		<div class="grid2">
			<label class="field"><span>début</span><input type="date" name="startDate" value={s.startDate} required /></label>
			<label class="field"><span>dernière case</span><input type="date" name="endDate" value={s.endDate} required /></label>
			<label class="field"><span>ouverture par défaut</span><input type="time" name="defaultOpenTime" value={s.defaultOpenTime.slice(0, 5)} required /></label>
			<label class="field"><span>fuseau horaire</span><input type="text" name="timezone" value={s.timezone} required /></label>
		</div>
		<label class="check"><input type="checkbox" name="workdaysOnly" checked={s.workdaysOnly} /> jours ouvrés uniquement (pas de case le week-end)</label>

		<fieldset class="ends">
			<legend class="hand">fin de l'événement</legend>
			<p class="muted">Rattrapage fermé, bonnes réponses et bilan révélés. Vide : minuit après la dernière case. Mets plus tard pour laisser quelques jours de rattrapage.</p>
			<div class="row">
				<label class="field"><span>date</span><input type="date" name="endsDate" value={data.endsAt?.date ?? ''} /></label>
				<label class="field"><span>heure</span><input type="time" name="endsTime" value={data.endsAt?.time ?? ''} /></label>
			</div>
			<p class="effective">Fin actuelle : <strong>{dayLabel(data.effectiveEnd.date)} à {data.effectiveEnd.time.replace(':', 'h')}</strong>{data.endsAt ? '' : ' (par défaut)'}</p>
		</fieldset>
	</section>

	<section class="card stack" aria-labelledby="score-title">
		<h2 id="score-title">Barème</h2>
		<div class="grid2">
			<label class="field"><span>bonne réponse le jour J</span><input type="number" name="pointsCorrect" value={s.pointsCorrect} min="0" max="10000" required /></label>
			<label class="field"><span>bonus rapidité maximum</span><input type="number" name="bonusMax" value={s.bonusMax} min="0" max="10000" required /></label>
			<label class="field"><span>durée du bonus (minutes)</span><input type="number" name="bonusMinutes" value={s.bonusMinutes} min="1" max="1440" required /></label>
			<label class="field"><span>bonne réponse en rattrapage</span><input type="number" name="pointsCatchup" value={s.pointsCatchup} min="0" max="10000" required /></label>
		</div>
		<p class="muted">Le bonus décroît de façon linéaire, du maximum à 0, pendant la durée choisie après l'ouverture. Pas de bonus en rattrapage.</p>
	</section>

	<button class="btn big" type="submit">Enregistrer</button>
</form>

<section class="card stack" aria-labelledby="gen-title">
	<h2 id="gen-title">Générer le calendrier</h2>
	<p>Crée une case par jour entre le début et la fin{s.workdaysOnly ? ', hors week-ends' : ''}, à l'heure par défaut. Actuellement : <strong>{data.dayCount} case{data.dayCount > 1 ? 's' : ''}</strong>.</p>
	<p class="muted">Les questions déjà rattachées, les jours exclus et les heures personnalisées sont conservés. Les jours sortis de la période sont supprimés.</p>
	<form method="POST" action="?/generate" use:enhance class="row">
		<label class="check"><input type="checkbox" name="resetTimes" /> remettre toutes les cases à l'heure par défaut</label>
		<button class="btn" type="submit">Générer</button>
	</form>
</section>

<style>
	h2 { font-size: 22px; }
	.ends { border: 3px dashed var(--ink); border-radius: 16px; padding: 12px 16px; margin: 0; display: flex; flex-direction: column; gap: 8px; }
	.ends legend { font-size: 20px; padding: 0 6px; }
	.ends .muted, .effective { margin: 0; }
	.ends .field { flex: 1 1 160px; }
	.swatch { width: 44px; height: 44px; border: 3px solid var(--ink); border-radius: 12px; cursor: pointer; }
	.swatch[aria-pressed='true'] { box-shadow: 0 0 0 3px var(--paper), 0 0 0 6px var(--ink); }
	input[type='color'] { width: 52px; height: 48px; padding: 2px; border: 3px solid var(--ink); border-radius: 12px; background: var(--white); }
	.preview { display: inline-flex; align-items: center; padding: 8px 16px; border: 3px solid var(--ink); border-radius: 12px; background-image: url('/doodle.svg'); font-family: var(--font-title); font-size: 20px; }
	.logo { max-height: 56px; border: 3px solid var(--ink); border-radius: 12px; background: var(--white); }
</style>
