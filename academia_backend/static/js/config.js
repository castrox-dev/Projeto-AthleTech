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
    mensal: ['pix'],
    trimestral: ['pix'],
    anual: ['pix']
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

window.getPlanTier = function(dias) {
  const cfg = window.SALES_CONFIG.planDurations;
  if (dias >= cfg.anualMinDays) return 'anual';
  if (dias >= cfg.trimestralMinDays && dias <= cfg.trimestralMaxDays) return 'trimestral';
  if (dias <= cfg.mensalMaxDays) return 'mensal';
  return 'mensal';
};
