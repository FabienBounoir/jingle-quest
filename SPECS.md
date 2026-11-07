# Calendrier de l'Avent : une quête par jour

> Statut : **v1, décisions validées le 2026-11-06**. Les points encore ouverts sont marqués ❓.

## 1. Vision

Un calendrier de l'Avent d'entreprise où chaque case ouvre **une question (la « quête du jour »)** sur l'entreprise : « Quel collaborateur a… ? », « Quel est le nom du projet qui… ? ». Les collaborateurs répondent depuis une liste avec autocomplétion. Un classement s'actualise en temps réel.

On en fait **un template** : rien n'est propre à Sopra Steria dans le code. Nom, logo, couleurs, fournisseur SSO, dates et questions se règlent par configuration ou par l'interface d'admin. Le modèle est **un déploiement par entreprise**.

## 2. Rôles

| Rôle | Qui | Droits |
|---|---|---|
| **Joueur** | Toute personne authentifiée par le SSO de l'entreprise | Voit le calendrier, répond aux questions, voit le classement |
| **Admin** | Emails listés dans `ADMIN_EMAILS` (variable d'environnement) | Tout ce qui précède, plus la gestion des questions, des listes, du calendrier, du branding et des stats |

## 3. Fonctionnalités

### 3.1 Calendrier

- Par défaut, du **1er au 24 décembre** (dates configurables).
- Option **« jours ouvrés uniquement »** (activée par défaut) : les samedis et dimanches ne font pas partie du calendrier. En 2026, cela fait **18 cases**.
- **Jours exclus** : l'admin peut exclure des dates à la main (jours fériés, séminaire…).
- **Heure d'ouverture** par défaut (ex. 09:00, fuseau `Europe/Paris`), modifiable jour par jour.
- États d'une case :
  - **Verrouillée** : compte à rebours, avec le nombre de personnes en attente en direct.
  - **Ouverte, jour J** : question et barème complet (bonus de rapidité compris).
  - **Ouverte, rattrapage** (jour passé, pas encore répondu) : on peut encore répondre, avec des points réduits.
  - **Répondue** : le joueur voit sa réponse et s'il a juste ou faux. La bonne réponse n'est **révélée qu'à la fin de l'événement**.
  - **Après la fin de l'événement** : tout se ferme et toutes les bonnes réponses sont révélées.

  On montre juste ou faux tout de suite parce que les points du classement le trahissent de toute façon. En revanche, on ne montre pas *quelle* est la bonne réponse, pour ne pas faciliter le partage entre collègues.

### 3.2 Questions

- Une question par jour : un intitulé et une **image optionnelle** (ex. « à qui est cette photo de bébé ? »).
- La question est liée à **une liste de réponses possibles**, avec **une ou plusieurs bonnes réponses** dans cette liste.
- Saisie côté joueur : un **champ avec autocomplétion** limité aux valeurs de la liste. Le joueur choisit une seule valeur.
- **Une seule tentative** par question (❓ par défaut, dis-moi si tu veux plusieurs tentatives avec une pénalité).

### 3.2 bis Types de question (ajoutés le 2026-11-06)

| Type | Côté joueur | Points |
|---|---|---|
| Liste | autocomplétion dans une liste (collaborateurs, projets…) | juste ou faux |
| QCM | 2 à 6 propositions à cliquer, saisies par l'admin | juste ou faux |
| Estimation | un nombre (unité optionnelle) | pile à 1 % = 100 %, à 10 % = 70 %, à 25 % = 40 % |
| Ordre | 3 à 5 éléments à classer avec ↑ ↓ | part des éléments à la bonne place |
| Zone | un clic sur l'image, l'admin a dessiné un rectangle | dedans = juste |
| Associer | 3 à 5 paires, un menu déroulant par ligne (colonne de droite mélangée) | part des paires justes |
| Photo floue | photo pixellisée que le joueur défloute lui-même (6 niveaux), réponse dans une liste | bonne réponse × 100 / 80 / 60 / 45 / 30 / 20 % selon le niveau atteint |

Les points partiels s'appliquent au barème complet, bonus de rapidité compris. La solution est stockée à part (`questions.solution`) et n'est jamais envoyée au navigateur avant la fin. Les éléments à ordonner sont mélangés à l'enregistrement, donc l'ordre affiché ne trahit rien. Code : `src/lib/server/questionTypes.ts`. La photo floue est pixellisée **côté serveur** (`src/lib/server/blur.ts`, sharp) au niveau atteint par le joueur, enregistré en base (table `reveals`) : recharger, changer d'onglet ou modifier l'adresse de l'image ne fait pas regagner de points.

### 3.3 Listes de réponses

- Ce sont des listes réutilisables, par exemple « Collaborateurs », « Projets », « Clients ».
- On les remplit à la main ou par **import CSV** (une valeur par ligne, doublons ignorés).
- Le client reçoit la liste des valeurs, **jamais** l'information de la bonne réponse. La validation se fait côté serveur.

### 3.4 Score et classement

- Bonne réponse le jour J : **100 points**, plus un **bonus de rapidité** qui décroît de façon linéaire de +50 à 0 pendant les `SPEED_BONUS_MINUTES` minutes après l'ouverture (60 par défaut).
- Bonne réponse en rattrapage : **50 points**, sans bonus de rapidité.
- Mauvaise réponse : 0 point.
- En cas d'égalité, le joueur qui a répondu le plus vite en cumulé passe devant.
- **Classement individuel** sous le **vrai nom** (nom affiché par le SSO). Deux vues : général et jour J.
- Toutes ces valeurs (100, 50, +50, 60 min) sont modifiables par l'admin.

### 3.5 Temps réel (SSE)

Un flux SSE `/events` par client. Il pousse :
- `presence` : le nombre de personnes en attente de la prochaine case.
- `answered` : le nombre de personnes ayant répondu à la question du jour.
- `leaderboard` : le top 20 et le rang du joueur, envoyés **au plus une fois par seconde** même si plusieurs réponses arrivent.
- `open` : le signal d'ouverture d'une case, que le client traite en rechargeant la question.

Un heartbeat part toutes les 25 s, pour passer le timeout de la route OpenShift.

### 3.6 Notifications push

- Web-push à l'ouverture de chaque case, sur opt-in du joueur (on reprend `web-push` et le service worker de `rae`).
- L'envoi est déclenché par le même timer serveur que l'événement `open`.

### 3.7 Administration

- CRUD des questions : texte, image, liste, bonnes réponses, jour, avec un aperçu.
- CRUD des listes et import CSV.
- Calendrier : dates, jours ouvrés, jours exclus, heure par défaut et heures par jour.
- Barème de score.
- Branding : nom de l'événement, logo, couleur principale.
- Statistiques : participants, taux de bonnes réponses par question, temps moyen de réponse.
- **Aperçu admin** : l'admin peut voir et tester une question avant son ouverture, sans que sa réponse compte.
- **Export et import JSON** de la configuration (questions, listes, barème, branding, images en base64), pour partager le template entre entreprises.

### 3.8 Authentification

On reprend **le module OIDC de `rae`** (`src/lib/server/auth/oidc.ts`) :
- OIDC générique (Entra ID, Keycloak, GitLab…) avec code d'autorisation et PKCE, découverte via `.well-known`.
- Variables `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` et `ALLOWED_EMAIL_DOMAINS` (optionnelle).
- On ajoute la lecture du claim `name`, pour le nom affiché (aujourd'hui `rae` ne lit que l'email).
- Le compte est créé à la première connexion. La session vit dans un cookie httpOnly, avec un id de session stocké en base.

## 4. Hors périmètre v1

- Quêtes qui ne sont pas des questions (photo à envoyer, défi validé par un admin).
- Classement par équipe et pseudos.
- Multi-tenant dans une seule instance.
- Lots et récompenses.
- Internationalisation (FR seulement, mais les textes sont regroupés dans un seul fichier).

## 5. Architecture

### 5.1 Stack (alignée sur `rae`)

- **SvelteKit 2 / Svelte 5** avec `adapter-node` : une seule image.
- **PostgreSQL** et **Drizzle**.
- `zod`, `pino`, `web-push`.

### 5.2 Déploiement : 1 pod applicatif et 1 Postgres, sans Redis

Cible : moins de 2 000 joueurs.

| Composant | Requests | Limits |
|---|---|---|
| app (1 replica) | 250m / 384Mi | 1500m / 1Gi |
| postgres (StatefulSet + PVC 1Gi) | 250m / 512Mi | 1000m / 1Gi |
| **Total** | **0,5 cœur / 896Mi** | **2,5 cœurs / 2 Go**, sur un quota de 4 / 4 Go |

- L'état temps réel vit **en mémoire** dans le pod : connexions SSE, compteurs, classement en cache. Il se reconstruit depuis Postgres au démarrage.
- Les réponses sont toujours écrites en base avant l'acquittement, donc un redémarrage ne perd que les compteurs de présence, et les clients se reconnectent tout seuls.
- `strategy: Recreate` avec un seul replica. **On ne déploie pas entre 8h45 et 10h** pendant l'événement.
- Pour passer à 2 pods, on ajouterait Redis pour le pub/sub et la présence. Ce n'est pas nécessaire à cette échelle.

### 5.3 Modèle de données

```
users                (id, email UNIQUE, display_name, created_at, last_login_at, is_admin_preview?)
sessions             (id, user_id, expires_at)
answer_lists         (id, name)
list_items           (id, list_id, label, UNIQUE(list_id, label))
days                 (date PK, opens_at timestamptz, excluded bool, question_id?)
questions            (id, text, image bytea?, image_mime?, list_id)
question_answers     (question_id, item_id, PK(question_id, item_id))   -- bonnes réponses (une ou plusieurs)
answers              (user_id, question_id, item_id, is_correct, points, answered_at,
                      PK(user_id, question_id))                       -- une seule tentative, garantie par la base
push_subscriptions   (id, user_id, endpoint UNIQUE, keys jsonb)
settings             (key PK, value jsonb)                            -- branding, barème, calendrier
```

- Les **images sont stockées en `bytea`** dans Postgres. Il y en a une vingtaine de quelques centaines de Ko, ce qui évite un PVC de plus et les met dans les mêmes sauvegardes. Elles sont servies avec un cache HTTP long.
- Le classement est calculé par `SUM(points) GROUP BY user_id`, recalculé en mémoire après chaque réponse puis diffusé (au plus une fois par seconde).

### 5.4 Anti-triche

- Les bonnes réponses ne quittent jamais le serveur avant la fin de l'événement.
- Une question n'est servie qu'après `opens_at`, et c'est l'horloge du serveur qui fait foi.
- L'unicité de la réponse est garantie par la clé primaire. Les points sont calculés côté serveur, à partir de l'heure de réception.
- Limite de débit sur `POST /answer`.

### 5.5 OpenShift

On reprend la structure `openshift/` de `rae` (Kustomize, BuildConfig, ImageStream, Deployment, Service, Route, Secret, ConfigMap, StatefulSet Postgres).
- Annotation sur la Route : `haproxy.router.openshift.io/timeout: 1h`, pour les connexions SSE.
- On ne reprend pas les cronjobs, le MCP ni Loki.

## 6. Design (validé le 2026-11-06)

Maquettes desktop et mobile : https://claude.ai/artifact/EP6fhFvr4kzijeN6Nedxnd

**Direction artistique : « Noël cartoon griffonné »** (esprit jeu de soirée dessiné, pas une copie d'un jeu existant).

| Token | Valeur |
|---|---|
| Fond | `--bg` **paramétrable** (défaut `#C62F3B`), motif de griffonnages blancs à 18 % (SVG `<pattern>`) |
| Encre (texte, contours, ombres) | `#2A1A1F` |
| Papier (cartes) | `#FFF8EC`, blanc `#FFFFFF` |
| Or (CTA, sélection) | `#FFC542` |
| Vert (réussi) | `#7FD1A6` (fond), `#1F8A55` (badge) |
| Gris (raté) | `#D9CFC0` |
| Contours | 3 à 4 px, couleur encre |
| Ombres | décalées, pleines, sans flou : `6px 6px 0 encre` (cartes), `0 5px 0 encre` (boutons) |
| Rayons | 14 à 30 px, parfois irréguliers (`26px 30px 24px 32px`) |
| Titres | **Fredoka** 600/700. Sur le fond coloré : blanc, `text-shadow` encre et contour 1,5 px |
| Texte | **Nunito** 700 |
| Annotations | **Gochi Hand** (« la case du jour t'attend… ») |

Principes :
- Les éléments sont légèrement inclinés (de -3° à +2°) comme des stickers. Les boutons s'enfoncent au clic (`translateY(3px)`).
- Les cases non ouvertes sont des **paquets cadeaux** avec un ruban croisé et le numéro dans un rond. La case du jour est dorée et porte un sticker « OUVRE-MOI » qui remue.
- Résultats : carte verte si c'est juste, grise si c'est raté, bordure en pointillés si la case est à rattraper.
- **Mobile d'abord** : barre d'onglets en bas (Calendrier, Classement, Prochaine), boutons pleine largeur de 56 px minimum, grille de 3 cases. L'admin reste prévu pour ordinateur.
- Une seule couleur de marque est réglable (le fond). Le logo est un emplacement sticker.

## 7. Architecture détaillée

> Cette section remplace l'esquisse du §5.3 quand les deux divergent.

### 7.1 Vue d'ensemble

```
Navigateur ──HTTPS──▶ Route OpenShift (edge TLS, timeout 1h)
                         │
                         ▼
              ┌───────────────────────────────┐
              │  Pod app (SvelteKit / Node)   │
              │  ├─ pages SSR + form actions  │
              │  ├─ POST /api/answer          │
              │  ├─ GET  /api/events  (SSE)   │──▶ IdP OIDC (Entra…)
              │  └─ live.ts (mémoire) :       │──▶ services push (FCM, Mozilla, Apple)
              │     hub SSE, classement,      │
              │     ticker d'ouverture        │
              └──────────────┬────────────────┘
                             ▼
                   Postgres (StatefulSet + PVC)
```

Un seul process Node porte tout l'état temps réel. Postgres est la source de vérité : tout ce qui est en mémoire se reconstruit au démarrage.

### 7.2 Schéma (Drizzle)

```ts
users            id uuid PK · email text UNIQUE · display_name text · created_at · last_login_at
sessions         id text PK (sha256 du token) · user_id → users · expires_at
answer_lists     id serial PK · name text UNIQUE
list_items       id serial PK · list_id → answer_lists ON DELETE CASCADE · label text
                 UNIQUE(list_id, label)
questions        id serial PK · text text · list_id → answer_lists · image bytea? · image_mime text?
question_answers question_id → questions ON DELETE CASCADE · item_id → list_items
                 PK(question_id, item_id)                          -- 1..n bonnes réponses
days             date date PK · opens_at timestamptz · excluded bool default false
                 question_id → questions UNIQUE? · notified_at timestamptz?
answers          user_id → users · question_id → questions · item_id → list_items
                 is_correct bool · points int · elapsed_ms int · answered_at timestamptz default now()
                 PK(user_id, question_id) · INDEX(question_id)
push_subscriptions  id · user_id → users · endpoint UNIQUE · p256dh · auth · user_agent
settings         id int PK CHECK (id = 1)                          -- une seule ligne, typée
                 event_name · bg_color · logo bytea? · logo_mime?
                 timezone default 'Europe/Paris' · start_date · end_date · workdays_only bool
                 default_open_time time default '09:00'
                 points_correct 100 · points_catchup 50 · bonus_max 50 · bonus_minutes 60
```

- `settings` est une ligne typée plutôt qu'un key/value en jsonb : la base valide les types, et il n'y a pas de parsing à écrire.
- `days` est (re)générée par le bouton admin « Générer le calendrier » à partir de `start_date`, `end_date` et `workdays_only`. C'est un upsert qui conserve `question_id` et `excluded`. On modifie l'heure d'ouverture d'un jour en changeant son `opens_at`.
- On vérifie dans l'application que les bonnes réponses appartiennent à la liste de la question (ponytail : une FK composite serait possible, mais c'est 3 lignes de code contre une colonne dénormalisée).
- **Fin de l'événement** : `end_date` à 23:59:59 dans `timezone`. C'est à ce moment que les réponses sont révélées et que le rattrapage se ferme.

### 7.3 Règles de jeu (`src/lib/server/game.ts`, pur et testé)

```ts
// "jour J" = réponse avant minuit (timezone) du jour d'ouverture
points(correct, sameDay, elapsedMs, s) =
  !correct  ? 0
: !sameDay  ? s.points_catchup
:             s.points_correct + Math.round(s.bonus_max * Math.max(0, 1 - elapsedMs / (s.bonus_minutes * 60_000)))
```

**État d'une case pour un joueur** : `wrapped` (avant `opens_at`), `today` (ouverte, pas répondue, jour J), `catch` (ouverte, pas répondue, jour passé, avant la fin), `ok` / `ko` (répondue), `closed` (pas répondue, après la fin).

**Soumission d'une réponse** (`POST /api/answer {questionId, itemId}`), en une transaction :
1. La question est rattachée à un jour avec `opens_at <= now()` et `now() < fin`. Sinon : 403.
2. `itemId` appartient à la liste de la question. Sinon : 400.
3. `INSERT … ON CONFLICT DO NOTHING RETURNING`. Si aucune ligne n'est renvoyée : 409, déjà répondu.
4. Réponse au client : `{ correct, points, rank }`. On ne renvoie **jamais** la bonne réponse.
5. On appelle `live.onAnswer(userId, points, …)`, qui met à jour le classement en mémoire.

Les fuseaux horaires sont gérés avec `Intl.DateTimeFormat` pour calculer le décalage. Il n'y a pas de dépendance de dates (`Temporal` n'est pas encore dans Node 22).

### 7.4 Temps réel (`src/lib/server/live.ts`)

**État en mémoire :**
- `clients: Set<{ userId, view, send }>` : une entrée par onglet ouvert.
- `board: Map<userId, { name, points, ok, elapsedTotal }>` : chargé au démarrage par une seule requête `GROUP BY`, puis incrémenté à chaque réponse.
- `todayBoard` et `answeredToday` : remis à zéro à chaque ouverture.
- `dirty` : un drapeau qui indique que quelque chose a changé depuis la dernière diffusion.

**Une boucle `setInterval(1000)`** fait tout :
1. Si `now >= prochain opens_at` : diffuse `open`, envoie le push si `notified_at` est vide (un redémarrage n'envoie donc pas de doublon), puis remet à zéro les compteurs du jour.
2. Si `dirty` : trie `board` (2 000 entrées, moins d'1 ms), puis diffuse `leaderboard`, `answered` et `presence`.
3. Toutes les 25 s : envoie un commentaire `: ping` pour garder la connexion ouverte à travers la route.

Ponytail : une boucle à 1 s plutôt qu'un `setTimeout` calé sur l'heure d'ouverture, pour éviter la limite de 24,8 jours de `setTimeout` et la dérive d'horloge. Comme la boucle tourne de toute façon, c'est elle qui ouvre les cases.

**`GET /api/events?view=calendar|question|waiting`** renvoie un `ReadableStream` (`text/event-stream`) :

| Événement | Contenu | Quand |
|---|---|---|
| `state` | instantané complet (les 4 ci-dessous) | à la connexion et à la reconnexion |
| `presence` | `{ waiting, online }`, en utilisateurs distincts | au plus 1/s si ça change |
| `answered` | `{ count }` pour la question du jour | au plus 1/s |
| `leaderboard` | `{ top: 20 premiers, me: { rank, points } }` | au plus 1/s |
| `open` | `{ date }` | à l'heure d'ouverture : le client recharge la page |

- Le top 20 est sérialisé une seule fois, et on y ajoute la ligne `me` de chaque client.
- On ouvre **une seule connexion SSE par onglet**, dans le layout, pas dans chaque composant.
- `retry: 3000` est envoyé au début du flux. Le navigateur se reconnecte tout seul après un redémarrage du pod.

### 7.5 Routes

**Joueur** (layout `(app)` qui exige une session) :

| Route | Rôle |
|---|---|
| `/` | Calendrier : états des cases, stats, mini-classement |
| `/jour/[date]` | Quête. Redirige vers `/attente` si la case n'est pas encore ouverte |
| `/attente` | Compte à rebours et présence |
| `/classement` | Général et jour J |
| `/img/q/[id]` | Image de la question, servie seulement si elle est ouverte ou si on est admin. `Cache-Control: private, max-age=86400` |

**Authentification** (copiée de `rae`) :

| Route | Rôle |
|---|---|
| `/login` | Bouton SSO |
| `/auth/login` | Redirection vers l'IdP |
| `/auth/callback` | Retour de l'IdP |
| `/logout` | Déconnexion |

**API :**

| Route | Rôle |
|---|---|
| `POST /jour/[date]?/answer` | Envoi d'une réponse (form action : protection CSRF de SvelteKit, marche aussi sans JS) |
| `GET /api/events` | Flux SSE |
| `POST`/`DELETE /api/push` | Abonnement aux notifications push |
| `GET /healthz` | Sonde OpenShift |

**Admin** (layout `admin` qui exige `isAdmin`). Tout passe par des **form actions** SvelteKit, sans API séparée :

| Route | Rôle |
|---|---|
| `/admin` | Tableau de bord : les jours, avec leur question ou non |
| `/admin/questions/[id]` | Éditeur de question : texte, image, liste, bonnes réponses, jour |
| `/admin/listes`, `/admin/listes/[id]` | CRUD des listes et import CSV |
| `/admin/reglages` | Calendrier, barème, marque, bouton « Générer le calendrier » |
| `/admin/stats` | Statistiques |
| `/admin/donnees` | Export et import JSON du template, remise à zéro des réponses |

**Aperçu admin** : sur `/jour/[date]`, un admin peut ouvrir la case avant l'heure. Sa réponse est validée, mais elle **n'est pas enregistrée** (`dryRun`).

### 7.6 Ce qui est mis en cache

| Donnée | Où | Invalidation |
|---|---|---|
| Question avec les valeurs de sa liste (sans les bonnes réponses) | `Map` en mémoire, par question | quand l'admin la modifie |
| Settings | variable de module | quand l'admin enregistre |
| Discovery OIDC | promesse en mémoire | redémarrage du pod (comme dans `rae`) |

À 9h00, les ~2 000 chargements de `/jour/[date]` ne font donc qu'une seule lecture en base pour la question, plus la lecture de la réponse du joueur.

### 7.7 Arborescence

```
src/
  hooks.server.ts              session → locals.user, locals.isAdmin (ADMIN_EMAILS)
  service-worker.ts            push uniquement (affiche la notif, ouvre /)
  lib/server/
    config.ts                  lecture de l'env (rien de propre à une entreprise)
    db/index.ts, db/schema.ts
    auth/oidc.ts               copié de rae, + claim `name` → display_name
    auth/session.ts, tokens.ts copiés de rae (sans workspace)
    game.ts + game.test.ts     points, états des cases, fuseau, soumission
    live.ts                    hub SSE, classement, ticker
    push.ts                    copié de rae
  lib/components/              Gift, Sticker, Button, Combobox, Countdown, Podium, TabBar
  lib/live.svelte.ts           EventSource unique → $state partagé
  routes/…                     cf. §7.5
static/fonts/                  Fredoka, Nunito, Gochi Hand en woff2, auto-hébergées
openshift/                     kustomize : deployment, service, route, configmap, secret,
                               postgres statefulset, buildconfig, imagestream
```

Différences avec `rae` :
- **Création du compte à la première connexion SSO** (upsert sur l'email). Dans `rae`, il faut une invitation préalable. Le filtrage se fait par le tenant de l'IdP et par `ALLOWED_EMAIL_DOMAINS`.
- **Polices auto-hébergées** plutôt que Google Fonts : ça évite un appel à Google, qui pose problème au regard du RGPD (jurisprudence en Europe), et ça marche derrière un proxy d'entreprise.
- **Combobox** : un petit composant maison plutôt qu'un `<datalist>` natif. Le natif ne se stylise pas, se comporte différemment sur mobile et n'empêche pas de saisir une valeur hors de la liste.

### 7.8 Configuration (env)

```
DATABASE_URL, ORIGIN (= BASE_URL publique)
OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET
ALLOWED_EMAIL_DOMAINS   (optionnel, ex. "soprasteria.com,groupe.com")
ADMIN_EMAILS            (ex. "a@x.com,b@x.com")
VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT   (optionnel : sans clés, pas de push)
```

Tout le reste (dates, barème, marque) se règle dans l'admin, ce qui permet de déployer le même template partout.

### 7.9 Exploitation

- **Migrations** au démarrage du pod (`scripts/migrate.js` de `rae`). On utilise `strategy: Recreate`, comme dans `rae`.
- **Sondes** : readiness et liveness sur `/healthz`, qui fait un `SELECT 1`.
- **Redémarrage pendant le jeu** : le classement est reconstruit depuis la base (moins de 100 ms), les clients SSE se reconnectent en 3 s et reçoivent `state`. Aucune réponse n'est perdue, puisqu'elle est en base avant l'acquittement.
- **Gel des déploiements** de 8h45 à 10h00 pendant l'événement. Ce n'est pas outillé, juste une règle d'équipe.
- **Pool Postgres** : 10 connexions, largement suffisant.

### 7.10 Tests

- `game.test.ts` : barème (bonus linéaire, rattrapage, bornes), états des cases, calcul de `opens_at` sur un changement d'heure, unicité de la réponse.
- Un test d'intégration de `POST /api/answer` contre un Postgres de test : 200, 409 en cas de doublon, 403 si la case n'est pas ouverte.
- Le temps réel est vérifié à la main avec 2 onglets. Un test de charge k6 (reprendre `rae/loadtest`) est à faire si on veut valider les 2 000 connexions SSE.

## 8. Prochaines étapes

1. ~~Design~~ ✅
2. ~~Architecture~~ ✅
3. **Implémentation**, par lots livrables :
   1. Socle : SvelteKit, Drizzle, schéma, auth SSO, OpenShift.
   2. Admin : listes et CSV, questions, réglages, génération du calendrier.
   3. Jeu : calendrier, quête, soumission, barème.
   4. Temps réel : SSE, classement live, présence, ticker d'ouverture.
   5. Push, export/import, stats.
