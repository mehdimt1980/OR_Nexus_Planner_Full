# Stage 1: Build the Next.js application
FROM node:20-slim AS builder
WORKDIR /app

# Install pnpm for dependency management if you switch, otherwise npm is fine
# RUN npm install -g pnpm

ENV NODE_ENV build

# Copy package.json and lock file
COPY package.json ./
# If using pnpm, copy pnpm-lock.yaml. If npm, package-lock.json (already handled by package*.json)
# COPY pnpm-lock.yaml ./
COPY package-lock.json ./


# Install dependencies
RUN npm install --frozen-lockfile
# Or: RUN pnpm install --frozen-lockfile

COPY . .

# Build the Next.js application
# The standalone output will be in .next/standalone
RUN npm run build

# Stage 2: Production image
# Use a more minimal base image for the runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV production
# ENV PORT 3000 # Next.js will default to 3000, but you can set it if needed

# Copy the standalone output from the builder stage
COPY --from=builder /app/.next/standalone ./
# Copy the public and static folders from the build output
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js application
# The server.js file is created by the standalone output
CMD ["node", "server.js"]
