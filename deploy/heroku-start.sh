#!/bin/bash
set -e

# Substitute only $PORT in nginx config (leave nginx variables like $host, $uri intact)
envsubst '$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Initialize database
python -m flask --app wsgi:app init-db

# Start gunicorn in background
gunicorn -w 2 -k gthread --timeout 120 -b 127.0.0.1:8000 wsgi:app &

# Wait for gunicorn to be ready
sleep 2

# Start nginx in foreground
exec nginx -g "daemon off;"
