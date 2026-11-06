// Partagé client/serveur. Une date de calendrier (YYYY-MM-DD) n'a pas de fuseau : on la lit à midi UTC.
const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const short = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** « jeudi 10 décembre » */
export const dayLabel = (date: string) => fmt.format(new Date(`${date}T12:00:00Z`));
/** « jeu. 10 déc. » */
export const dayShort = (date: string) => short.format(new Date(`${date}T12:00:00Z`));
