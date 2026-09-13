ARG NODE_VERSION=24.13.1
FROM node:${NODE_VERSION}-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN corepack enable && mkdir -p "$PNPM_HOME/bin"
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS prepare
WORKDIR /app
COPY package.json .
RUN pnpm add -g turbo
COPY . .
RUN turbo prune api --docker

FROM base AS builder
WORKDIR /app
ENV DATABASE_URL="postgres://chainsentry:chainsentry@localhost:5432/chainsentry"
COPY --from=prepare /app/out/json/ .
RUN pnpm install
COPY --from=prepare /app/out/full/ .
RUN cd packages/database && pnpm exec prisma generate
RUN pnpm --filter @repo/database build
RUN pnpm --filter api build

FROM base AS runner
WORKDIR /app
ENV HOME="/app"
ENV XDG_CACHE_HOME="/app/.cache"
ENV NPM_CONFIG_CACHE="/app/.npm"
RUN addgroup --system --gid 1001 expressjs
RUN adduser --system --uid 1001 expressjs
RUN mkdir -p /app/.cache /app/.npm && chown -R expressjs:expressjs /app/.cache /app/.npm
COPY --from=builder --chown=expressjs:expressjs /app .
USER expressjs
EXPOSE 3001
CMD ["sh", "-c", "cd packages/database && ./node_modules/.bin/prisma migrate deploy && cd /app && node apps/api/dist/index.js"]
