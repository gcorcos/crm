#!/bin/sh
set -e
API_URL="${VITE_API_URL:-/api}"
echo "Injecting API URL: $API_URL"
find /usr/share/nginx/html -name '*.js' -exec sed -i "s|__VITE_API_URL_PLACEHOLDER__|$API_URL|g" {} \;
exec nginx -g 'daemon off;'
