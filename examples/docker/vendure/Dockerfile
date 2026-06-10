# syntax=docker/dockerfile:1

FROM node:24-bookworm AS plugin
WORKDIR /plugin

COPY package.json package-lock.json tsconfig.json biome.json README.md CHANGELOG.md LICENSE ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY src ./src
RUN npm run build

FROM node:24-bookworm AS deps
WORKDIR /app

COPY examples/docker/vendure/package.json examples/docker/vendure/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:24-bookworm
WORKDIR /app
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules

COPY --from=plugin /plugin/package.json ./node_modules/@sumup/vendure-plugin/package.json
COPY --from=plugin /plugin/README.md ./node_modules/@sumup/vendure-plugin/README.md
COPY --from=plugin /plugin/CHANGELOG.md ./node_modules/@sumup/vendure-plugin/CHANGELOG.md
COPY --from=plugin /plugin/LICENSE ./node_modules/@sumup/vendure-plugin/LICENSE
COPY --from=plugin /plugin/dist ./node_modules/@sumup/vendure-plugin/dist

COPY examples/docker/vendure/ ./
RUN chmod +x ./entrypoint.sh

EXPOSE 3000 3002
ENTRYPOINT ["./entrypoint.sh"]
