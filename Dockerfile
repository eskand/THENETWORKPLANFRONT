# ============================================================
#  NetPlus — image du front (React 19 / Vite, servi par nginx)
#
#    docker build -t netplus-front .
#    docker run --rm -p 8081:8080 -e API_UPSTREAM=http://host.docker.internal:8080 netplus-front
#
#  Étape 1 : npm ci + vite build, dans une image Node jetable.
#  Étape 2 : nginx sans privilège (écoute 8080, tourne en non-root) sert
#  dist/ et relaie /v1 vers l'API. Le front appelle l'API en URL relative
#  (src/api/client.js : baseURL '/v1'), exactement comme le proxy de Vite
#  en développement : même origine, donc pas de CORS à configurer.
#
#  API_UPSTREAM est remplacé au démarrage dans deploy/nginx/default.conf.template
#  (mécanisme /etc/nginx/templates de l'image officielle). Dans Kubernetes
#  c'est le Service de l'API : http://netplus-back:8080.
# ============================================================

# ---------- 1. build ----------
FROM node:24-alpine AS build
WORKDIR /src
ENV CI=true NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- 2. image finale ----------
FROM nginxinc/nginx-unprivileged:1.29-alpine
LABEL org.opencontainers.image.title="netplus-front" \
      org.opencontainers.image.source="https://github.com/eskand/THENETWORKPLANFRONT"

ENV API_UPSTREAM=http://netplus-back:8080
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 8080
