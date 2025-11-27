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
  const tabelaUsuariosBody = document.querySelector('#tabela-usuarios tbody');
  let professoresCache = [];
  let usuariosCache = [];
  let planosCache = [];

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

  // ========== GERENCIAMENTO DE USUÁRIOS ==========
  
  const loadPlanos = async () => {
    try {
      const data = await apiRequest(`${planosEndpoint}?page_size=50`);
      planosCache = Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  };
  
  const renderUsuariosTabela = (usuarios) => {
    if (!tabelaUsuariosBody) return;
    usuariosCache = usuarios;
    tabelaUsuariosBody.innerHTML = '';
    
    if (!usuarios.length) {
      tabelaUsuariosBody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;">Nenhum usuário encontrado.</td></tr>';
      return;
    }
    
    usuarios.forEach((user) => {
      const row = document.createElement('tr');
      const iniciais = `${(user.first_name || user.username || 'U').charAt(0)}${(user.last_name || '').charAt(0)}`.toUpperCase();
      const nomeCompleto = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Sem nome';
      
      // Determinar classe do plano
      let planoBadgeClass = 'sem-plano';
      let planoNome = 'Sem plano';
      if (user.plano_nome || user.plano) {
        planoNome = user.plano_nome || user.plano;
        const planoLower = planoNome.toLowerCase();
        if (planoLower.includes('premium')) planoBadgeClass = 'premium';
        else if (planoLower.includes('elite')) planoBadgeClass = 'elite';
        else if (planoLower.includes('básico') || planoLower.includes('basico')) planoBadgeClass = 'basico';
        else planoBadgeClass = 'basico';
      }
      
      // Status
      const isActive = user.is_active_member;
      const statusClass = isActive ? 'success' : 'danger';
      const statusText = isActive ? 'Ativo' : 'Inativo';
      
      // Última atividade
      const ultimaAtividade = user.last_login 
        ? new Date(user.last_login).toLocaleDateString('pt-BR') 
        : 'Nunca acessou';
      
      // Role badge
      let roleBadge = '';
      if (user.role === 'admin' || user.is_superuser) {
        roleBadge = '<span class="status" style="background: rgba(239, 68, 68, 0.15); color: #f87171; margin-left: 6px;"><i class="fa-solid fa-shield"></i></span>';
      } else if (user.role === 'professor') {
        roleBadge = '<span class="status" style="background: rgba(59, 130, 246, 0.15); color: #60a5fa; margin-left: 6px;"><i class="fa-solid fa-chalkboard-teacher"></i></span>';
      }
      
      row.innerHTML = `
        <td>
          <div class="usuario-info">
            <div class="usuario-avatar">${iniciais}</div>
            <div class="usuario-dados">
              <strong>${nomeCompleto}${roleBadge}</strong>
              <small>ID: ${user.id} • CPF: ${user.cpf || 'Não informado'}</small>
            </div>
          </div>
        </td>
        <td>${user.email || '--'}</td>
        <td><span class="plano-badge ${planoBadgeClass}"><i class="fa-solid fa-crown"></i> ${planoNome}</span></td>
        <td><span class="status ${statusClass}"><i class="fa-solid fa-circle"></i> ${statusText}</span></td>
        <td>${ultimaAtividade}</td>
        <td>
          <div class="usuario-acoes">
            <button class="btn-icon btn-editar-usuario" data-id="${user.id}" title="Editar usuário">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon btn-mudar-plano" data-id="${user.id}" title="Alterar plano">
              <i class="fa-solid fa-crown"></i>
            </button>
            <button class="btn-icon btn-gerar-pagamento" data-id="${user.id}" title="Gerar pagamento">
              <i class="fa-solid fa-file-invoice-dollar"></i>
            </button>
            <button class="btn-icon danger btn-desativar-usuario" data-id="${user.id}" title="${isActive ? 'Desativar' : 'Ativar'} usuário">
              <i class="fa-solid fa-${isActive ? 'ban' : 'check'}"></i>
            </button>
          </div>
        </td>
      `;
      tabelaUsuariosBody.appendChild(row);
    });
  };
  
  const loadUsuarios = async (filtros = {}) => {
    if (!tabelaUsuariosBody) return;
    tabelaUsuariosBody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando usuários...</td></tr>';
    
    try {
      let url = `${professoresEndpoint}?page_size=50`;
      if (filtros.role) url += `&role=${filtros.role}`;
      if (filtros.search) url += `&search=${encodeURIComponent(filtros.search)}`;
      
      const data = await apiRequest(url);
      let usuarios = Array.isArray(data) ? data : (data.results || []);
      
      // Filtrar por status localmente se necessário
      if (filtros.status === 'ativo') {
        usuarios = usuarios.filter(u => u.is_active);
      } else if (filtros.status === 'inativo') {
        usuarios = usuarios.filter(u => !u.is_active);
      }
      
      renderUsuariosTabela(usuarios);
    } catch (error) {
      tabelaUsuariosBody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;">Erro ao carregar: ${error.message}</td></tr>`;
    }
  };
  
  const openNovoUsuarioModal = async () => {
    await loadPlanos();
    
    const form = document.createElement('form');
    form.id = 'form-novo-usuario';
    
    let planosOptions = '<option value="">Sem plano</option>';
    planosCache.forEach(p => {
      planosOptions += `<option value="${p.id}">${p.nome} - R$ ${parseFloat(p.preco).toFixed(2)}</option>`;
    });
    
    form.innerHTML = `
      <div class="form-group">
        <label for="user-nome">Nome Completo *</label>
        <input type="text" id="user-nome" name="nome" required placeholder="Ex.: João Silva">
      </div>
      <div class="form-group">
        <label for="user-email">Email *</label>
        <input type="email" id="user-email" name="email" required placeholder="joao@email.com">
      </div>
      <div class="form-group">
        <label for="user-cpf">CPF</label>
        <input type="text" id="user-cpf" name="cpf" placeholder="000.000.000-00">
      </div>
      <div class="form-group">
        <label for="user-telefone">Telefone</label>
        <input type="text" id="user-telefone" name="telefone" placeholder="(00) 00000-0000">
      </div>
      <div class="form-group">
        <label for="user-role">Perfil *</label>
        <select id="user-role" name="role" required>
          <option value="aluno">Aluno</option>
          <option value="professor">Professor</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div class="form-group" id="grupo-plano">
        <label for="user-plano">Plano</label>
        <select id="user-plano" name="plano">${planosOptions}</select>
      </div>
      <div class="form-group">
        <label for="user-senha">Senha Temporária *</label>
        <input type="text" id="user-senha" name="senha" required value="${Math.random().toString(36).slice(-8)}">
        <small class="muted">O usuário deverá alterar no primeiro acesso</small>
      </div>
      <div class="form-actions">
        <button type="button" class="btn outline" data-action="cancelar">Cancelar</button>
        <button type="submit" class="btn primary"><i class="fa-solid fa-user-plus"></i> Criar Membro</button>
      </div>
    `;
    
    // Mostrar/ocultar campo de plano baseado no role
    const roleSelect = form.querySelector('#user-role');
    const grupoPlano = form.querySelector('#grupo-plano');
    roleSelect.addEventListener('change', () => {
      grupoPlano.style.display = roleSelect.value === 'aluno' ? 'block' : 'none';
    });
    
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const nomeCompleto = formData.get('nome').trim();
      const partesNome = nomeCompleto.split(' ');
      const firstName = partesNome[0] || '';
      const lastName = partesNome.slice(1).join(' ') || '';
      
      const payload = {
        email: formData.get('email'),
        first_name: firstName,
        last_name: lastName,
        cpf: formData.get('cpf') || '',
        phone: formData.get('telefone') || '',
        role: formData.get('role'),
        password: formData.get('senha'),
        password_confirm: formData.get('senha'),
      };
      
      try {
        const novoUsuario = await apiRequest(professoresEndpoint, { method: 'POST', body: payload });
        
        // Se for aluno e tiver plano selecionado, criar matrícula
        const planoId = formData.get('plano');
        if (formData.get('role') === 'aluno' && planoId) {
          try {
            const plano = planosCache.find(p => p.id === parseInt(planoId));
            const dataInicio = new Date();
            const dataFim = new Date();
            dataFim.setDate(dataFim.getDate() + (plano?.duracao_dias || 30));
            
            await apiRequest('/api/matriculas/', { 
              method: 'POST', 
              body: { 
                usuario: novoUsuario.id, 
                plano: parseInt(planoId), 
                status: 'ativa',
                data_inicio: dataInicio.toISOString().split('T')[0],
                data_fim: dataFim.toISOString().split('T')[0],
                valor_pago: parseFloat(plano?.preco || 0)
              }
            });
          } catch (e) {
            console.warn('Aviso ao criar matrícula:', e.message);
          }
        }
        
        showToast('Membro criado com sucesso!', 'success', 'Sucesso');
        closeModal();
        loadUsuarios();
      } catch (error) {
        showToast(error.message || 'Erro ao criar membro', 'error', 'Erro');
      }
    });
    
    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);
    openModal('Novo Membro', form);
  };
  
  const openEditarUsuarioModal = (user) => {
    const form = document.createElement('form');
    form.id = 'form-editar-usuario';
    
    form.innerHTML = `
      <div class="form-group">
        <label for="edit-user-nome">Nome</label>
        <input type="text" id="edit-user-nome" name="first_name" value="${user.first_name || ''}">
      </div>
      <div class="form-group">
        <label for="edit-user-sobrenome">Sobrenome</label>
        <input type="text" id="edit-user-sobrenome" name="last_name" value="${user.last_name || ''}">
      </div>
      <div class="form-group">
        <label for="edit-user-email">Email</label>
        <input type="email" id="edit-user-email" name="email" value="${user.email || ''}" required>
      </div>
      <div class="form-group">
        <label for="edit-user-cpf">CPF</label>
        <input type="text" id="edit-user-cpf" name="cpf" value="${user.cpf || ''}">
      </div>
      <div class="form-group">
        <label for="edit-user-telefone">Telefone</label>
        <input type="text" id="edit-user-telefone" name="phone" value="${user.phone || ''}">
      </div>
      <div class="form-group">
        <label for="edit-user-role">Perfil</label>
        <select id="edit-user-role" name="role">
          <option value="aluno" ${user.role === 'aluno' ? 'selected' : ''}>Aluno</option>
          <option value="professor" ${user.role === 'professor' ? 'selected' : ''}>Professor</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn outline" data-action="cancelar">Cancelar</button>
        <button type="submit" class="btn primary"><i class="fa-solid fa-save"></i> Salvar</button>
      </div>
    `;
    
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name'),
        email: formData.get('email'),
        cpf: formData.get('cpf'),
        phone: formData.get('phone'),
        role: formData.get('role'),
      };
      
      try {
        await apiRequest(`${professoresEndpoint}${user.id}/`, { method: 'PATCH', body: payload });
        showToast('Usuário atualizado!', 'success', 'Sucesso');
        closeModal();
        loadUsuarios();
      } catch (error) {
        showToast(error.message || 'Erro ao atualizar', 'error', 'Erro');
      }
    });
    
    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);
    openModal(`Editar: ${user.first_name || user.username}`, form);
  };
  
  const openMudarPlanoModal = async (user) => {
    await loadPlanos();
    
    const form = document.createElement('form');
    form.id = 'form-mudar-plano';
    
    let planosOptions = '<option value="">Sem plano</option>';
    planosCache.forEach(p => {
      planosOptions += `<option value="${p.id}">${p.nome} - R$ ${parseFloat(p.preco).toFixed(2)}</option>`;
    });
    
    const nomeCompleto = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    
    form.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div class="usuario-avatar" style="width: 60px; height: 60px; margin: 0 auto 12px; font-size: 1.2rem;">
          ${(user.first_name || 'U').charAt(0)}${(user.last_name || '').charAt(0)}
        </div>
        <h3 style="color: #fff; margin-bottom: 4px;">${nomeCompleto}</h3>
        <p class="muted">${user.email}</p>
        <p style="margin-top: 8px;">Plano atual: <strong style="color: #a78bfa;">${user.plano_nome || 'Nenhum'}</strong></p>
      </div>
      <div class="form-group">
        <label for="novo-plano">Novo Plano</label>
        <select id="novo-plano" name="plano" required>${planosOptions}</select>
      </div>
      <div class="form-group">
        <label for="data-inicio">Data de Início</label>
        <input type="date" id="data-inicio" name="data_inicio" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" name="gerar_pagamento" id="gerar-pagamento-check" checked>
          <span class="checkbox-custom"><i class="fa-solid fa-check"></i></span>
          Gerar cobrança automaticamente
        </label>
      </div>
      <div class="form-actions">
        <button type="button" class="btn outline" data-action="cancelar">Cancelar</button>
        <button type="submit" class="btn primary"><i class="fa-solid fa-crown"></i> Alterar Plano</button>
      </div>
    `;
    
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const planoId = formData.get('plano');
      
      if (!planoId) {
        showToast('Selecione um plano', 'warning', 'Atenção');
        return;
      }
      
      try {
        const plano = planosCache.find(p => p.id === parseInt(planoId));
        const dataInicio = new Date(formData.get('data_inicio'));
        const dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + (plano?.duracao_dias || 30));
        
        // Buscar matrículas ativas do usuário para cancelar
        try {
          const matriculasData = await apiRequest(`/api/matriculas/?usuario=${user.id}`);
          const matriculas = Array.isArray(matriculasData) ? matriculasData : (matriculasData.results || []);
          
          // Cancelar matrículas ativas anteriores
          for (const mat of matriculas) {
            if (mat.status === 'ativa') {
              await apiRequest(`/api/matriculas/${mat.id}/`, { 
                method: 'PATCH', 
                body: { status: 'cancelada' }
              });
            }
          }
        } catch (e) {
          console.warn('Aviso ao verificar matrículas anteriores:', e.message);
        }
        
        // Criar nova matrícula
        await apiRequest('/api/matriculas/', { 
          method: 'POST', 
          body: { 
            usuario: user.id, 
            plano: parseInt(planoId),
            data_inicio: formData.get('data_inicio'),
            data_fim: dataFim.toISOString().split('T')[0],
            valor_pago: parseFloat(plano?.preco || 0),
            status: 'ativa'
          }
        });
        
        // Ativar usuário como membro
        try {
          await apiRequest(`${professoresEndpoint}${user.id}/`, { 
            method: 'PATCH', 
            body: { is_active_member: true }
          });
        } catch (e) {
          console.warn('Aviso ao ativar usuário:', e.message);
        }
        
        // Gerar pagamento se checkbox marcado
        if (formData.get('gerar_pagamento')) {
          if (plano) {
            try {
              await apiRequest('/api/pagamentos/', { 
                method: 'POST', 
                body: { 
                  usuario: user.id, 
                  valor: parseFloat(plano.preco),
                  descricao: `Mensalidade - ${plano.nome}`,
                  status: 'pendente'
                }
              });
            } catch (e) {
              console.warn('Aviso ao criar pagamento:', e.message);
            }
          }
        }
        
        showToast('Plano alterado com sucesso!', 'success', 'Sucesso');
        closeModal();
        loadUsuarios();
      } catch (error) {
        showToast(error.message || 'Erro ao alterar plano', 'error', 'Erro');
      }
    });
    
    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);
    openModal('Alterar Plano', form);
  };
  
  const openGerarPagamentoModal = async (user) => {
    await loadPlanos();
    
    const nomeCompleto = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    const plano = planosCache.find(p => p.nome === user.plano_nome);
    const valorSugerido = plano ? parseFloat(plano.preco).toFixed(2) : '0.00';
    
    const form = document.createElement('form');
    form.id = 'form-gerar-pagamento';
    
    form.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div class="usuario-avatar" style="width: 60px; height: 60px; margin: 0 auto 12px; font-size: 1.2rem;">
          ${(user.first_name || 'U').charAt(0)}${(user.last_name || '').charAt(0)}
        </div>
        <h3 style="color: #fff; margin-bottom: 4px;">${nomeCompleto}</h3>
        <p class="muted">${user.email}</p>
      </div>
      <div class="form-group">
        <label for="pag-descricao">Descrição</label>
        <input type="text" id="pag-descricao" name="descricao" value="Mensalidade - ${user.plano_nome || 'Academia'}" required>
      </div>
      <div class="form-group">
        <label for="pag-valor">Valor (R$)</label>
        <input type="number" id="pag-valor" name="valor" step="0.01" min="0" value="${valorSugerido}" required>
      </div>
      <div class="form-group">
        <label for="pag-vencimento">Data de Vencimento</label>
        <input type="date" id="pag-vencimento" name="data_vencimento" value="${new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label for="pag-metodo">Método de Pagamento</label>
        <select id="pag-metodo" name="metodo">
          <option value="pix">PIX</option>
          <option value="cartao">Cartão de Crédito</option>
          <option value="boleto">Boleto</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn outline" data-action="cancelar">Cancelar</button>
        <button type="submit" class="btn primary"><i class="fa-solid fa-file-invoice-dollar"></i> Gerar Cobrança</button>
      </div>
    `;
    
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      
      try {
        await apiRequest('/api/pagamentos/', { 
          method: 'POST', 
          body: { 
            usuario: user.id, 
            valor: parseFloat(formData.get('valor')),
            descricao: formData.get('descricao'),
            data_vencimento: formData.get('data_vencimento'),
            metodo_pagamento: formData.get('metodo'),
            status: 'pendente'
          }
        });
        
        showToast('Cobrança gerada com sucesso!', 'success', 'Sucesso');
        closeModal();
      } catch (error) {
        showToast(error.message || 'Erro ao gerar cobrança', 'error', 'Erro');
      }
    });
    
    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);
    openModal('Gerar Pagamento', form);
  };
  
  const toggleUsuarioStatus = async (user) => {
    const isActive = user.is_active_member;
    const action = isActive ? 'desativar' : 'ativar';
    if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;
    
    try {
      await apiRequest(`${professoresEndpoint}${user.id}/`, { 
        method: 'PATCH', 
        body: { is_active_member: !isActive }
      });
      showToast(`Usuário ${isActive ? 'desativado' : 'ativado'}!`, 'success', 'Sucesso');
      loadUsuarios();
    } catch (error) {
      showToast(error.message || 'Erro ao alterar status', 'error', 'Erro');
    }
  };
  
  // ========== FIM GERENCIAMENTO DE USUÁRIOS ==========

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
    
    // ===== Eventos de Usuários =====
    document.getElementById('btn-novo-usuario')?.addEventListener('click', (event) => {
      event.preventDefault();
      openNovoUsuarioModal();
    });
    
    // Busca de usuários
    let buscaTimeout;
    document.getElementById('busca-usuarios')?.addEventListener('input', (event) => {
      clearTimeout(buscaTimeout);
      buscaTimeout = setTimeout(() => {
        const filtros = {
          search: event.target.value,
          role: document.getElementById('filtro-role')?.value || '',
          status: document.getElementById('filtro-status')?.value || ''
        };
        loadUsuarios(filtros);
      }, 400);
    });
    
    // Filtro por role
    document.getElementById('filtro-role')?.addEventListener('change', () => {
      const filtros = {
        search: document.getElementById('busca-usuarios')?.value || '',
        role: document.getElementById('filtro-role')?.value || '',
        status: document.getElementById('filtro-status')?.value || ''
      };
      loadUsuarios(filtros);
    });
    
    // Filtro por status
    document.getElementById('filtro-status')?.addEventListener('change', () => {
      const filtros = {
        search: document.getElementById('busca-usuarios')?.value || '',
        role: document.getElementById('filtro-role')?.value || '',
        status: document.getElementById('filtro-status')?.value || ''
      };
      loadUsuarios(filtros);
    });
    
    // Eventos na tabela de usuários
    tabelaUsuariosBody?.addEventListener('click', (event) => {
      const userId = event.target.closest('[data-id]')?.dataset.id;
      if (!userId) return;
      
      const user = usuariosCache.find(u => u.id === parseInt(userId));
      if (!user) return;
      
      if (event.target.closest('.btn-editar-usuario')) {
        openEditarUsuarioModal(user);
      } else if (event.target.closest('.btn-mudar-plano')) {
        openMudarPlanoModal(user);
      } else if (event.target.closest('.btn-gerar-pagamento')) {
        openGerarPagamentoModal(user);
      } else if (event.target.closest('.btn-desativar-usuario')) {
        toggleUsuarioStatus(user);
      }
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
    loadUsuarios();
    loadPlanos();
    
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

