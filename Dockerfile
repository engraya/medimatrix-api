FROM node:25-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
# Retain downloaded packages across builds, including interrupted installs.
RUN --mount=type=cache,target=/root/.npm \
    test -f package-lock.json && npm ci --prefer-offline --no-audit --no-fund \
    --fetch-retries=5
COPY . .
# prisma.config.ts loads app validation; generation needs no live services.
# These placeholders apply only to this command, never to the runtime environment.
RUN POSTGRES_PASSWORD=build-only \
    JWT_SECRET=build-only-placeholder-not-for-runtime \
    OTP_PEPPER=build-only-placeholder-not-for-runtime \
    STORAGE_PROVIDER=local \
    npx prisma generate
RUN npm run build

FROM build AS production-deps
RUN --mount=type=cache,target=/root/.npm \
    npm prune --omit=dev --prefer-offline --no-audit --no-fund --fetch-retries=5

# Migration image keeps the CLI and the engine downloaded in the build stage.
FROM build AS migrate
USER node
ENTRYPOINT ["node", "dist/scripts/db/env.js", "migrate", "deploy"]

FROM node:25-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV CONTAINER=true
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/prisma ./prisma
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:4000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/src/server.js"]
