(() => {
  const API_BASE_URL = '/api';
  let currentUser = null;
  let currentTorneio = null;

  const getToken = () => localStorage.getItem('access_token') || localStorage.getItem('accessToken');

  const apiRequest = async (url, options = {}) => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken })
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('access_token', data.access);
          headers['Authorization'] = `Bearer ${data.access}`;
          return await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
        }
      }
      window.location.href = '/login/';
      return null;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || error.message || 'Erro na requisição');
    }

    return response.json();
  };

  const showToast = (message, type = 'info') => {
    // Usar o sistema global de toast
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      // Fallback se não existir
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  };

  const closeModal = (modalId) => {
    document.getElementById(modalId).classList.add('hidden');
  };

  const openModal = (modalId) => {
    document.getElementById(modalId).classList.remove('hidden');
  };

  const loadUserInfo = async () => {
    try {
      const user = await apiRequest('/auth/user/');
      currentUser = user;
      const userNameEl = document.getElementById('user-name');
      if (userNameEl) {
        userNameEl.textContent = `${user.first_name || user.username}`;
      }
      return user;
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      return null;
    }
  };

  const isAdmin = () => {
    return currentUser && (currentUser.is_superuser || currentUser.role === 'admin');
  };

  const isProfessor = () => {
    return currentUser && (currentUser.role === 'professor' || isAdmin());
  };

  const isAluno = () => {
    return currentUser && currentUser.role === 'aluno';
  };

  const statusText = {
    'inscricoes_abertas': 'Inscrições Abertas',
    'em_andamento': 'Em Andamento',
    'finalizado': 'Finalizado',
    'cancelado': 'Cancelado'
  };

  // Renderiza card simples para a lista inicial
  const renderTorneioCardLista = (torneio) => {
    const card = document.createElement('div');
    card.className = 'torneio-card';
    card.onclick = () => verDetalhesTorneio(torneio.id);
    
    card.innerHTML = `
      <div class="torneio-card-header">
        <h2>${torneio.nome}</h2>
        <span class="torneio-card-status status-${torneio.status}">
          ${statusText[torneio.status] || torneio.status}
        </span>
      </div>
      <p style="color: #666; margin: 0 0 1rem 0;">${torneio.descricao || 'Sem descrição'}</p>
      <div class="torneio-card-info">
        <div class="info-item">
          <strong>Participantes</strong>
          <span>${torneio.total_participantes || 0} / ${torneio.max_participantes || 0}</span>
        </div>
        <div class="info-item">
          <strong>Vagas Disponíveis</strong>
          <span>${torneio.vagas_disponiveis || 0}</span>
        </div>
        ${torneio.usuario_inscrito ? `
          <div class="info-item">
            <strong>Status</strong>
            <span style="color: #4CAF50;"><i class="fa-solid fa-check"></i> Inscrito</span>
          </div>
        ` : ''}
      </div>
      <div style="margin-top: 1rem; text-align: right;">
        <button class="btn gold" onclick="event.stopPropagation(); verDetalhesTorneio(${torneio.id})">
          Ver Detalhes <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;
    return card;
  };

  // Renderiza detalhes completos do torneio
  const renderTorneioDetalhes = (torneio) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '2rem';
    
    card.innerHTML = `
      <div class="torneio-header">
        <h1>${torneio.nome}</h1>
        <p>${torneio.descricao || 'Sem descrição'}</p>
        <div class="torneio-stats">
          <div class="stat-card">
            <strong>${torneio.total_participantes || 0}</strong>
            <span>Participantes</span>
          </div>
          <div class="stat-card">
            <strong>${torneio.vagas_disponiveis || 0}</strong>
            <span>Vagas Disponíveis</span>
          </div>
          <div class="stat-card">
            <strong>${statusText[torneio.status] || torneio.status}</strong>
            <span>Status</span>
          </div>
        </div>
        ${torneio.regras ? `
          <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 8px;">
            <strong>Regras:</strong>
            <p style="margin: 0.5rem 0 0 0; white-space: pre-line;">${torneio.regras}</p>
          </div>
        ` : ''}
        ${torneio.premio ? `
          <div style="margin-top: 1rem; padding: 1rem; background: rgba(255,255,255,0.2); border-radius: 8px;">
            <strong>Prêmio:</strong>
            <p style="margin: 0.5rem 0 0 0; white-space: pre-line;">${torneio.premio}</p>
          </div>
        ` : ''}
        ${isAdmin() ? `
          <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <button class="btn gold" onclick="editarTorneio(${torneio.id})">
              <i class="fa-solid fa-edit"></i> Editar
            </button>
            <button class="btn gold" onclick="gerarChaves(${torneio.id})" ${torneio.status === 'inscricoes_abertas' ? 'disabled' : ''}>
              <i class="fa-solid fa-sitemap"></i> Gerar Chaves
            </button>
          </div>
        ` : ''}
        ${isAluno() && !torneio.usuario_inscrito && torneio.status === 'inscricoes_abertas' && torneio.vagas_disponiveis > 0 ? `
          <button class="btn gold btn-inscrever" onclick="inscreverTorneio(${torneio.id})">
            <i class="fa-solid fa-user-plus"></i> Inscrever-se
          </button>
        ` : ''}
        ${torneio.usuario_inscrito ? `
          <p style="margin-top: 1rem; padding: 0.75rem; background: rgba(255,255,255,0.2); border-radius: 6px;">
            <i class="fa-solid fa-check"></i> Você está inscrito neste torneio
          </p>
        ` : ''}
      </div>
      ${torneio.fases && torneio.fases.length > 0 ? renderFases(torneio.fases) : '<p class="muted" style="padding: 1rem;">Chaves ainda não foram geradas.</p>'}
    `;
    return card;
  };

  const renderFases = (fases) => {
    return `
      <div class="chaves-container">
        ${fases.map(fase => `
          <div class="fase-section">
            <div class="fase-title">${fase.tipo_fase}</div>
            ${fase.exercicios && fase.exercicios.length > 0 ? `
              <div class="exercicios-fase">
                <strong>Exercícios desta fase:</strong>
                ${fase.exercicios.map(ex => `
                  <div class="exercicio-item">
                    <strong>${ex.exercicio_nome}</strong> - ${ex.series}x${ex.repeticoes} 
                    ${ex.pontos ? `(${ex.pontos} pontos)` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${fase.chaves && fase.chaves.length > 0 ? fase.chaves.map(chave => renderChave(chave)).join('') : '<p class="muted">Aguardando participantes...</p>'}
          </div>
        `).join('')}
      </div>
    `;
  };

  const renderChave = (chave) => {
    const p1Id = chave.participante1;
    const p2Id = chave.participante2;
    const p1Nome = chave.participante1_nome || 'Aguardando';
    const p2Nome = chave.participante2_nome || 'Aguardando';
    const vencedorNome = chave.vencedor_nome || null;
    const temResultado = chave.tem_resultado;
    
    return `
      <div class="chave-item ${chave.concluida ? 'concluida' : ''}">
        <div style="font-weight: bold; margin-bottom: 0.5rem;">Chave ${chave.numero_chave}</div>
        <div class="participante-nome ${vencedorNome && vencedorNome !== p1Nome ? 'eliminado' : ''} ${vencedorNome === p1Nome ? 'vencedor' : ''}">
          ${p1Nome}
        </div>
        <div style="text-align: center; margin: 0.5rem 0; font-weight: bold;">VS</div>
        <div class="participante-nome ${vencedorNome && vencedorNome !== p2Nome ? 'eliminado' : ''} ${vencedorNome === p2Nome ? 'vencedor' : ''}">
          ${p2Nome}
        </div>
        ${temResultado ? `
          <div style="margin-top: 1rem; padding: 0.75rem; background: #e8f5e9; border-radius: 6px; font-size: 0.9rem;">
            <strong>Resultado:</strong> Ver detalhes abaixo
            ${vencedorNome ? `<br><strong>Vencedor:</strong> ${vencedorNome}` : ''}
          </div>
        ` : ''}
        ${(isAdmin() || isProfessor()) && p1Id && p2Id && !chave.concluida ? `
          <button class="btn gold" style="margin-top: 0.5rem; width: 100%;" onclick="abrirModalResultado(${chave.id}, ${p1Id}, ${p2Id})">
            <i class="fa-solid fa-trophy"></i> Registrar Resultado
          </button>
        ` : ''}
      </div>
    `;
  };

  // Carrega lista de torneios na tela inicial
  // Carregar e renderizar calendário de competições
  const loadCalendario = async () => {
    try {
      const torneios = await apiRequest('/torneios/');
      const calendarioContent = document.getElementById('calendario-content');
      
      let torneiosArray = [];
      if (Array.isArray(torneios)) {
        torneiosArray = torneios;
      } else if (torneios.results) {
        torneiosArray = torneios.results;
      } else if (torneios) {
        torneiosArray = [torneios];
      }
      
      // Filtrar apenas torneios futuros ou em andamento
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const torneiosFuturos = torneiosArray.filter(torneio => {
        if (!torneio.data_inicio) return false;
        const dataInicio = new Date(torneio.data_inicio);
        dataInicio.setHours(0, 0, 0, 0);
        return dataInicio >= hoje || torneio.status === 'em_andamento' || torneio.status === 'inscricoes_abertas';
      }).sort((a, b) => {
        const dataA = new Date(a.data_inicio || 0);
        const dataB = new Date(b.data_inicio || 0);
        return dataA - dataB;
      }).slice(0, 6); // Limitar a 6 próximos
      
      if (torneiosFuturos.length === 0) {
        calendarioContent.innerHTML = '<p style="text-align: center; color: var(--muted);">Nenhuma competição agendada no momento.</p>';
        return;
      }
      
      // Renderizar calendário mensal
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const primeiroDia = new Date(anoAtual, mesAtual, 1);
      const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
      const diasNoMes = ultimoDia.getDate();
      const diaSemanaInicio = primeiroDia.getDay();
      
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      
      // Mapear torneios por dia
      const torneiosPorDia = {};
      torneiosFuturos.forEach(torneio => {
        if (torneio.data_inicio) {
          const data = new Date(torneio.data_inicio);
          const dia = data.getDate();
          const mes = data.getMonth();
          const ano = data.getFullYear();
          
          if (mes === mesAtual && ano === anoAtual) {
            if (!torneiosPorDia[dia]) {
              torneiosPorDia[dia] = [];
            }
            torneiosPorDia[dia].push(torneio);
          }
        }
      });
      
      let calendarioHTML = `
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin: 0 0 1rem 0; color: var(--text);">${meses[mesAtual]} ${anoAtual}</h3>
          <div class="calendario-mes">
            ${diasSemana.map(dia => `<div class="calendario-dia-semana">${dia}</div>`).join('')}
      `;
      
      // Espaços vazios antes do primeiro dia
      for (let i = 0; i < diaSemanaInicio; i++) {
        calendarioHTML += '<div class="calendario-dia" style="visibility: hidden;"></div>';
      }
      
      // Dias do mês
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const temEvento = torneiosPorDia[dia];
        const isHoje = dia === hoje.getDate();
        const classeDia = temEvento ? 'tem-evento' : '';
        const estiloHoje = isHoje ? 'border: 2px solid var(--primary);' : '';
        
        calendarioHTML += `
          <div class="calendario-dia ${classeDia}" style="${estiloHoje}" 
               ${temEvento ? `onclick="verDetalhesTorneio(${torneiosPorDia[dia][0].id})" title="${torneiosPorDia[dia].map(t => t.nome).join(', ')}"` : ''}>
            <div class="calendario-dia-numero">${dia}</div>
            ${temEvento ? `<div class="calendario-dia-evento">${torneiosPorDia[dia].length} evento${torneiosPorDia[dia].length > 1 ? 's' : ''}</div>` : ''}
          </div>
        `;
      }
      
      calendarioHTML += '</div></div>';
      
      // Lista de próximas competições
      calendarioHTML += `
        <div style="margin-top: 2rem;">
          <h3 style="margin: 0 0 1rem 0; color: var(--text);">Próximas Competições</h3>
          <div class="calendario-grid">
            ${torneiosFuturos.map(torneio => {
              const dataInicio = torneio.data_inicio ? new Date(torneio.data_inicio) : null;
              const dataFormatada = dataInicio ? dataInicio.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              }) : 'Data não definida';
              
              return `
                <div class="calendario-item" onclick="verDetalhesTorneio(${torneio.id})">
                  <div class="calendario-data">
                    <i class="fa-solid fa-calendar"></i> ${dataFormatada}
                  </div>
                  <div class="calendario-nome">${torneio.nome || 'Sem nome'}</div>
                  <span class="calendario-status status-${torneio.status || 'inscricoes_abertas'}">
                    ${statusText[torneio.status] || 'Inscrições Abertas'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      
      calendarioContent.innerHTML = calendarioHTML;
    } catch (error) {
      console.error('Erro ao carregar calendário:', error);
      const calendarioContent = document.getElementById('calendario-content');
      calendarioContent.innerHTML = '<p style="text-align: center; color: var(--muted);">Erro ao carregar calendário.</p>';
    }
  };

  const loadTorneios = async () => {
    try {
      const torneios = await apiRequest('/torneios/');
      const container = document.getElementById('lista-torneios');
      const loading = document.getElementById('torneio-loading');
      
      loading.style.display = 'none';
      container.style.display = 'block';
      
      let torneiosArray = [];
      if (Array.isArray(torneios)) {
        torneiosArray = torneios;
      } else if (torneios.results) {
        torneiosArray = torneios.results;
      } else if (torneios) {
        torneiosArray = [torneios];
      }
      
      if (torneiosArray.length === 0) {
        container.innerHTML = '<div class="card"><p class="muted">Nenhum torneio disponível no momento.</p></div>';
        return;
      }

      container.innerHTML = torneiosArray.map(torneio => {
        const card = renderTorneioCardLista(torneio);
        return card.outerHTML;
      }).join('');
    } catch (error) {
      console.error('Erro ao carregar torneios:', error);
      showToast('Erro ao carregar torneios: ' + error.message, 'error');
    }
  };

  // Navega para tela de detalhes do torneio
  window.verDetalhesTorneio = async (torneioId) => {
    try {
      const torneio = await apiRequest(`/torneios/${torneioId}/`);
      const detalhesContainer = document.getElementById('detalhes-torneio');
      const telaInicial = document.getElementById('tela-inicial');
      const telaDetalhes = document.getElementById('tela-detalhes');
      
      const card = renderTorneioDetalhes(torneio);
      detalhesContainer.innerHTML = card.outerHTML;
      
      telaInicial.style.display = 'none';
      telaDetalhes.style.display = 'block';
      
      // Scroll para o topo
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Erro ao carregar detalhes do torneio:', error);
      showToast('Erro ao carregar detalhes: ' + error.message, 'error');
    }
  };

  // Volta para a lista de torneios
  window.voltarParaLista = () => {
    const telaInicial = document.getElementById('tela-inicial');
    const telaDetalhes = document.getElementById('tela-detalhes');
    
    telaDetalhes.style.display = 'none';
    telaInicial.style.display = 'block';
    
    // Recarregar lista para atualizar dados
    loadTorneios();
    
    // Scroll para o topo
    window.scrollTo(0, 0);
  };

  window.inscreverTorneio = async (torneioId) => {
    try {
      await apiRequest('/participantes-torneio/', {
        method: 'POST',
        body: JSON.stringify({
          torneio: torneioId,
          usuario: currentUser.id
        })
      });
      showToast('Inscrição realizada com sucesso!', 'success');
      // Recarregar detalhes do torneio atual
      await verDetalhesTorneio(torneioId);
    } catch (error) {
      showToast('Erro ao se inscrever: ' + error.message, 'error');
    }
  };

  window.gerarChaves = async (torneioId) => {
    if (window.showConfirm) {
      window.showConfirm(
        'Tem certeza que deseja gerar as chaves? Isso irá reorganizar todas as fases do torneio.',
        async () => {
          try {
            await apiRequest(`/torneios/${torneioId}/gerar_chaves/`, {
              method: 'POST'
            });
            showToast('Chaves geradas com sucesso!', 'success');
            // Recarregar detalhes do torneio atual
            await verDetalhesTorneio(torneioId);
          } catch (error) {
            showToast('Erro ao gerar chaves: ' + error.message, 'error');
          }
        }
      );
      return;
    }
    // Fallback para confirm nativo se showConfirm não existir
    if (!confirm('Tem certeza que deseja gerar as chaves? Isso irá reorganizar todas as fases do torneio.')) {
      return;
    }
    try {
      await apiRequest(`/torneios/${torneioId}/gerar_chaves/`, {
        method: 'POST'
      });
      showToast('Chaves geradas com sucesso!', 'success');
      // Recarregar detalhes do torneio atual
      await verDetalhesTorneio(torneioId);
    } catch (error) {
      showToast('Erro ao gerar chaves: ' + error.message, 'error');
    }
  };

  window.abrirModalResultado = async (chaveId, participante1Id, participante2Id) => {
    try {
      const [p1, p2] = await Promise.all([
        apiRequest(`/participantes-torneio/${participante1Id}/`),
        apiRequest(`/participantes-torneio/${participante2Id}/`)
      ]);

      document.getElementById('pontos-p1').value = '';
      document.getElementById('pontos-p2').value = '';
      document.getElementById('vencedor-select').innerHTML = `
        <option value="">Selecione o vencedor</option>
        <option value="${p1.id}">${p1.usuario_nome}</option>
        <option value="${p2.id}">${p2.usuario_nome}</option>
      `;
      document.getElementById('observacoes-resultado').value = '';
      
      document.getElementById('form-resultado').onsubmit = async (e) => {
        e.preventDefault();
        const pontosP1 = parseInt(document.getElementById('pontos-p1').value);
        const pontosP2 = parseInt(document.getElementById('pontos-p2').value);
        const vencedorId = parseInt(document.getElementById('vencedor-select').value);
        const observacoes = document.getElementById('observacoes-resultado').value;

        try {
          await apiRequest('/resultados-partida/', {
            method: 'POST',
            body: JSON.stringify({
              chave: chaveId,
              participante1_pontos: pontosP1,
              participante2_pontos: pontosP2,
              vencedor: vencedorId,
              observacoes: observacoes
            })
          });
          showToast('Resultado registrado com sucesso!', 'success');
          closeModal('modal-resultado');
          // Recarregar detalhes do torneio atual
          const chave = await apiRequest(`/chaves/${chaveId}/`);
          if (chave && chave.fase) {
            const fase = await apiRequest(`/fases-torneio/${chave.fase}/`);
            if (fase && fase.torneio) {
              await verDetalhesTorneio(fase.torneio);
            }
          }
        } catch (error) {
          showToast('Erro ao registrar resultado: ' + error.message, 'error');
        }
      };

      openModal('modal-resultado');
    } catch (error) {
      showToast('Erro ao abrir modal: ' + error.message, 'error');
    }
  };

  window.editarTorneio = async (torneioId) => {
    navegarPara('criar');
    await carregarFormCriarTorneio(torneioId);
  };

  // Navegação entre telas
  window.navegarPara = (tela, element = null) => {
    // Esconder todas as telas
    document.getElementById('tela-inicial').style.display = 'none';
    document.getElementById('tela-detalhes').style.display = 'none';
    document.getElementById('tela-criar').style.display = 'none';
    document.getElementById('tela-gerenciar').style.display = 'none';
    document.getElementById('tela-participantes').style.display = 'none';
    
    // Atualizar sidebar
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (element) {
      element.closest('.nav-item')?.classList.add('active');
    } else {
      // Encontrar o item correspondente pela tela
      const navItems = document.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`'${tela}'`)) {
          item.classList.add('active');
        }
      });
    }
    
    // Mostrar tela selecionada
    switch(tela) {
      case 'lista':
        document.getElementById('tela-inicial').style.display = 'block';
        loadTorneios();
        break;
      case 'criar':
        if (isAdmin()) {
          document.getElementById('tela-criar').style.display = 'block';
          carregarFormCriarTorneio();
        } else {
          showToast('Apenas administradores podem criar torneios', 'error');
        }
        break;
      case 'gerenciar':
        if (isAdmin()) {
          document.getElementById('tela-gerenciar').style.display = 'block';
          carregarTorneiosGerenciar();
        } else {
          showToast('Apenas administradores podem gerenciar torneios', 'error');
        }
        break;
      case 'participantes':
        if (isAdmin()) {
          document.getElementById('tela-participantes').style.display = 'block';
          carregarParticipantes();
        } else {
          showToast('Apenas administradores podem ver participantes', 'error');
        }
        break;
    }
    
    window.scrollTo(0, 0);
  };

  // Toggle sidebar no mobile
  window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar-admin');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && overlay) {
      const isOpen = sidebar.classList.contains('open');
      
      if (isOpen) {
        // Fechar sidebar
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      } else {
        // Abrir sidebar
        sidebar.classList.add('open');
        overlay.classList.add('active');
      }
    }
  };

  // Carregar formulário de criar/editar torneio
  const carregarFormCriarTorneio = async (torneioId = null) => {
    const formContainer = document.getElementById('form-criar-torneio');
    const cardHead = document.querySelector('#tela-criar .card-head h2');
    const cardDescription = document.querySelector('#tela-criar .card-head + p');
    const isEdit = torneioId !== null;
    let torneioData = null;
    
    // Se for edição, carregar dados do torneio
    if (isEdit) {
      try {
        torneioData = await apiRequest(`/torneios/${torneioId}/`);
        // Atualizar título do card
        if (cardHead) {
          cardHead.innerHTML = `<i class="fa-solid fa-edit"></i> Editar Torneio`;
        }
        if (cardDescription) {
          cardDescription.textContent = 'Edite os dados do torneio abaixo';
        }
      } catch (error) {
        showToast('Erro ao carregar dados do torneio: ' + error.message, 'error');
        return;
      }
    } else {
      // Restaurar título original
      if (cardHead) {
        cardHead.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Criar Novo Torneio`;
      }
      if (cardDescription) {
        cardDescription.textContent = 'Preencha os dados para criar uma nova competição';
      }
    }
    
    // Função auxiliar para formatar data para datetime-local
    const formatDateTimeLocal = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    formContainer.innerHTML = `
      <form id="form-novo-torneio">
        <div class="field">
          <label>Nome do Torneio *</label>
          <input type="text" id="torneio-nome" required placeholder="Ex: Campeonato de Força 2024" value="${torneioData ? (torneioData.nome || '') : ''}">
        </div>
        <div class="field">
          <label>Descrição *</label>
          <textarea id="torneio-descricao" rows="3" required placeholder="Descreva o torneio...">${torneioData ? (torneioData.descricao || '') : ''}</textarea>
        </div>
        <div class="grid-2">
          <div class="field">
            <label>Data de Início das Inscrições *</label>
            <input type="datetime-local" id="torneio-inicio-inscricoes" required value="${torneioData ? formatDateTimeLocal(torneioData.data_inicio_inscricoes) : ''}">
          </div>
          <div class="field">
            <label>Data de Fim das Inscrições *</label>
            <input type="datetime-local" id="torneio-fim-inscricoes" required value="${torneioData ? formatDateTimeLocal(torneioData.data_fim_inscricoes) : ''}">
          </div>
        </div>
        <div class="grid-2">
          <div class="field">
            <label>Data de Início do Torneio *</label>
            <input type="datetime-local" id="torneio-inicio" required value="${torneioData ? formatDateTimeLocal(torneioData.data_inicio) : ''}">
          </div>
          <div class="field">
            <label>Data de Fim do Torneio</label>
            <input type="datetime-local" id="torneio-fim" value="${torneioData ? formatDateTimeLocal(torneioData.data_fim) : ''}">
          </div>
        </div>
        <div class="field">
          <label>Máximo de Participantes *</label>
          <input type="number" id="torneio-max-participantes" min="2" value="${torneioData ? (torneioData.max_participantes || 16) : 16}" required>
        </div>
        <div class="field">
          <label>Status *</label>
          <select id="torneio-status" required>
            <option value="inscricoes_abertas" ${torneioData && torneioData.status === 'inscricoes_abertas' ? 'selected' : ''}>Inscrições Abertas</option>
            <option value="em_andamento" ${torneioData && torneioData.status === 'em_andamento' ? 'selected' : ''}>Em Andamento</option>
            <option value="finalizado" ${torneioData && torneioData.status === 'finalizado' ? 'selected' : ''}>Finalizado</option>
            <option value="cancelado" ${torneioData && torneioData.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
        <div class="field">
          <label>Regras</label>
          <textarea id="torneio-regras" rows="4" placeholder="Regras do torneio...">${torneioData ? (torneioData.regras || '') : ''}</textarea>
        </div>
        <div class="field">
          <label>Prêmio</label>
          <textarea id="torneio-premio" rows="2" placeholder="Descrição do prêmio...">${torneioData ? (torneioData.premio || '') : ''}</textarea>
        </div>
        <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
          <button type="submit" class="btn gold">
            <i class="fa-solid fa-save"></i> ${isEdit ? 'Salvar Alterações' : 'Criar Torneio'}
          </button>
          <button type="button" class="btn outline" onclick="navegarPara('lista')">
            Cancelar
          </button>
        </div>
      </form>
    `;
    
    document.getElementById('form-novo-torneio').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const data = {
          nome: document.getElementById('torneio-nome').value,
          descricao: document.getElementById('torneio-descricao').value,
          data_inicio_inscricoes: document.getElementById('torneio-inicio-inscricoes').value,
          data_fim_inscricoes: document.getElementById('torneio-fim-inscricoes').value,
          data_inicio: document.getElementById('torneio-inicio').value,
          data_fim: document.getElementById('torneio-fim').value || null,
          max_participantes: parseInt(document.getElementById('torneio-max-participantes').value),
          status: document.getElementById('torneio-status').value,
          regras: document.getElementById('torneio-regras').value || '',
          premio: document.getElementById('torneio-premio').value || ''
        };
        
        if (isEdit) {
          await apiRequest(`/torneios/${torneioId}/`, {
            method: 'PUT',
            body: JSON.stringify(data)
          });
          showToast('Torneio atualizado com sucesso!', 'success');
        } else {
          await apiRequest('/torneios/', {
            method: 'POST',
            body: JSON.stringify(data)
          });
          showToast('Torneio criado com sucesso!', 'success');
        }
        
        navegarPara('lista');
        await carregarTorneiosGerenciar();
      } catch (error) {
        showToast(`Erro ao ${isEdit ? 'atualizar' : 'criar'} torneio: ` + error.message, 'error');
      }
    };
  };

  // Carregar torneios para gerenciar
  const carregarTorneiosGerenciar = async () => {
    try {
      const torneios = await apiRequest('/torneios/');
      const container = document.getElementById('lista-gerenciar-torneios');
      
      let torneiosArray = Array.isArray(torneios) ? torneios : (torneios.results || []);
      
      if (torneiosArray.length === 0) {
        container.innerHTML = '<div class="card"><p class="muted">Nenhum torneio encontrado.</p></div>';
        return;
      }
      
      container.innerHTML = torneiosArray.map(torneio => `
        <div class="card" style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h3 style="margin: 0 0 0.5rem 0;">${torneio.nome}</h3>
              <p style="color: #666; margin: 0;">${torneio.descricao || 'Sem descrição'}</p>
              <div style="margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                <span><strong>Status:</strong> ${statusText[torneio.status] || torneio.status}</span>
                <span><strong>Participantes:</strong> ${torneio.total_participantes || 0}/${torneio.max_participantes || 0}</span>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-direction: column;">
              <button class="btn gold small" onclick="verParticipantesTorneio(${torneio.id})">
                <i class="fa-solid fa-eye"></i> Ver
              </button>
              <button class="btn gold small" onclick="editarTorneioGerenciar(${torneio.id})">
                <i class="fa-solid fa-edit"></i> Editar
              </button>
              <button class="btn gold small" onclick="deletarTorneio(${torneio.id})" style="color: #000;">
                <i class="fa-solid fa-trash"></i> Deletar
              </button>
            </div>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Erro ao carregar torneios:', error);
      showToast('Erro ao carregar torneios: ' + error.message, 'error');
    }
  };

  // Carregar participantes
  const carregarParticipantes = async () => {
    try {
      const participantes = await apiRequest('/participantes-torneio/');
      const container = document.getElementById('lista-participantes');
      
      let participantesArray = Array.isArray(participantes) ? participantes : (participantes.results || []);
      
      if (participantesArray.length === 0) {
        container.innerHTML = '<div class="card"><p class="muted">Nenhum participante encontrado.</p></div>';
        return;
      }
      
      // Agrupar por torneio e buscar nomes
      const porTorneio = {};
      const torneiosMap = {};
      
      // Buscar informações dos torneios
      const torneiosUnicos = [...new Set(participantesArray.map(p => p.torneio))];
      await Promise.all(torneiosUnicos.map(async (torneioId) => {
        try {
          const torneio = await apiRequest(`/torneios/${torneioId}/`);
          torneiosMap[torneioId] = torneio.nome;
        } catch (error) {
          torneiosMap[torneioId] = 'Torneio #' + torneioId;
        }
      }));
      
      participantesArray.forEach(p => {
        if (!porTorneio[p.torneio]) {
          porTorneio[p.torneio] = [];
        }
        porTorneio[p.torneio].push(p);
      });
      
      container.innerHTML = Object.entries(porTorneio).map(([torneioId, parts]) => {
        const torneioNome = torneiosMap[torneioId] || 'Torneio #' + torneioId;
        return `
          <div class="card" style="margin-bottom: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0;">${torneioNome}</h3>
            <div style="display: grid; gap: 0.5rem;">
              ${parts.map(p => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f9f9f9; border-radius: 6px;">
                  <div>
                    <strong>${p.usuario_nome || 'N/A'}</strong>
                    <span style="color: #666; margin-left: 1rem;">${p.usuario_email || ''}</span>
                  </div>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    ${p.eliminado ? '<span style="color: #d32f2f;">Eliminado</span>' : ''}
                    ${p.ativo ? '<span style="color: #4CAF50;">Ativo</span>' : '<span style="color: #999;">Inativo</span>'}
                    ${p.posicao_final ? `<span><strong>Posição:</strong> ${p.posicao_final}º</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
      showToast('Erro ao carregar participantes: ' + error.message, 'error');
    }
  };

  window.editarTorneioGerenciar = async (torneioId) => {
    navegarPara('criar');
    await carregarFormCriarTorneio(torneioId);
  };
  
  // Ver participantes do torneio (na lista de gerenciamento)
  window.verParticipantesTorneio = async (torneioId) => {
    try {
      const torneio = await apiRequest(`/torneios/${torneioId}/`);
      const participantes = torneio.participantes || [];
      
      const container = document.getElementById('lista-gerenciar-torneios');
      
      if (participantes.length === 0) {
        container.innerHTML = `
          <div class="card">
            <h3 style="margin-bottom: 1rem;">Participantes do Torneio: ${torneio.nome}</h3>
            <p class="muted">Nenhum participante inscrito neste torneio.</p>
            <button class="btn gold" onclick="carregarTorneiosGerenciar()" style="margin-top: 1rem;">
              <i class="fa-solid fa-arrow-left"></i> Voltar
            </button>
          </div>
        `;
        return;
      }
      
      container.innerHTML = `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="margin: 0;">Participantes do Torneio: ${torneio.nome}</h3>
            <button class="btn gold" onclick="carregarTorneiosGerenciar()">
              <i class="fa-solid fa-arrow-left"></i> Voltar
            </button>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Data de Inscrição</th>
                  <th>Status</th>
                  <th>Posição Final</th>
                </tr>
              </thead>
              <tbody>
                ${participantes.map(p => `
                  <tr>
                    <td>${p.usuario_nome || 'N/A'}</td>
                    <td>${p.usuario_email || 'N/A'}</td>
                    <td>${p.data_inscricao ? new Date(p.data_inscricao).toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td>
                      ${p.ativo ? '<span class="badge success">Ativo</span>' : '<span class="badge error">Inativo</span>'}
                      ${p.eliminado ? '<span class="badge error">Eliminado</span>' : ''}
                    </td>
                    <td>${p.posicao_final ? `${p.posicao_final}º lugar` : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="margin-top: 1rem; padding: 1rem; background: rgba(251, 191, 36, 0.1); border-radius: 8px;">
            <strong>Total de Participantes:</strong> ${participantes.length} / ${torneio.max_participantes}
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
      showToast('Erro ao carregar participantes: ' + error.message, 'error');
    }
  };

  window.deletarTorneio = async (torneioId) => {
    if (window.showConfirm) {
      window.showConfirm(
        'Tem certeza que deseja deletar este torneio? Esta ação não pode ser desfeita.',
        async () => {
          try {
            await apiRequest(`/torneios/${torneioId}/`, { method: 'DELETE' });
            showToast('Torneio deletado com sucesso!', 'success');
            await carregarTorneiosGerenciar();
          } catch (error) {
            showToast('Erro ao deletar torneio: ' + error.message, 'error');
          }
        }
      );
      return;
    }
    // Fallback para confirm nativo se showConfirm não existir
    if (!confirm('Tem certeza que deseja deletar este torneio? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      await apiRequest(`/torneios/${torneioId}/`, {
        method: 'DELETE'
      });
      showToast('Torneio deletado com sucesso!', 'success');
      carregarTorneiosGerenciar();
    } catch (error) {
      showToast('Erro ao deletar torneio: ' + error.message, 'error');
    }
  };

  // Inicializar
  document.addEventListener('DOMContentLoaded', async () => {
    await loadUserInfo();
    
    const sidebarAdmin = document.getElementById('sidebar-admin');
    const portalLayout = document.querySelector('.portal-layout');
    
    // Mostrar sidebar se for admin
    if (isAdmin()) {
      if (sidebarAdmin) {
        sidebarAdmin.style.display = 'flex';
      }
      if (portalLayout) {
        portalLayout.classList.remove('without-sidebar');
      }
    } else {
      // Se não for admin, garantir que sidebar está oculta e adicionar classe para centralizar
      if (sidebarAdmin) {
        sidebarAdmin.style.display = 'none';
      }
      if (portalLayout) {
        portalLayout.classList.add('without-sidebar');
      }
    }
    
    // Carregar calendário e lista de torneios
    await loadCalendario();
    await loadTorneios();
  });
})();

