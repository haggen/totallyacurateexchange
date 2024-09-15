FROM oven/bun:1.1-alpine

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "start"]

WORKDIR /app
COPY package.json bun.lockb .
RUN bun install

COPY . .