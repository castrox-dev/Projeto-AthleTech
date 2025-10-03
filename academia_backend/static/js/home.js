// Configuração da API
const API_BASE_URL = 'http://localhost:8000/api';

// Smooth scrolling para links de navegação
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling para links internos
    const navLinks = document.querySelectorAll('a[href^="#"]');
    const navItems = document.querySelectorAll('#nav_list .nav-item');
    const sections = Array.from(document.querySelectorAll('section[id]'));
    const headerEl = document.querySelector('header');
    const underline = document.getElementById('nav-underline');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = headerEl ? headerEl.offsetHeight : 0;
                const rect = targetSection.getBoundingClientRect();
                const absoluteTop = window.scrollY + rect.top;
                const targetPosition = absoluteTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Após o scroll, garantir active correto
                setTimeout(updateActiveNav, 300);
            }

            // Atualiza active imediatamente no clique
            navItems.forEach(item => item.classList.remove('active'));
            const li = this.closest('.nav-item');
            if (li) li.classList.add('active');

            // Mover underline
            moveUnderlineToLink(this);
        });
    });
    
    // Efeito de scroll no header
    const header = headerEl;
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            header.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            header.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop;
    });

    // Destacar item ativo conforme a seção visível
    function updateActiveNav() {
        const scrollPos = window.scrollY + (headerEl ? headerEl.offsetHeight + 10 : 10);
        let currentId = null;

        for (let i = 0; i < sections.length; i++) {
            const sec = sections[i];
            const top = sec.offsetTop;
            const bottom = top + sec.offsetHeight;
            if (scrollPos >= top && scrollPos < bottom) {
                currentId = '#' + sec.id;
                break;
            }
        }

        if (currentId) {
            navItems.forEach(item => {
                const a = item.querySelector('a');
                if (a && a.getAttribute('href') === currentId) {
                    item.classList.add('active');
                    moveUnderlineToLink(a);
                } else {
                    item.classList.remove('active');
                }
            });
        }
    }

    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav();

    function moveUnderlineToLink(link) {
        if (!underline || !link) return;
        const navRect = document.getElementById('navbar').getBoundingClientRect();
        const rect = link.getBoundingClientRect();
        const left = rect.left - navRect.left;
        underline.style.left = left + 'px';
        underline.style.width = rect.width + 'px';
    }

    // Posicionar underline inicialmente sob o ativo
    const activeLink = document.querySelector('#nav_list .nav-item.active a');
    if (activeLink) {
        // aguarda layout estabilizar
        setTimeout(() => moveUnderlineToLink(activeLink), 50);
    } else if (navLinks.length) {
        setTimeout(() => moveUnderlineToLink(navLinks[0]), 50);
    }
    
    // Animação dos cards de planos
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observar cards de planos
    const planoCards = document.querySelectorAll('.plano-card');
    planoCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
    
    // Funcionalidade dos botões de planos
    const botoesPlano = document.querySelectorAll('.btn-plano');
    
    botoesPlano.forEach(botao => {
        botao.addEventListener('click', function() {
            const planoCard = this.closest('.plano-card');
            const planoNome = planoCard.querySelector('h3').textContent;
            const planoPreco = planoCard.querySelector('.preco').textContent;
            
            // Verificar se o usuário está logado
            const token = localStorage.getItem('access_token');
            
            if (!token) {
                // Redirecionar para login se não estiver logado
                alert('Você precisa fazer login para escolher um plano!');
                window.location.href = 'login.html';
                return;
            }
            
            // Se estiver logado, processar a escolha do plano
            escolherPlano(planoNome, planoPreco);
        });
    });
    
    // Verificar se o usuário está logado e atualizar a navegação
    verificarLogin();
});

// Função para verificar se o usuário está logado
function verificarLogin() {
    const token = localStorage.getItem('access_token');
    const navMenu = document.querySelector('.nav-menu');
    
    if (token) {
        // Usuário logado - mostrar opções de usuário logado
        const loginBtn = navMenu.querySelector('.btn-login');
        const cadastroBtn = navMenu.querySelector('.btn-cadastro');
        
        if (loginBtn && cadastroBtn) {
            // Substituir botões de login/cadastro por menu do usuário
            loginBtn.textContent = 'Minha Conta';
            loginBtn.href = '#';
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                mostrarMenuUsuario();
            });
            
            cadastroBtn.textContent = 'Sair';
            cadastroBtn.addEventListener('click', function(e) {
                e.preventDefault();
                logout();
            });
        }
    }
}

// Função para mostrar menu do usuário
function mostrarMenuUsuario() {
    // Implementar menu dropdown ou redirecionar para página de perfil
    alert('Funcionalidade de perfil em desenvolvimento!');
}

// Função para logout
function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        
        // Recarregar a página para atualizar a navegação
        window.location.reload();
    }
}

// Função para escolher plano
async function escolherPlano(nome, preco) {
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`${API_BASE_URL}/planos/escolher/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nome: nome,
                preco: preco
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            alert(`Plano ${nome} escolhido com sucesso! Você será redirecionado para o pagamento.`);
            // Redirecionar para página de pagamento ou dashboard
        } else {
            const errorData = await response.json();
            alert('Erro ao escolher plano: ' + (errorData.message || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao escolher plano:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// Função para buscar dados do usuário
async function buscarDadosUsuario() {
    try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`${API_BASE_URL}/auth/user/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const userData = await response.json();
            localStorage.setItem('user_data', JSON.stringify(userData));
            return userData;
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
    }
    
    return null;
}

// Função para verificar e renovar token
async function verificarToken() {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!token || !refreshToken) {
        return false;
    }
    
    try {
        // Verificar se o token ainda é válido
        const response = await fetch(`${API_BASE_URL}/auth/verify/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: token })
        });
        
        if (response.ok) {
            return true;
        }
        
        // Se o token expirou, tentar renovar
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh: refreshToken })
        });
        
        if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            localStorage.setItem('access_token', data.access);
            return true;
        }
        
        // Se não conseguiu renovar, fazer logout
        logout();
        return false;
        
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        return false;
    }
}

// Verificar token periodicamente (a cada 5 minutos)
setInterval(verificarToken, 5 * 60 * 1000);

// Adicionar efeitos visuais aos elementos
document.addEventListener('DOMContentLoaded', function() {
    // Efeito parallax no hero
    const hero = document.querySelector('.hero');
    
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        if (hero) {
            hero.style.transform = `translateY(${rate}px)`;
        }
    });
    
    // Contador animado para estatísticas (se houver)
    const contadores = document.querySelectorAll('.contador');
    
    contadores.forEach(contador => {
        const target = parseInt(contador.getAttribute('data-target'));
        const increment = target / 100;
        let current = 0;
        
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                contador.textContent = Math.ceil(current);
                setTimeout(updateCounter, 20);
            } else {
                contador.textContent = target;
            }
        };
        
        // Iniciar contador quando elemento estiver visível
        observer.observe(contador);
        contador.addEventListener('animationstart', updateCounter);
    });
});
