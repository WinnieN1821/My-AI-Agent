FROM node:24.16.0-alpine3.22 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24.16.0-alpine3.22 AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node public ./public

USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]
