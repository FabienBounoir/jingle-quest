# Déploiement OpenShift

Budget du namespace : **4 cœurs / 4 Go**. Ce projet consomme au maximum :

| Pod | Requests | Limits |
|---|---|---|
| app (`jingle-quest`, 1 replica) | 250m / 384Mi | 1500m / 1Gi |
| Postgres (`jingle-quest-db`) | 250m / 512Mi | 1000m / 1Gi |
| build (pendant `oc start-build`) | 500m / 768Mi | 1000m / 1.5Gi |

## Premier déploiement

```sh
oc project <ton-namespace>

# 1. Secrets (jamais committés : secret.yaml et db-secret.yaml ne sont que des modèles)
PW="$(openssl rand -hex 24)"
oc create secret generic jingle-quest-db-secret \
  --from-literal=POSTGRESQL_USER=jq --from-literal=POSTGRESQL_PASSWORD="$PW" --from-literal=POSTGRESQL_DATABASE=jq
oc create secret generic jingle-quest-secrets \
  --from-literal=DATABASE_URL="postgres://jq:$PW@jingle-quest-db:5432/jq" \
  --from-literal=OIDC_ISSUER_URL='https://login.microsoftonline.com/<tenant-id>/v2.0' \
  --from-literal=OIDC_CLIENT_ID='...' --from-literal=OIDC_CLIENT_SECRET='...' \
  --from-literal=VAPID_PUBLIC='' --from-literal=VAPID_PRIVATE=''

# 2. Accès au dépôt GitHub privé (token « fine-grained », Contents: read-only, sur ce seul dépôt)
oc create secret generic jingle-quest-git --type=kubernetes.io/basic-auth \
  --from-literal=username=<login-github> --from-literal=password=<token>

# 3. Tout le reste
oc apply -k openshift/

# 4. Reporter le host de la Route dans ORIGIN, et déclarer la redirect URI chez l'IdP
HOST="$(oc get route jingle-quest -o jsonpath='{.spec.host}')"
oc patch configmap jingle-quest-config --type merge -p "{\"data\":{\"ORIGIN\":\"https://$HOST\"}}"
echo "Redirect URI à déclarer : https://$HOST/auth/callback"
# Éditer aussi ADMIN_EMAILS (et ALLOWED_EMAIL_DOMAINS si besoin) dans le ConfigMap, puis :
oc rollout restart deployment/jingle-quest
```

Le BuildConfig se lance tout seul à la création (trigger ConfigChange). L'image produite redéploie l'app (trigger d'image sur le Deployment). Les migrations s'appliquent au démarrage du pod.

## Mettre à jour

```sh
oc start-build jingle-quest --follow
```

⚠️ **Pendant l'événement, ne pas déployer entre 8h45 et 10h00.** Un seul replica en `Recreate` signifie quelques secondes de coupure, et les clients se reconnectent tout seuls. Mieux vaut éviter que ça tombe sur l'ouverture d'une case.
