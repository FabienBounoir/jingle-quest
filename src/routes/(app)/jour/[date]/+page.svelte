<script lang="ts">
	import { enhance } from '$app/forms';
	import Combobox from '$lib/components/Combobox.svelte';
	import ChoiceInput from '$lib/components/answers/ChoiceInput.svelte';
	import NumberInput from '$lib/components/answers/NumberInput.svelte';
	import OrderInput from '$lib/components/answers/OrderInput.svelte';
	import ZoneInput from '$lib/components/answers/ZoneInput.svelte';
	import MatchInput from '$lib/components/answers/MatchInput.svelte';
	import WordInput from '$lib/components/answers/WordInput.svelte';
	import BlurImage from '$lib/components/BlurImage.svelte';
	import { BLUR_MULTIPLIERS } from '$lib/blur';
	import { WORD_POINTS } from '$lib/word';
	import { serverClock } from '$lib/clock.svelte';
	import { dayLabel } from '$lib/dates';
	import { live } from '$lib/live.svelte';
	import { ordinal } from '$lib/text';
	let { data, form } = $props();
	const answered = $derived(live.answered?.questionId === data.question.id ? live.answered.count : data.answered);

	let value = $state<string | null>(null); // types « list », « blur », « zoom » : jeton de la valeur choisie
	let ready = $state(false); // autres types : le composant de saisie dit si la réponse est complète
	let sending = $state(false);
	const q = $derived(data.question);
	const cfg = $derived(q.config as { options?: string[]; unit?: string; items?: string[]; left?: string[]; right?: string[]; length?: number });
	const listLike = $derived(q.type === 'list' || q.type === 'blur' || q.type === 'zoom');
	const staged = $derived(q.type === 'blur' || q.type === 'zoom');
	const onImage = $derived(q.type === 'zone' || q.type === 'pin'); // l'image est le champ de réponse
	const canSubmit = $derived(listLike ? value !== null : ready);
	// Mot mystère : essais renvoyés par l'action (aperçu admin : seule source), sinon ceux de la base.
	const guesses = $derived(form && 'guesses' in form && form.guesses ? form.guesses : data.guesses);
	const imgSrc = $derived(`/img/q/${q.id}`);
	const zonePoint = $derived(data.myAnswer?.value as { x: number; y: number } | null | undefined);
	// Juste = réussi, même avec des points réduits (photo défloutée) ; points partiels = presque.
	const verdict = $derived(!data.myAnswer ? null : data.myAnswer.isCorrect ? 'ok' : data.myAnswer.score > 0 ? 'part' : 'ko');
	// svelte-ignore state_referenced_locally
	let blurStage = $state(data.blurStage);
	// svelte-ignore state_referenced_locally
	const clock = serverClock(data.serverNow);
	const bonusLeft = $derived(data.sameDay ? Math.max(0, data.bonusEndsAt - clock.now) : 0);
	const bonusNow = $derived(Math.round(data.scoring.bonusMax * (bonusLeft / (data.scoring.bonusMinutes * 60_000))));
	const blurFactor = $derived(staged ? BLUR_MULTIPLIERS[blurStage] : q.type === 'word' ? (WORD_POINTS[guesses.length] ?? 0) : 1);
	const potential = $derived(Math.round(blurFactor * (data.sameDay ? data.scoring.pointsCorrect + bonusNow : data.scoring.pointsCatchup)));
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
		<span class="pill answered"><span class="dot"></span><strong>{answered}</strong> ont répondu</span>
	</header>

	{#if data.preview}
		<p class="notice preview" role="status">Aperçu admin : la case n'est pas encore ouverte. Tu peux tester une réponse, elle ne sera pas enregistrée.</p>
	{/if}

	<section class="card main" aria-labelledby="q">
		<!-- Zone : l'image EST le champ de réponse (ou le support du résultat), on ne l'affiche pas deux fois. -->
		{#if staged && q.hasImage}
			<BlurImage id={q.id} bind:stage={blurStage} canUnblur={!data.myAnswer && !data.ended} preview={data.preview} zoom={q.type === 'zoom'} />
		{:else if q.hasImage && !onImage}
			<img src={imgSrc} alt="Illustration de la question" class="qimg" />
		{/if}
		<h2 id="q">{q.text}</h2>

		{#if onImage && (data.myAnswer || data.ended)}
			<div class="zone-view">
				<img src={imgSrc} alt="Ta réponse sur l’illustration de la question" />
				{#if data.reveal?.zone}
					{@const z = data.reveal.zone}
					<span class="sol" style:left="{z.x * 100}%" style:top="{z.y * 100}%" style:width="{z.w * 100}%" style:height="{z.h * 100}%" aria-hidden="true"></span>
				{/if}
				{#if data.reveal?.pin}
					{@const t = data.reveal.pin}
					<span class="target" style:left="{t.x * 100}%" style:top="{t.y * 100}%" aria-hidden="true"></span>
				{/if}
				{#if zonePoint}<span class="mark" style:left="{zonePoint.x * 100}%" style:top="{zonePoint.y * 100}%" aria-hidden="true"></span>{/if}
			</div>
			<p class="muted">{zonePoint ? 'Le rond : ton clic.' : ''}{data.reveal?.zone ? ' Le cadre vert : la bonne zone.' : ''}{data.reveal?.pin ? ' La croix verte : la cible.' : ''}</p>
		{/if}

		{#if q.type === 'word' && (guesses.length || (!data.myAnswer && !data.ended))}
			<WordInput length={cfg.length ?? 0} {guesses} canPlay={!data.myAnswer && !data.ended && !(dry && q.type === 'word')} preview={data.preview} />
		{/if}

		{#if data.myAnswer}
			<div class="result {verdict} pop" role="status">
				<span class="ico {verdict === 'ok' ? 'wob' : ''}" aria-hidden="true">
					{#if verdict !== 'ko'}<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l5 5L20 6" /></svg>
					{:else}<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>{/if}
				</span>
				<div>
					<p class="big">
						{verdict === 'ok' ? `BIEN JOUÉ ! +${data.myAnswer.points} pts` : verdict === 'part' ? `Presque ! +${data.myAnswer.points} pts` : 'Raté pour cette fois…'}
					</p>
					<p class="hand">
						{#if data.myAnswer.text}tu as répondu « {data.myAnswer.text} »{:else}ta réponse est enregistrée{/if}{#if rank} · tu es {rank}{ordinal(rank)} !{/if}
						{#if verdict !== 'ok' && !data.reveal} La bonne réponse sera dévoilée à la fin.{/if}
					</p>
				</div>
			</div>
		{:else if data.ended}
			<p class="result ko">Trop tard, l'événement est terminé.</p>
		{:else if q.type === 'word'}
			<!-- Chaque essai est son propre envoi (WordInput) : pas de bouton VALIDER. -->
			{#if error}<p class="notice error" role="alert">{error}</p>{/if}
			{#if dry}
				<p class="notice {dry.correct ? 'ok' : 'error'}" role="status">
					Aperçu : {dry.correct ? 'mot trouvé' : 'mot pas trouvé'}{dry.points ? `, il rapporterait ${dry.points} pts` : ''}. Rien n'est enregistré.
				</p>
			{:else}
				<p class="muted">si tu trouves à cet essai : <strong>{potential} pts</strong>{data.sameDay ? '' : ' (rattrapage)'}</p>
			{/if}
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
				{#if listLike}
					<Combobox items={q.items} bind:value id="answer" label="ta réponse · {q.listName} :" />
					<input type="hidden" name="itemId" value={value ?? ''} />
					<!-- Aperçu admin uniquement : le serveur lit sinon le niveau en base. -->
					{#if staged && data.preview}<input type="hidden" name="stage" value={blurStage} />{/if}
				{:else if q.type === 'choice'}
					<ChoiceInput options={cfg.options ?? []} bind:ready />
				{:else if q.type === 'number'}
					<NumberInput unit={cfg.unit ?? ''} bind:ready />
				{:else if q.type === 'order'}
					<OrderInput items={cfg.items ?? []} bind:ready />
				{:else if onImage}
					<ZoneInput src={imgSrc} bind:ready />
				{:else if q.type === 'match'}
					<MatchInput left={cfg.left ?? []} right={cfg.right ?? []} bind:ready />
				{/if}

				{#if error}<p class="notice error" role="alert">{error}</p>{/if}
				{#if dry}
					<p class="notice {dry.correct || dry.score > 0 ? 'ok' : 'error'}" role="status">
						Aperçu : {dry.correct ? 'réponse juste' : dry.score > 0 ? `réponse à ${Math.round(dry.score * 100)} %` : 'réponse fausse'}{dry.points ? `, elle rapporterait ${dry.points} pts` : ''}. Rien n'est enregistré.
					</p>
				{/if}

				<div class="submit">
					<div class="gain">
						<span>{q.type === 'number' || q.type === 'order' || q.type === 'match' || q.type === 'pin' ? 'jusqu’à' : 'si c’est juste :'} <strong>{potential} pts</strong>{data.sameDay ? '' : ' (rattrapage)'}</span>
						{#if bonusLeft > 0}
							<div class="bar"><div style:width="{(bonusLeft / (data.scoring.bonusMinutes * 60_000)) * 100}%"></div></div>
						{/if}
					</div>
					<button class="btn big" type="submit" disabled={!canSubmit || sending}>{sending ? '…' : 'VALIDER !'}</button>
				</div>
			</form>
		{/if}

		{#if data.reveal?.text}
			<p class="reveal">
				<span class="hand">la bonne réponse :</span>
				<strong>{data.reveal.text}</strong>
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
	.result.part { background: #fff0b8; }
	.part .ico { background: var(--green); }
	.zone-view { position: relative; border: 3.5px solid var(--ink); border-radius: 18px; overflow: hidden; background: var(--white); }
	.zone-view img { display: block; width: 100%; height: auto; }
	.sol { position: absolute; border: 4px solid var(--green-dark); background: rgba(127, 209, 166, 0.35); border-radius: 6px; }
	.target { position: absolute; width: 34px; height: 34px; margin: -17px 0 0 -17px; pointer-events: none; }
	.target::before, .target::after { content: ''; position: absolute; left: 50%; top: 0; width: 7px; height: 100%; margin-left: -3.5px; border-radius: 4px; background: var(--green-dark); box-shadow: 0 0 0 2px var(--white); transform: rotate(45deg); }
	.target::after { transform: rotate(-45deg); }
	.mark { position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; border: 4px solid var(--ink); border-radius: 50%; background: rgba(255, 197, 66, 0.6); box-shadow: 0 0 0 3px var(--white); }
	.muted { margin: 0; }
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
