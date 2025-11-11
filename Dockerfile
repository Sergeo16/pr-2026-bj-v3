FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Installer tsx globalement pour les migrations et seed
RUN npm install -g tsx

# Copier les fichiers publics
COPY --from=builder /app/public ./public

# Copier le build standalone (le contenu de standalone est copié à la racine)
# Cela inclut server.js, node_modules, package.json, etc.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copier les fichiers statiques dans .next/static
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copier les scripts et fichiers nécessaires pour les migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js

# Installer les dépendances nécessaires pour les scripts (dotenv, pg) dans node_modules
# Ces packages sont nécessaires pour les scripts de migration et seed
RUN npm install dotenv pg --save --prefix /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Avec Next.js standalone, server.js est à la racine après copie
CMD ["node", "server.js"]

