/**
 * User Menu Component
 * Componente reutilizável para exibir o menu do usuário logado
 */

class UserMenu {
  constructor() {
    this.API_BASE_URL = (window.API_CONFIG && window.API_CONFIG.API_BASE_URL) || '/api';
    this.init();
  }

  init() {
    // Verificar se estamos na página de login - se sim, não fazer nada
    const currentPath = window.location.pathname;
    if (currentPath.includes('/login/')) {
      this.showLoginMenu();
      return;
    }
    
    // Verificar se há token de acesso
    const accessToken = localStorage.getItem('access_token') || localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
    
    if (accessToken) {
      // Aguardar um pouco para evitar conflitos com outros scripts
      setTimeout(() => {
        this.loadUserData();
      }, 100);
    } else {
      this.showLoginMenu();
    }
  }

  async loadUserData() {
    try {
      // Verificar se já existe um nome carregado (pode ter sido carregado por outro script)
      const userNameElement = document.getElementById('user-name');
      if (userNameElement && userNameElement.textContent && userNameElement.textContent !== 'Carregando...') {
        // Já tem dados, apenas mostrar o menu
        this.showLoginMenu();
        const loginElements = document.querySelectorAll('.login-only');
        const userElements = document.querySelectorAll('.user-only');
        loginElements.forEach(el => el.style.display = 'none');
        userElements.forEach(el => el.style.display = 'block');
        this.setupLogout();
        return;
      }

      const response = await this.authenticatedFetch(`${this.API_BASE_URL}/dashboard/`);
      if (!response || !response.ok) {
        // Se a resposta foi null (tokens foram limpos), apenas mostrar menu de login
        if (response === null) {
          this.showLoginMenu();
          return;
        }
        // Para outros erros, apenas mostrar menu de login sem deslogar
        console.warn('Erro ao carregar dados do dashboard:', response.status);
        this.showLoginMenu();
        return;
      }
      
      const data = await response.json();
      if (data.usuario) {
        this.showUserMenu(data.usuario);
      } else {
        this.showLoginMenu();
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      // Não deslogar em caso de erro, apenas mostrar menu de login
      // O usuário ainda pode estar autenticado, apenas não conseguimos carregar os dados agora
      this.showLoginMenu();
    }
  }

  showUserMenu(user) {
    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    
    // Atualizar elementos existentes
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
      userNameElement.textContent = userName;
    }

    // Mostrar/ocultar elementos baseado no status de login
    const loginElements = document.querySelectorAll('.login-only');
    const userElements = document.querySelectorAll('.user-only');
    
    loginElements.forEach(el => el.style.display = 'none');
    userElements.forEach(el => el.style.display = 'block');

    // Configurar logout
    this.setupLogout();
    
    // Disparar evento customizado para outras partes do sistema
    window.dispatchEvent(new CustomEvent('userDataLoaded', { 
      detail: { user, userName } 
    }));
  }

  showLoginMenu() {
    // Mostrar/ocultar elementos baseado no status de login
    const loginElements = document.querySelectorAll('.login-only');
    const userElements = document.querySelectorAll('.user-only');
    
    loginElements.forEach(el => el.style.display = 'block');
    userElements.forEach(el => el.style.display = 'none');
  }

  setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) {
      return;
    }

    // Remover event listeners anteriores para evitar duplicação
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

    const logoutForm = newLogoutBtn.closest('form');

    if (logoutForm) {
      logoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Limpar tokens primeiro
        this.clearTokens();
        // Depois fazer o submit do form (que vai para /logout/ e redireciona para login)
        logoutForm.submit();
      });
    } else {
      newLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Limpar tokens e redirecionar
        this.clearTokens();
        window.location.href = '/login/?message=logout_success';
      });
    }
  }

  logout(afterClearCallback) {
    // Limpar tokens
    this.clearTokens();
    
    // Redirecionar para login apenas se for uma ação explícita do usuário
    if (typeof afterClearCallback === 'function') {
      afterClearCallback();
    } else {
      // Sempre redirecionar para login ao fazer logout
      window.location.href = '/login/?message=logout_success';
    }
  }

  async authenticatedFetch(url, options = {}) {
    const accessToken = localStorage.getItem('access_token') || localStorage.getItem('accessToken');
    
    // Se não há token, não fazer a requisição
    if (!accessToken) {
      return null;
    }
    
    const headers = Object.assign(
      { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      options.headers || {}
    );
    
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const r = await fetch(`${this.API_BASE_URL}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken })
          });
          
          if (r.ok) {
            const data = await r.json();
            localStorage.setItem('access_token', data.access);
            // Retry once com novo token
            const newHeaders = { ...headers, 'Authorization': `Bearer ${data.access}` };
            return await fetch(url, { ...options, headers: newHeaders });
          } else {
            // Refresh token inválido ou expirado - limpar tokens mas não redirecionar
            // Na home page, apenas mostrar menu de login sem redirecionar
            console.warn('Refresh token inválido, limpando tokens');
            this.clearTokens();
            return null;
          }
        } catch (error) {
          // Erro de rede ou servidor (500) ao tentar renovar - limpar tokens mas não redirecionar
          console.error('Erro ao renovar token:', error);
          this.clearTokens();
          return null;
        }
      } else {
        // Sem refresh token - limpar tokens mas não redirecionar
        console.warn('Sem refresh token, limpando tokens');
        this.clearTokens();
        return null;
      }
    }
    
    return res;
  }

  clearTokens() {
    // Limpar tokens sem redirecionar
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user_data');
    // Mostrar menu de login
    this.showLoginMenu();
  }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  new UserMenu();
});
