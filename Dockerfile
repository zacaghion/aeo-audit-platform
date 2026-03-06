FROM node:20-alpine AS base
RUN apk add --no-cache openssl

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npx esbuild prisma/seed.ts --bundle --platform=node --outfile=prisma/seed.js --external:@prisma/client --format=cjs --loader:.json=json
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy the standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy prisma schema, migrations, compiled seed, and seed data
COPY --from=builder /app/prisma ./prisma

# Copy Prisma engine binaries and CLI
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma

# Copy entrypoint
COPY --from=builder /app/scripts ./scripts
RUN chmod +x /app/scripts/entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/scripts/entrypoint.sh"]
