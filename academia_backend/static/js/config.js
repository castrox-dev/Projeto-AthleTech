// Configuração comercial e de checkout (editável)
window.SALES_CONFIG = {
  // Classificação por duração (em dias)
  planDurations: {
    mensalMaxDays: 31,
    trimestralMinDays: 80,
    trimestralMaxDays: 120,
    anualMinDays: 330
  },
  // Regras de pagamento por tipo
  paymentRules: {
    mensal: ['pix', 'cartao'],  // Mensal aceita PIX e Cartão
    trimestral: ['cartao'],      // Trimestral só Cartão
    anual: ['cartao']            // Anual só Cartão
  },
  // Labels amigáveis
  labels: {
    cartao: 'Cartão de crédito',
    pix: 'PIX'
  },
  // Chave PIX (edite aqui)
  pixKey: '21968642276',
  // Provedores (para integração futura)
  gateways: {
    cartao: 'mercadopago',
    pix: 'mercadopago'
  }
};

// Carregar Public Key do Mercado Pago via API (mais seguro)
(async function loadMercadoPagoConfig() {
  try {
    const response = await fetch('/api/config/public/');
    if (response.ok) {
      const config = await response.json();
      window.MERCADOPAGO_PUBLIC_KEY = config.mercadopago_public_key || '';
    }
  } catch (error) {
    console.warn('Não foi possível carregar configuração do Mercado Pago:', error);
  }
})();

window.getPlanTier = function(dias) {
  const cfg = window.SALES_CONFIG.planDurations;
  if (dias >= cfg.anualMinDays) return 'anual';
  if (dias >= cfg.trimestralMinDays && dias <= cfg.trimestralMaxDays) return 'trimestral';
  if (dias <= cfg.mensalMaxDays) return 'mensal';
  return 'mensal';
};
