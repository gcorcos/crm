#!/bin/sh
set -e
BACKEND="${BACKEND_URL:-/api}"
echo "Setting API URL: $BACKEND"
echo "window.__API_URL__ = '$BACKEND';" > /usr/share/nginx/html/config.js
exec nginx -g 'daemon off;'
