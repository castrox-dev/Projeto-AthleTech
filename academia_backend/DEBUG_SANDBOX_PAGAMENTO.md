# 🔍 Debug - Pagamento em Modo Sandbox

## Problema Reportado
O usuário não consegue fazer pagamento de teste, parece que está tentando fazer de forma real como se estivesse em produção.

## Verificações Implementadas

### 1. ✅ Detecção de Modo TEST
- O token está sendo detectado corretamente: `TEST-237217287294553`
- A variável `is_test` está sendo definida corretamente

### 2. ✅ Logs Adicionados
Foram adicionados logs detalhados para identificar o problema:
- `init_point` recebido da API
- `sandbox_init_point` recebido da API
- Qual URL está sendo usada (sandbox ou produção)
- Se a URL contém "sandbox" ou "test"

### 3. 🔧 Lógica de Seleção de URL
A lógica foi melhorada para:
- **Priorizar `sandbox_init_point`** quando em modo TEST
- **Avisar** se `sandbox_init_point` não estiver disponível
- **Verificar** se a URL final contém indicadores de sandbox

## Como Verificar

1. **Tente fazer um pagamento** e verifique os logs no console do Django
2. **Procure por estas mensagens**:
   - `Criando preferência - Modo: TEST (Sandbox)`
   - `init_point recebido: ...`
   - `sandbox_init_point recebido: ...`
   - `Usando sandbox_init_point (modo TEST)`
   - `URL final de redirecionamento: ...`
   - `URL contém 'sandbox'? True/False`

## Possíveis Causas

### 1. Mercado Pago não retorna `sandbox_init_point`
- **Solução**: O código agora usa `init_point` como fallback, mas avisa nos logs

### 2. URL não contém "sandbox" mas ainda é de teste
- **Verificação**: Os logs mostrarão se a URL contém "sandbox" ou "test"

### 3. Configuração incorreta no Mercado Pago
- **Verificar**: Se o Access Token é realmente de TEST
- **Verificar**: Se a conta do Mercado Pago está configurada para sandbox

## Próximos Passos

1. **Execute um teste de pagamento**
2. **Copie os logs** que aparecem no console
3. **Verifique**:
   - Se está detectando modo TEST
   - Qual URL está sendo retornada
   - Se a URL contém indicadores de sandbox

## URLs Esperadas

- **Sandbox**: Deve conter `sandbox` ou `test` na URL
- **Produção**: Não deve conter `sandbox` ou `test`

---

**Status**: ✅ Logs adicionados - Aguardando teste para identificar o problema

