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

  // Se tier for mensal, mostrar ambos os métodos (PIX e Cartão)
  // Se não especificar método ou for mensal, permitir escolha
  const isMensal = tier === 'mensal';
  const allowBothMethods = isMensal && (!method || method === 'escolher');
  
  if (allowBothMethods) {
    // Mostrar ambos os métodos e adicionar seletor
    secCartao.style.display = 'block';
    secPix.style.display = 'block';
    ckMetodo.textContent = 'Escolha o método de pagamento';
    
    // Adicionar seletor de método antes das seções
    const resumoCard = document.querySelector('.card');
    if (resumoCard && !document.getElementById('method_selector')) {
      const selector = document.createElement('div');
      selector.id = 'method_selector';
      selector.className = 'field';
      selector.style.marginTop = '16px';
      selector.style.padding = '16px';
      selector.style.background = 'rgba(255, 255, 255, 0.03)';
      selector.style.border = '1px solid rgba(255, 255, 255, 0.08)';
      selector.style.borderRadius = '12px';
      selector.innerHTML = `
        <label style="display: block; margin-bottom: 12px; font-weight: 600; color: var(--text, #e5e7eb);">Escolha o método de pagamento:</label>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <label class="radio-option" style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; transition: all 0.2s;">
            <input type="radio" name="payment_method_choice" value="pix" checked style="accent-color: rgb(0, 31, 84); cursor: pointer;">
            <span style="color: var(--text, #e5e7eb);">PIX</span>
          </label>
          <label class="radio-option" style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; transition: all 0.2s;">
            <input type="radio" name="payment_method_choice" value="cartao" style="accent-color: rgb(0, 31, 84); cursor: pointer;">
            <span style="color: var(--text, #e5e7eb);">Cartão de Crédito</span>
          </label>
        </div>
      `;
      resumoCard.appendChild(selector);
      
      // Adicionar estilos de hover e checked
      const radioOptions = selector.querySelectorAll('.radio-option');
      radioOptions.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        
        // Hover effect
        option.addEventListener('mouseenter', function() {
          if (!radio.checked) {
            this.style.background = 'rgba(255, 255, 255, 0.08)';
            this.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }
        });
        
        option.addEventListener('mouseleave', function() {
          if (!radio.checked) {
            this.style.background = 'rgba(255, 255, 255, 0.05)';
            this.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }
        });
        
        // Checked state
        const updateCheckedState = () => {
          radioOptions.forEach(opt => {
            const r = opt.querySelector('input[type="radio"]');
            if (r.checked) {
              opt.style.background = 'rgba(0, 31, 84, 0.3)';
              opt.style.borderColor = 'rgba(0, 31, 84, 0.5)';
            } else {
              opt.style.background = 'rgba(255, 255, 255, 0.05)';
              opt.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }
          });
        };
        
        radio.addEventListener('change', updateCheckedState);
        updateCheckedState(); // Inicializar estado
      });
      
      // Adicionar listener para mostrar/esconder métodos
      const radios = selector.querySelectorAll('input[type="radio"]');
      radios.forEach(radio => {
        radio.addEventListener('change', function() {
          if (this.value === 'pix') {
            secPix.style.display = 'block';
            secCartao.style.display = 'none';
            ckMetodo.textContent = 'PIX';
          } else {
            secCartao.style.display = 'block';
            secPix.style.display = 'none';
            ckMetodo.textContent = 'Cartão de crédito';
          }
        });
      });
      
      // Inicializar com PIX selecionado
      secCartao.style.display = 'none';
      ckMetodo.textContent = 'PIX';
    }
  } else {
    // Método específico foi escolhido, mostrar apenas ele
    ckMetodo.textContent = (window.SALES_CONFIG.labels[method] || method);
    secCartao.style.display = method === 'cartao' ? 'block' : 'none';
    secPix.style.display = method === 'pix' ? 'block' : 'none';
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

