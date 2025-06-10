# Dockerfile for Next.js Application

# 1. Base Image for Building
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package.json and lock files
COPY package.json ./
COPY package-lock.json ./
# If you use yarn, copy yarn.lock instead and change npm ci to yarn install
# COPY yarn.lock ./

# Install dependencies
RUN npm ci
# If using yarn:
# RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Set environment variables for build time if needed
# ARG NEXT_PUBLIC_SOME_VAR
# ENV NEXT_PUBLIC_SOME_VAR=$NEXT_PUBLIC_SOME_VAR

# Build the Next.js application
RUN npm run build

# 2. Production Image
FROM node:18-alpine
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy built assets from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Expose the port Next.js runs on
EXPOSE 3000

# Command to run the application
# The default Next.js start script uses port 3000.
# Azure App Service for Containers and Azure Container Apps will set the PORT environment variable.
# We can use that or stick to 3000 and map it. For flexibility:
CMD ["npm", "start"]
