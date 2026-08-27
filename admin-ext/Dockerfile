FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner

# [SEC] modo producao: o handler de erro padrao do Express deixa de incluir
# stack trace nas respostas de 500.
ENV NODE_ENV=production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# [SEC] sem privilegio: um servidor HTTP nao precisa de root.
RUN chown -R node:node /app
USER node

EXPOSE 3092

CMD ["node", "dist/index.js"]
