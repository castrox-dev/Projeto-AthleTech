# 🔧 Solução: DisallowedHost no Railway

## Problema

O Django está rejeitando o host `athletech.up.railway.app` porque não está na lista `ALLOWED_HOSTS`.

## Solução Rápida (Recomendada)

No painel do Railway, adicione a variável de ambiente:

**Variável:** `ALLOWED_HOSTS`  
**Valor:** `athletech.up.railway.app,*.railway.app,*.up.railway.app`

Ou apenas o domínio específico:

**Variável:** `ALLOWED_HOSTS`  
**Valor:** `athletech.up.railway.app`

## Solução Automática

O código já foi atualizado para aceitar automaticamente domínios do Railway quando detecta que está rodando no Railway (via variável `PORT`).

No entanto, o Django não aceita wildcards diretamente. A melhor solução é adicionar o domínio específico à variável de ambiente.

## Passos

1. No painel do Railway, vá em **Variables**
2. Adicione ou edite a variável `ALLOWED_HOSTS`
3. Configure como: `athletech.up.railway.app`
4. Salve e aguarde o redeploy automático

## Alternativa: Usar RAILWAY_PUBLIC_DOMAIN

O Railway pode criar automaticamente a variável `RAILWAY_PUBLIC_DOMAIN`. Se ela existir, será adicionada automaticamente à lista `ALLOWED_HOSTS`.

## Verificação

Após configurar, acesse `https://athletech.up.railway.app` e o erro deve desaparecer.

