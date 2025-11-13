document.addEventListener('DOMContentLoaded', async function () {
  // Não executar se estiver na página do admin ou professor
  const currentPath = window.location.pathname;
  if (currentPath.includes('/portal/admin/') || currentPath.includes('/portal/professor/')) {
    console.log('Portal.js: Página do admin/professor detectada, não executando script do aluno');
    return;
  }

  // Evitar múltiplas execuções
  if (window.portalScriptExecuted) {
    console.log('Portal.js: Script já foi executado, ignorando');
    return;
  }
  window.portalScriptExecuted = true;
  
  // Verificar se há flag de redirecionamento em progresso
  if (window.portalRedirectInProgress) {
    console.log('Portal.js: Redirecionamento já em progresso, ignorando');
    return;
  }

  const API_BASE_URL = (window.API_CONFIG && window.API_CONFIG.API_BASE_URL) || '/api';

  const getAccessToken = () => localStorage.getItem('access_token') || localStorage.getItem('accessToken');
  const getRefreshToken = () => localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');

  const buildHeaders = (extra = {}) => {
    const headers = { 'Content-Type': 'application/json', ...extra };
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  async function authenticatedFetch(url, options = {}) {
    const opts = {
      method: options.method || 'GET',
      headers: buildHeaders(options.headers),
      credentials: 'include',
      body: options.body,
    };

    const res = await fetch(url, opts);
    if (res.status === 401) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('access_token', data.access);
          return await fetch(url, {
            ...opts,
            headers: buildHeaders(options.headers),
          });
        }

        localStorage.removeItem('access_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('refreshToken');
      }

      // Limpar tokens antes de redirecionar
      localStorage.removeItem('access_token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user_data');
      
      // Redirecionar para login apenas se não estivermos já na página de login
      if (!window.location.pathname.includes('/login/')) {
        window.location.href = '/login/?message=login_required&redirect=/portal/';
      }
      return null;
    }

    return res;
  }

  // Verificar se há token antes de tentar carregar dados
  const accessToken = getAccessToken();
  if (!accessToken) {
    console.warn('Sem token de acesso, redirecionando para login');
    window.location.href = '/login/?message=login_required&redirect=/portal/';
    return;
  }

  // Load dashboard data
  try {
    const resp = await authenticatedFetch(`${API_BASE_URL}/dashboard/`);
    if (!resp) {
      // Se resp é null, authenticatedFetch já redirecionou
      return;
    }
    if (!resp.ok) {
      // Se não for 401, pode ser outro erro
      if (resp.status === 401) {
        // authenticatedFetch já deve ter tratado isso
        return;
      }
      throw new Error('Falha ao carregar dashboard');
    }
    const data = await resp.json();

    // Verificar role do usuário e redirecionar se necessário
    // Mas apenas se estiver na página do aluno (/portal/) e não for aluno
    const currentPath = window.location.pathname;
    const user = data.usuario || {};
    const userRole = user.role;
    const isSuperuser = user.is_superuser || false;
    
    // Só redirecionar se estiver na página do aluno (/portal/) e não for aluno
    // E se não houver redirecionamento em progresso
    if ((currentPath === '/portal/' || currentPath === '/portal') && !window.portalRedirectInProgress) {
      // Se for admin ou superuser, redirecionar para dashboard do admin
      if (userRole === 'admin' || isSuperuser) {
        console.log('Portal.js: Usuário é admin na página do aluno, redirecionando para dashboard do admin');
        window.portalRedirectInProgress = true;
        // Usar setTimeout para evitar loops
        setTimeout(() => {
          window.location.replace('/portal/admin/');
        }, 50);
        return;
      }
      
      // Se for professor, redirecionar para dashboard do professor
      if (userRole === 'professor') {
        console.log('Portal.js: Usuário é professor na página do aluno, redirecionando para dashboard do professor');
        window.portalRedirectInProgress = true;
        setTimeout(() => {
          window.location.replace('/portal/professor/');
        }, 50);
        return;
      }
    }

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

      if (!Number.isNaN(peso)) document.getElementById('aluno-peso').textContent = `${peso.toFixed(1)} kg`;
      if (!Number.isNaN(alturaM) && alturaM) document.getElementById('aluno-altura').textContent = `${alturaM.toFixed(2)} m`;
      if (!Number.isNaN(imc) && imc) document.getElementById('aluno-imc').textContent = Number(imc).toFixed(1);

      const setCm = (id, value) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (value === null || value === undefined || value === '') {
          el.textContent = '--';
        } else {
          const num = parseFloat(value);
          el.textContent = Number.isNaN(num) ? '--' : `${num.toFixed(1)} cm`;
        }
      };

      setCm('aluno-peito', data.ultima_avaliacao.perimetro_peito);
      setCm('aluno-cintura', data.ultima_avaliacao.perimetro_cintura);
      setCm('aluno-quadril', data.ultima_avaliacao.perimetro_quadril);
      setCm('aluno-braco', data.ultima_avaliacao.perimetro_braco);
      setCm('aluno-coxa', data.ultima_avaliacao.perimetro_coxa);
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

    // Preencher informações pessoais mais robustas
    if (data.usuario) {
      // Data de nascimento
      if (data.usuario.birth_date) {
        const birthDate = new Date(data.usuario.birth_date);
        const formattedDate = birthDate.toLocaleDateString('pt-BR');
        document.getElementById('aluno-nascimento').textContent = formattedDate;
      }
      
      // Gênero
      const generoMap = {
        'male': 'Masculino',
        'female': 'Feminino',
        'other': 'Outro'
      };
      if (data.usuario.gender) {
        document.getElementById('aluno-genero').textContent = generoMap[data.usuario.gender] || data.usuario.gender;
      }
      
      // Status da matrícula
      if (data.matricula_ativa) {
        document.getElementById('aluno-matricula').innerHTML = '<span style="color: #4CAF50;">Ativa</span>';
        if (data.matricula_ativa.data_fim) {
          const dataFim = new Date(data.matricula_ativa.data_fim);
          const formattedFim = dataFim.toLocaleDateString('pt-BR');
          document.getElementById('aluno-matricula').innerHTML += `<br><small class="muted">Até ${formattedFim}</small>`;
        }
      } else {
        document.getElementById('aluno-matricula').innerHTML = '<span style="color: #f44336;">Inativa</span>';
      }
      
      // Membro ativo
      if (data.usuario.is_active_member) {
        document.getElementById('aluno-membro').innerHTML = '<span style="color: #4CAF50;">Sim</span>';
      } else {
        document.getElementById('aluno-membro').innerHTML = '<span style="color: #ff9800;">Não</span>';
      }
      
      // Data de cadastro
      if (data.usuario.created_at) {
        const createdDate = new Date(data.usuario.created_at);
        document.getElementById('aluno-cadastro').textContent = createdDate.toLocaleDateString('pt-BR');
      }
      
      // Última atualização
      if (data.usuario.updated_at) {
        const updatedDate = new Date(data.usuario.updated_at);
        document.getElementById('aluno-atualizacao').textContent = updatedDate.toLocaleDateString('pt-BR');
      }
      
      // Preencher formulário de edição
      const fNascimento = document.getElementById('f-nascimento');
      const fGenero = document.getElementById('f-genero');
      if (fNascimento && data.usuario.birth_date) {
        fNascimento.value = data.usuario.birth_date.split('T')[0];
      }
      if (fGenero && data.usuario.gender) {
        fGenero.value = data.usuario.gender;
      }
    }
    
    // Preencher medidas da última avaliação
    if (data.ultima_avaliacao) {
      if (data.ultima_avaliacao.percentual_gordura) {
        document.getElementById('aluno-gordura').textContent = `${data.ultima_avaliacao.percentual_gordura}%`;
      }
      if (data.ultima_avaliacao.massa_muscular) {
        document.getElementById('aluno-muscular').textContent = `${data.ultima_avaliacao.massa_muscular} kg`;
      }
    }

    // Carregar histórico de avaliações
    try {
      const avaliacoesResp = await authenticatedFetch(`${API_BASE_URL}/avaliacoes/`);
      if (avaliacoesResp && avaliacoesResp.ok) {
        const avaliacoesData = await avaliacoesResp.json();
        const tabelaBody = document.querySelector('#tabela-avaliacoes tbody');
        
        if (tabelaBody) {
          tabelaBody.innerHTML = '';
          
          if (!avaliacoesData.results || avaliacoesData.results.length === 0) {
            tabelaBody.innerHTML = '<tr><td colspan="11" class="muted" style="text-align: center;">Nenhuma avaliação registrada ainda.</td></tr>';
          } else {
            avaliacoesData.results.forEach(av => {
              const dataAval = new Date(av.data_avaliacao);
              const formatKg = (value) => value ? `${parseFloat(value).toFixed(1)} kg` : '--';
              const formatPercent = (value) => value ? `${parseFloat(value).toFixed(1)}%` : '--';
              const formatCm = (value) => value ? `${parseFloat(value).toFixed(1)} cm` : '--';
              const formatImc = (value) => value ? parseFloat(value).toFixed(1) : '--';

              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${dataAval.toLocaleDateString('pt-BR')}</td>
                <td>${formatKg(av.peso)}</td>
                <td>${formatImc(av.imc)}</td>
                <td>${formatPercent(av.percentual_gordura)}</td>
                <td>${formatKg(av.massa_muscular)}</td>
                <td>${formatCm(av.perimetro_peito)}</td>
                <td>${formatCm(av.perimetro_cintura)}</td>
                <td>${formatCm(av.perimetro_quadril)}</td>
                <td>${formatCm(av.perimetro_braco)}</td>
                <td>${formatCm(av.perimetro_coxa)}</td>
                <td>${av.observacoes || '--'}</td>
              `;
              tabelaBody.appendChild(row);
            });
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar avaliações:', e);
      const tabelaBody = document.querySelector('#tabela-avaliacoes tbody');
      if (tabelaBody) {
        tabelaBody.innerHTML = '<tr><td colspan="11" class="muted" style="text-align: center;">Erro ao carregar avaliações.</td></tr>';
      }
    }

  } catch (err) {
    console.error(err);
    alert('Não foi possível carregar seu portal agora.');
  }

  // Handle profile edit to API
  const formPerfil = document.getElementById('form-perfil');
  if (formPerfil) {
    formPerfil.addEventListener('submit', async function(e) {
      e.preventDefault();
      const nomeCompleto = document.getElementById('f-nome').value.trim();
      const nomeParts = nomeCompleto.split(' ');
      const payload = {
        first_name: nomeParts[0] || undefined,
        last_name: nomeParts.slice(1).join(' ') || undefined,
        email: document.getElementById('f-email').value.trim(),
        phone: document.getElementById('f-telefone').value.trim(),
        birth_date: document.getElementById('f-nascimento').value || undefined,
        gender: document.getElementById('f-genero').value || undefined
      };
      try {
        const res = await authenticatedFetch(`${API_BASE_URL}/auth/user/`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res && res.ok) {
          alert('Perfil atualizado com sucesso!');
          location.reload();
        } else {
          const errorData = await res.json();
          alert('Erro ao salvar perfil: ' + (errorData.detail || 'Erro desconhecido'));
        }
      } catch (err) {
        console.error(err);
        alert('Erro de conexão. Tente novamente.');
      }
    });
  }

  // Setup logout functionality
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    const logoutForm = logoutBtn.closest('form');
    if (logoutForm) {
      logoutForm.addEventListener('submit', () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user_data');
      });
    } else {
      logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user_data');
        window.location.href = '/login/?message=logout_success';
      });
    }
  }
});

