# ✅ Checklist de Configuração de Pagamento

## 🔐 1. Variáveis de Ambiente (.env)

- [x] Arquivo `.env` existe na raiz do projeto
- [ ] `MERCADOPAGO_ACCESS_TOKEN` configurado (credencial privada)
- [ ] `MERCADOPAGO_PUBLIC_KEY` configurado (credencial pública)
- [ ] `MERCADOPAGO_WEBHOOK_URL` configurado (URL pública do servidor)
- [ ] `MERCADOPAGO_USE_MCP` configurado (opcional, default: false)

**Como verificar:**
```bash
# No Python shell
python manage.py shell
>>> from django.conf import settings
>>> print("Access Token:", settings.MERCADOPAGO_ACCESS_TOKEN[:20] + "...")
>>> print("Public Key:", settings.MERCADOPAGO_PUBLIC_KEY[:20] + "...")
```

## 📦 2. Dependências

- [x] `mercadopago` instalado no `requirements.txt`
- [ ] Dependências instaladas: `pip install -r requirements.txt`

**Verificar:**
```bash
pip list | grep mercadopago
```

## 🗄️ 3. Banco de Dados

- [ ] Migrações aplicadas: `python manage.py migrate`
- [ ] Modelo `Pedido` tem todos os campos necessários:
  - [x] `mercado_pago_payment_id`
  - [x] `mercado_pago_status`
  - [x] `mercado_pago_subscription_id`
  - [x] `mercado_pago_subscription_status`
  - [x] `is_subscription`
  - [x] `subscription_start_date`
  - [x] `subscription_end_date`

**Verificar:**
```bash
python manage.py makemigrations
python manage.py migrate
```

## 🔌 4. Endpoints da API

### Endpoints de Configuração
- [x] `GET /api/config/public/` - Retorna Public Key (público)

### Endpoints de Pagamento PIX
- [x] `POST /api/payments/pix/initiate/` - Inicia pagamento PIX
- [x] `GET /api/payments/pix/status/<uuid:pedido_id>/` - Consulta status PIX
- [x] `POST /api/payments/pix/confirm/<uuid:pedido_id>/` - Confirma pagamento PIX

### Endpoints de Assinatura (Cartão)
- [x] `POST /api/payments/cartao/initiate/` - Cria assinatura
- [x] `GET /api/payments/assinatura/status/<uuid:pedido_id>/` - Consulta status
- [x] `POST /api/payments/assinatura/cancelar/<uuid:pedido_id>/` - Cancela assinatura

### Webhook
- [x] `POST /api/payments/mercadopago/webhook/` - Recebe webhooks

**Verificar URLs:**
```bash
python manage.py show_urls | grep payments
```

## 🎨 5. Frontend

### HTML
- [x] `checkout_frontend.html` inclui SDK do Mercado Pago:
  ```html
  <script src="https://sdk.mercadopago.com/js/v2"></script>
  ```

### JavaScript
- [x] `config.js` carrega Public Key via API (`/api/config/public/`)
- [x] `checkout.js` implementa:
  - [x] Tokenização de cartão via Mercado Pago SDK
  - [x] Criação de assinatura via `/api/payments/cartao/initiate/`
  - [x] Geração de PIX via `/api/payments/pix/initiate/`
  - [x] Polling de status PIX
  - [x] Tratamento de erros

## 🔧 6. Serviço Mercado Pago

- [x] `academia/services/mercadopago.py` implementado com:
  - [x] `criar_pagamento_pix()` - Cria pagamento PIX
  - [x] `criar_assinatura()` - Cria assinatura recorrente
  - [x] `consultar_pagamento()` - Consulta status de pagamento
  - [x] `consultar_assinatura()` - Consulta status de assinatura
  - [x] `cancelar_assinatura()` - Cancela assinatura
  - [x] `processar_webhook()` - Processa webhooks

## 📋 7. Views

- [x] `PixInitiateView` - Inicia pagamento PIX
- [x] `PixStatusView` - Consulta status PIX
- [x] `CartaoInitiateView` - Cria assinatura
- [x] `AssinaturaStatusView` - Consulta status assinatura
- [x] `AssinaturaCancelarView` - Cancela assinatura
- [x] `MercadoPagoWebhookView` - Processa webhooks
- [x] `ConfigPublicaView` - Retorna configurações públicas

## 🔄 8. Fluxo de Pagamento

### PIX
1. [x] Usuário clica em "Gerar PIX"
2. [x] Frontend chama `/api/payments/pix/initiate/`
3. [x] Backend cria `Pedido` e chama `MercadoPagoService.criar_pagamento_pix()`
4. [x] Retorna QR Code (base64 ou URL)
5. [x] Frontend exibe QR Code e inicia polling
6. [x] Webhook atualiza status quando pagamento é aprovado
7. [x] Matrícula é criada automaticamente

### Cartão (Assinatura)
1. [x] Usuário preenche dados do cartão
2. [x] Frontend tokeniza cartão via Mercado Pago SDK
3. [x] Frontend chama `/api/payments/cartao/initiate/` com token
4. [x] Backend cria `Pedido` (is_subscription=True) e chama `MercadoPagoService.criar_assinatura()`
5. [x] Se aprovado, cria matrícula automaticamente
6. [x] Webhook processa renovações automáticas

## 🧪 9. Testes Manuais

### Teste PIX
- [ ] Acessar página de checkout
- [ ] Selecionar método PIX
- [ ] Clicar em "Gerar PIX"
- [ ] Verificar se QR Code é exibido
- [ ] Verificar se polling está funcionando
- [ ] Simular pagamento no Mercado Pago (sandbox)
- [ ] Verificar se matrícula é criada

### Teste Cartão (Assinatura)
- [ ] Acessar página de checkout
- [ ] Selecionar método Cartão
- [ ] Preencher dados do cartão de teste
- [ ] Clicar em "Pagar agora"
- [ ] Verificar se assinatura é criada
- [ ] Verificar se matrícula é criada (se aprovado)
- [ ] Verificar status da assinatura

### Teste Webhook
- [ ] Configurar webhook no painel do Mercado Pago
- [ ] URL: `https://seu-dominio.com/api/payments/mercadopago/webhook/`
- [ ] Testar webhook manualmente ou aguardar eventos reais

## 🐛 10. Problemas Comuns

### Public Key não carrega
- [ ] Verificar se `MERCADOPAGO_PUBLIC_KEY` está no `.env`
- [ ] Verificar se endpoint `/api/config/public/` retorna a chave
- [ ] Verificar console do navegador para erros

### Erro ao criar assinatura
- [ ] Verificar se `MERCADOPAGO_ACCESS_TOKEN` está configurado
- [ ] Verificar se token do cartão é válido
- [ ] Verificar logs do servidor

### Webhook não funciona
- [ ] Verificar se `MERCADOPAGO_WEBHOOK_URL` está correto
- [ ] Verificar se URL é acessível publicamente
- [ ] Verificar se CSRF está desabilitado para webhook
- [ ] Verificar logs do servidor

### Matrícula não é criada
- [ ] Verificar se pedido está com status `aprovado`
- [ ] Verificar se método `_criar_matricula()` é chamado
- [ ] Verificar logs do servidor

## 📝 11. Credenciais de Teste

### Mercado Pago Sandbox
- **Cartão de Teste Aprovado:**
  - Número: `5031 4332 1540 6351`
  - CVV: `123`
  - Validade: `11/25`
  - Nome: Qualquer nome

- **Cartão de Teste Recusado:**
  - Número: `5031 4332 1540 6351`
  - CVV: `123`
  - Validade: `11/25`
  - Nome: Qualquer nome

### PIX de Teste
- Use o ambiente sandbox do Mercado Pago
- QR Code será gerado automaticamente
- Pagamento pode ser simulado no painel

## ✅ Status Final

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Migrações aplicadas
- [ ] Endpoints funcionando
- [ ] Frontend integrado
- [ ] Testes manuais realizados
- [ ] Webhook configurado
- [ ] Pronto para produção

---

**Última atualização:** Verificar antes de cada deploy

