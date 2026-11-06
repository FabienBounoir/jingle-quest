# Image de production (adapter-node), repris de rae. Tourne sous UID arbitraire (SCC restricted d'OpenShift).
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
# Jamais utilisée pour une vraie connexion (client postgres lazy) : seulement pour que l'analyse
# des routes au build ne plante pas sur `DATABASE_URL is not set`.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# adapter-node refuse par défaut les requêtes de plus de 512 Ko : trop peu pour une image de question
# (2 Mo) ou l'import d'un template avec ses images (une vingtaine × 2 Mo, en base64).
ENV BODY_SIZE_LIMIT=64M
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate.js ./scripts/migrate.js
RUN chgrp -R 0 /app && chmod -R g=u /app
USER 1001
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.js && node build"]
