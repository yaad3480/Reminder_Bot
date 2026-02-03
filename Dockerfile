# Stage 1: Builder
FROM node:18-bullseye-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runner
FROM node:18-bullseye-slim

# Install tzdata for Timezone Support
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/*
ENV TZ=Asia/Kolkata

WORKDIR /app

# Copy package files and install production dependencies
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/admin ./admin

# Expose port
EXPOSE 7860

CMD [ "npm", "start" ]
