# 🧪 Guia de Teste de Pagamento

Este guia fornece instruções passo a passo para testar o sistema de pagamento.

## 📋 Pré-requisitos

1. ✅ Arquivo `.env` configurado com credenciais do Mercado Pago
2. ✅ Servidor Django rodando: `python manage.py runserver`
3. ✅ Banco de dados com migrações aplicadas
4. ✅ Usuário de teste criado e logado

## 🔐 Configurar Credenciais

### 1. Obter Credenciais do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Faça login na sua conta
3. Vá em "Suas integrações" > "Suas credenciais"
4. Copie:
   - **Access Token** (credencial de produção ou teste)
   - **Public Key** (credencial de produção ou teste)

### 2. Configurar no .env

Edite o arquivo `.env` na raiz do projeto:

```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...ou-TEST-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...ou-TEST-...
MERCADOPAGO_WEBHOOK_URL=http://localhost:8000
MERCADOPAGO_USE_MCP=false
```

**Importante:** Use credenciais de **TESTE** durante desenvolvimento.

## 🧪 Teste 1: Verificar Configuração

### 1.1. Verificar se Public Key está sendo exposta

```bash
# No terminal
curl http://localhost:8000/api/config/public/
```

**Resposta esperada:**
```json
{
  "mercadopago_public_key": "TEST-..."
}
```

### 1.2. Verificar no navegador

1. Abra: http://localhost:8000/checkout/?plano_id=1&preco=99.90&method=cartao
2. Abra o Console do Desenvolvedor (F12)
3. Verifique se não há erros relacionados ao Mercado Pago
4. Verifique se `window.MERCADOPAGO_PUBLIC_KEY` está definido

## 🧪 Teste 2: Pagamento PIX

### 2.1. Preparação

1. Certifique-se de estar logado
2. Acesse a página de checkout com um plano selecionado

### 2.2. Testar Geração de PIX

1. Na página de checkout, selecione o método **PIX**
2. Clique em **"Gerar PIX"**
3. **Resultado esperado:**
   - Botão muda para "Gerando PIX..."
   - QR Code é exibido na tela
   - Código PIX é exibido para copiar
   - Polling inicia automaticamente

### 2.3. Verificar no Banco de Dados

```python
# No Django shell: python manage.py shell
from academia.models import Pedido
pedido = Pedido.objects.filter(metodo='pix').latest('criado_em')
print(f"Status: {pedido.status}")
print(f"MP Payment ID: {pedido.mercado_pago_payment_id}")
print(f"MP Status: {pedido.mercado_pago_status}")
```

### 2.4. Simular Pagamento (Sandbox)

1. Acesse o painel do Mercado Pago
2. Vá em "Pagamentos" > "Testes"
3. Localize o pagamento criado
4. Simule a aprovação do pagamento
5. **Resultado esperado:**
   - Webhook é recebido
   - Status do pedido muda para "aprovado"
   - Matrícula é criada automaticamente
   - Polling detecta mudança e redireciona

## 🧪 Teste 3: Assinatura (Cartão)

### 3.1. Preparação

1. Certifique-se de estar logado
2. Acesse a página de checkout com um plano selecionado

### 3.2. Testar Criação de Assinatura

1. Na página de checkout, selecione o método **Cartão**
2. Preencha os dados do cartão de teste:
   - **Número:** `5031 4332 1540 6351`
   - **Validade:** `11/25`
   - **CVV:** `123`
   - **Nome:** `Teste Usuario`
3. Clique em **"Pagar agora"**
4. **Resultado esperado:**
   - Botão muda para "Processando..."
   - Token do cartão é criado
   - Assinatura é criada no Mercado Pago
   - Status é retornado (authorized, active, pending, etc.)
   - Se aprovado, matrícula é criada automaticamente

### 3.3. Verificar no Banco de Dados

```python
# No Django shell
from academia.models import Pedido, Matricula
pedido = Pedido.objects.filter(metodo='cartao', is_subscription=True).latest('criado_em')
print(f"Status: {pedido.status}")
print(f"MP Subscription ID: {pedido.mercado_pago_subscription_id}")
print(f"MP Subscription Status: {pedido.mercado_pago_subscription_status}")
print(f"É Assinatura: {pedido.is_subscription}")

# Verificar matrícula
matricula = Matricula.objects.filter(usuario=pedido.usuario).latest('criado_em')
print(f"Matrícula Status: {matricula.status}")
print(f"Data Início: {matricula.data_inicio}")
print(f"Data Fim: {matricula.data_fim}")
```

### 3.4. Testar Consulta de Status

```bash
# No terminal (substitua {pedido_id} pelo UUID do pedido)
curl -H "Authorization: Bearer {token}" \
     http://localhost:8000/api/payments/assinatura/status/{pedido_id}/
```

### 3.5. Testar Cancelamento

```bash
# No terminal
curl -X POST \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     http://localhost:8000/api/payments/assinatura/cancelar/{pedido_id}/
```

## 🧪 Teste 4: Webhook

### 4.1. Configurar Webhook no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Vá em "Suas integrações" > "Webhooks"
3. Adicione URL: `https://seu-dominio.com/api/payments/mercadopago/webhook/`
4. Selecione eventos:
   - `payment`
   - `subscription`
   - `subscription_payment`

### 4.2. Testar Webhook Localmente (usando ngrok)

1. Instale ngrok: https://ngrok.com/
2. Execute: `ngrok http 8000`
3. Copie a URL HTTPS fornecida (ex: `https://abc123.ngrok.io`)
4. Configure no Mercado Pago: `https://abc123.ngrok.io/api/payments/mercadopago/webhook/`
5. Faça um pagamento de teste
6. Verifique se webhook é recebido

### 4.3. Verificar Logs

```python
# No Django shell, verificar último pedido
from academia.models import Pedido
pedido = Pedido.objects.latest('atualizado_em')
print(f"Status: {pedido.status}")
print(f"MP Status: {pedido.mercado_pago_status}")
```

## 🐛 Troubleshooting

### Erro: "Public Key não configurada"

**Solução:**
1. Verifique se `MERCADOPAGO_PUBLIC_KEY` está no `.env`
2. Reinicie o servidor Django
3. Limpe o cache do navegador

### Erro: "Access Token não configurado"

**Solução:**
1. Verifique se `MERCADOPAGO_ACCESS_TOKEN` está no `.env`
2. Verifique se não há espaços extras
3. Reinicie o servidor Django

### Erro: "Token do cartão inválido"

**Solução:**
1. Verifique se está usando cartão de teste válido
2. Verifique se Public Key está correta
3. Verifique console do navegador para erros

### Webhook não funciona

**Solução:**
1. Verifique se URL é acessível publicamente
2. Verifique se CSRF está desabilitado para webhook
3. Verifique logs do servidor
4. Use ngrok para testar localmente

### Matrícula não é criada

**Solução:**
1. Verifique se pedido está com status "aprovado"
2. Verifique logs do servidor
3. Verifique se método `_criar_matricula()` é chamado

## ✅ Checklist de Teste

- [ ] Public Key carrega via API
- [ ] PIX gera QR Code corretamente
- [ ] Polling de PIX funciona
- [ ] Assinatura é criada com cartão de teste
- [ ] Matrícula é criada quando pagamento é aprovado
- [ ] Webhook processa eventos corretamente
- [ ] Status de assinatura é consultado corretamente
- [ ] Cancelamento de assinatura funciona

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor Django
2. Verifique o console do navegador
3. Verifique os logs do Mercado Pago no painel
4. Consulte a documentação: `MERCADOPAGO_SETUP.md`

