#!/bin/bash
# Script de inicialização para Railway
# Este script é executado automaticamente pelo Railway para iniciar a aplicação

echo "🚀 Iniciando aplicação AthleTech..."

# Iniciar o servidor Gunicorn
echo "🌐 Iniciando servidor Gunicorn na porta ${PORT:-8000}..."
exec gunicorn academia_project.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${WEB_CONCURRENCY:-2} \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info

