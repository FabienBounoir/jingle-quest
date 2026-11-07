// Partagé client/serveur : barème de la photo floue. Le joueur défloute lui-même ; chaque niveau
// réduit la part des points qu'une bonne réponse peut rapporter (bonus de rapidité compris).
/** Part des points max selon le niveau de défloutage (0 = le plus flou, dernier = nette). */
export const BLUR_MULTIPLIERS = [1, 0.8, 0.6, 0.45, 0.3, 0.2];
export const BLUR_STAGES = BLUR_MULTIPLIERS.length;
export const LAST_STAGE = BLUR_STAGES - 1;
