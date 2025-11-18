# Configuração do MCP (Model Context Protocol) do Mercado Pago

Este guia explica como configurar e usar o MCP do Mercado Pago no Cursor para integração com o sistema.

## 📋 O que é MCP?

O Model Context Protocol (MCP) permite que o Cursor se conecte diretamente com APIs externas, como o Mercado Pago, permitindo que a IA acesse e use essas ferramentas diretamente.

## 🔧 Configuração do MCP no Cursor

### 1. Adicionar MCP do Mercado Pago no Cursor

1. Abra as configurações do Cursor
2. Vá em **Settings** > **Features** > **Model Context Protocol**
3. Adicione um novo servidor MCP com as seguintes configurações:

```json
{
  "mcpServers": {
    "mercadopago": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-mercadopago"
      ],
      "env": {
        "MERCADOPAGO_ACCESS_TOKEN": "seu_access_token_aqui"
      }
    }
  }
}
```

### 2. Configurar Variáveis de Ambiente

No arquivo `.env` do projeto, adicione:

```env
# Mercado Pago - Configuração tradicional (SDK)
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui
MERCADOPAGO_WEBHOOK_URL=https://seu-dominio.com.br

# Mercado Pago - Usar MCP (opcional)
MERCADOPAGO_USE_MCP=true
```

**Nota:** Se `MERCADOPAGO_USE_MCP=true`, o sistema tentará usar o MCP quando disponível, mas fará fallback para o SDK tradicional se o MCP não estiver acessível.

## 🚀 Como Funciona

### Modo Tradicional (SDK)
- Usa a biblioteca `mercadopago` Python diretamente
- Funciona independentemente do Cursor
- Recomendado para produção

### Modo MCP
- Usa o MCP do Cursor para fazer chamadas à API
- Permite que a IA acesse diretamente as ferramentas do Mercado Pago
- Útil para desenvolvimento e testes assistidos por IA

## 🔄 Fallback Automático

O serviço está configurado para:
1. Tentar usar MCP se `MERCADOPAGO_USE_MCP=true`
2. Fazer fallback automático para SDK tradicional se MCP não estiver disponível
3. Registrar logs informativos sobre qual método está sendo usado

## 📝 Exemplo de Uso

### Via SDK Tradicional (padrão)

```python
from academia.services.mercadopago import MercadoPagoService

service = MercadoPagoService()
payment_data = service.criar_pagamento_pix(pedido, usuario, plano)
```

### Via MCP (quando habilitado)

O MCP será usado automaticamente se:
- `MERCADOPAGO_USE_MCP=true` no `.env`
- O servidor MCP estiver configurado no Cursor
- O MCP estiver disponível no momento da chamada

## 🛠️ Ferramentas Disponíveis no MCP

Quando o MCP do Mercado Pago estiver configurado, as seguintes ferramentas estarão disponíveis:

1. **Criar Pagamento PIX**
2. **Criar Pagamento com Cartão**
3. **Consultar Status de Pagamento**
4. **Processar Webhook**
5. **Listar Pagamentos**
6. **Cancelar Pagamento**

## ⚠️ Importante

- O MCP é principalmente útil durante o desenvolvimento com assistência da IA
- Para produção, recomenda-se usar o SDK tradicional (`MERCADOPAGO_USE_MCP=false`)
- O sistema sempre fará fallback para o SDK se o MCP não estiver disponível
- As credenciais do MCP devem ser as mesmas do SDK tradicional

## 🔍 Verificação

Para verificar se o MCP está funcionando:

1. Configure `MERCADOPAGO_USE_MCP=true` no `.env`
2. Verifique os logs do Django - você verá: `"Mercado Pago usando MCP (Model Context Protocol)"`
3. Se o MCP não estiver disponível, verá: `"MCP não disponível, usando SDK tradicional"`

## 📚 Recursos

- [Documentação do MCP](https://modelcontextprotocol.io/)
- [SDK Python do Mercado Pago](https://github.com/mercadopago/sdk-python)
- [API do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs)

