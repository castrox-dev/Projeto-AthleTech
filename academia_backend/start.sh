#!/bin/bash
# Script de inicialização para Railway
# Este script é executado automaticamente pelo Railway para iniciar a aplicação

set -e  # Sair se algum comando falhar

echo "🚀 Iniciando aplicação AthleTech..."

# Executar migrações (opcional - pode ser feito manualmente também)
echo "📦 Executando migrações do banco de dados..."
python manage.py migrate --noinput || echo "⚠️  Aviso: Erro ao executar migrações (pode ser normal se já foram executadas)"

# Coletar arquivos estáticos
echo "📁 Coletando arquivos estáticos..."
python manage.py collectstatic --noinput || echo "⚠️  Aviso: Erro ao coletar arquivos estáticos"

# Iniciar o servidor Gunicorn
echo "🌐 Iniciando servidor Gunicorn..."
exec gunicorn academia_project.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${WEB_CONCURRENCY:-2} \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info

