# Configuração de Variáveis de Ambiente

Este guia explica como configurar as variáveis de ambiente do projeto de forma segura.

## 📋 Arquivo .env

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

### 1. Copiar o arquivo de exemplo

```bash
# No Windows PowerShell
Copy-Item .env.example .env

# No Linux/Mac
cp .env.example .env
```

### 2. Configurar as variáveis

Edite o arquivo `.env` e preencha as seguintes variáveis:

#### Mercado Pago (Obrigatório para pagamentos)

```env
# Access Token (credencial privada - NUNCA exponha no frontend)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...ou-TEST-...

# Public Key (pode ser exposta - é segura para frontend)
MERCADOPAGO_PUBLIC_KEY=TEST-...ou-APP_USR-...

# URL do webhook (URL pública do seu servidor)
MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com.br

# Usar MCP (opcional, default: false)
MERCADOPAGO_USE_MCP=false
```

**Como obter as credenciais:**
1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Vá em "Suas integrações" > "Suas credenciais"
3. Copie o **Access Token** e a **Public Key**

#### Outras configurações importantes

```env
# Django
SECRET_KEY=sua-chave-secreta-aqui
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# PIX (método simples - fallback)
PIX_KEY=sua-chave-pix-aqui
```

## 🔒 Segurança

### ✅ O que pode ser exposto no frontend:
- `MERCADOPAGO_PUBLIC_KEY` - É segura, pode ser exposta

### ❌ O que NUNCA deve ser exposto:
- `MERCADOPAGO_ACCESS_TOKEN` - Credencial privada
- `SECRET_KEY` - Chave secreta do Django
- `DATABASE_URL` - Credenciais do banco de dados
- Qualquer senha ou token privado

## 🚀 Como funciona

1. **Backend (settings.py)**:
   - Lê todas as variáveis do `.env`
   - `MERCADOPAGO_ACCESS_TOKEN` fica apenas no backend
   - `MERCADOPAGO_PUBLIC_KEY` é exposta via API pública

2. **Frontend (checkout.js)**:
   - Busca `MERCADOPAGO_PUBLIC_KEY` via endpoint `/api/config/public/`
   - Nunca acessa o Access Token diretamente

3. **API de Configuração**:
   - Endpoint: `GET /api/config/public/`
   - Retorna apenas dados seguros para o frontend
   - Não requer autenticação

## 📝 Exemplo de .env

```env
# Django
SECRET_KEY=dev-secret-key-change-me-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require
DB_SSL_REQUIRE=True

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890-123456-abcdef1234567890abcdef1234567890-123456789
MERCADOPAGO_PUBLIC_KEY=APP_USR-1234567890-123456-abcdef1234567890abcdef1234567890-123456789
MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com.br
MERCADOPAGO_USE_MCP=false

# PIX
PIX_KEY=sua-chave-pix-aqui

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_CREDENTIALS=True
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## ⚠️ Importante

1. **Nunca commite o arquivo `.env`** no Git
2. Use `.env.example` como template
3. Em produção, configure as variáveis no servidor (Heroku, Railway, etc.)
4. Use credenciais de **teste** durante desenvolvimento
5. Use credenciais de **produção** apenas em ambiente de produção

## 🔍 Verificação

Para verificar se as variáveis estão configuradas:

```bash
# No Python/Django shell
python manage.py shell
>>> from django.conf import settings
>>> print(settings.MERCADOPAGO_ACCESS_TOKEN[:10] + '...')  # Mostra apenas início
>>> print(settings.MERCADOPAGO_PUBLIC_KEY[:10] + '...')
```

## 📚 Recursos

- [Documentação python-decouple](https://github.com/henriquebastos/python-decouple)
- [Variáveis de Ambiente no Django](https://docs.djangoproject.com/en/stable/topics/settings/#using-environment-variables)

