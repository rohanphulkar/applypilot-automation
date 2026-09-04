# ==============================================================================
# ApplyPilot Frontend Dockerfile — React SPA Build + Nginx Gateway with SSL
# ==============================================================================

# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production serve stage with Nginx
FROM nginx:alpine

# Install OpenSSL and curl for fallback SSL cert generation and health checks
RUN apk add --no-cache openssl curl

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx configuration and entrypoint script
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
