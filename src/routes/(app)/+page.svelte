<script lang="ts">
	import Gift from '$lib/components/Gift.svelte';
	import { countdown, serverClock } from '$lib/clock.svelte';
	import { dayLabel } from '$lib/dates';
	import { live } from '$lib/live.svelte';
	import PushButton from '$lib/components/PushButton.svelte';
	let { data } = $props();

	// Valeurs temps réel quand le flux est là, valeurs du rendu serveur sinon.
	const answered = $derived(data.today && live.answered?.questionId === data.today.questionId ? live.answered.count : (data.today?.answered ?? 0));
	const top = $derived((live.top ?? data.top).map((p) => ({ ...p, me: p.userId === data.userId })));
	const stats = $derived(
		live.me !== undefined
			? { points: live.me?.points ?? 0, rank: live.me?.rank ?? null, ok: live.me?.ok ?? 0, answered: live.me?.answered ?? 0, ranked: live.ranked }
			: data.stats
	);

	// svelte-ignore state_referenced_locally
	const clock = serverClock(data.serverNow);
	const bonusLeft = $derived(data.today ? Math.max(0, data.today.bonusEndsAt - clock.now) : 0);
	const bonusNow = $derived(Math.round(data.scoring.bonusMax * (bonusLeft / (data.scoring.bonusMinutes * 60_000))));
	const nextIn = $derived(data.next ? countdown(data.next.opensAt - clock.now) : null);
</script>

<div class="home">
	<section class="hero" aria-labelledby="today-title">
		<div class="card today">
			{#if data.today && data.today.state === 'today'}
				<span class="sticker wob corner">OUVERTE !</span>
				<p class="hand kicker">la case du jour t'attend…</p>
				<h1 id="today-title">{dayLabel(data.today.date)}</h1>
				<p class="live"><span class="dot"></span><strong>{answered}</strong> lutin{answered > 1 ? 's ont' : ' a'} déjà répondu</p>
				{#if bonusLeft > 0}
					<div class="bonus">
						<div class="row between"><span>bonus rapidité : <strong>+{bonusNow} pts</strong></span><span>encore {Math.ceil(bonusLeft / 60_000)} min</span></div>
						<div class="bar"><div style:width="{(bonusLeft / (data.scoring.bonusMinutes * 60_000)) * 100}%"></div></div>
					</div>
				{/if}
				<div class="row">
					<a class="btn big" href="/jour/{data.today.date}">OUVRIR LA CASE</a>
					<span class="hand">{data.scoring.pointsCorrect} pts + jusqu'à {data.scoring.bonusMax} de bonus !</span>
				</div>
			{:else if data.today}
				<p class="hand kicker">quête du jour : c'est fait !</p>
				<h1 id="today-title">{dayLabel(data.today.date)}</h1>
				<p class="result {data.today.state}">
					{data.today.state === 'ok' ? `Bien joué : +${data.today.points} pts !` : 'Raté pour aujourd’hui… la bonne réponse sera dévoilée à la fin.'}
				</p>
				<p class="live"><span class="dot"></span><strong>{answered}</strong> lutin{answered > 1 ? 's ont' : ' a'} répondu</p>
				{#if data.next && nextIn}
					<a class="btn secondary" href="/attente">Prochaine case dans {nextIn.d ? `${nextIn.d} j ` : ''}{nextIn.h}:{nextIn.m}:{nextIn.s}</a>
				{/if}
			{:else if data.ended}
				<p class="hand kicker">c'est fini !</p>
				<h1 id="today-title">Joyeux Noël 🎄</h1>
				<p>Les bonnes réponses sont dévoilées : ouvre les cases pour les découvrir.</p>
				<a class="btn" href="/classement">Voir le classement final</a>
			{:else if data.next && nextIn}
				<p class="hand kicker">prochaine case…</p>
				<h1 id="today-title">{dayLabel(data.next.date)}</h1>
				<p class="countdown" role="timer">{nextIn.d ? `${nextIn.d} j ` : ''}{nextIn.h}:{nextIn.m}:{nextIn.s}</p>
				<a class="btn" href="/attente">Salle d'attente</a>
			{:else}
				<h1 id="today-title">Le calendrier arrive bientôt…</h1>
			{/if}
			{#if data.catchUp > 0 && !data.ended}
				<p class="catch-hint hand">{data.catchUp} cadeau{data.catchUp > 1 ? 'x' : ''} à rattraper, ça vaut encore des points !</p>
			{/if}
		</div>

		<div class="stats">
			<div class="stat gold"><span class="hand">mes points</span><strong>{stats.points}</strong></div>
			<div class="stat white"><span class="hand">mon rang</span><strong>{#if stats.rank}{stats.rank}<small>e</small> <em>/ {stats.ranked}</em>{:else}–{/if}</strong></div>
			<div class="stat green"><span class="hand">bonnes réponses</span><strong>{stats.ok} <em>/ {stats.answered}</em></strong></div>
		</div>
	</section>

	<div class="lower">
		<section class="card calendar" aria-labelledby="cal-title">
			<div class="row between">
				<h2 id="cal-title">{data.cells.length} cadeaux à ouvrir</h2>
				<div class="legend row">
					<span><i class="sw ok"></i>Réussie</span>
					<span><i class="sw ko"></i>Ratée</span>
					<span><i class="sw catch"></i>À rattraper</span>
				</div>
			</div>
			<div class="grid">
				{#each data.cells as cell, i (cell.date)}
					<Gift {cell} index={i} />
				{/each}
			</div>
		</section>

		<aside class="card board" aria-labelledby="lb-title">
			<div class="row between">
				<h2 id="lb-title">Classement</h2>
				<span class="pill live-pill" class:off={!live.connected} title={live.connected ? 'Mis à jour en direct' : 'Reconnexion…'}>LIVE</span>
			</div>
			{#if top.length === 0}
				<p class="hand">personne n'a encore répondu… sois le premier !</p>
			{:else}
				<ol>
					{#each top as p (p.userId)}
						<li class:me={p.me} class="r{p.rank}"><span class="rk">{p.rank}</span><span class="nm">{p.name}</span><strong>{p.points}</strong></li>
					{/each}
				</ol>
				{#if stats.rank && stats.rank > 5}
					<p class="dots hand">· · ·</p>
					<p class="mine"><span class="rk">{stats.rank}</span><span class="nm">Toi !</span><strong>{stats.points}</strong></p>
				{/if}
			{/if}
			<a href="/classement" class="hand all">voir tout le classement →</a>
		</aside>
	</div>

	{#if !data.ended}<div class="push-wrap"><PushButton vapidKey={data.pushKey} /></div>{/if}

	<form method="POST" action="/logout" class="logout">
		<button type="submit" class="hand">se déconnecter</button>
	</form>
</div>

<style>
	.home { display: flex; flex-direction: column; gap: 28px; }
	.row.between { justify-content: space-between; }
	.hero { display: flex; flex-wrap: wrap; gap: 22px; align-items: stretch; }
	.today { position: relative; flex: 999 1 520px; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
	.corner { position: absolute; top: -18px; right: 24px; }
	.kicker { margin: 0; color: var(--red-ink); font-size: 22px; }
	h1 { font-size: clamp(32px, 6vw, 48px); }
	h1::first-letter { text-transform: uppercase; }
	.live { margin: 0; align-self: flex-start; display: inline-flex; align-items: center; gap: 10px; padding: 8px 14px; border: 2.5px dashed var(--green-dark); border-radius: 12px; background: #e8f6ee; }
	.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green-dark); animation: blink 1.2s infinite; }
	@keyframes blink { 50% { opacity: 0.35; } }
	.bonus { max-width: 460px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
	.bar { height: 18px; border: 3px solid var(--ink); border-radius: 999px; background: var(--white); overflow: hidden; }
	.bar > div { height: 100%; background: repeating-linear-gradient(-45deg, var(--gold) 0 10px, #ffb000 10px 20px); border-right: 3px solid var(--ink); transition: width 1s linear; }
	.result { margin: 0; padding: 12px 16px; border: 3px solid var(--ink); border-radius: 14px; font-family: var(--font-title); font-size: 20px; }
	.result.ok { background: var(--green); }
	.result.ko { background: var(--grey); }
	.countdown { margin: 0; font: 700 44px var(--font-title); font-variant-numeric: tabular-nums; }
	.catch-hint { margin: 0; color: var(--red-ink); }

	.stats { flex: 1 1 240px; display: flex; flex-direction: column; gap: 14px; }
	.stat { border: 4px solid var(--ink); border-radius: 20px; box-shadow: 6px 6px 0 var(--ink); padding: 12px 20px; display: flex; flex-direction: column; }
	.stat strong { font: 700 40px/1 var(--font-title); }
	.stat small { font-size: 20px; }
	.stat em { font-style: normal; font-size: 17px; font-weight: 500; }
	.stat.gold { background: var(--gold); transform: rotate(-2deg); }
	.stat.white { background: var(--white); transform: rotate(1.5deg); }
	.stat.green { background: var(--green); transform: rotate(-1deg); }

	.lower { display: flex; flex-wrap: wrap; gap: 26px; align-items: flex-start; }
	.calendar { flex: 999 1 600px; min-width: 0; display: flex; flex-direction: column; gap: 18px; border-radius: 28px; }
	h2 { font-size: 26px; }
	.legend { gap: 14px; font-size: 14px; }
	.legend span { display: inline-flex; align-items: center; gap: 6px; }
	.sw { width: 14px; height: 14px; border-radius: 4px; border: 2.5px solid var(--ink); }
	.sw.ok { background: var(--green); }
	.sw.ko { background: var(--grey); }
	.sw.catch { background: var(--white); border-style: dashed; }
	.sw.wrapped { background: #c62f3b; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 18px 14px; }

	.board { flex: 1 1 280px; background: var(--white); transform: rotate(1deg); display: flex; flex-direction: column; gap: 12px; border-radius: 24px; }
	.live-pill { background: #c62f3b; color: var(--white); font-family: var(--font-title); }
	.live-pill.off { background: var(--grey); color: var(--ink); }
	ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
	li, .mine { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border: 2.5px solid var(--ink); border-radius: 14px; margin: 0; }
	li.r1 { background: var(--gold); }
	li.r2 { background: #e7e2da; }
	li.r3 { background: #f2b48a; }
	li.me, .mine { background: var(--gold); border-width: 3px; box-shadow: 0 4px 0 var(--ink); }
	.rk { width: 30px; height: 30px; flex: none; border-radius: 50%; border: 2.5px solid var(--ink); background: var(--white); display: flex; align-items: center; justify-content: center; font: 600 15px var(--font-title); }
	.nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	li strong, .mine strong { font-family: var(--font-title); }
	.dots { margin: 0; text-align: center; }
	.all { text-align: center; }
	.push-wrap { max-width: 560px; width: 100%; margin: 0 auto; }
	.logout { text-align: center; }
	.logout button { background: none; border: 0; color: var(--white); text-decoration: underline; cursor: pointer; min-height: 44px; }

	@media (max-width: 500px) {
		.hero { gap: 16px; }
		.today { gap: 10px; }
		.stats { flex-direction: row; gap: 10px; }
		.stat { flex: 1; padding: 8px 10px; text-align: center; border-width: 3px; box-shadow: 4px 4px 0 var(--ink); }
		.stat strong { font-size: 26px; }
		.stat .hand { font-size: 15px; order: 2; }
		.stat em { display: none; }
		.legend { display: none; }
		.grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 10px; }
		.countdown { font-size: 34px; }
	}
</style>
