ARG NODE_VERSION=24.13.1
FROM node:${NODE_VERSION}-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PNPM_HOME/bin:$PATH"
RUN corepack enable && mkdir -p "$PNPM_HOME/bin"

FROM base AS prepare
WORKDIR /app
COPY package.json .
RUN pnpm add -g turbo
COPY . .
RUN turbo prune api --docker

FROM base AS builder
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN pnpm install
COPY --from=prepare /app/out/full/ .
RUN cd packages/database && pnpm exec prisma generate
RUN pnpm --filter @repo/database build
RUN pnpm --filter api build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 expressjs
RUN adduser --system --uid 1001 expressjs
COPY --from=builder --chown=expressjs:expressjs /app .
USER expressjs
EXPOSE 3001
CMD ["sh", "-c", "pnpm --filter @repo/database db:migrate && node apps/api/dist/index.js"]
