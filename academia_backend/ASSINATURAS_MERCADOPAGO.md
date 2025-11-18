# Sistema de Assinaturas com Mercado Pago

Este documento explica como o sistema de assinaturas recorrentes está configurado no AthleTech.

## 📋 Visão Geral

O sistema foi configurado para trabalhar com **assinaturas recorrentes** ao invés de pagamentos únicos. Quando um cliente assina um plano com cartão de crédito, uma assinatura é criada no Mercado Pago que cobrará automaticamente de forma recorrente.

## 🔄 Como Funciona

### 1. Criação de Assinatura

Quando um cliente escolhe um plano e paga com cartão:

1. **Frontend** gera um token do cartão usando o SDK do Mercado Pago
2. **Backend** recebe o token e cria uma assinatura (Preapproval) no Mercado Pago
3. **Mercado Pago** processa a assinatura e cobra automaticamente conforme a frequência configurada
4. **Sistema** cria automaticamente a matrícula quando a assinatura é autorizada

### 2. Frequência de Cobrança

A frequência é calculada automaticamente baseada na duração do plano:

- **≤ 35 dias**: Mensal (1 mês)
- **36-95 dias**: Trimestral (3 meses)
- **96-370 dias**: Anual (12 meses)
- **> 370 dias**: Mensal (default)

### 3. Renovação Automática

O Mercado Pago cobra automaticamente a cada período configurado. O sistema recebe webhooks quando:
- Assinatura é autorizada
- Pagamento recorrente é aprovado
- Assinatura é cancelada
- Pagamento falha

## 🚀 API Endpoints

### Criar Assinatura

```http
POST /api/payments/cartao/initiate/
Authorization: Bearer {token}
Content-Type: application/json

{
    "plano_id": 1,
    "token": "token_gerado_pelo_mercadopago",
    "payment_method_id": "visa"
}
```

**Resposta:**
```json
{
    "id_publico": "uuid-do-pedido",
    "subscription_id": "123456789",
    "subscription_status": "authorized",
    "init_point": "https://www.mercadopago.com.br/...",
    "status": "aprovado"
}
```

### Consultar Status da Assinatura

```http
GET /api/payments/assinatura/status/{pedido_id}/
Authorization: Bearer {token}
```

### Cancelar Assinatura

```http
POST /api/payments/assinatura/cancelar/{pedido_id}/
Authorization: Bearer {token}
```

## 🔔 Webhooks

O sistema processa automaticamente os seguintes eventos:

### Eventos de Assinatura

- `preapproval.authorized` - Assinatura autorizada
- `preapproval.updated` - Status da assinatura atualizado
- `preapproval.cancelled` - Assinatura cancelada

### Eventos de Pagamento Recorrente

- `payment.approved` - Pagamento recorrente aprovado
- `payment.rejected` - Pagamento recorrente rejeitado
- `payment.cancelled` - Pagamento recorrente cancelado

### Configuração do Webhook

1. Acesse o [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel)
2. Vá em "Suas integrações" > "Webhooks"
3. Adicione a URL: `https://seu-dominio.com.br/api/payments/mercadopago/webhook/`
4. Selecione os eventos:
   - `preapproval`
   - `preapproval.updated`
   - `payment`
   - `payment.updated`

## 📊 Status de Assinatura

### Status no Mercado Pago

- **authorized**: Assinatura autorizada e ativa
- **active**: Assinatura ativa (cobranças automáticas)
- **pending**: Aguardando autorização
- **cancelled**: Assinatura cancelada
- **paused**: Assinatura pausada

### Status no Sistema

- **aprovado**: Assinatura ativa e matrícula criada
- **pendente**: Aguardando processamento
- **cancelado**: Assinatura cancelada

## 🔄 Renovação de Matrícula

Quando um pagamento recorrente é aprovado:

1. O webhook recebe a notificação
2. O sistema verifica se existe matrícula ativa
3. Se não existir, cria uma nova matrícula
4. Se existir, renova a data de fim baseado no plano

## 💳 Frontend - Integração

### Exemplo com SDK do Mercado Pago

```javascript
// 1. Inicializar SDK
const mp = new MercadoPago('SUA_PUBLIC_KEY', {
    locale: 'pt-BR'
});

// 2. Criar formulário de cartão
const cardForm = mp.fields.create('card', {
    style: {
        base: {
            fontSize: '16px',
            color: '#333'
        }
    }
});

// 3. Processar assinatura
cardForm.on('submit', async (event) => {
    event.preventDefault();
    
    const token = event.token;
    
    // Criar assinatura no backend
    const response = await fetch('/api/payments/cartao/initiate/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            plano_id: planoId,
            token: token,
            payment_method_id: 'visa'
        })
    });
    
    const data = await response.json();
    
    if (data.subscription_status === 'authorized') {
        // Assinatura criada com sucesso
        console.log('Assinatura ativa!');
    }
});
```

## 🛠️ Gerenciamento

### Cancelar Assinatura

```javascript
const response = await fetch(`/api/payments/assinatura/cancelar/${pedidoId}/`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

### Consultar Status

```javascript
const response = await fetch(`/api/payments/assinatura/status/${pedidoId}/`, {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});

const data = await response.json();
console.log('Status:', data.mercado_pago_subscription_status);
```

## 📝 Modelo de Dados

### Pedido (Assinatura)

- `is_subscription`: Indica se é assinatura (true) ou pagamento único (false)
- `mercado_pago_subscription_id`: ID da assinatura no Mercado Pago
- `mercado_pago_subscription_status`: Status atual da assinatura
- `subscription_start_date`: Data de início da assinatura
- `subscription_end_date`: Data de fim da assinatura

### Matrícula

A matrícula é criada/renovada automaticamente quando:
- Assinatura é autorizada
- Pagamento recorrente é aprovado

## ⚠️ Importante

1. **PIX não suporta assinaturas**: Apenas cartão de crédito cria assinaturas recorrentes
2. **Renovação automática**: O Mercado Pago cobra automaticamente, não é necessário ação manual
3. **Webhooks são essenciais**: Configure corretamente para receber notificações de renovação
4. **Testes**: Use credenciais de teste para desenvolvimento

## 🔒 Segurança

- Tokens de cartão são gerados no frontend e nunca armazenados
- Webhooks devem ser validados (implementar validação de assinatura se necessário)
- Use HTTPS em produção
- Nunca exponha o Access Token no frontend

## 📚 Recursos

- [Documentação de Assinaturas do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview)
- [API de Preapproval](https://www.mercadopago.com.br/developers/pt/reference/preapproval/_preapproval/post)
- [Webhooks de Assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/webhooks)

