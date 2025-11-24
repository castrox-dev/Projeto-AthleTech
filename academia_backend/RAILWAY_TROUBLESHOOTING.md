# 🔧 Troubleshooting - Railway Deploy

## Erro: "Error creating build plan with Railpack"

Este erro geralmente ocorre quando o Railway não consegue detectar automaticamente como construir o projeto.

### Soluções:

#### 1. Verificar Root Directory
No painel do Railway:
- Vá em **Settings** → **Root Directory**
- Configure como: `academia_backend`
- Salve e faça redeploy

#### 2. Verificar Arquivos de Configuração
Certifique-se de que os seguintes arquivos existem em `academia_backend/`:
- ✅ `requirements.txt`
- ✅ `manage.py`
- ✅ `Procfile` ou `start.sh`
- ✅ `nixpacks.toml` (opcional, mas ajuda)
- ✅ `.python-version` ou `runtime.txt`

#### 3. Usar Dockerfile (Alternativa)
Se o Nixpacks continuar falhando, você pode criar um `Dockerfile`:

```dockerfile
FROM python:3.11.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

EXPOSE $PORT

CMD ["bash", "start.sh"]
```

E no `railway.toml`:
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
```

#### 4. Verificar Estrutura do Projeto
O Railway precisa encontrar:
- `requirements.txt` na raiz do Root Directory
- `manage.py` na raiz do Root Directory
- Arquivos do Django (`academia_project/`, `academia/`)

#### 5. Logs de Build
Verifique os logs completos do build:
- Vá em **Deployments** → Clique no deploy falhado
- Veja os logs completos para identificar o erro específico

## Outros Erros Comuns

### Erro: "Module not found"
**Solução**: Verifique se o Root Directory está configurado corretamente como `academia_backend`

### Erro: "Port already in use"
**Solução**: O Railway usa a variável `PORT` automaticamente. Não configure manualmente.

### Erro: "Static files not found"
**Solução**: Execute `python manage.py collectstatic --noinput` manualmente após o deploy

### Erro: "Database connection failed"
**Solução**: 
1. Verifique se o PostgreSQL está rodando
2. Verifique se `DATABASE_URL` está configurada (é criada automaticamente quando você adiciona PostgreSQL)

## Configuração Manual do Build

Se o auto-detect não funcionar, configure manualmente no Railway:

1. Vá em **Settings** → **Build Command**
2. Configure: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
3. Vá em **Settings** → **Start Command**
4. Configure: `bash start.sh`

## Contato

Se o problema persistir:
1. Verifique os logs completos
2. Verifique a documentação do Railway: https://docs.railway.app
3. Entre no Discord do Railway para suporte

