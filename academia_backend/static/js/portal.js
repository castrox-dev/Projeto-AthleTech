document.addEventListener('DOMContentLoaded', async function() {
  // Base URL from global config if available
  const API_BASE_URL = (window.API_CONFIG && window.API_CONFIG.API_BASE_URL) || '/api';

  // Require auth
  const accessToken = localStorage.getItem('access_token') || localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
  if (!accessToken) {
    window.location.href = '/login/?message=login_required&redirect=/portal/';
    return;
  }

  async function authenticatedFetch(url, options = {}) {
    const headers = Object.assign(
      { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('accessToken')}` },
      options.headers || {}
    );
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 && refreshToken) {
      const r = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
      });
      if (r.ok) {
        const data = await r.json();
        localStorage.setItem('access_token', data.access);
        // retry once
        return await fetch(url, { ...options, headers: { ...headers, 'Authorization': `Bearer ${data.access}` } });
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login/?message=session_expired&redirect=/portal/';
        return null;
      }
    }
    return res;
  }

  // Load dashboard data
  try {
    const resp = await authenticatedFetch(`${API_BASE_URL}/dashboard/`);
    if (!resp) return;
    if (!resp.ok) throw new Error('Falha ao carregar dashboard');
    const data = await resp.json();

    // Fill profile
    if (data.usuario) {
      const nome = `${data.usuario.first_name || ''} ${data.usuario.last_name || ''}`.trim() || data.usuario.username;
      document.getElementById('aluno-nome').textContent = nome;
      document.getElementById('aluno-email').textContent = data.usuario.email || '';
      if (data.usuario.phone) document.getElementById('aluno-telefone').textContent = data.usuario.phone;
      
      // Update header user name
      const userNameElement = document.getElementById('user-name');
      if (userNameElement) {
        userNameElement.textContent = nome;
      }
      
      // Show user menu
      const loginElements = document.querySelectorAll('.login-only');
      const userElements = document.querySelectorAll('.user-only');
      loginElements.forEach(el => el.style.display = 'none');
      userElements.forEach(el => el.style.display = 'block');

      // Prefill form
      const fNome = document.getElementById('f-nome');
      const fEmail = document.getElementById('f-email');
      const fTelefone = document.getElementById('f-telefone');
      if (fNome) fNome.value = nome;
      if (fEmail) fEmail.value = data.usuario.email || '';
      if (fTelefone) fTelefone.value = data.usuario.phone || '';
    }

    // Fill avaliação simples
    if (data.ultima_avaliacao) {
      const peso = parseFloat(data.ultima_avaliacao.peso || 0);
      const alturaCm = parseFloat(data.ultima_avaliacao.altura || 0);
      const alturaM = alturaCm ? alturaCm / 100.0 : 0;
      const imc = alturaM ? (peso / (alturaM * alturaM)) : (data.ultima_avaliacao.imc || 0);
      if (!isNaN(peso)) document.getElementById('aluno-peso').textContent = `${peso.toFixed(1)} kg`;
      if (!isNaN(alturaM) && alturaM) document.getElementById('aluno-altura').textContent = `${alturaM.toFixed(2)} m`;
      if (!isNaN(imc) && imc) document.getElementById('aluno-imc').textContent = Number(imc).toFixed(1);
    }

    // bloquear acesso se não tem matrícula ativa
    if (!data.matricula_ativa) {
      const warn = document.createElement('div');
      warn.className = 'card';
      warn.innerHTML = '<h2>Assinatura necessária</h2><p class="muted">Nenhuma matrícula ativa encontrada. Conclua seu pagamento para liberar o portal.</p><div style="margin-top:8px;"><a href="/planos/" class="btn">Escolher plano</a></div>';
      const main = document.querySelector('main.content');
      if (main) {
        main.innerHTML = '';
        main.appendChild(warn);
      }
      return;
    }

    // Fill treinos
    if (Array.isArray(data.treinos_recentes)) {
      const treinosSection = document.querySelector('#treinos .list');
      if (treinosSection) treinosSection.innerHTML = '';
      data.treinos_recentes.forEach(t => {
        const article = document.createElement('article');
        article.className = 'row';
        article.innerHTML = `<div><h4>${t.nome}</h4><p>${t.descricao || ''}</p></div><span class="tag">Ativo</span>`;
        treinosSection && treinosSection.appendChild(article);
      });
    }

    // Fill exercícios: exemplo carregando lista geral do usuário
    try {
      const exResp = await authenticatedFetch(`${API_BASE_URL}/exercicios/`);
      if (exResp && exResp.ok) {
        const exData = await exResp.json();
        const grid = document.getElementById('lista-exercicios');
        if (grid) grid.innerHTML = '';
        exData.results?.forEach(ex => {
          const div = document.createElement('div');
          div.className = 'exercise';
          div.innerHTML = `<h4>${ex.nome}</h4><p>${ex.categoria} • ${ex.nivel}</p>`;
          grid && grid.appendChild(div);
        });
      }
    } catch (e) { /* silencioso */ }

  } catch (err) {
    console.error(err);
    alert('Não foi possível carregar seu portal agora.');
  }

  // Handle profile edit to API
  const formPerfil = document.getElementById('form-perfil');
  if (formPerfil) {
    formPerfil.addEventListener('submit', async function(e) {
      e.preventDefault();
      const payload = {
        first_name: document.getElementById('f-nome').value.split(' ')[0] || undefined,
        last_name: (function(){ const sp=document.getElementById('f-nome').value.split(' '); sp.shift(); return sp.join(' '); })() || undefined,
        email: document.getElementById('f-email').value,
        phone: document.getElementById('f-telefone').value
      };
      try {
        const res = await authenticatedFetch(`${API_BASE_URL}/auth/user/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res && res.ok) {
          location.reload();
        } else {
          alert('Erro ao salvar perfil');
        }
      } catch (_) { alert('Erro de conexão'); }
    });
  }

  // Setup logout functionality
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      // Clear tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user_data');
      // Redirect to login
      window.location.href = '/login/?message=logout_success';
    });
  }
});

