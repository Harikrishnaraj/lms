# Builds and runs @lms/api (NestJS) out of the pnpm/Turborepo monorepo.
# Railway's Root Directory is left at the repo root so this Dockerfile's
# build context can see the whole workspace (apps/api depends on
# @lms/database and @lms/config via pnpm workspace links).
FROM node:22-slim

# Prisma's query engine needs OpenSSL; node:22-slim doesn't ship it, which
# otherwise leaves Prisma silently guessing a libssl version at runtime.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.34.3 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter=@lms/api... build

ENV NODE_ENV=production

CMD ["node", "apps/api/dist/main.js"]
