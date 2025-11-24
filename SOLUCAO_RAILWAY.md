# 🔧 Solução: Railway não encontra start.sh

## Problema

O Railway está analisando a **raiz do repositório** (onde está `README.md` e a pasta `academia_backend/`), mas os arquivos do Django estão dentro de `academia_backend/`.

O erro mostra que o Railway vê:
```
./
├── academia_backend/
├── .gitattributes
└── README.md
```

Mas precisa encontrar:
- `requirements.txt`
- `manage.py`
- `start.sh`

## ✅ Solução Aplicada

Criei arquivos de configuração na **raiz do repositório** que indicam ao Railway onde está o projeto:

1. **`railway.toml`** (raiz) - Configura o Railway
2. **`nixpacks.toml`** (raiz) - Configura o Nixpacks para usar `academia_backend/`
3. **`Procfile`** (raiz) - Alternativa de inicialização

## 🚀 Próximos Passos

### Opção 1: Configurar Root Directory (Recomendado)

No painel do Railway:
1. Vá em **Settings** → **Root Directory**
2. Configure como: `academia_backend`
3. Salve e faça redeploy

### Opção 2: Usar os Arquivos da Raiz

Os arquivos criados na raiz já apontam para `academia_backend/`:
- `railway.toml` - Usa `cd academia_backend && bash start.sh`
- `nixpacks.toml` - Todos os comandos usam `cd academia_backend`

**Faça commit e push:**
```bash
git add railway.toml nixpacks.toml Procfile
git commit -m "Adicionar configurações do Railway na raiz"
git push origin main
```

O Railway deve detectar automaticamente e fazer o build corretamente.

## 📝 Verificação

Após o deploy, verifique nos logs:
- ✅ Build deve completar sem erros
- ✅ Deve mostrar "Iniciando servidor Gunicorn"
- ✅ Aplicação deve estar rodando

## 🔍 Se Ainda Não Funcionar

1. **Verifique o Root Directory:**
   - No Railway: Settings → Root Directory
   - Deve estar como: `academia_backend`

2. **Verifique os logs completos:**
   - Vá em Deployments → Clique no deploy
   - Veja os logs completos do build

3. **Use Dockerfile como alternativa:**
   - O `Dockerfile` em `academia_backend/` também está configurado
   - Configure no Railway: Settings → Build Command (deixe vazio)
   - E no `railway.toml` (raiz): `builder = "DOCKERFILE"`

