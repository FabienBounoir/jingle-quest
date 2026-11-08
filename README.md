# 🎁 Jingle Quest

Calendrier de l'Avent d'entreprise : une quête par jour ouvré, réponses à autocomplétion, classement en temps réel, connexion SSO. Template réutilisable dans n'importe quelle entreprise : rien de propre à une entreprise dans le code. Le SSO vient de l'env, tout le reste (questions, dates, barème, marque) se règle dans l'admin.

- Specs, design et architecture : [SPECS.md](SPECS.md)
- Déploiement OpenShift : [openshift/README.md](openshift/README.md)

## Dev local

Prérequis : Node 22 et Docker.

```sh
cp .env.example .env
docker compose up -d          # Postgres (port 5433) + faux fournisseur SSO (port 8080)
npm install
npm run db:migrate
npm run dev                   # http://localhost:5173
```

### SSO en local

Le `docker-compose` lance un faux fournisseur OIDC ([mock-oauth2-server](https://github.com/navikt/mock-oauth2-server)) : c'est le vrai flux SSO, sans Entra. Sur sa page de connexion :

- **username** : n'importe quoi ;
- **claims** : l'identité voulue, par exemple
  ```json
  { "email": "admin@exemple.com", "name": "Camille Martin" }
  ```

`admin@exemple.com` est admin par défaut (`ADMIN_EMAILS` dans `.env`).

### Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de dev |
| `npm test` | Tests unitaires (vitest) |
| `npm run check` | Vérification TypeScript / Svelte |
| `npm run db:generate` | Génère une migration après une modification de `src/lib/server/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations |
| `npm run db:studio` | Explorateur de base |

## Crédits

- Son des boutons (`static/sounds/click.mp3`) : « cool bubble » par Roddz, flashkit.com (libre de droits).
- Compte à rebours : son synthétisé dans le navigateur (`src/lib/sound.svelte.ts`), aucun fichier.

## Licences des polices

Fredoka, Nunito et Gochi Hand sont sous licence SIL Open Font License 1.1, auto-hébergées dans `static/fonts/` (aucun appel à Google Fonts).
