(() => {
  const config = window.ADMIN_CONFIG || {};
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
    const opts = {
      method,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        ...headers,
      },
      credentials: 'include',
    };

    if (body) {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      const csrf = getCookie('csrftoken');
      if (csrf) {
        opts.headers['X-CSRFToken'] = csrf;
      }
    }

    const response = await fetch(url, opts);
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
          <input type="text" id="prof-cref" name="cref" placeholder="Ex.: CREF123456-G/UF">
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
      const payload = {
        email: formData.get('email'),
        first_name: formData.get('nome'),
        phone: formData.get('telefone'),
        role: 'professor',
        especialidade: formData.get('especialidade'),
        cref: formData.get('cref') || '',
        password: tempPassword,
        password_confirm: tempPassword,
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
          <input type="text" id="edit-prof-cref" name="cref" value="${prof.cref || ''}">
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

  const init = () => {
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
  };

  document.addEventListener('DOMContentLoaded', init);
})();

