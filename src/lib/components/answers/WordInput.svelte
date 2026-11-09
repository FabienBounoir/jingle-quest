<script lang="ts">
	// Mot mystère : chaque essai part au serveur (action ?/guess), qui l'enregistre et renvoie les indices.
	// Le mot ne quitte jamais le serveur. En aperçu admin, les essais précédents sont renvoyés avec le
	// formulaire (rien n'est enregistré).
	import { enhance } from '$app/forms';
	import { WORD_POINTS, WORD_TRIES, normalizeWord } from '$lib/word';
	type Guess = { guess: string; marks: number[] };
	let { length, guesses, canPlay, preview }: { length: number; guesses: Guess[]; canPlay: boolean; preview: boolean } = $props();

	let typed = $state('');
	let sending = $state(false);
	const KEYS = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN'];
	const MARK = ['absent', 'present', 'ok'];
	// Meilleur indice connu par lettre, pour colorier le clavier.
	const best = $derived.by(() => {
		const m = new Map<string, number>();
		for (const g of guesses) [...g.guess].forEach((l, i) => m.set(l, Math.max(m.get(l) ?? 0, g.marks[i])));
		return m;
	});
	const rows = $derived(Array.from({ length: WORD_TRIES }, (_, r) => guesses[r] ?? null));
	const left = $derived(WORD_TRIES - guesses.length);
	const pct = $derived(Math.round((WORD_POINTS[guesses.length] ?? 0) * 100));
	const type = (l: string) => (typed = (typed + l).slice(0, length));
</script>

<div class="word">
	<p class="hand label">{length} lettres · {left} essai{left > 1 ? 's' : ''} restant{left > 1 ? 's' : ''}</p>
	<div class="grid" style:--n={length} aria-label="Essais">
		{#each rows as g, r (r)}
			{@const current = !g && r === guesses.length && canPlay}
			{#each Array(length) as _, i (i)}
				{@const l = g ? g.guess[i] : current ? (typed[i] ?? '') : ''}
				<span class="cell {g ? MARK[g.marks[i]] : ''}" class:typing={current && l}>{l}</span>
			{/each}
		{/each}
	</div>
	<!-- Lecteurs d'écran : les indices en clair. -->
	<ul class="sr">
		{#each guesses as g, k (k)}
			<li>{g.guess} : {[...g.guess].map((l, i) => `${l} ${['absente', 'mal placée', 'bien placée'][g.marks[i]]}`).join(', ')}</li>
		{/each}
	</ul>

	{#if canPlay && left > 0}
		<form
			method="POST"
			action="?/guess"
			use:enhance={() => {
				sending = true;
				return async ({ update }) => {
					await update();
					typed = '';
					sending = false;
				};
			}}
		>
			{#if preview}{#each guesses as g, k (k)}<input type="hidden" name="previous" value={g.guess} />{/each}{/if}
			<div class="entry">
				<input
					name="guess"
					aria-label="Ton essai, {length} lettres"
					autocomplete="off"
					autocapitalize="characters"
					spellcheck="false"
					maxlength={length}
					value={typed}
					oninput={(e) => (typed = normalizeWord(e.currentTarget.value).slice(0, length))}
				/>
				<button class="btn" type="submit" disabled={typed.length !== length || sending}>{sending ? '…' : 'ESSAYER'}</button>
			</div>
			<div class="keys">
				{#each KEYS as row (row)}
					<div class="krow">
						{#each row as l (l)}
							<button type="button" class="key {best.has(l) ? MARK[best.get(l)!] : ''}" onclick={() => type(l)}>{l}</button>
						{/each}
						{#if row.length === 6}<button type="button" class="key wide" aria-label="Effacer" onclick={() => (typed = typed.slice(0, -1))}>⌫</button>{/if}
					</div>
				{/each}
			</div>
			<p class="muted">Vert : bien placée · jaune : ailleurs dans le mot · gris : absente. Trouvé à cet essai : {pct} % des points.</p>
		</form>
	{/if}
</div>

<style>
	.word { display: flex; flex-direction: column; gap: 14px; align-items: center; }
	.label { margin: 0; font-size: 22px; align-self: flex-start; }
	.grid { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 52px)); gap: 6px; width: 100%; justify-content: center; }
	.cell { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border: 3px solid #e2d8c8; border-radius: 10px; background: var(--white); font: 700 clamp(16px, 5vw, 26px) var(--font-title); text-transform: uppercase; }
	.cell.typing { border-color: var(--ink); }
	.cell.ok, .key.ok { background: var(--green); border-color: var(--ink); }
	.cell.present, .key.present { background: var(--gold); border-color: var(--ink); }
	.cell.absent, .key.absent { background: var(--grey); border-color: var(--ink); }
	form { width: 100%; display: flex; flex-direction: column; gap: 12px; align-items: center; }
	.entry { display: flex; gap: 10px; width: 100%; max-width: 480px; }
	.entry input { flex: 1; min-width: 0; font: 700 22px var(--font-title); letter-spacing: 0.2em; text-transform: uppercase; }
	.keys { display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 520px; }
	.krow { display: flex; gap: 4px; justify-content: center; }
	.key { flex: 1 1 0; max-width: 44px; min-height: 46px; padding: 0; border: 2.5px solid var(--ink); border-radius: 8px; background: var(--white); font: 700 16px var(--font-title); cursor: pointer; }
	.key.wide { max-width: 66px; flex-grow: 1.5; }
	.muted { margin: 0; text-align: center; }
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
