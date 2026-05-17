#!/bin/bash
# deploy.sh — build glmps.upleb.uk and push dist/ to the server.
# Usage: ./deploy.sh

set -euo pipefail

SERVER="root@45.154.199.154"
SSH_PORT="2121"
REMOTE_PATH="/var/www/glmps.upleb.uk"

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "▸ building…"
if [ ! -d node_modules ]; then npm ci --silent; fi
npm run build

echo "▸ rsync → $SERVER:$REMOTE_PATH"
rsync -avz --delete \
  -e "ssh -p $SSH_PORT" \
  --exclude='.DS_Store' \
  dist/ "$SERVER:$REMOTE_PATH/"

echo "▸ chown www-data"
ssh -p "$SSH_PORT" "$SERVER" "chown -R www-data:www-data $REMOTE_PATH"

echo "✓ live at https://glmps.upleb.uk"
echo
echo "If /r/<naddr> still 404s, install the SPA-fallback vhost:"
echo "  scp -P $SSH_PORT nginx-glmps.upleb.uk.conf $SERVER:/etc/nginx/sites-available/glmps.upleb.uk"
echo "  ssh -p $SSH_PORT $SERVER 'nginx -t && systemctl reload nginx'"
