/** Normalisation partagée client/serveur (autocomplétion, comparaisons) : minuscules, sans accents. */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
