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

  // Botão de gerar PIX - Mostra QR Code diretamente
  document.getElementById('btn_gerar_pix').addEventListener('click', async function() {
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Gerando PIX...';
    
    // Obter plano_id (do pending ou da URL)
    const planoIdToUse = pending?.planoId || planoId;
    if (!planoIdToUse) {
      alert('Plano não encontrado. Volte e escolha um plano.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-brands fa-pix"></i> Pagar com PIX';
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
      
      // Criar pagamento PIX
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
        btn.innerHTML = '<i class="fa-brands fa-pix"></i> Pagar com PIX';
        return;
      }
      
      // Verificar se temos QR Code ou se precisa redirecionar
      if (initData.pix_qr_code) {
        // Mostrar QR Code na página
        mostrarQRCodePix(initData);
      } else if (initData.init_point) {
        // Fallback: redirecionar para Mercado Pago
        window.location.href = initData.init_point;
      } else {
        alert('Erro: Dados do PIX não disponíveis');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-brands fa-pix"></i> Pagar com PIX';
      }
      
    } catch (e) {
      console.error(e);
      alert('Não foi possível iniciar o pagamento PIX.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-brands fa-pix"></i> Pagar com PIX';
    }
  });

  // Função para mostrar QR Code do PIX na página
  function mostrarQRCodePix(data) {
    // Esconder seções de pagamento
    secCartao.style.display = 'none';
    secPix.style.display = 'none';
    
    // Criar seção do QR Code
    const pixSection = document.createElement('section');
    pixSection.className = 'card';
    pixSection.id = 'sec_pix_qrcode';
    pixSection.innerHTML = `
      <div class="card-header">
        <div class="card-header-icon green">
          <i class="fa-brands fa-pix"></i>
        </div>
        <h2>Pague com PIX</h2>
      </div>
      
      <div style="text-align: center; padding: 20px 0;">
        ${data.pix_qr_code_base64 ? `
          <div style="background: white; padding: 20px; border-radius: 16px; display: inline-block; margin-bottom: 20px;">
            <img src="data:image/png;base64,${data.pix_qr_code_base64}" alt="QR Code PIX" style="width: 220px; height: 220px;">
          </div>
        ` : ''}
        
        <p style="color: #9ca3af; margin-bottom: 16px;">
          Escaneie o QR Code acima ou copie o código abaixo:
        </p>
        
        <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <input type="text" id="pix_code" value="${data.pix_qr_code}" readonly 
            style="width: 100%; background: transparent; border: none; color: #e5e7eb; font-size: 0.75rem; text-align: center; word-break: break-all;">
        </div>
        
        <button onclick="copiarCodigoPix()" class="payment-btn pix-btn" style="max-width: 300px; margin: 0 auto 20px;">
          <i class="fa-solid fa-copy"></i>
          Copiar código PIX
        </button>
        
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 10px; padding: 16px;">
          <p style="color: #22c55e; font-size: 0.9rem; margin: 0;">
            <i class="fa-solid fa-clock"></i> 
            Após o pagamento, sua assinatura será ativada automaticamente em alguns minutos.
          </p>
        </div>
      </div>
      
      <div style="margin-top: 20px; text-align: center;">
        <a href="/portal/" class="btn outline" style="margin-right: 10px;">
          <i class="fa-solid fa-gauge"></i> Ir para o Portal
        </a>
        <button onclick="verificarPagamentoPix('${data.id_publico}')" class="btn">
          <i class="fa-solid fa-rotate"></i> Verificar Pagamento
        </button>
      </div>
    `;
    
    // Inserir após o resumo do pedido
    const resumoCard = document.querySelector('.card');
    resumoCard.insertAdjacentElement('afterend', pixSection);
    
    // Atualizar método no resumo
    ckMetodo.textContent = 'PIX - Aguardando pagamento';
  }

  // Função para copiar código PIX
  window.copiarCodigoPix = function() {
    const pixCode = document.getElementById('pix_code');
    if (pixCode) {
      pixCode.select();
      document.execCommand('copy');
      
      // Feedback visual
      const btn = event.target.closest('button');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
      btn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
      
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
      }, 2000);
    }
  };

  // Função para verificar status do pagamento
  window.verificarPagamentoPix = async function(pedidoId) {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/payments/pix/status/${pedidoId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.status === 'aprovado' || data.status === 'approved') {
        alert('✅ Pagamento aprovado! Redirecionando para o portal...');
        window.location.href = '/portal/';
      } else if (data.status === 'pendente' || data.status === 'pending') {
        alert('⏳ Pagamento ainda pendente. Por favor, aguarde alguns instantes após realizar o pagamento.');
      } else {
        alert(`Status: ${data.status || 'Verificando...'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao verificar pagamento. Tente novamente.');
    }
  };

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

