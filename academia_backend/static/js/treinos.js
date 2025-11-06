document.addEventListener('DOMContentLoaded', async function() {
  // Base URL from global config if available
  const API_BASE_URL = (window.API_CONFIG && window.API_CONFIG.API_BASE_URL) || '/api';

  // Require auth
  const accessToken = localStorage.getItem('access_token') || localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
  if (!accessToken) {
    window.location.href = '/login/?message=login_required&redirect=/treinos/';
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
        window.location.href = '/login/?message=session_expired&redirect=/treinos/';
        return null;
      }
    }
    return res;
  }

  // Load user name for header
  try {
    const userResp = await authenticatedFetch(`${API_BASE_URL}/auth/user/`);
    if (userResp && userResp.ok) {
      const userData = await userResp.json();
      const nome = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username;
      const userNameElement = document.getElementById('user-name');
      if (userNameElement) {
        userNameElement.textContent = nome;
      }
    }
  } catch (e) {
    console.error('Erro ao carregar dados do usuário:', e);
  }

  // Load treinos
  const treinosContainer = document.getElementById('treinos-container');
  const loadingState = document.getElementById('loading-state');

  try {
    const treinosResp = await authenticatedFetch(`${API_BASE_URL}/treinos/`);
    if (!treinosResp) {
      if (loadingState) loadingState.style.display = 'none';
      treinosContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-exclamation-triangle"></i>
          <h3>Erro de autenticação</h3>
          <p>Por favor, faça login novamente.</p>
        </div>
      `;
      return;
    }
    
    if (!treinosResp.ok) {
      const errorText = await treinosResp.text();
      console.error('Erro na resposta:', treinosResp.status, errorText);
      if (loadingState) loadingState.style.display = 'none';
      treinosContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-exclamation-triangle"></i>
          <h3>Erro ao carregar treinos</h3>
          <p>Status: ${treinosResp.status}</p>
        </div>
      `;
      return;
    }

    const treinosData = await treinosResp.json();
    
    console.log('Treinos recebidos:', treinosData); // Debug
    console.log('Total de treinos:', treinosData.results ? treinosData.results.length : 0); // Debug
    
    if (loadingState) loadingState.style.display = 'none';
    
    // Verificar se é array direto ou objeto com results (paginação)
    const treinosList = treinosData.results || treinosData;
    
    if (!treinosList || (Array.isArray(treinosList) && treinosList.length === 0)) {
      treinosContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-dumbbell"></i>
          <h3>Nenhum treino cadastrado</h3>
          <p>Seus treinos aparecerão aqui quando o professor cadastrar para você.</p>
        </div>
      `;
      return;
    }

    // Render treinos
    treinosContainer.innerHTML = '';
    
    const treinosArray = Array.isArray(treinosList) ? treinosList : [treinosList];
    
    treinosArray.forEach(treino => {
      const treinoCard = document.createElement('div');
      treinoCard.className = 'treino-card';
      
      // Header
      const treinoHeader = document.createElement('div');
      treinoHeader.className = 'treino-header';
      
      const treinoTitle = document.createElement('h2');
      treinoTitle.textContent = treino.nome;
      
      const treinoDesc = document.createElement('p');
      treinoDesc.className = 'muted';
      treinoDesc.textContent = treino.descricao || 'Sem descrição';
      
      treinoHeader.appendChild(treinoTitle);
      treinoHeader.appendChild(treinoDesc);
      
      // Exercícios
      const exerciciosGrid = document.createElement('div');
      exerciciosGrid.className = 'exercicios-grid';
      
      console.log('Treino:', treino.nome); // Debug
      console.log('Exercícios detalhes:', treino.exercicios_detalhes); // Debug
      console.log('Tipo de exercicios_detalhes:', typeof treino.exercicios_detalhes); // Debug
      console.log('É array?', Array.isArray(treino.exercicios_detalhes)); // Debug
      
      if (treino.exercicios_detalhes && Array.isArray(treino.exercicios_detalhes) && treino.exercicios_detalhes.length > 0) {
        treino.exercicios_detalhes.forEach((ex, index) => {
          const exerciseCard = document.createElement('div');
          exerciseCard.className = 'exercise-card';
          
          const exerciseTitle = document.createElement('h4');
          exerciseTitle.textContent = `${index + 1}. ${ex.exercicio_nome}`;
          
          const exerciseInfo = document.createElement('div');
          exerciseInfo.className = 'exercise-info';
          
          const infoParts = [];
          if (ex.series && ex.repeticoes) {
            infoParts.push(`<span><i class="fa-solid fa-repeat"></i> ${ex.series}x${ex.repeticoes}</span>`);
          }
          if (ex.peso) {
            infoParts.push(`<span><i class="fa-solid fa-weight-hanging"></i> ${ex.peso} kg</span>`);
          }
          if (ex.tempo_descanso) {
            infoParts.push(`<span><i class="fa-solid fa-clock"></i> ${ex.tempo_descanso}s</span>`);
          }
          if (ex.exercicio_categoria) {
            infoParts.push(`<span><i class="fa-solid fa-tag"></i> ${ex.exercicio_categoria}</span>`);
          }
          
          exerciseInfo.innerHTML = infoParts.join('');
          
          exerciseCard.appendChild(exerciseTitle);
          exerciseCard.appendChild(exerciseInfo);
          
          if (ex.observacoes) {
            const observacoes = document.createElement('div');
            observacoes.className = 'exercise-observacoes';
            observacoes.innerHTML = `<strong>Observações:</strong> ${ex.observacoes}`;
            exerciseCard.appendChild(observacoes);
          }
          
          exerciciosGrid.appendChild(exerciseCard);
        });
      } else {
        console.warn('Treino sem exercícios ou exercicios_detalhes vazio:', treino.nome); // Debug
        const noExercicios = document.createElement('div');
        noExercicios.className = 'empty-state';
        noExercicios.style.padding = '2rem';
        noExercicios.innerHTML = '<p class="muted">Nenhum exercício cadastrado neste treino.</p>';
        exerciciosGrid.appendChild(noExercicios);
      }
      
      treinoCard.appendChild(treinoHeader);
      treinoCard.appendChild(exerciciosGrid);
      treinosContainer.appendChild(treinoCard);
    });

  } catch (err) {
    console.error(err);
    if (loadingState) loadingState.style.display = 'none';
    treinosContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <h3>Erro ao carregar treinos</h3>
        <p>Não foi possível carregar seus treinos. Tente novamente mais tarde.</p>
      </div>
    `;
  }

  // Setup logout functionality
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user_data');
      window.location.href = '/login/?message=logout_success';
    });
  }
});

