web: cd packages/backend && python -m flask --app wsgi:app init-db && gunicorn -w 2 -k gthread --timeout 120 -b 0.0.0.0:$PORT wsgi:app
