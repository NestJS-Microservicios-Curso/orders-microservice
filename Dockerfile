FROM node:22-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS dev
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "start:dev"]

FROM node:22-alpine AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Prune dev dependencies for a lean runtime, then restore the Prisma CLI (a
# devDependency) so `prisma migrate deploy` runs at startup without npx
# downloading an unpinned version. `--no-save` keeps package manifests intact.
RUN PRISMA_VERSION="$(node -p "require('./package-lock.json').packages['node_modules/prisma'].version")" \
    && npm prune --production \
    && npm install --no-save "prisma@${PRISMA_VERSION}"

FROM node:22-alpine AS runner
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/prisma.config.ts ./prisma.config.ts

USER node

EXPOSE 3002

CMD ["sh", "-c", "npx --no-install prisma migrate deploy && node dist/main.js"]
