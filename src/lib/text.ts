/** Normalisation partagée client/serveur (autocomplétion, comparaisons) : minuscules, sans accents. */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/** Suffixe ordinal français : 1er, 2e, 3e… */
export const ordinal = (n: number) => (n === 1 ? 'er' : 'e');
