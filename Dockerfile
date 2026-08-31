# Use Node.js 20 LTS Alpine image for minimal size and security
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Copy package manifests
COPY package*.json ./

# Install production dependencies only and clean cache
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy source code with appropriate ownership
COPY --chown=node:node . .

# Run as non-root user for security
USER node

# Expose service port
EXPOSE 5000

# Container healthcheck using the built-in /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/health || exit 1

# Start the service
CMD ["node", "src/app.js"]
