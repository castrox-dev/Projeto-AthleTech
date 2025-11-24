# ⚡ Quick Start - Deploy no Railway

Guia rápido para fazer deploy no Railway em 5 minutos.

## 🚀 Passos Rápidos

### 1. Preparar Repositório
```bash
git add .
git commit -m "Preparar para deploy"
git push origin main
```

### 2. Criar Projeto no Railway
1. Acesse [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Selecione seu repositório
4. Configure **Root Directory** como: `academia_backend`

### 3. Adicionar PostgreSQL
1. **New** → **Database** → **Add PostgreSQL**
2. A variável `DATABASE_URL` será criada automaticamente

### 4. Configurar Variáveis de Ambiente

No painel do serviço, vá em **Variables** e adicione:

```env
SECRET_KEY=<gere-uma-key>
DEBUG=False
ALLOWED_HOSTS=*.railway.app
```

**Gerar SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 5. Executar Migrações

Após o primeiro deploy, execute:

```bash
# Via terminal do Railway ou "Run Command"
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

### 6. Pronto! 🎉

Acesse sua aplicação em: `https://seu-app.railway.app`

---

**Dúvidas?** Veja o guia completo em [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md)

