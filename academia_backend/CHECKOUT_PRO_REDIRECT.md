# 🔄 Redirecionamento para Mercado Pago Checkout Pro

## 📋 Mudanças Implementadas

O sistema foi modificado para redirecionar o usuário para o site do Mercado Pago (Checkout Pro) ao invés de processar o pagamento localmente.

## ✅ O que foi alterado

### 1. **Backend - Serviço Mercado Pago**

- ✅ Criado método `criar_checkout_preference()` que cria uma preferência no Mercado Pago
- ✅ Retorna `init_point` (URL de redirecionamento) ao invés de processar pagamento localmente
- ✅ Configura métodos de pagamento permitidos (PIX ou Cartão) baseado no parâmetro
- ✅ Configura URLs de retorno (success, failure, pending)

### 2. **Backend - Views**

- ✅ `PixInitiateView`: Agora cria checkout preference e retorna `init_point`
- ✅ `CartaoInitiateView`: Agora cria checkout preference e retorna `init_point`
- ✅ Removida lógica de tokenização de cartão no backend

### 3. **Frontend - Checkout**

- ✅ Removido SDK do Mercado Pago do HTML (não é mais necessário)
- ✅ Removidos formulários de cartão (número, CVV, etc.)
- ✅ Removida lógica de tokenização de cartão
- ✅ Botões agora apenas criam o checkout e redirecionam
- ✅ Simplificada a interface - apenas botões de "Pagar com PIX" e "Pagar com Cartão"

### 4. **Modelo Pedido**

- ✅ Adicionado campo `mercado_pago_preference_id` para armazenar o ID da preferência
- ✅ Campo usado para rastrear pedidos quando o webhook é recebido

### 5. **Webhook**

- ✅ Atualizado para processar pagamentos do Checkout Pro
- ✅ Busca pedido por `preference_id` quando `external_reference` não está disponível
- ✅ Atualiza `payment_id` quando o pagamento é aprovado

## 🔄 Fluxo de Pagamento

### PIX
1. Usuário clica em "Pagar com PIX"
2. Frontend chama `/api/payments/pix/initiate/`
3. Backend cria `Pedido` e `Preference` no Mercado Pago
4. Backend retorna `init_point` (URL do Mercado Pago)
5. Frontend redireciona para `init_point`
6. Usuário paga no site do Mercado Pago
7. Mercado Pago redireciona de volta para `/portal/?payment=success`
8. Webhook atualiza status do pedido
9. Matrícula é criada automaticamente

### Cartão
1. Usuário clica em "Pagar com Cartão"
2. Frontend chama `/api/payments/cartao/initiate/`
3. Backend cria `Pedido` (is_subscription=True) e `Preference` no Mercado Pago
4. Backend retorna `init_point` (URL do Mercado Pago)
5. Frontend redireciona para `init_point`
6. Usuário preenche dados do cartão no site do Mercado Pago
7. Mercado Pago processa o pagamento
8. Mercado Pago redireciona de volta para `/portal/?payment=success`
9. Webhook atualiza status do pedido
10. Matrícula é criada automaticamente

## 🔧 Configuração Necessária

### URLs de Retorno

As URLs de retorno são configuradas automaticamente baseadas em `MERCADOPAGO_WEBHOOK_URL`:

- **Success**: `{MERCADOPAGO_WEBHOOK_URL}/portal/?payment=success`
- **Failure**: `{MERCADOPAGO_WEBHOOK_URL}/checkout/?pedido_id={uuid}&payment=failed`
- **Pending**: `{MERCADOPAGO_WEBHOOK_URL}/checkout/?pedido_id={uuid}&payment=pending`

### Webhook

Configure o webhook no painel do Mercado Pago:
- **URL**: `{MERCADOPAGO_WEBHOOK_URL}/api/payments/mercadopago/webhook/`
- **Eventos**: `payment`, `preapproval`

## 📝 Vantagens

1. ✅ **Segurança**: Dados do cartão nunca passam pelo seu servidor
2. ✅ **PCI Compliance**: Mercado Pago gerencia toda a segurança
3. ✅ **Simplicidade**: Menos código no frontend
4. ✅ **Confiabilidade**: Mercado Pago gerencia todo o fluxo de pagamento
5. ✅ **UX**: Interface nativa do Mercado Pago, conhecida pelos usuários

## ⚠️ Observações

- O usuário será redirecionado para o site do Mercado Pago
- Após o pagamento, o usuário será redirecionado de volta para o portal
- O webhook garante que o status seja atualizado mesmo se o usuário fechar a página
- A matrícula é criada automaticamente quando o pagamento é aprovado

## 🧪 Teste

1. Acesse `/planos/`
2. Clique em "Assinar" em qualquer plano
3. Escolha o método de pagamento (PIX ou Cartão)
4. Clique no botão de pagamento
5. Você será redirecionado para o Mercado Pago
6. Complete o pagamento no site deles
7. Você será redirecionado de volta para o portal

---

**Status**: ✅ Implementado e pronto para uso

