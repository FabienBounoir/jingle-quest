<script lang="ts">
	import { goto } from '$app/navigation';
	import { countdown, serverClock } from '$lib/clock.svelte';
	import { dayLabel, dayShort } from '$lib/dates';
	import { live } from '$lib/live.svelte';
	import PushButton from '$lib/components/PushButton.svelte';
	let { data } = $props();
	// La présence me compte aussi : « attendent avec toi » = les autres.
	const others = $derived(live.presence ? Math.max(0, live.presence.waiting - 1) : null);

	// svelte-ignore state_referenced_locally
	const clock = serverClock(data.serverNow);
	const left = $derived(data.next.opensAt - clock.now);
	const t = $derived(countdown(left));
	const num = $derived(Number(data.next.date.slice(8)));
	// Ouverture : on file sur la quête (le lot 4 le fera aussi par le flux temps réel).
	let gone = false;
	$effect(() => {
		if (left <= 0 && !gone) {
			gone = true;
			goto(data.next.hasQuestion ? `/jour/${data.next.date}` : '/', { invalidateAll: true });
		}
	});
</script>

<div class="wait">
	<div class="gift bob" aria-hidden="true">
		<span class="box"></span><span class="lid"></span><span class="rib"></span><span class="bow l"></span><span class="bow r"></span>
		<span class="tag">{num}</span>
	</div>

	<div>
		<p class="hand when">{dayLabel(data.next.date)}</p>
		<h1 class="title-on-bg">Le cadeau s'ouvre à {data.next.time.replace(':', 'h')} !</h1>
	</div>

	<div class="timer" role="timer" aria-label="Temps restant avant l'ouverture">
		{#if t.d > 0}<div class="unit"><strong>{t.d}</strong><span class="hand">jour{t.d > 1 ? 's' : ''}</span></div>{/if}
		<div class="unit"><strong>{t.h}</strong><span class="hand">heures</span></div>
		<div class="unit"><strong>{t.m}</strong><span class="hand">min</span></div>
		<div class="unit gold"><strong>{t.s}</strong><span class="hand">sec</span></div>
	</div>

	{#if others !== null}
		<p class="waiting" role="status" aria-live="polite">
			<span class="dot"></span>
			{#if others === 0}tu es le premier lutin dans la salle !{:else}<strong>{others}</strong> lutin{others > 1 ? 's attendent' : ' attend'} avec toi{/if}
		</p>
	{/if}

	<p class="hint">Reste sur cette page : la quête s'affiche toute seule à l'ouverture. Les premiers décrochent le plus gros bonus !</p>

	<PushButton vapidKey={data.pushKey} />

	{#if data.catchUp.length}
		<div class="card catch">
			<p class="title">{data.catchUp.length} cadeau{data.catchUp.length > 1 ? 'x' : ''} à rattraper</p>
			<p class="muted">{data.pointsCatchup} pts par bonne réponse.</p>
			<div class="row">
				{#each data.catchUp as d (d)}<a class="btn small secondary" href="/jour/{d}">{dayShort(d)}</a>{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.wait { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 26px; text-align: center; }
	.when { margin: 0; color: var(--white); font-size: 24px; }
	.when::first-letter { text-transform: uppercase; }
	h1 { font-size: clamp(32px, 7vw, 52px); }
	.timer { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
	.unit { width: 140px; padding: 16px 0 10px; border: 4px solid var(--ink); border-radius: 22px; background: var(--paper); box-shadow: 6px 6px 0 var(--ink); display: flex; flex-direction: column; }
	.unit:nth-child(odd) { transform: rotate(-2deg); }
	.unit:nth-child(even) { transform: rotate(1.5deg); }
	.unit.gold { background: var(--gold); }
	.unit strong { font: 700 72px/1 var(--font-title); font-variant-numeric: tabular-nums; }
	.unit .hand { font-size: 20px; }
	.hint { margin: 0; max-width: 520px; color: var(--white); }
	.waiting { margin: 0; display: inline-flex; align-items: center; gap: 12px; padding: 12px 24px; border: 4px solid var(--ink); border-radius: 999px; background: var(--white); box-shadow: 0 6px 0 var(--ink); font-size: 18px; }
	.waiting strong { font: 700 28px var(--font-title); font-variant-numeric: tabular-nums; }
	.dot { width: 12px; height: 12px; border-radius: 50%; background: var(--green-dark); animation: blink 1.2s infinite; }
	@keyframes blink { 50% { opacity: 0.35; } }
	.catch { border-style: dashed; background: var(--white); transform: rotate(1deg); text-align: left; display: flex; flex-direction: column; gap: 8px; }
	.title { margin: 0; font: 700 20px var(--font-title); }
	.catch .muted { margin: 0; }

	.gift { position: relative; width: 150px; height: 130px; margin-top: 10px; }
	.gift span { position: absolute; border: 4px solid var(--ink); }
	.box { left: 0; right: 0; bottom: 0; height: 96px; border-radius: 18px; background: var(--green-dark); box-shadow: 6px 6px 0 var(--ink); }
	.lid { left: -10px; right: -10px; top: 18px; height: 30px; border-radius: 12px; background: #2ba36a; }
	.rib { left: calc(50% - 11px); top: 18px; bottom: 0; width: 22px; background: var(--gold); border-width: 0 4px !important; }
	.bow { top: -8px; width: 34px; height: 28px; background: var(--gold); }
	.bow.l { left: calc(50% - 38px); border-radius: 50% 50% 10% 50%; transform: rotate(-20deg); }
	.bow.r { left: calc(50% + 4px); border-radius: 50% 50% 50% 10%; transform: rotate(20deg); }
	.tag { right: -54px; top: 30px; transform: rotate(10deg); padding: 4px 10px; border-width: 3px !important; border-radius: 10px; background: var(--white); font: 700 20px var(--font-title); }
	@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
	.bob { animation: bob 1.6s ease-in-out infinite; }

	@media (max-width: 500px) {
		/* 3 ou 4 blocs (avec les jours) toujours sur une ligne. */
		.timer { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 8px; width: 100%; }
		.unit { width: auto; padding: 12px 0 8px; border-width: 3.5px; box-shadow: 4px 4px 0 var(--ink); }
		.unit strong { font-size: 40px; }
		.unit .hand { font-size: 17px; }
		.gift { transform: scale(0.75); margin: -10px 0; }
	}
</style>
