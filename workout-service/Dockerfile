FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY scripts ./scripts
COPY seeds ./seeds
EXPOSE 3002
CMD ["sh", "-c", "npx prisma db push && node scripts/seed-exercises.js && node src/server.js"]
