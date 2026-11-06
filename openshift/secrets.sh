#!/bin/sh
# Crée les deux secrets du namespace courant, à lancer une seule fois : `sh openshift/secrets.sh`
# Mot de passe Postgres et clés de notification (VAPID) générés ici, jamais affichés ni committés.
# Le SSO peut rester vide au premier déploiement ; le compléter ensuite avec :
#   oc set data secret/jingle-quest-secrets OIDC_ISSUER_URL=... OIDC_CLIENT_ID=... OIDC_CLIENT_SECRET=...
#   oc rollout restart deployment/jingle-quest
set -eu
NS="$(oc project -q)"
printf 'Namespace : %s — on continue ? [o/N] ' "$NS"; read -r ok; [ "$ok" = "o" ] || exit 1

PW="$(openssl rand -hex 24)"
KEYS="$(npx -y web-push generate-vapid-keys --json)"
PUB="$(printf '%s' "$KEYS" | node -pe "JSON.parse(require('fs').readFileSync(0)).publicKey")"
PRIV="$(printf '%s' "$KEYS" | node -pe "JSON.parse(require('fs').readFileSync(0)).privateKey")"

oc create secret generic jingle-quest-db-secret \
  --from-literal=POSTGRESQL_USER=jq --from-literal=POSTGRESQL_PASSWORD="$PW" --from-literal=POSTGRESQL_DATABASE=jq
oc create secret generic jingle-quest-secrets \
  --from-literal=DATABASE_URL="postgres://jq:$PW@jingle-quest-db:5432/jq" \
  --from-literal=OIDC_ISSUER_URL='' --from-literal=OIDC_CLIENT_ID='' --from-literal=OIDC_CLIENT_SECRET='' \
  --from-literal=VAPID_PUBLIC="$PUB" --from-literal=VAPID_PRIVATE="$PRIV"
echo "Secrets créés dans $NS."
