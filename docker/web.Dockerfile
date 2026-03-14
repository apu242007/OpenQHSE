# ── Web Frontend ─────────────────────────────────────────────
FROM node:22-alpine AS web-deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── Builder ──────────────────────────────────────────────────
FROM node:22-alpine AS web-builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY --from=web-deps /app/node_modules ./node_modules
COPY . .

# next.config.ts requires Next.js 15+; remove it so .mjs is picked up instead
RUN rm -f apps/web/next.config.ts

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter=@openqhse/web run build

# ── Runner ───────────────────────────────────────────────────
FROM node:22-alpine AS web-runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=web-builder /app/apps/web/public ./apps/web/public
COPY --from=web-builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=web-builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
