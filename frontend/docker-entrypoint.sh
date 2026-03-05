#!/bin/sh
set -e
BACKEND="${BACKEND_URL:-http://localhost:4000}"
echo "Proxying /api to: $BACKEND"
sed -i "s|BACKEND_URL_PLACEHOLDER|$BACKEND|g" /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
