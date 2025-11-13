(() => {
  const config = window.PROFESSOR_API_CONFIG || {};
  const API_BASE_URL = (window.API_CONFIG && window.API_CONFIG.API_BASE_URL) || '/api';
  const treinosEndpoint = config.treinosEndpoint || '/api/treinos/gerenciar/';
  const exerciciosEndpoint = config.exerciciosEndpoint || '/api/exercicios/';
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');
  const toastContainer = document.getElementById('toast-container');
  const treinosTableBody = document.querySelector('#treinos-table tbody');
  const filterTreinosSelect = document.getElementById('filter-treinos');

  let treinosCache = [];

  // Verificar autenticação e role do usuário
  const checkAuthAndRole = async () => {
    // Evitar múltiplas verificações simultâneas
    if (window.professorAuthCheckInProgress) {
      console.log('Professor-dashboard.js: Verificação de autenticação já em progresso, aguardando...');
      return true;
    }
    window.professorAuthCheckInProgress = true;

    const accessToken = localStorage.getItem('access_token') || localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
    
    if (!accessToken) {
      window.professorAuthCheckInProgress = false;
      window.location.href = '/login/?message=login_required&redirect=/portal/professor/';
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
            window.professorAuthCheckInProgress = false;
            return result;
          }
        }
        
        // Não conseguiu renovar, mas se já está na página do professor, não redirecionar
        const currentPath = window.location.pathname;
        if (currentPath.includes('/portal/professor/')) {
          console.warn('Professor-dashboard.js: Token expirado mas já está na página do professor, permitindo acesso');
          window.professorAuthCheckInProgress = false;
          return true;
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.professorAuthCheckInProgress = false;
        window.location.href = '/login/?message=session_expired&redirect=/portal/professor/';
        return false;
      }

      if (!response.ok) {
        throw new Error('Erro ao verificar autenticação');
      }

      const dashboardData = await response.json();
      const result = checkUserRole(dashboardData);
      window.professorAuthCheckInProgress = false;
      return result;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      window.professorAuthCheckInProgress = false;
      // Não redirecionar se já estiver na página do professor - pode ser erro temporário
      const currentPath = window.location.pathname;
      if (currentPath.includes('/portal/professor/')) {
        console.warn('Professor-dashboard.js: Erro na verificação mas já está na página do professor, permitindo acesso');
        return true;
      }
      window.location.href = '/login/?message=login_required&redirect=/portal/professor/';
      return false;
    }
  };

  const checkUserRole = (dashboardData) => {
    // Verificar role do usuário
    const user = dashboardData.user || {};
    const userRole = user.role || dashboardData.role;
    const isSuperuser = user.is_superuser || false;
    const currentPath = window.location.pathname;
    
    console.log('Professor-dashboard.js: Verificando role do usuário:', { userRole, isSuperuser, user, currentPath });
    
    // Se está na página do professor, SEMPRE permitir acesso (evitar loops)
    // A verificação de role será feita no backend se necessário
    if (currentPath.includes('/portal/professor/')) {
      console.log('Professor-dashboard.js: Está na página do professor, permitindo acesso (evitando loops)');
      return true;
    }
    
    // Se não está na página do professor, permitir acesso (não deveria acontecer, mas por segurança)
    console.log('Professor-dashboard.js: Não está na página do professor, permitindo acesso');
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
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
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

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  };

  const renderTreinos = (treinos) => {
    if (!treinosTableBody) return;
    treinosTableBody.innerHTML = '';

    if (!treinos.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.innerHTML = '<div class="empty">Nenhum treino encontrado.</div>';
      row.appendChild(cell);
      treinosTableBody.appendChild(row);
      return;
    }

    treinos.forEach((treino) => {
      const row = document.createElement('tr');
      row.dataset.treinoId = treino.id;

      const statusBadge = treino.ativo
        ? '<span class="pill success"><i class="fa-solid fa-circle-check"></i> Ativo</span>'
        : '<span class="pill accent"><i class="fa-solid fa-clock"></i> Inativo</span>';

      row.innerHTML = `
        <td>${treino.usuario_nome || '—'}</td>
        <td>${treino.nome || '—'}</td>
        <td>${formatDate(treino.data_criacao)}</td>
        <td>${statusBadge}</td>
        <td>
          <button type="button" class="btn outline btn-editar-treino">
            <i class="fa-solid fa-pen-to-square"></i>Editar
          </button>
        </td>
      `;

      treinosTableBody.appendChild(row);
    });
  };

  const loadTreinos = async () => {
    try {
      const data = await apiRequest(`${treinosEndpoint}?page_size=100`);
      treinosCache = Array.isArray(data)
        ? data
        : (data.results || []);
      applyTreinoFilter();
    } catch (error) {
      showToast(error.message || 'Não foi possível carregar os treinos', 'error', 'Ops!');
    }
  };

  const applyTreinoFilter = () => {
    const filterValue = (filterTreinosSelect && filterTreinosSelect.value || '').toLowerCase();
    if (!filterValue) {
      renderTreinos(treinosCache);
      return;
    }
    const filtered = treinosCache.filter((treino) => {
      const objetivo = `${treino.nome || ''} ${treino.descricao || ''}`.toLowerCase();
      return objetivo.includes(filterValue);
    });
    renderTreinos(filtered);
  };

  const openBibliotecaModal = async () => {
    openModal('Biblioteca de Exercícios', '<p>Carregando exercícios...</p>');
    try {
      const data = await apiRequest(`${exerciciosEndpoint}?page_size=100`);
      const exercicios = Array.isArray(data) ? data : (data.results || []);
      if (!exercicios.length) {
        modalBody.innerHTML = '<div class="empty">Nenhum exercício cadastrado.</div>';
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'exercise-grid';
      exercicios.forEach((exercicio) => {
        const card = document.createElement('div');
        card.className = 'exercise-card';
        card.innerHTML = `
          <h4>${exercicio.nome}</h4>
          <div class="exercise-meta">
            <span>${exercicio.categoria}</span>
            <span>${exercicio.nivel}</span>
          </div>
          <p>${exercicio.descricao || 'Sem descrição.'}</p>
        `;
        grid.appendChild(card);
      });
      modalBody.innerHTML = '';
      modalBody.appendChild(grid);
    } catch (error) {
      modalBody.innerHTML = `<div class="empty">Erro ao carregar exercícios: ${error.message}</div>`;
    }
  };

  let exerciciosCache = null;
  let exerciciosPorCategoria = {};

  const ensureExercicios = async () => {
    if (exerciciosCache) return exerciciosCache;
    const data = await apiRequest(`${exerciciosEndpoint}?page_size=200`);
    const results = Array.isArray(data) ? data : (data.results || []);
    exerciciosCache = results;
    exerciciosPorCategoria = results.reduce((acc, item) => {
      const categoria = item.categoria || 'Outros';
      if (!acc[categoria]) acc[categoria] = [];
      acc[categoria].push(item);
      return acc;
    }, {});
    return exerciciosCache;
  };

  const openNovoTreinoForm = async () => {
    await ensureExercicios();

    const form = document.createElement('form');
    form.id = 'form-novo-treino';
    form.innerHTML = `
      <div class="modal-grid">
        <div>
          <label for="novo-treino-usuario">ID do aluno</label>
          <input type="number" id="novo-treino-usuario" name="usuario" placeholder="Ex.: 12" required min="1">
        </div>
        <div>
          <label for="novo-treino-nome">Nome do treino</label>
          <input type="text" id="novo-treino-nome" name="nome" placeholder="Ex.: Hipertrofia A/B" required>
        </div>
        <div>
          <label for="novo-treino-descricao">Descrição</label>
          <textarea id="novo-treino-descricao" name="descricao" placeholder="Observações gerais, divisão etc."></textarea>
        </div>
        <div>
          <label for="novo-treino-ativo">Status</label>
          <select id="novo-treino-ativo" name="ativo">
            <option value="true" selected>Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
      </div>
      <div class="metrics-collapse">
        <button type="button" class="btn outline metrics-toggle" aria-expanded="false">
          <i class="fa-solid fa-dumbbell"></i> Adicionar exercícios ao treino
        </button>
        <div class="collapse-body" hidden>
          <div class="exercise-selector">
            <div class="selector-controls">
              <div>
                <label for="novo-treino-categoria">Grupo muscular</label>
                <select id="novo-treino-categoria"></select>
              </div>
              <div>
                <label for="novo-treino-exercicio">Exercício</label>
                <select id="novo-treino-exercicio"></select>
              </div>
              <div class="selector-actions">
                <button type="button" class="btn primary" id="btn-adicionar-exercicio">
                  <i class="fa-solid fa-plus"></i> Adicionar exercício
                </button>
              </div>
            </div>
            <div id="selected-exercises" class="selected-exercises-container">
              <div class="empty">Nenhum exercício adicionado ainda.</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn outline" data-action="cancelar">Cancelar</button>
        <button type="submit" class="btn primary">Salvar treino</button>
      </div>
    `;

    const metricsToggle = form.querySelector('.metrics-toggle');
    const collapseBody = form.querySelector('.collapse-body');
    if (metricsToggle && collapseBody) {
      metricsToggle.addEventListener('click', () => {
        const expanded = metricsToggle.getAttribute('aria-expanded') === 'true';
        metricsToggle.setAttribute('aria-expanded', String(!expanded));
        if (expanded) {
          collapseBody.hidden = true;
          collapseBody.classList.remove('open');
        } else {
          collapseBody.hidden = false;
          collapseBody.classList.add('open');
        }
      });
    }

    const selectedExercises = [];
    const categoriaSelect = form.querySelector('#novo-treino-categoria');
    const exercicioSelect = form.querySelector('#novo-treino-exercicio');
    const selectedContainer = form.querySelector('#selected-exercises');
    const addButton = form.querySelector('#btn-adicionar-exercicio');

    const populateCategorias = () => {
      categoriaSelect.innerHTML = '';
      Object.keys(exerciciosPorCategoria).forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        categoriaSelect.appendChild(option);
      });
    };

    const populateExercicios = (categoria) => {
      exercicioSelect.innerHTML = '';
      const lista = exerciciosPorCategoria[categoria] || [];
      lista.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.nome;
        exercicioSelect.appendChild(option);
      });
    };

    const renderSelectedExercises = () => {
      if (!selectedContainer) return;
      if (!selectedExercises.length) {
        selectedContainer.innerHTML = '<div class="empty">Nenhum exercício adicionado ainda.</div>';
        return;
      }

      const table = document.createElement('table');
      table.className = 'table selected-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Exercício</th>
            <th>Séries</th>
            <th>Repetições</th>
            <th>Descanso (s)</th>
            <th>Notas</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector('tbody');
      selectedExercises.forEach((item, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index;
        row.innerHTML = `
          <td>
            <div class="exercise-name">
              <strong>${item.nome}</strong>
              <span class="muted">${item.categoria}</span>
            </div>
          </td>
          <td><input type="number" class="input-series" min="1" step="1" value="${item.series}"></td>
          <td><input type="number" class="input-repeticoes" min="1" step="1" value="${item.repeticoes}"></td>
          <td><input type="number" class="input-descanso" min="0" step="1" value="${item.tempo_descanso}"></td>
          <td><button type="button" class="btn outline btn-remove-exercicio">Remover</button></td>
        `;
        tbody.appendChild(row);
      });

      selectedContainer.innerHTML = '';
      selectedContainer.appendChild(table);
    };

    populateCategorias();
    populateExercicios(categoriaSelect.value);

    categoriaSelect.addEventListener('change', (event) => {
      populateExercicios(event.target.value);
    });

    addButton.addEventListener('click', () => {
      const categoria = categoriaSelect.value;
      const exercicioId = parseInt(exercicioSelect.value, 10);
      if (!exercicioId) {
        showToast('Selecione um exercício válido.', 'error', 'Atenção');
        return;
      }

      const exercicioInfo = (exerciciosPorCategoria[categoria] || []).find((item) => item.id === exercicioId);
      if (!exercicioInfo) {
        showToast('Não foi possível identificar o exercício selecionado.', 'error', 'Erro');
        return;
      }

      selectedExercises.push({
        id: exercicioInfo.id,
        nome: exercicioInfo.nome,
        categoria,
        series: 3,
        repeticoes: 10,
        tempo_descanso: 60,
        observacoes: '',
      });
      renderSelectedExercises();
    });

    selectedContainer.addEventListener('input', (event) => {
      const row = event.target.closest('tr');
      if (!row) return;
      const index = parseInt(row.dataset.index, 10);
      const item = selectedExercises[index];
      if (!item) return;

      if (event.target.classList.contains('input-series')) {
        item.series = parseInt(event.target.value, 10) || 1;
      } else if (event.target.classList.contains('input-repeticoes')) {
        item.repeticoes = parseInt(event.target.value, 10) || 1;
      } else if (event.target.classList.contains('input-descanso')) {
        item.tempo_descanso = parseInt(event.target.value, 10) || 0;
      }
    });

    selectedContainer.addEventListener('click', (event) => {
      const button = event.target.closest('.btn-remove-exercicio');
      if (!button) return;
      const row = button.closest('tr');
      const index = parseInt(row.dataset.index, 10);
      selectedExercises.splice(index, 1);
      renderSelectedExercises();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        usuario: parseInt(formData.get('usuario'), 10),
        nome: formData.get('nome'),
        descricao: formData.get('descricao'),
        ativo: formData.get('ativo') === 'true',
        exercicios: selectedExercises.map((item, index) => ({
          exercicio: item.id,
          series: item.series,
          repeticoes: item.repeticoes,
          tempo_descanso: item.tempo_descanso,
          observacoes: item.observacoes,
          ordem: index + 1,
        })),
      };

      try {
        await apiRequest(treinosEndpoint, { method: 'POST', body: payload });
        showToast('Treino criado com sucesso!', 'success', 'Sucesso');
        closeModal();
        await loadTreinos();
      } catch (error) {
        showToast(error.message || 'Erro ao criar treino', 'error', 'Erro');
      }
    });

    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);

    openModal('Novo Treino', form);
  };

  const openEditarTreinoForm = (treino) => {
    const form = document.createElement('form');
    form.id = 'form-editar-treino';
    form.innerHTML = `
      <div>
        <label for="editar-treino-nome">Nome do treino</label>
        <input type="text" id="editar-treino-nome" name="nome" value="${treino.nome || ''}" required>
      </div>
      <div>
        <label for="editar-treino-descricao">Descrição</label>
        <textarea id="editar-treino-descricao" name="descricao">${treino.descricao || ''}</textarea>
      </div>
      <div>
        <label for="editar-treino-ativo">Status</label>
        <select id="editar-treino-ativo" name="ativo">
          <option value="true" ${treino.ativo ? 'selected' : ''}>Ativo</option>
          <option value="false" ${!treino.ativo ? 'selected' : ''}>Inativo</option>
        </select>
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
        nome: formData.get('nome'),
        descricao: formData.get('descricao'),
        ativo: formData.get('ativo') === 'true',
      };
      try {
        await apiRequest(`${treinosEndpoint}${treino.id}/`, {
          method: 'PATCH',
          body: payload,
        });
        showToast('Treino atualizado com sucesso!', 'success', 'Sucesso');
        closeModal();
        await loadTreinos();
      } catch (error) {
        showToast(error.message || 'Erro ao atualizar treino', 'error', 'Erro');
      }
    });

    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);

    openModal(`Editar Treino • ${treino.nome || ''}`, form);
  };

  const handleTreinoEditClick = async (event) => {
    const button = event.target.closest('.btn-editar-treino');
    if (!button) return;
    event.preventDefault();
    const row = button.closest('tr');
    const treinoId = row && row.dataset.treinoId;
    if (!treinoId) return;

    try {
      const treino = await apiRequest(`${treinosEndpoint}${treinoId}/`);
      openEditarTreinoForm(treino);
    } catch (error) {
      showToast(error.message || 'Não foi possível carregar o treino', 'error', 'Erro');
    }
  };

  const openNovaAvaliacaoForm = () => {
    const today = new Date().toISOString().split('T')[0];
    const form = document.createElement('form');
    form.id = 'form-nova-avaliacao';
    form.innerHTML = `
      <div class="modal-grid">
        <div>
          <label for="avaliacao-aluno-nome">Nome completo do aluno</label>
          <input type="text" id="avaliacao-aluno-nome" name="usuario_nome" placeholder="Ex.: Maria Souza" required>
          <small class="muted">Informe o nome completo conforme registrado.</small>
        </div>
        <div>
          <label for="avaliacao-aluno-id">ID do aluno (opcional)</label>
          <input type="number" id="avaliacao-aluno-id" name="usuario_id" placeholder="Ex.: 15" min="1">
          <small class="muted">Preencha caso conheça o ID para maior precisão.</small>
        </div>
        <div>
          <label for="avaliacao-data">Data da avaliação</label>
          <input type="date" id="avaliacao-data" name="data_avaliacao" value="${today}" required>
        </div>
        <div>
          <label for="avaliacao-peso">Peso (kg)</label>
          <input type="number" step="0.01" min="0" id="avaliacao-peso" name="peso" placeholder="Ex.: 78.5" required>
        </div>
        <div>
          <label for="avaliacao-altura">Altura (cm)</label>
          <input type="number" step="0.1" min="0" id="avaliacao-altura" name="altura" placeholder="Ex.: 175" required>
        </div>
        <div>
          <label for="avaliacao-imc">IMC</label>
          <input type="number" step="0.1" min="0" id="avaliacao-imc" name="imc" placeholder="Calculado automaticamente">
          <small class="muted">Preencha manualmente ou deixe vazio para o cálculo automático pelo sistema.</small>
        </div>
        <div style="grid-column: 1 / -1;">
          <label for="avaliacao-observacoes">Observações</label>
          <textarea id="avaliacao-observacoes" name="observacoes" placeholder="Notas adicionais, evolução, pontos de atenção..." rows="3"></textarea>
        </div>
      </div>
      <div class="metrics-collapse">
        <button type="button" class="btn outline metrics-toggle" aria-expanded="false">
          <i class="fa-solid fa-sliders"></i> Adicionar métricas complementares
        </button>
        <div class="collapse-body" hidden>
          <div class="modal-grid">
            <div>
              <label for="avaliacao-gordura">% de gordura</label>
              <input type="number" step="0.1" min="0" id="avaliacao-gordura" name="percentual_gordura" placeholder="Ex.: 18.5">
            </div>
            <div>
              <label for="avaliacao-muscular">Massa muscular (kg)</label>
              <input type="number" step="0.1" min="0" id="avaliacao-muscular" name="massa_muscular" placeholder="Ex.: 34.2">
            </div>
            <div>
              <label for="avaliacao-perimetro-peito">Perímetro peito (cm)</label>
              <input type="number" step="0.1" min="0" id="avaliacao-perimetro-peito" name="perimetro_peito" placeholder="Ex.: 102">
            </div>
            <div>
              <label for="avaliacao-perimetro-cintura">Perímetro cintura (cm)</label>
              <input type="number" step="0.1" min="0" id="avaliacao-perimetro-cintura" name="perimetro_cintura" placeholder="Ex.: 88">
            </div>
            <div>
              <label for="avaliacao-perimetro-quadril">Perímetro quadril (cm)</label>
              <input type="number" step="0.1" min="0" id="avaliacao-perimetro-quadril" name="perimetro_quadril" placeholder="Ex.: 96">
            </div>
            <div>
              <label for="avaliacao-perimetro-braco">Perímetro braço (cm)</label>
              <input type="number" step="0.1" min="0" id="avaliacao-perimetro-braco" name="perimetro_braco" placeholder="Ex.: 34">
            </div>
            <div>
              <label for="avaliacao-perimetro-coxa">Perímetro coxa (cm)</label>
              <input type="number" step="0.1" min="0" id="avaliacao-perimetro-coxa" name="perimetro_coxa" placeholder="Ex.: 56">
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn outline" data-action="cancelar">Cancelar</button>
        <button type="submit" class="btn primary">Registrar avaliação</button>
      </div>
    `;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);

      const toNumber = (value) => {
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value);
        return Number.isNaN(num) ? null : num;
      };

      const alunoIdRaw = formData.get('usuario_id');
      const alunoId = alunoIdRaw ? parseInt(alunoIdRaw, 10) : null;
      const alunoNome = (formData.get('usuario_nome') || '').trim() || null;

      const peso = toNumber(formData.get('peso'));
      const altura = toNumber(formData.get('altura'));
      let imcValue = toNumber(formData.get('imc'));

      if ((imcValue === null || imcValue === undefined) && peso && altura) {
        const alturaMetros = altura / 100;
        if (alturaMetros > 0) {
          imcValue = parseFloat((peso / (alturaMetros * alturaMetros)).toFixed(2));
        }
      }

      const payload = {
        usuario: alunoId || undefined,
        usuario_nome: alunoNome || undefined,
        data_avaliacao: formData.get('data_avaliacao'),
        peso,
        altura,
        percentual_gordura: toNumber(formData.get('percentual_gordura')),
        massa_muscular: toNumber(formData.get('massa_muscular')),
        imc: imcValue,
        perimetro_peito: toNumber(formData.get('perimetro_peito')),
        perimetro_cintura: toNumber(formData.get('perimetro_cintura')),
        perimetro_quadril: toNumber(formData.get('perimetro_quadril')),
        perimetro_braco: toNumber(formData.get('perimetro_braco')),
        perimetro_coxa: toNumber(formData.get('perimetro_coxa')),
        observacoes: formData.get('observacoes') || '',
      };

      try {
        await apiRequest('/api/avaliacoes/', { method: 'POST', body: payload });
        showToast('Avaliação registrada com sucesso!', 'success', 'Sucesso');
        closeModal();
      } catch (error) {
        showToast(error.message || 'Erro ao registrar avaliação', 'error', 'Erro');
      }
    });

    const metricsToggle = form.querySelector('.metrics-toggle');
    const metricsBody = form.querySelector('.collapse-body');

    if (metricsToggle && metricsBody) {
      metricsToggle.addEventListener('click', () => {
        const expanded = metricsToggle.getAttribute('aria-expanded') === 'true';
        metricsToggle.setAttribute('aria-expanded', String(!expanded));
        if (expanded) {
          metricsBody.hidden = true;
          metricsBody.classList.remove('open');
        } else {
          metricsBody.hidden = false;
          metricsBody.classList.add('open');
        }
      });
    }

    form.querySelector('[data-action="cancelar"]').addEventListener('click', closeModal);
    const pesoInput = form.querySelector('#avaliacao-peso');
    const alturaInput = form.querySelector('#avaliacao-altura');
    const imcInput = form.querySelector('#avaliacao-imc');

    const updateImc = () => {
      const pesoVal = parseFloat(pesoInput.value);
      const alturaVal = parseFloat(alturaInput.value);
      if (!Number.isNaN(pesoVal) && !Number.isNaN(alturaVal) && alturaVal > 0) {
        const alturaMetros = alturaVal / 100;
        const imcCalc = pesoVal / (alturaMetros * alturaMetros);
        if (!Number.isNaN(imcCalc) && imcInput) {
          imcInput.value = imcCalc.toFixed(2);
        }
      }
    };

    pesoInput.addEventListener('input', updateImc);
    alturaInput.addEventListener('input', updateImc);

    openModal('Registrar Avaliação', form);
  };

  const handleAlertAction = (event) => {
    const button = event.target.closest('.btn-alert');
    if (!button) return;
    event.preventDefault();
    const action = button.dataset.action;
    const messages = {
      'enviar-questionario': 'Questionário enviado com sucesso.',
      'responder-feedback': 'Abertura de resposta registrada, abra o chat do aluno para continuar.',
      'agendar-revisao': 'Revisão agendada. Atualize o treino após conversar com o aluno.',
    };
    showToast(messages[action] || 'Ação executada!', 'success', 'Pronto');
  };

  const handleAtualizarAlertas = () => {
    showToast('Alertas atualizados com os últimos eventos.', 'success', 'Atualizado');
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
      window.professorRedirectInProgress = false;
      window.portalScriptExecuted = false;
      window.adminDashboardScriptExecuted = false;
      window.professorDashboardScriptExecuted = false;
      window.professorAuthCheckInProgress = false;
      
      console.log('Professor-dashboard.js: Tokens limpos, redirecionando para login');
      
      // Redirecionar para login
      window.location.href = '/login/?message=logout_success';
    });
  };

  const init = async () => {
    // Evitar múltiplas execuções
    if (window.professorDashboardScriptExecuted) {
      console.log('Professor-dashboard.js: Script já foi executado, ignorando');
      return;
    }
    window.professorDashboardScriptExecuted = true;

    // Verificar autenticação e role antes de inicializar
    // Mas apenas se não houver redirecionamento em progresso
    if (window.professorRedirectInProgress || window.portalRedirectInProgress) {
      console.log('Professor-dashboard.js: Redirecionamento em progresso, ignorando verificação');
      return;
    }

    const isAuthorized = await checkAuthAndRole();
    if (!isAuthorized) {
      console.log('Professor-dashboard.js: Não autorizado, não continuando');
      return; // Não continuar se não estiver autorizado
    }

    document.getElementById('btn-biblioteca')?.addEventListener('click', (event) => {
      event.preventDefault();
      openBibliotecaModal();
    });
    document.getElementById('btn-novo-treino')?.addEventListener('click', (event) => {
      event.preventDefault();
      openNovoTreinoForm();
    });
    document.getElementById('btn-atualizar-alertas')?.addEventListener('click', (event) => {
      event.preventDefault();
      handleAtualizarAlertas();
    });
    document.getElementById('btn-nova-avaliacao')?.addEventListener('click', (event) => {
      event.preventDefault();
      openNovaAvaliacaoForm();
    });

    document.addEventListener('click', handleTreinoEditClick);
    document.querySelector('.section:nth-of-type(4)')?.addEventListener('click', handleAlertAction);

    filterTreinosSelect?.addEventListener('change', applyTreinoFilter);

    modalClose?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', (event) => {
      if (event.target === modalOverlay) {
        closeModal();
      }
    });

    loadTreinos();
    
    // Configurar logout para limpar tokens JWT
    setupLogout();
  };

  document.addEventListener('DOMContentLoaded', init);
})();

