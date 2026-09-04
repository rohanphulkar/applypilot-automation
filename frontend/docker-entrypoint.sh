#!/bin/sh
set -e

DOMAIN="${DOMAIN:-jobs.rohanphulkar.com}"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Ensure directories exist
mkdir -p /var/www/certbot
mkdir -p "$CERT_DIR"

# Check if certificate exists; if not, create fallback certificate to allow Nginx to start
if [ ! -f "$CERT_DIR/fullchain.pem" ] || [ ! -f "$CERT_DIR/privkey.pem" ]; then
    echo "==> [ApplyPilot Nginx] No SSL certificate found for $DOMAIN. Creating fallback certificate..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=$DOMAIN" >/dev/null 2>&1 || true
    echo "==> [ApplyPilot Nginx] Fallback certificate created at $CERT_DIR"
fi

exec "$@"
