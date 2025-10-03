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
        throw new Error('Falha ao carregar dados do usuário');
      }
      
      const data = await response.json();
      if (data.usuario) {
        this.showUserMenu(data.usuario);
      } else {
        this.showLoginMenu();
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
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
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  }

  logout() {
    // Limpar tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user_data');
    
    // Redirecionar para login
    window.location.href = '/login/?message=logout_success';
  }

  async authenticatedFetch(url, options = {}) {
    const headers = Object.assign(
      { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token') || localStorage.getItem('accessToken')}` },
      options.headers || {}
    );
    
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refreshToken');
      if (refreshToken) {
        const r = await fetch(`${this.API_BASE_URL}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken })
        });
        
        if (r.ok) {
          const data = await r.json();
          localStorage.setItem('access_token', data.access);
          // Retry once
          return await fetch(url, { ...options, headers: { ...headers, 'Authorization': `Bearer ${data.access}` } });
        } else {
          this.logout();
          return null;
        }
      } else {
        this.logout();
        return null;
      }
    }
    
    return res;
  }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  new UserMenu();
});
