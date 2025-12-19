FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY knexfile.js ./knexfile.js
COPY migrations ./migrations
COPY seeds ./seeds
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN mkdir -p /app/logs
RUN chmod +x /app/docker-entrypoint.sh
EXPOSE 10001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
