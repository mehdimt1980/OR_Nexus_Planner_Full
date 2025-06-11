# Stage 1: Build the Next.js application
FROM node:20-slim AS builder
WORKDIR /app

# Ensure NODE_ENV is NOT set to production during build
ENV NODE_ENV=

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies including devDependencies
RUN npm ci

# Copy ALL source code
COPY . .

# Verify components exist (debug step)
RUN ls -la src/components/or-planner/ || echo "Components directory not found"

# Set NODE_ENV to production for the build
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 2: Production image
FROM node:20-slim AS runner
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output from the builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["node", "server.js"]
