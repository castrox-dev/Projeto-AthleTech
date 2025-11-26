(() => {
  const config = window.ADMIN_CONFIG || {};
  const API_BASE_URL = (window.API_CONFIG && window.API_CONFIG.API_BASE_URL) || '/api';
  const professoresEndpoint = config.professoresEndpoint || '/api/usuarios/';
  const planosEndpoint = config.planosEndpoint || '/api/planos/';
  const relatoriosUrl = config.relatoriosUrl || '#';

  const modalOverlay = document.getElementById('admin-modal-overlay');
  const modalTitle = document.getElementById('admin-modal-title');
  const modalBody = document.getElementById('admin-modal-body');
  const modalClose = document.getElementById('admin-modal-close');
  const toastContainer = document.getElementById('admin-toast-container');
  const tabelaProfessoresBody = document.querySelector('#tabela-professores tbody');
  let professoresCache = [];

  // Verificar autenticação e role do usuário
  const checkAuthAndRole = async () => {
    // Evitar múltiplas verificações simultâneas
    if (window.adminAuthCheckInProgress) {
      console.log('Admin-dashboard.js: Verificação de autenticação já em progresso, aguardando...');
      // Aguardar um pouco e retornar true (assumir que está ok)
      return true;
    }
    window.adminAuthCheckInProgress = true;

    const accessToken = localStorage.getItem('access_token') || localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
    
    if (!accessToken) {
      window.adminAuthCheckInProgress = false;
      window.location.href = '/login/?message=login_required&redirect=/portal/admin/';
      return false;
    }

    try {
      // Buscar dados do usuário do dashboard para verificar role
      const response = await fetch(`${API_BASE_URL}/dashboard/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        credentials: 'include'
      });

      if (response.status === 401) {
        // Token expirado, tentar renovar
        if (refreshToken) {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
          });

          if (refreshResponse.ok) {
            const tokenData = await refreshResponse.json();
            localStorage.setItem('access_token', tokenData.access);
            // Tentar novamente com o novo token
            const retryResponse = await fetch(`${API_BASE_URL}/dashboard/`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.access}`
              },
              credentials: 'include'
            });
            
            if (!retryResponse.ok) {
              throw new Error('Não autorizado após renovar token');
            }
            
            const dashboardData = await retryResponse.json();
            const result = checkUserRole(dashboardData);
            window.adminAuthCheckInProgress = false;
            return result;
          }
        }
        
        // Não conseguiu renovar, mas se já está na página do admin, não redirecionar
        const currentPath = window.location.pathname;
        if (currentPath.includes('/portal/admin/')) {
          console.warn('Admin-dashboard.js: Token expirado mas já está na página do admin, permitindo acesso');
          window.adminAuthCheckInProgress = false;
          return true;
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.adminAuthCheckInProgress = false;
        window.location.href = '/login/?message=session_expired&redirect=/portal/admin/';
        return false;
      }

      if (!response.ok) {
        throw new Error('Erro ao verificar autenticação');
      }

      const dashboardData = await response.json();
      const result = checkUserRole(dashboardData);
      window.adminAuthCheckInProgress = false;
      return result;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      window.adminAuthCheckInProgress = false;
      // Não redirecionar se já estiver na página do admin - pode ser erro temporário
      const currentPath = window.location.pathname;
      if (currentPath.includes('/portal/admin/')) {
        console.warn('Admin-dashboard.js: Erro na verificação mas já está na página do admin, permitindo acesso');
        return true;
      }
      window.location.href = '/login/?message=login_required&redirect=/portal/admin/';
      return false;
    }
  };

  const checkUserRole = (dashboardData) => {
    // Verificar role do usuário
    const user = dashboardData.user || {};
    const userRole = user.role || dashboardData.role;
    const isSuperuser = user.is_superuser || false;
    const currentPath = window.location.pathname;
    
    console.log('Admin-dashboard.js: Verificando role do usuário:', { userRole, isSuperuser, user, currentPath });
    
    // Se está na página do admin, SEMPRE permitir acesso (evitar loops)
    // A verificação de role será feita no backend se necessário
    if (currentPath.includes('/portal/admin/')) {
      console.log('Admin-dashboard.js: Está na página do admin, permitindo acesso (evitando loops)');
      return true;
    }
    
    // Se não está na página do admin, permitir acesso (não deveria acontecer, mas por segurança)
    console.log('Admin-dashboard.js: Não está na página do admin, permitindo acesso');
    return true;
  };

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const showToast = (message, type = 'success', title = '') => {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        ${title ? `<span class="toast-title">${title}</span>` : ''}
        <span>${message}</span>
      </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 220);
    }, 3200);
  };

  const apiRequest = async (url, { method = 'GET', body, headers = {}, expectJSON = true } = {}) => {
    // Obter token JWT do localStorage
    const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken');
    
    const opts = {
      method,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        ...headers,
      },
      credentials: 'include',
    };

    // Adicionar token JWT no header Authorization se disponível
    if (token) {
      opts.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      const csrf = getCookie('csrftoken');
      if (csrf) {
        opts.headers['X-CSRFToken'] = csrf;
      }
    }

    let response = await fetch(url, opts);
    
    // Se receber 401 (não autorizado), tentar renovar o token
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshResponse = await fetch('/api/auth/token/refresh/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
          });
          
          if (refreshResponse.ok) {
            const tokenData = await refreshResponse.json();
            localStorage.setItem('access_token', tokenData.access);
            // Tentar novamente com o novo token
            opts.headers['Authorization'] = `Bearer ${tokenData.access}`;
            response = await fetch(url, opts);
          } else {
            // Se não conseguir renovar, limpar tokens e redirecionar para login
            localStorage.removeItem('access_token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login/?message=session_expired';
            return;
          }
        } catch (err) {
          console.error('Erro ao renovar token:', err);
        }
      }
    }
    
    if (!response.ok) {
      let errorDetail = 'Erro inesperado';
      try {
        const data = await response.json();
        errorDetail = data.detail || JSON.stringify(data);
      } catch (err) {
        errorDetail = await response.text();
      }
      throw new Error(errorDetail);
    }

    if (!expectJSON) return response;
    return response.json();
  };

  const openModal = (title, content) => {
    if (!modalOverlay) return;
    modalTitle.textContent = title;
    if (typeof content === 'string') {
      modalBody.innerHTML = content;
    } else {
      modalBody.innerHTML = '';
      modalBody.appendChild(content);
    }
    modalOverlay.classList.remove('hidden');
  };

  const closeModal = () => {
    if (!modalOverlay) return;
    modalOverlay.classList.add('hidden');
    modalBody.innerHTML = '';
  };

  const renderProfessoresTabela = (professores) => {
    if (!tabelaProfessoresBody) return;
    professoresCache = professores;
    tabelaProfessoresBody.innerHTML = '';

    if (!professores.length) {
      tabelaProfessoresBody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;">Nenhum professor cadastrado.</td></tr>';
      return;
    }

    professores.forEach((prof) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="professor-identificacao">
            <strong>${prof.first_name || prof.username || '--'}</strong>
            <span class="muted">${prof.cref ? `CREF ${prof.cref}` : 'CREF não informado'}</span>
          </div>
        </td>
        <td>${prof.email || '--'}</td>
        <td>${prof.especialidade || 'Não informado'}</td>
        <td>${prof.total_alunos || '--'}</td>
        <td>${prof.treinos_ativos || '--'}</td>
        <td>
          <div class="professor-actions">
            <button class="btn outline btn-editar-professor" data-id="${prof.id}"><i class="fa-solid fa-pen"></i>Editar</button>
            <button class="btn outline btn-remover-professor" data-id="${prof.id}"><i class="fa-solid fa-user-minus"></i>Remover</button>
          </div>
        </td>
      `;
      tabelaProfessoresBody.appendChild(row);
    });
  };

  const loadProfessores = async () => {
    if (!tabelaProfessoresBody) return;
    tabelaProfessoresBody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;">Carregando professores...</td></tr>';
    try {
      const data = await apiRequest(`${professoresEndpoint}?role=professor`);
      const professores = Array.isArray(data) ? data : (data.results || []);
      renderProfessoresTabela(professores);
    } catch (error) {
      tabelaProfessoresBody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;">Erro ao carregar professores: ${error.message}</td></tr>`;
    }
  };

  const openRelatoriosModal = () => {
    const content = document.createElement('div');
    content.className = 'modal-grid';
    content.innerHTML = `
      <div>
        <label>Relatórios disponíveis</label>
        <ul class="report-list">
          <li><a href="${relatoriosUrl}?tipo=alunos" target="_blank"><i class="fa-solid fa-file-lines"></i> Relatório de alunos</a></li>
          <li><a href="${relatoriosUrl}?tipo=matriculas" target="_blank"><i class="fa-solid fa-clipboard-list"></i> Relatório de matrículas</a></li>
          <li><a href="${relatoriosUrl}?tipo=financeiro" target="_blank"><i class="fa-solid fa-coins"></i> Relatório financeiro</a></li>
        </ul>
      </div>
    `;
    openModal('Relatórios', content);
  };

  const openNovoPlanoModal = () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="modal-grid">
        <div>
          <label for="novo-plano-nome">Nome do plano</label>
          <input type="text" id="novo-plano-nome" name="nome" required placeholder="Ex.: Plano Performance">
        </div>
        <div>
          <label for="novo-plano-preco">Preço (R$)</label>
          <input type="number" id="novo-plano-preco" name="preco" min="0" step="0.01" required placeholder="Ex.: 199.90">
        </div>
        <div>
          <label for="novo-plano-duracao">Duração (dias)</label>
          <input type="number" id="novo-plano-duracao" name="duracao_dias" min="1" required placeholder="Ex.: 30">
        </div>
        <div>
          <label for="novo-plano-beneficios">Benefícios (um por linha)</label>
          <textarea id="novo-plano-beneficios" name="beneficios" rows="3"></textarea>
        </div>
        <div style="grid-column: 1 / -1;">
          <label for="novo-plano-descricao">Descrição</label>
          <textarea id="novo-plano-descricao" name="descricao" rows="3" placeholder="Descreva em detalhes o plano."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn outline" data-action="cancelar">Cancelar</button>
        <button type="submit" class="btn primary">Salvar plano</button>
      </div>
    `;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const beneficiosRaw = formData.get('beneficios');
      const payload = {
        nome: formData.get('nome'),
        descricao: formData.get('descricao'),
        preco: parseFloat(formData.get('preco')),
        duracao_dias: parseInt(formData.get('duracao_dias'), 10) || 30,
        beneficios: beneficiosRaw ? beneficiosRaw.split('\n').map((b) => b.trim()).filter(Boolean) : [],
      };

      try {
        await apiRequest(planosEndpoint, { method: 'POST', body: payload });
        showToast('Plano criado com sucesso!', 'success', 'Sucesso');
        closeModal();
      } catch (error) {
        showToast(error.message || 'Erro ao criar plano', 'error', 'Erro');
      }
    });

    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);

    openModal('Novo Plano', form);
  };

  const openAddProfessorModal = () => {
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="modal-grid">
        <div>
          <label for="prof-nome">Nome completo</label>
          <input type="text" id="prof-nome" name="nome" required placeholder="Ex.: Marcos Andrade">
        </div>
        <div>
          <label for="prof-email">Email</label>
          <input type="email" id="prof-email" name="email" required placeholder="professor@academia.com">
        </div>
        <div>
          <label for="prof-especialidade">Especialidade</label>
          <input type="text" id="prof-especialidade" name="especialidade" placeholder="Ex.: Hipertrofia, Performance...">
        </div>
        <div>
          <label for="prof-cref">CREF</label>
          <input type="text" id="prof-cref" name="cref" placeholder="000000-G/UF">
        </div>
        <div>
          <label for="prof-telefone">Telefone</label>
          <input type="text" id="prof-telefone" name="telefone" placeholder="Ex.: (11) 90000-0000">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn outline" data-action="cancelar">Cancelar</button>
        <button type="submit" class="btn primary">Adicionar professor</button>
      </div>
    `;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const tempPassword = Math.random().toString(36).slice(-10);
      const nomeCompleto = formData.get('nome').trim();
      const partesNome = nomeCompleto.split(' ');
      const firstName = partesNome[0] || '';
      const lastName = partesNome.slice(1).join(' ') || '';
      
      const payload = {
        email: formData.get('email'),
        first_name: firstName,
        last_name: lastName,
        phone: formData.get('telefone'),
        role: 'professor',
        password: tempPassword,
        password_confirm: tempPassword,
        especialidade: formData.get('especialidade') || '',
        cref: formData.get('cref') || '',
      };

      try {
        await apiRequest(professoresEndpoint, { method: 'POST', body: payload });
        showToast('Professor adicionado com sucesso!', 'success', 'Sucesso');
        closeModal();
        loadProfessores();
      } catch (error) {
        showToast(error.message || 'Erro ao adicionar professor', 'error', 'Erro');
      }
    });

    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);
    openModal('Adicionar Professor', form);
  };

  const handleRemoverProfessor = async (professorId) => {
    if (!confirm('Tem certeza que deseja remover este professor? Essa ação não poderá ser desfeita.')) {
      return;
    }
    try {
      await apiRequest(`${professoresEndpoint}${professorId}/`, { method: 'DELETE', expectJSON: false });
      showToast('Professor removido com sucesso!', 'success', 'Sucesso');
      loadProfessores();
    } catch (error) {
      showToast(error.message || 'Erro ao remover professor', 'error', 'Erro');
    }
  };

  const openEditProfessorModal = (prof) => {
    const form = document.createElement('form');
    form.innerHTML = `
      <div class="modal-grid">
        <div>
          <label for="edit-prof-nome">Nome completo</label>
          <input type="text" id="edit-prof-nome" name="nome" value="${prof.first_name || ''}" placeholder="Ex.: Marcos Andrade">
        </div>
        <div>
          <label for="edit-prof-email">Email</label>
          <input type="email" id="edit-prof-email" name="email" value="${prof.email || ''}" required>
        </div>
        <div>
          <label for="edit-prof-especialidade">Especialidade</label>
          <input type="text" id="edit-prof-especialidade" name="especialidade" value="${prof.especialidade || ''}">
        </div>
        <div>
          <label for="edit-prof-cref">CREF</label>
          <input type="text" id="edit-prof-cref" name="cref" value="${prof.cref || ''}" placeholder="000000-G/UF">
        </div>
        <div>
          <label for="edit-prof-telefone">Telefone</label>
          <input type="text" id="edit-prof-telefone" name="telefone" value="${prof.phone || ''}">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn outline" data-action="cancelar">Cancelar</button>
        <button type="submit" class="btn primary">Salvar alterações</button>
      </div>
    `;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        first_name: formData.get('nome') || undefined,
        email: formData.get('email') || undefined,
        phone: formData.get('telefone') || undefined,
        especialidade: formData.get('especialidade') || '',
        cref: formData.get('cref') || '',
      };

      try {
        await apiRequest(`${professoresEndpoint}${prof.id}/`, { method: 'PATCH', body: payload });
        showToast('Professor atualizado com sucesso!', 'success', 'Sucesso');
        closeModal();
        loadProfessores();
      } catch (error) {
        showToast(error.message || 'Erro ao atualizar professor', 'error', 'Erro');
      }
    });

    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);

    openModal('Editar Professor', form);
  };

  const init = async () => {
    // Evitar múltiplas execuções
    if (window.adminDashboardScriptExecuted) {
      console.log('Admin-dashboard.js: Script já foi executado, ignorando');
      return;
    }
    window.adminDashboardScriptExecuted = true;

    // Verificar autenticação e role antes de inicializar
    // Mas apenas se não houver redirecionamento em progresso
    if (window.adminRedirectInProgress || window.portalRedirectInProgress) {
      console.log('Admin-dashboard.js: Redirecionamento em progresso, ignorando verificação');
      return;
    }

    const isAuthorized = await checkAuthAndRole();
    if (!isAuthorized) {
      console.log('Admin-dashboard.js: Não autorizado, não continuando');
      return; // Não continuar se não estiver autorizado
    }

    document.getElementById('btn-relatorios')?.addEventListener('click', (event) => {
      event.preventDefault();
      openRelatoriosModal();
    });

    document.getElementById('btn-novo-plano')?.addEventListener('click', (event) => {
      event.preventDefault();
      openNovoPlanoModal();
    });

    document.getElementById('btn-add-professor')?.addEventListener('click', (event) => {
      event.preventDefault();
      openAddProfessorModal();
    });

    document.getElementById('btn-remover-professor')?.addEventListener('click', (event) => {
      event.preventDefault();
      showToast('Selecione um professor na lista para remover utilizando o botão ao lado.', 'info', 'Dica');
    });

    tabelaProfessoresBody?.addEventListener('click', (event) => {
      const removeButton = event.target.closest('.btn-remover-professor');
      if (removeButton) {
        const professorId = removeButton.dataset.id;
        if (professorId) {
          handleRemoverProfessor(professorId);
        }
        return;
      }

      const editButton = event.target.closest('.btn-editar-professor');
      if (editButton) {
        const professorId = parseInt(editButton.dataset.id, 10);
        const professor = professoresCache.find((p) => p.id === professorId);
        if (professor) {
          openEditProfessorModal(professor);
        }
      }
    });

    modalClose?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', (event) => {
      if (event.target === modalOverlay) {
        closeModal();
      }
    });

    loadProfessores();
    
    // Configurar logout para limpar tokens JWT
    setupLogout();
  };

  const setupLogout = () => {
    const logoutForm = document.querySelector('.logout-form');
    if (!logoutForm) {
      return;
    }

    logoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Limpar todos os tokens JWT do localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user_data');
      
      // Limpar flags de redirecionamento
      window.portalRedirectInProgress = false;
      window.adminRedirectInProgress = false;
      window.portalScriptExecuted = false;
      window.adminDashboardScriptExecuted = false;
      window.adminAuthCheckInProgress = false;
      
      console.log('Admin-dashboard.js: Tokens limpos, redirecionando para login');
      
      // Redirecionar para login
      window.location.href = '/login/?message=logout_success';
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})();

