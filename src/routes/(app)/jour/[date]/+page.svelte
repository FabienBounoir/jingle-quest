<script lang="ts">
	import { enhance } from '$app/forms';
	import Combobox from '$lib/components/Combobox.svelte';
	import { serverClock } from '$lib/clock.svelte';
	import { dayLabel } from '$lib/dates';
	let { data, form } = $props();

	let value = $state<number | null>(null);
	let sending = $state(false);
	// svelte-ignore state_referenced_locally
	const clock = serverClock(data.serverNow);
	const bonusLeft = $derived(data.sameDay ? Math.max(0, data.bonusEndsAt - clock.now) : 0);
	const bonusNow = $derived(Math.round(data.scoring.bonusMax * (bonusLeft / (data.scoring.bonusMinutes * 60_000))));
	const potential = $derived(data.sameDay ? data.scoring.pointsCorrect + bonusNow : data.scoring.pointsCatchup);
	const dry = $derived(form && 'result' in form && form.result?.dryRun ? form.result : null);
	const rank = $derived(form && 'result' in form ? form.result?.rank : null);
	const error = $derived(form && 'error' in form ? form.error : null);
	const day = $derived(Number(data.date.slice(8)));
</script>

<div class="quest">
	<a href="/" class="btn secondary small back">← Calendrier</a>

	<header class="head">
		<div class="badge" aria-hidden="true"><span class="rib"></span><span class="n">{day}</span></div>
		<div>
			<h1 class="title-on-bg">Quête n° {data.number}</h1>
			<p class="hand sub">{dayLabel(data.date)} · une seule chance !</p>
		</div>
		<span class="pill answered"><span class="dot"></span><strong>{data.answered}</strong> ont répondu</span>
	</header>

	{#if data.preview}
		<p class="notice preview" role="status">Aperçu admin : la case n'est pas encore ouverte. Tu peux tester une réponse, elle ne sera pas enregistrée.</p>
	{/if}

	<section class="card main" aria-labelledby="q">
		{#if data.question.hasImage}
			<img src="/img/q/{data.question.id}" alt="Illustration de la question" class="qimg" />
		{/if}
		<h2 id="q">{data.question.text}</h2>

		{#if data.myAnswer}
			<div class="result {data.myAnswer.isCorrect ? 'ok' : 'ko'} pop" role="status">
				<span class="ico {data.myAnswer.isCorrect ? 'wob' : ''}" aria-hidden="true">
					{#if data.myAnswer.isCorrect}<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l5 5L20 6" /></svg>
					{:else}<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>{/if}
				</span>
				<div>
					<p class="big">{data.myAnswer.isCorrect ? `BIEN JOUÉ ! +${data.myAnswer.points} pts` : 'Raté pour cette fois…'}</p>
					<p class="hand">
						tu as répondu « {data.myAnswer.label} »{#if rank} · tu es {rank}e !{/if}
						{#if !data.myAnswer.isCorrect && !data.reveal} La bonne réponse sera dévoilée à la fin.{/if}
					</p>
				</div>
			</div>
		{:else if data.ended}
			<p class="result ko">Trop tard, l'événement est terminé.</p>
		{:else}
			<form
				method="POST"
				action="?/answer"
				class="answer"
				use:enhance={() => {
					sending = true;
					return async ({ update }) => {
						await update({ reset: false });
						sending = false;
					};
				}}
			>
				<Combobox items={data.items} bind:value id="answer" label="ta réponse · {data.question.listName} :" />
				<input type="hidden" name="itemId" value={value ?? ''} />

				{#if error}<p class="notice error" role="alert">{error}</p>{/if}
				{#if dry}
					<p class="notice {dry.correct ? 'ok' : 'error'}" role="status">
						Aperçu : réponse {dry.correct ? `juste, elle rapporterait ${dry.points} pts` : 'fausse'}. Rien n'est enregistré.
					</p>
				{/if}

				<div class="submit">
					<div class="gain">
						<span>si c'est juste : <strong>{potential} pts</strong>{data.sameDay ? '' : ' (rattrapage)'}</span>
						{#if bonusLeft > 0}
							<div class="bar"><div style:width="{(bonusLeft / (data.scoring.bonusMinutes * 60_000)) * 100}%"></div></div>
						{/if}
					</div>
					<button class="btn big" type="submit" disabled={value === null || sending}>{sending ? '…' : 'VALIDER !'}</button>
				</div>
			</form>
		{/if}

		{#if data.reveal}
			<p class="reveal">
				<span class="hand">la bonne réponse :</span>
				<strong>{data.reveal.join(' · ')}</strong>
			</p>
		{/if}

		{#if data.myAnswer || data.ended}
			<div class="row">
				<a href="/" class="btn">Retour au calendrier</a>
				<a href="/classement" class="btn secondary">Classement</a>
			</div>
		{/if}
	</section>
</div>

<style>
	.quest { max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
	.back { align-self: flex-start; border-radius: 999px; }
	.head { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
	.badge { position: relative; width: 84px; height: 84px; flex: none; transform: rotate(-5deg); border: 4px solid var(--ink); border-radius: 18px; background: var(--gold); box-shadow: 5px 5px 0 var(--ink); }
	.rib { position: absolute; left: calc(50% - 8px); top: 0; bottom: 0; width: 16px; background: #c62f3b; border: 0 solid var(--ink); border-width: 0 3px; }
	.n { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 50px; height: 50px; border-radius: 50%; border: 3px solid var(--ink); background: #fff8ec; display: flex; align-items: center; justify-content: center; font: 700 26px var(--font-title); }
	h1 { font-size: clamp(28px, 6vw, 36px); }
	.sub { margin: 0; color: var(--white); }
	.answered { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; font-size: 14px; }
	.dot { width: 9px; height: 9px; border-radius: 50%; background: var(--green-dark); animation: blink 1.2s infinite; }
	@keyframes blink { 50% { opacity: 0.35; } }
	.preview { background: var(--gold); }

	.main { display: flex; flex-direction: column; gap: 22px; border-radius: 30px 26px 32px 24px; }
	.qimg { width: 100%; max-height: 360px; object-fit: contain; border: 3.5px solid var(--ink); border-radius: 18px; background: var(--white); transform: rotate(-1deg); }
	h2 { font-size: clamp(24px, 4.5vw, 34px); line-height: 1.15; }
	.answer { display: flex; flex-direction: column; gap: 18px; }
	.submit { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
	.gain { display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
	.bar { width: 240px; height: 16px; border: 3px solid var(--ink); border-radius: 999px; background: var(--white); overflow: hidden; }
	.bar > div { height: 100%; background: repeating-linear-gradient(-45deg, var(--gold) 0 10px, #ffb000 10px 20px); border-right: 3px solid var(--ink); transition: width 1s linear; }

	.result { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 18px; padding: 22px; border: 4px solid var(--ink); border-radius: 22px; box-shadow: 6px 6px 0 var(--ink); }
	.result.ok { background: var(--green); }
	.result.ko { background: var(--grey); }
	.result .hand { margin: 0; }
	.big { margin: 0; font: 700 clamp(24px, 5vw, 32px)/1.1 var(--font-title); }
	.ico { width: 70px; height: 70px; flex: none; border: 4px solid var(--ink); border-radius: 50%; background: var(--white); display: flex; align-items: center; justify-content: center; }
	.ok .ico { background: var(--gold); }
	.reveal { margin: 0; padding: 14px 18px; border: 3px dashed var(--ink); border-radius: 14px; background: var(--white); display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; }
	.reveal strong { font: 700 22px var(--font-title); }
	@keyframes pop { 0% { transform: scale(0.6) rotate(-8deg); opacity: 0; } 70% { transform: scale(1.06) rotate(2deg); } 100% { transform: scale(1) rotate(-1deg); opacity: 1; } }
	.pop { animation: pop 0.45s ease-out both; }

	@media (max-width: 500px) {
		.badge { width: 64px; height: 64px; }
		.n { width: 40px; height: 40px; font-size: 20px; }
		.answered { margin-left: 0; }
		.submit .btn { width: 100%; }
		.bar { width: 100%; }
		.gain { width: 100%; }
	}
</style>
