#!/usr/bin/env bash
# ==============================================================================
# ApplyPilot — Let's Encrypt SSL Provisioning for jobs.rohanphulkar.com
# ==============================================================================
# Usage:
#   chmod +x init-letsencrypt.sh
#   ./init-letsencrypt.sh
# ==============================================================================

set -euo pipefail

DOMAIN="${DOMAIN:-jobs.rohanphulkar.com}"
EMAIL="${EMAIL:-hello@rohanphulkar.com}"
STAGING="${STAGING:-0}" # Set STAGING=1 to test against Let's Encrypt staging servers without hitting rate limits

echo "================================================================================"
echo " ApplyPilot SSL Certificate Provisioning"
echo " Domain:  $DOMAIN"
echo " Email:   $EMAIL"
echo " Staging: $STAGING"
echo "================================================================================"

# 1. Start all containers (including Nginx frontend)
echo "==> Step 1: Starting ApplyPilot Docker Compose stack..."
docker compose up -d

# 2. Wait for Nginx to be ready
echo "==> Step 2: Waiting for Nginx to initialize..."
sleep 5

# 3. Determine Let's Encrypt flags
STAGING_FLAG=""
if [ "$STAGING" != "0" ]; then
    echo "==> [Notice] Running in STAGING mode..."
    STAGING_FLAG="--staging"
fi

# 4. Request production certificate via Certbot webroot ACME challenge
echo "==> Step 3: Requesting SSL certificate from Let's Encrypt for $DOMAIN..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_FLAG \
    --email $EMAIL \
    -d $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

# 5. Reload Nginx configuration to adopt the new certificate
echo "==> Step 4: Reloading Nginx with the verified SSL certificate..."
docker compose exec frontend nginx -s reload

echo "================================================================================"
echo " SUCCESS: SSL Certificate for https://$DOMAIN is active and valid!"
echo " The Certbot background container will automatically renew certificates."
echo "================================================================================"
