# Guia de Configuração do Mercado Pago

Este guia explica como configurar e usar a integração do Mercado Pago no sistema AthleTech.

## 📋 Pré-requisitos

1. Conta no Mercado Pago (https://www.mercadopago.com.br/)
2. Acesso às credenciais de produção ou teste

## 🔧 Configuração

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2. Obter Credenciais do Mercado Pago

1. Acesse o [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel)
2. Vá em "Suas integrações" > "Suas credenciais"
3. Copie o **Access Token** (credencial de produção ou teste)

### 3. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui
MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com.br
```

**Importante:**
- Use credenciais de **teste** para desenvolvimento
- Use credenciais de **produção** apenas em ambiente de produção
- O `MERCADOPAGO_WEBHOOK_URL` deve ser a URL pública do seu servidor

### 4. Executar Migrations

```bash
python manage.py migrate
```

## 🚀 Como Usar

### Pagamento PIX

#### Backend (API)

```python
POST /api/payments/pix/initiate/
{
    "plano_id": 1
}
```

**Resposta:**
```json
{
    "id_publico": "uuid-do-pedido",
    "pix_qr_code": "00020126...",
    "pix_qr_code_base64": "data:image/png;base64,...",
    "status": "pendente"
}
```

#### Frontend (JavaScript)

```javascript
const response = await fetch('/api/payments/pix/initiate/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ plano_id: 1 })
});

const data = await response.json();
// Exibir QR Code: data.pix_qr_code_base64
```

### Pagamento com Cartão de Crédito

#### Backend (API)

```python
POST /api/payments/cartao/initiate/
{
    "plano_id": 1,
    "token": "token_gerado_pelo_mercadopago",
    "installments": 1,
    "payment_method_id": "visa"
}
```

**Resposta:**
```json
{
    "id_publico": "uuid-do-pedido",
    "status": "aprovado",
    "payment_status": "approved"
}
```

#### Frontend (JavaScript)

Para pagamento com cartão, você precisa usar o SDK do Mercado Pago no frontend:

1. Adicione o script do Mercado Pago:
```html
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

2. Configure e processe o pagamento:
```javascript
const mp = new MercadoPago('SUA_PUBLIC_KEY', {
    locale: 'pt-BR'
});

// Criar token do cartão
const cardForm = mp.fields.create('card', {
    style: { /* estilos */ }
});

cardForm.on('submit', async (event) => {
    const token = event.token;
    
    const response = await fetch('/api/payments/cartao/initiate/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            plano_id: 1,
            token: token,
            installments: 1,
            payment_method_id: 'visa'
        })
    });
});
```

## 🔔 Webhook

O Mercado Pago enviará notificações de pagamento para:

```
POST /api/payments/mercadopago/webhook/
```

### Configurar Webhook no Mercado Pago

1. Acesse o [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel)
2. Vá em "Suas integrações" > "Webhooks"
3. Adicione a URL: `https://seu-dominio.com.br/api/payments/mercadopago/webhook/`
4. Selecione os eventos: `payment`, `payment.updated`

### Processamento Automático

Quando o webhook receber uma notificação:
- O status do pedido será atualizado automaticamente
- Se o pagamento for aprovado, uma matrícula será criada automaticamente

## 📊 Status de Pagamento

### Consultar Status

```python
GET /api/payments/pix/status/{pedido_id}/
```

### Status Possíveis

- **pendente**: Aguardando pagamento
- **aprovado**: Pagamento confirmado (matrícula criada)
- **cancelado**: Pagamento cancelado ou rejeitado
- **expirado**: Pagamento expirado

## 🧪 Testes

### Cartões de Teste

Use os seguintes cartões para testes:

**Aprovado:**
- Número: `5031 4332 1540 6351`
- CVV: `123`
- Vencimento: `11/25`
- Nome: `APRO`

**Recusado:**
- Número: `5031 4332 1540 6351`
- CVV: `123`
- Vencimento: `11/25`
- Nome: `OTHE`

### PIX de Teste

No ambiente de teste, o PIX será gerado normalmente, mas você precisará simular o pagamento manualmente ou usar a ferramenta de testes do Mercado Pago.

## 🔒 Segurança

1. **Nunca** exponha o `MERCADOPAGO_ACCESS_TOKEN` no frontend
2. Use HTTPS em produção
3. Valide sempre os webhooks (implementar validação de assinatura se necessário)
4. Use credenciais de teste durante desenvolvimento

## 📝 Notas Importantes

- O sistema mantém compatibilidade com o método PIX simples (fallback) se o Mercado Pago não estiver configurado
- Matrículas são criadas automaticamente quando o pagamento é aprovado
- O sistema suporta tanto PIX quanto Cartão de Crédito
- Todos os pagamentos são rastreados com `external_reference` (UUID do pedido)

## 🆘 Troubleshooting

### Erro: "MERCADOPAGO_ACCESS_TOKEN não configurado"
- Verifique se a variável está no arquivo `.env`
- Reinicie o servidor após adicionar a variável

### Webhook não está funcionando
- Verifique se a URL está acessível publicamente
- Use um serviço como ngrok para testes locais
- Verifique os logs do servidor

### Pagamento não está sendo processado
- Verifique os logs do Django
- Confirme que as credenciais estão corretas
- Verifique se o webhook está configurado corretamente

