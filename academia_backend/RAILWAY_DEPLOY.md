# 🚂 Guia de Deploy no Railway - AthleTech

Este guia passo a passo vai te ajudar a fazer o deploy da aplicação AthleTech no Railway.

## 📋 Pré-requisitos

- Conta no [Railway](https://railway.app) (pode usar GitHub para login)
- Repositório Git configurado
- PostgreSQL (pode criar no Railway)

## 🚀 Passo a Passo

### 1. Preparar o Repositório

Certifique-se de que todos os arquivos estão commitados:

```bash
git add .
git commit -m "Preparar para deploy no Railway"
git push origin main
```

### 2. Criar Novo Projeto no Railway

1. Acesse [railway.app](https://railway.app) e faça login
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Autorize o Railway a acessar seu GitHub (se necessário)
5. Selecione o repositório `Projeto-AthleTech`
6. Selecione a branch `main` (ou a branch que você quer fazer deploy)

### 3. Configurar o Serviço Web

O Railway vai detectar automaticamente que é um projeto Django/Python. Configure:

1. Clique no serviço criado
2. Vá em **"Settings"** → **"Root Directory"**
3. Defina como: `academia_backend`
4. Vá em **"Settings"** → **"Start Command"**
5. Deixe vazio (o Railway vai usar o `Procfile` automaticamente)

### 4. Criar Banco de Dados PostgreSQL

1. No projeto, clique em **"New"** → **"Database"** → **"Add PostgreSQL"**
2. O Railway criará automaticamente um banco PostgreSQL
3. A variável `DATABASE_URL` será criada automaticamente

### 5. Configurar Variáveis de Ambiente

No painel do serviço web, vá em **"Variables"** e adicione as seguintes variáveis:

#### Variáveis Obrigatórias

```env
SECRET_KEY=<gere-uma-secret-key-segura>
DEBUG=False
ALLOWED_HOSTS=*.railway.app,seu-dominio.com
```

**Para gerar SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### Variáveis Recomendadas

```env
# CORS - Substitua pelo domínio do seu frontend
CORS_ALLOWED_ORIGINS=https://seu-frontend.vercel.app,https://seu-dominio.com
CSRF_TRUSTED_ORIGINS=https://seu-frontend.vercel.app,https://seu-dominio.com

# Segurança
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# Mercado Pago (se usar)
MERCADOPAGO_ACCESS_TOKEN=seu-access-token
MERCADOPAGO_PUBLIC_KEY=sua-public-key
MERCADOPAGO_WEBHOOK_URL=https://seu-app.railway.app/api/payments/mercadopago/webhook/

# PIX (se usar)
PIX_KEY=sua-chave-pix
```

**Nota**: O Railway cria automaticamente a variável `DATABASE_URL` quando você adiciona o PostgreSQL. Não precisa criar manualmente.

### 6. Configurar Build e Deploy

O Railway detecta automaticamente:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: Lê do `Procfile` (já configurado)

Se precisar ajustar manualmente:
- **Build Command**: `cd academia_backend && pip install -r requirements.txt && python manage.py collectstatic --noinput`
- **Start Command**: `cd academia_backend && gunicorn academia_project.wsgi:application`

### 7. Executar Migrações

Após o primeiro deploy, execute as migrações:

1. No painel do serviço, vá em **"Deployments"**
2. Clique nos três pontos (⋯) do último deploy
3. Selecione **"View Logs"**
4. Clique em **"Run Command"** (ou use o terminal)
5. Execute:

```bash
cd academia_backend
python manage.py migrate
python manage.py collectstatic --noinput
```

### 8. Criar Superusuário

Execute via terminal do Railway:

```bash
cd academia_backend
python manage.py createsuperuser
```

Siga as instruções para criar o usuário admin.

### 9. Carregar Dados Iniciais (Opcional)

Se quiser carregar dados iniciais (planos, exercícios):

```bash
cd academia_backend
python scripts/create_initial_data.py
```

### 10. Verificar Deploy

1. No painel do serviço, vá em **"Settings"**
2. Em **"Domains"**, você verá a URL do seu app (ex: `seu-app.railway.app`)
3. Clique na URL para abrir
4. Teste acessando: `https://seu-app.railway.app/admin/`

## 🔧 Configurações Adicionais

### Domínio Personalizado

1. Vá em **"Settings"** → **"Domains"**
2. Clique em **"Custom Domain"**
3. Adicione seu domínio
4. Configure os registros DNS conforme instruções
5. Atualize `ALLOWED_HOSTS` e `CORS_ALLOWED_ORIGINS` com o novo domínio

### Variáveis de Ambiente do Banco

O Railway cria automaticamente:
- `DATABASE_URL` - URL completa de conexão
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - Variáveis individuais

### Logs

Para ver os logs em tempo real:
1. Vá em **"Deployments"**
2. Clique no deploy ativo
3. Veja os logs em tempo real

## 🐛 Troubleshooting

### Erro: "DisallowedHost"

**Solução**: Adicione `*.railway.app` em `ALLOWED_HOSTS`:
```env
ALLOWED_HOSTS=*.railway.app,seu-dominio.com
```

### Erro: "Static files not found"

**Solução**: Execute:
```bash
python manage.py collectstatic --noinput
```

### Erro: "Database connection failed"

**Solução**: 
1. Verifique se o PostgreSQL está rodando
2. Verifique se `DATABASE_URL` está configurada (é criada automaticamente)
3. Verifique os logs do serviço

### Erro: "Module not found"

**Solução**: Verifique se o `Root Directory` está configurado como `academia_backend`

### Erro: "Port already in use"

**Solução**: O Railway usa a variável `PORT` automaticamente. Não precisa configurar manualmente.

## 📊 Monitoramento

### Verificar Status do Serviço

- **"Deployments"**: Veja histórico de deploys
- **"Metrics"**: Veja uso de CPU, memória, etc.
- **"Logs"**: Veja logs em tempo real

### Comandos Úteis via Terminal

```bash
# Ver logs
railway logs

# Executar comando
railway run python manage.py migrate

# Abrir shell
railway shell
```

## 🔒 Checklist de Segurança

Antes de colocar em produção, verifique:

- [ ] `DEBUG=False`
- [ ] `SECRET_KEY` única e segura
- [ ] `ALLOWED_HOSTS` configurado corretamente
- [ ] `SECURE_SSL_REDIRECT=True`
- [ ] `SESSION_COOKIE_SECURE=True`
- [ ] `CSRF_COOKIE_SECURE=True`
- [ ] `CORS_ALLOW_ALL_ORIGINS=False`
- [ ] Credenciais apenas em variáveis de ambiente
- [ ] Tokens de API apenas em variáveis de ambiente

## 📚 Recursos

- [Documentação do Railway](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Documentação Django Deploy](https://docs.djangoproject.com/en/stable/howto/deployment/)

## ✅ Próximos Passos

Após o deploy bem-sucedido:

1. Configure um domínio personalizado (opcional)
2. Configure CI/CD para deploy automático
3. Configure monitoramento e alertas
4. Faça backup regular do banco de dados
5. Configure webhooks do Mercado Pago (se usar)

---

**Dica**: O Railway oferece um plano gratuito generoso. Para projetos maiores, considere fazer upgrade.

