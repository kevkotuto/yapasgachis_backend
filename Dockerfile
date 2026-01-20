# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Disable husky during install
ENV HUSKY=0

# Install all dependencies
RUN npm ci --ignore-scripts

# Copy prisma schema
COPY src/infrastructure/database/prisma ./src/infrastructure/database/prisma

# Generate Prisma Client
RUN npx prisma generate --schema=./src/infrastructure/database/prisma/schema.prisma

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma and build tools for bcrypt
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Disable husky during install
ENV HUSKY=0

# Install production dependencies (without husky scripts, but allow bcrypt to compile)
RUN npm ci --only=production --ignore-scripts && npm rebuild bcrypt

# Copy built application, prisma, and bootstrap
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/infrastructure/database/prisma ./src/infrastructure/database/prisma
COPY bootstrap.js ./

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/sh -m nodejs

# Create uploads and logs directories
RUN mkdir -p uploads logs && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3004

CMD ["node", "bootstrap.js"]
