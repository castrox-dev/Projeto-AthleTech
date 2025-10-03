document.addEventListener('DOMContentLoaded', function() {
  const params = new URLSearchParams(window.location.search);
  const planoId = parseInt(params.get('plano_id') || '0');
  const method = params.get('method') || 'cartao';
  const preco = parseFloat(params.get('preco') || '0');
  const tier = params.get('tier') || 'mensal';

  const ckPlano = document.getElementById('ck_plano');
  const ckPreco = document.getElementById('ck_preco');
  const ckDuracao = document.getElementById('ck_duracao');
  const ckMetodo = document.getElementById('ck_metodo');

  const secCartao = document.getElementById('sec_cartao');
  const secPix = document.getElementById('sec_pix');
  const pending = (function(){ try { return JSON.parse(localStorage.getItem('pending_signup')||'null'); } catch(_) { return null; } })();

  // Carregar dados do plano para exibir nome e duração
  (async function loadPlano(){
    try {
      const res = await fetch('/api/planos/');
      const data = await res.json();
      const planos = Array.isArray(data) ? data : data.results || [];
      const p = planos.find(x => x.id === planoId);
      if (p) {
        ckPlano.textContent = p.nome;
        ckPreco.textContent = `R$ ${(p.preco ?? preco).toFixed(2)}`;
        ckDuracao.textContent = `${p.duracao_dias} dias`;
      } else {
        ckPlano.textContent = `Plano #${planoId}`;
        ckPreco.textContent = `R$ ${preco.toFixed(2)}`;
        ckDuracao.textContent = '- dias';
      }
    } catch(_) {
      ckPlano.textContent = `Plano #${planoId}`;
      ckPreco.textContent = `R$ ${preco.toFixed(2)}`;
    }
  })();

  ckMetodo.textContent = (window.SALES_CONFIG.labels[method] || method);
  secCartao.style.display = method === 'cartao' ? 'block' : 'none';
  secPix.style.display = method === 'pix' ? 'block' : 'none';

  // Botão de pagar cartão (simulação)
  document.getElementById('btn_pagar_cartao').addEventListener('click', function() {
    alert('Pagamento por cartão simulado. Integre seu gateway no checkout.js.');
    finalizeSignup();
  });

  // Botão de gerar PIX via API (inicia pedido e começa polling)
  document.getElementById('btn_gerar_pix').addEventListener('click', async function() {
    if (!pending) { alert('Cadastro pendente não encontrado. Volte e preencha novamente.'); return; }
    try {
      // iniciar pedido PIX
      const token = localStorage.getItem('access_token');
      // se não logado ainda, criar sessão temporária anônima? Aqui exigimos login posterior no finalize
      const initRes = await fetch('/api/payments/pix/initiate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify({ plano_id: pending.planoId })
      });
      const initData = await initRes.json();
      if (!initRes.ok) { alert(initData.detail || 'Falha ao iniciar PIX'); return; }
      const pedidoId = initData.id_publico;
      // preencher QR e copia-e-cola
      const txt = document.getElementById('pix_copy');
      txt.value = initData.pix_payload || initData.pix_qr || '';
      const img = document.getElementById('pix_qr');
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(txt.value)}`;
      img.style.display = 'block';

      // polling de status
      const timer = setInterval(async () => {
        try {
          const stRes = await fetch(`/api/payments/pix/status/${pedidoId}/`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
          const stData = await stRes.json();
          if (stRes.ok && stData.status === 'aprovado') {
            clearInterval(timer);
            await finalizeSignup();
          }
        } catch (_) { /* ignora tentativas */ }
      }, 5000);
    } catch (e) {
      console.error(e);
      alert('Não foi possível iniciar o pagamento PIX.');
    }
  });

  async function finalizeSignup() {
    if (!pending) { window.location.href = '/portal/'; return; }
    // 1) Criar conta
    try {
      const resReg = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending.userData)
      });
      const dataReg = await resReg.json();
      if (!resReg.ok) { alert('Falha ao criar conta: ' + (dataReg.detail || 'verifique os dados')); return; }
      // salvar tokens
      localStorage.setItem('access_token', dataReg.access);
      localStorage.setItem('refresh_token', dataReg.refresh);
      if (dataReg.user) localStorage.setItem('user_data', JSON.stringify(dataReg.user));
      // 2) Criar matrícula
      try {
        const respMat = await fetch('/api/planos/escolher/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({ plano_id: pending.planoId })
        });
        const matData = await respMat.json();
        if (!respMat.ok) { console.warn('Falha ao criar matrícula:', matData); }
      } catch(_) {}
      // limpar pendência e ir para portal
      localStorage.removeItem('pending_signup');
      window.location.href = '/portal/';
    } catch (e) {
      console.error(e);
      alert('Erro ao concluir cadastro. Tente novamente.');
    }
  }
});

