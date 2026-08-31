# Multi-stage Dockerfile for Genuine Electronics Marketplace
# Stage 1: Build frontend and server bundle
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies for compilation
RUN npm install

# Copy all repository source files
COPY . .

# Compile Vite client and esbuild server
RUN npm run build

# Stage 2: Production runtime environment
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled bundles and assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data

# Expose web service port
EXPOSE 3000

# Start production server
CMD ["node", "dist/server.cjs"]
