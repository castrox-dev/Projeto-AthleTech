# 🚀 Guia de Deploy - AthleTech

Este guia fornece instruções detalhadas para fazer o deploy da aplicação AthleTech em diferentes plataformas.

## 📋 Pré-requisitos

- Python 3.11+
- PostgreSQL (banco de dados)
- Conta em uma plataforma de deploy (Heroku, Railway, Render, etc.)
- Git configurado

## 🔧 Configuração Inicial

### 1. Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

#### Variáveis Obrigatórias

```env
SECRET_KEY=sua-secret-key-segura-aqui
DEBUG=False
ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

#### Variáveis Opcionais (mas recomendadas)

```env
# CORS
CORS_ALLOWED_ORIGINS=https://seu-dominio.com
CSRF_TRUSTED_ORIGINS=https://seu-dominio.com

# Segurança
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Pagamentos
MERCADOPAGO_ACCESS_TOKEN=seu-token
MERCADOPAGO_PUBLIC_KEY=sua-chave-publica
MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com/api/payments/mercadopago/webhook/
PIX_KEY=sua-chave-pix
```

### 2. Gerar Secret Key

Para gerar uma secret key segura:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 🎯 Deploy no Heroku

### 1. Instalar Heroku CLI

```bash
# Windows
# Baixe do site: https://devcenter.heroku.com/articles/heroku-cli

# Mac
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

### 2. Login e Criar App

```bash
heroku login
heroku create seu-app-athletech
```

### 3. Configurar Banco de Dados

```bash
# Adicionar addon do PostgreSQL
heroku addons:create heroku-postgresql:mini

# Verificar DATABASE_URL
heroku config:get DATABASE_URL
```

### 4. Configurar Variáveis de Ambiente

```bash
heroku config:set SECRET_KEY="sua-secret-key"
heroku config:set DEBUG=False
heroku config:set ALLOWED_HOSTS="seu-app.herokuapp.com"
heroku config:set CORS_ALLOWED_ORIGINS="https://seu-app.herokuapp.com"
heroku config:set CSRF_TRUSTED_ORIGINS="https://seu-app.herokuapp.com"
heroku config:set SECURE_SSL_REDIRECT=True
heroku config:set MERCADOPAGO_ACCESS_TOKEN="seu-token"
heroku config:set MERCADOPAGO_PUBLIC_KEY="sua-chave-publica"
```

### 5. Deploy

```bash
git push heroku main
```

### 6. Executar Migrações

```bash
heroku run python manage.py migrate
heroku run python manage.py collectstatic --noinput
heroku run python manage.py createsuperuser
```

### 7. Abrir App

```bash
heroku open
```

## 🚂 Deploy no Railway

### 1. Conectar Repositório

1. Acesse [Railway.app](https://railway.app)
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Escolha seu repositório

### 2. Configurar Banco de Dados

1. Clique em "New" → "Database" → "Add PostgreSQL"
2. Railway criará automaticamente a variável `DATABASE_URL`

### 3. Configurar Variáveis de Ambiente

No painel do Railway, vá em "Variables" e adicione:

```
SECRET_KEY=sua-secret-key
DEBUG=False
ALLOWED_HOSTS=seu-app.railway.app
CORS_ALLOWED_ORIGINS=https://seu-app.railway.app
CSRF_TRUSTED_ORIGINS=https://seu-app.railway.app
SECURE_SSL_REDIRECT=True
```

### 4. Configurar Build e Start Commands

Railway detecta automaticamente o `Procfile`, mas você pode configurar manualmente:

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn academia_project.wsgi:application`

### 5. Deploy

O deploy é automático quando você faz push para o repositório.

### 6. Executar Migrações

No painel do Railway, vá em "Deployments" → "View Logs" → "Run Command":

```bash
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

## 🎨 Deploy no Render

### 1. Criar Novo Web Service

1. Acesse [Render.com](https://render.com)
2. Clique em "New" → "Web Service"
3. Conecte seu repositório GitHub

### 2. Configurar Serviço

- **Name**: `athletech-backend`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
- **Start Command**: `gunicorn academia_project.wsgi:application`

### 3. Configurar Banco de Dados

1. Clique em "New" → "PostgreSQL"
2. Copie a `DATABASE_URL` gerada
3. Adicione como variável de ambiente no Web Service

### 4. Configurar Variáveis de Ambiente

No painel do serviço, vá em "Environment" e adicione:

```
SECRET_KEY=sua-secret-key
DEBUG=False
ALLOWED_HOSTS=seu-app.onrender.com
CORS_ALLOWED_ORIGINS=https://seu-app.onrender.com
CSRF_TRUSTED_ORIGINS=https://seu-app.onrender.com
SECURE_SSL_REDIRECT=True
DATABASE_URL=<URL_DO_POSTGRESQL>
```

### 5. Deploy

O deploy é automático. Após o primeiro deploy, execute:

```bash
# Via SSH ou via Dashboard → Shell
python manage.py migrate
python manage.py createsuperuser
```

## 🔒 Configurações de Segurança para Produção

### Checklist de Segurança

- [ ] `DEBUG=False` em produção
- [ ] `SECRET_KEY` única e segura
- [ ] `ALLOWED_HOSTS` configurado corretamente
- [ ] `SECURE_SSL_REDIRECT=True` (força HTTPS)
- [ ] `SESSION_COOKIE_SECURE=True` (cookies apenas via HTTPS)
- [ ] `CSRF_COOKIE_SECURE=True` (CSRF apenas via HTTPS)
- [ ] `SECURE_HSTS_SECONDS=31536000` (HSTS habilitado)
- [ ] `CORS_ALLOW_ALL_ORIGINS=False` (CORS restritivo)
- [ ] Credenciais do banco apenas em variáveis de ambiente
- [ ] Tokens de API apenas em variáveis de ambiente

## 📦 Comandos Úteis

### Coletar Arquivos Estáticos

```bash
python manage.py collectstatic --noinput
```

### Executar Migrações

```bash
python manage.py migrate
```

### Criar Superusuário

```bash
python manage.py createsuperuser
```

### Verificar Configurações

```bash
python manage.py check --deploy
```

### Ver Logs (Heroku)

```bash
heroku logs --tail
```

## 🐛 Troubleshooting

### Erro: "DisallowedHost"

**Solução**: Adicione seu domínio em `ALLOWED_HOSTS`:

```env
ALLOWED_HOSTS=seu-dominio.com,www.seu-dominio.com
```

### Erro: "Static files not found"

**Solução**: Execute:

```bash
python manage.py collectstatic --noinput
```

### Erro: "Database connection failed"

**Solução**: Verifique se `DATABASE_URL` está configurada corretamente e se o banco está acessível.

### Erro: "CSRF verification failed"

**Solução**: Adicione seu domínio em `CSRF_TRUSTED_ORIGINS`:

```env
CSRF_TRUSTED_ORIGINS=https://seu-dominio.com
```

## 📚 Recursos Adicionais

- [Documentação do Django Deploy](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [Documentação do Heroku](https://devcenter.heroku.com/articles/getting-started-with-python)
- [Documentação do Railway](https://docs.railway.app/)
- [Documentação do Render](https://render.com/docs)

## 📞 Suporte

Para problemas ou dúvidas sobre o deploy, consulte:
- Logs da aplicação
- Documentação da plataforma escolhida
- Issues do repositório

---

**Nota**: Este guia assume que você já tem um banco de dados PostgreSQL configurado. Se não tiver, configure um antes de fazer o deploy.

