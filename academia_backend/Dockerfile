# Dockerfile para deploy no Railway
# Use este arquivo se o Nixpacks não funcionar automaticamente

FROM python:3.11.9-slim

# Definir diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY . .

# Coletar arquivos estáticos
RUN python manage.py collectstatic --noinput || true

# Expor porta (Railway usa variável PORT)
EXPOSE $PORT

# Comando de inicialização
CMD ["bash", "start.sh"]

