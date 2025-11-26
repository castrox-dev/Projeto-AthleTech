document.addEventListener('DOMContentLoaded', async function() {
  // O pagamento será feito no site do Mercado Pago, não precisa carregar SDK ou Public Key
  
  const params = new URLSearchParams(window.location.search);
  const planoId = parseInt(params.get('plano_id') || '0');
  const method = params.get('method') || null; // Não definir padrão, deixar null se não especificado
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

  // Mostrar ambos os métodos de pagamento (cards já estão bem desenhados na página)
  // O usuário escolhe clicando diretamente no botão de pagamento desejado
  secCartao.style.display = 'block';
  secPix.style.display = 'block';
  
  // Se method foi especificado na URL, mostrar apenas ele
  if (method === 'pix') {
    secCartao.style.display = 'none';
    ckMetodo.textContent = 'PIX';
  } else if (method === 'cartao') {
    secPix.style.display = 'none';
    ckMetodo.textContent = 'Cartão de Crédito';
  } else {
    // Mostrar ambos, sem seletor extra
    ckMetodo.textContent = 'PIX ou Cartão';
  }

  // Botão de pagar cartão - Redireciona para Mercado Pago
  document.getElementById('btn_pagar_cartao').addEventListener('click', async function() {
    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Redirecionando...';
    
    try {
      // Obter plano_id (do pending ou da URL)
      const planoIdToUse = pending?.planoId || planoId;
      if (!planoIdToUse) {
        alert('Plano não encontrado');
        btn.disabled = false;
        btn.textContent = 'Pagar com Cartão';
        return;
      }
      
      // Obter token de autenticação
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        alert('Você precisa estar logado para fazer o pagamento');
        window.location.href = '/login/?redirect=' + encodeURIComponent(window.location.href);
        return;
      }
      
      // Criar checkout no Mercado Pago
      const response = await fetch('/api/payments/cartao/initiate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          plano_id: planoIdToUse
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        alert(data.detail || 'Erro ao processar pagamento');
        btn.disabled = false;
        btn.textContent = 'Pagar com Cartão';
        return;
      }
      
      // Redirecionar para o site do Mercado Pago
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert('Erro: URL de pagamento não disponível');
        btn.disabled = false;
        btn.textContent = 'Pagar com Cartão';
      }
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
      btn.disabled = false;
      btn.textContent = 'Pagar com Cartão';
    }
  });

  // Botão de gerar PIX - Redireciona para Mercado Pago
  document.getElementById('btn_gerar_pix').addEventListener('click', async function() {
    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Redirecionando...';
    
    // Obter plano_id (do pending ou da URL)
    const planoIdToUse = pending?.planoId || planoId;
    if (!planoIdToUse) {
      alert('Plano não encontrado. Volte e escolha um plano.');
      btn.disabled = false;
      btn.textContent = 'Pagar com PIX';
      return;
    }
    
    try {
      // Obter token de autenticação
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Você precisa estar logado para fazer o pagamento');
        window.location.href = '/login/?redirect=' + encodeURIComponent(window.location.href);
        return;
      }
      
      // Criar checkout PIX no Mercado Pago
      const initRes = await fetch('/api/payments/pix/initiate/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plano_id: planoIdToUse })
      });
      
      const initData = await initRes.json();
      if (!initRes.ok) { 
        alert(initData.detail || 'Falha ao iniciar pagamento PIX');
        btn.disabled = false;
        btn.textContent = 'Pagar com PIX';
        return;
      }
      
      // Redirecionar para o site do Mercado Pago
      if (initData.init_point) {
        window.location.href = initData.init_point;
      } else {
        alert('Erro: URL de pagamento não disponível');
        btn.disabled = false;
        btn.textContent = 'Pagar com PIX';
      }
      
    } catch (e) {
      console.error(e);
      alert('Não foi possível iniciar o pagamento PIX.');
      btn.disabled = false;
      btn.textContent = 'Pagar com PIX';
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

