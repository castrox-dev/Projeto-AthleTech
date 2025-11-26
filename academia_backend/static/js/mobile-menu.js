/**
 * ATHLETECH - Menu Mobile Hamburger
 * Script reutilizável para todas as páginas
 * Suporta tanto menu CSS puro quanto menu JS
 */

(function() {
  'use strict';

  // Espera o DOM carregar
  document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initCSSPureMenu();
  });

  // Inicializa menu CSS puro (com checkbox)
  function initCSSPureMenu() {
    const menuCheckbox = document.getElementById('menu-toggle');
    const mobileMenuItems = document.querySelector('.mobile-menu-items');
    
    if (!menuCheckbox) return;

    // Fecha menu ao clicar em links
    if (mobileMenuItems) {
      const links = mobileMenuItems.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', () => {
          setTimeout(() => {
            menuCheckbox.checked = false;
          }, 150);
        });
      });

      // Handler para logout
      const logoutForms = mobileMenuItems.querySelectorAll('form[action*="logout"]');
      logoutForms.forEach(form => {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Limpar tokens do localStorage
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user_data');
            
            // Submeter o formulário
            form.submit();
          });
        }
      });
    }

    // Fecha ao pressionar ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuCheckbox.checked) {
        menuCheckbox.checked = false;
      }
    });

    // Sincronizar info do usuário
    syncUserInfoCSSMenu();
  }

  // Sincroniza info do usuário no menu CSS puro
  function syncUserInfoCSSMenu() {
    const desktopUserName = document.getElementById('user-name');
    const mobileUserName = document.getElementById('mobile-user-name');
    const mobileMenuItems = document.querySelector('.mobile-menu-items');

    if (mobileUserName && desktopUserName) {
      mobileUserName.textContent = desktopUserName.textContent;

      const observer = new MutationObserver(() => {
        mobileUserName.textContent = desktopUserName.textContent;
      });

      observer.observe(desktopUserName, {
        characterData: true,
        childList: true,
        subtree: true
      });
    }

    // Sync visibilidade login/user
    if (mobileMenuItems) {
      const loginOnlyDesktop = document.querySelector('.nav-buttons .login-only');
      const userOnlyDesktop = document.querySelector('.nav-buttons .user-only');
      const loginOnlyMobile = mobileMenuItems.querySelector('.login-only');
      const userOnlyMobile = mobileMenuItems.querySelector('.user-only');

      if (loginOnlyDesktop && userOnlyDesktop && loginOnlyMobile && userOnlyMobile) {
        const syncVisibility = () => {
          const showLogin = window.getComputedStyle(loginOnlyDesktop).display !== 'none';
          loginOnlyMobile.style.display = showLogin ? 'flex' : 'none';
          userOnlyMobile.style.display = showLogin ? 'none' : 'flex';
        };

        const styleObserver = new MutationObserver(syncVisibility);
        styleObserver.observe(loginOnlyDesktop, { attributes: true, attributeFilter: ['style'] });
        styleObserver.observe(userOnlyDesktop, { attributes: true, attributeFilter: ['style'] });

        setTimeout(syncVisibility, 500);
      }
    }
  }

  function initMobileMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileOverlay = document.getElementById('mobile-menu-overlay');
    const closeBtn = document.getElementById('mobile-menu-close');

    // Se não existir hamburger, não faz nada
    if (!hamburger) return;

    // Toggle do menu
    function openMenu() {
      hamburger.classList.add('active');
      hamburger.setAttribute('aria-expanded', 'true');
      if (mobileMenu) mobileMenu.classList.add('active');
      if (mobileOverlay) mobileOverlay.classList.add('active');
      document.body.classList.add('menu-open');
    }

    function closeMenu() {
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      if (mobileMenu) mobileMenu.classList.remove('active');
      if (mobileOverlay) mobileOverlay.classList.remove('active');
      document.body.classList.remove('menu-open');
    }

    function toggleMenu() {
      if (hamburger.classList.contains('active')) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    // Event Listeners
    hamburger.addEventListener('click', toggleMenu);

    if (closeBtn) {
      closeBtn.addEventListener('click', closeMenu);
    }

    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', closeMenu);
    }

    // Fecha ao clicar em links do menu
    if (mobileMenu) {
      const links = mobileMenu.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', () => {
          // Pequeno delay para permitir navegação
          setTimeout(closeMenu, 100);
        });
      });

      // Handler específico para formulários de logout no menu mobile
      const logoutForms = mobileMenu.querySelectorAll('form[action*="logout"]');
      logoutForms.forEach(form => {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Limpar tokens do localStorage
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user_data');
            
            // Submeter o formulário
            form.submit();
          });
        }
      });
    }

    // Fecha ao pressionar ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && hamburger.classList.contains('active')) {
        closeMenu();
      }
    });

    // Fecha ao redimensionar para desktop
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 768 && hamburger.classList.contains('active')) {
          closeMenu();
        }
      }, 100);
    });

    // Sincronizar info do usuário (se existir)
    syncUserInfo();
  }

  // Sincroniza nome do usuário entre desktop e mobile
  function syncUserInfo() {
    const desktopUserName = document.getElementById('user-name');
    const mobileUserName = document.getElementById('mobile-user-name');

    if (desktopUserName && mobileUserName) {
      // Sync inicial
      mobileUserName.textContent = desktopUserName.textContent;

      // Observer para mudanças
      const observer = new MutationObserver(() => {
        mobileUserName.textContent = desktopUserName.textContent;
      });

      observer.observe(desktopUserName, {
        characterData: true,
        childList: true,
        subtree: true
      });
    }

    // Sync visibilidade login/user
    const loginOnlyDesktop = document.querySelector('.nav-buttons .login-only');
    const userOnlyDesktop = document.querySelector('.nav-buttons .user-only');
    const loginOnlyMobile = document.querySelector('.mobile-menu-buttons .login-only');
    const userOnlyMobile = document.querySelector('.mobile-menu-buttons .user-only');

    if (loginOnlyDesktop && userOnlyDesktop && loginOnlyMobile && userOnlyMobile) {
      const syncVisibility = () => {
        const showLogin = window.getComputedStyle(loginOnlyDesktop).display !== 'none';
        loginOnlyMobile.style.display = showLogin ? 'flex' : 'none';
        userOnlyMobile.style.display = showLogin ? 'none' : 'flex';
      };

      // Observar mudanças de estilo
      const styleObserver = new MutationObserver(syncVisibility);
      styleObserver.observe(loginOnlyDesktop, { attributes: true, attributeFilter: ['style'] });
      styleObserver.observe(userOnlyDesktop, { attributes: true, attributeFilter: ['style'] });

      // Sync inicial após delay (para dar tempo do user-menu.js rodar)
      setTimeout(syncVisibility, 500);
    }
  }

  // Para uso em admin/professor dashboards com sidebar
  window.initAdminMobileMenu = function() {
    const hamburger = document.getElementById('hamburger-btn');
    const nav = document.querySelector('.layout .sidebar .nav');
    const overlay = document.getElementById('mobile-menu-overlay');

    if (!hamburger || !nav) return;

    function toggleNav() {
      const isActive = nav.classList.contains('active');
      
      if (isActive) {
        nav.classList.remove('active');
        hamburger.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
      } else {
        nav.classList.add('active');
        hamburger.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.classList.add('menu-open');
      }
    }

    hamburger.addEventListener('click', toggleNav);

    if (overlay) {
      overlay.addEventListener('click', () => {
        nav.classList.remove('active');
        hamburger.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
      });
    }

    // Fecha ao clicar em links
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          nav.classList.remove('active');
          hamburger.classList.remove('active');
          if (overlay) overlay.classList.remove('active');
          document.body.classList.remove('menu-open');
        }
      });
    });

    // ESC para fechar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('active')) {
        nav.classList.remove('active');
        hamburger.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
      }
    });
  };
})();

