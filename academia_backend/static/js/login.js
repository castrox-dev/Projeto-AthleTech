document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.error('Formulário de login não encontrado');
        return;
    }
    
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    
    if (!emailField || !passwordField || !submitButton) {
        console.error('Campos do formulário não encontrados');
        return;
    }
    
    // Adicionar validações aos campos (se o método existir e os campos estiverem em form-group)
    if (emailField && emailField.closest('.form-group') && typeof AuthUtils.addFieldValidation === 'function') {
        try {
            AuthUtils.addFieldValidation(
                emailField,
                AuthUtils.validateEmail,
                'Por favor, insira um email válido'
            );
        } catch (e) {
            console.warn('Erro ao adicionar validação de email:', e);
        }
    }
    
    if (passwordField && passwordField.closest('.form-group') && typeof AuthUtils.addFieldValidation === 'function') {
        try {
            AuthUtils.addFieldValidation(
                passwordField,
                (value) => value.length >= 6,
                'A senha deve ter pelo menos 6 caracteres'
            );
        } catch (e) {
            console.warn('Erro ao adicionar validação de senha:', e);
        }
    }
    
    // Manipular envio do formulário
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Verificar se API_BASE_URL está definido
        const API_BASE_URL = (window.API_CONFIG && window.API_CONFIG.API_BASE_URL) || '/api';
        
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        const remember = formData.get('remember') === 'on';
        
        // Validar campos
        if (!email || !email.trim()) {
            AuthUtils.showMessage('Por favor, insira um email', 'error');
            emailField.focus();
            return;
        }
        
        if (!AuthUtils.validateEmail(email)) {
            AuthUtils.showMessage('Por favor, insira um email válido', 'error');
            emailField.focus();
            return;
        }
        
        if (!password || password.length < 6) {
            AuthUtils.showMessage('A senha deve ter pelo menos 6 caracteres', 'error');
            passwordField.focus();
            return;
        }
        
        // Marcar que login está em progresso para evitar redirecionamentos automáticos
        sessionStorage.setItem('login_in_progress', 'true');
        
        // Mostrar loading
        AuthUtils.setLoading(submitButton, true);
        AuthUtils.showMessage('Fazendo login...', 'info');
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password
                })
            });
            
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Erro ao parsear resposta JSON:', jsonError);
                AuthUtils.showMessage('Erro na resposta do servidor. Tente novamente.', 'error');
                AuthUtils.setLoading(submitButton, false);
                return;
            }
            
            if (response.ok) {
                // Login bem-sucedido
                if (data.access && data.refresh) {
                    AuthUtils.saveTokens(data.access, data.refresh);
                } else {
                    console.error('Tokens não recebidos na resposta:', data);
                    AuthUtils.showMessage('Erro: tokens não recebidos. Tente novamente.', 'error');
                    AuthUtils.setLoading(submitButton, false);
                    return;
                }
                
                // Salvar dados do usuário se fornecidos
                if (data.user) {
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    console.log('Dados do usuário:', data.user);
                    console.log('Role do usuário:', data.user.role);
                }
                
                AuthUtils.showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                
                // Determinar redirecionamento baseado PRIMEIRO no role do usuário
                // O role do usuário é a fonte de verdade para o destino
                const userRole = data.user ? data.user.role : null;
                const isSuperuser = data.user ? data.user.is_superuser : false;
                
                let redirectTo;
                
                console.log('Login.js - Role:', userRole, '| Superuser:', isSuperuser);
                
                // Determinar destino baseado no role (prioridade máxima)
                if (userRole === 'admin' || isSuperuser) {
                    redirectTo = '/portal/admin/';
                    console.log('Login.js: Redirecionando admin para:', redirectTo);
                } else if (userRole === 'professor') {
                    redirectTo = '/portal/professor/';
                    console.log('Login.js: Redirecionando professor para:', redirectTo);
                } else {
                    // Para alunos, verificar se há redirect na URL
                    const urlRedirect = new URLSearchParams(window.location.search).get('redirect');
                    if (urlRedirect && !urlRedirect.includes('/admin') && !urlRedirect.includes('/professor')) {
                        redirectTo = urlRedirect.startsWith('/') ? urlRedirect : '/' + urlRedirect;
                        console.log('Login.js: Usando redirect da URL:', redirectTo);
                    } else {
                        redirectTo = '/portal/';
                        console.log('Login.js: Redirecionando aluno para portal');
                    }
                }
                
                // Garantir que comece com /
                if (!redirectTo.startsWith('/')) {
                    redirectTo = '/' + redirectTo;
                }
                
                // Garantir que termine com / se não tiver extensão
                if (!redirectTo.match(/\.[a-z]+$/i) && !redirectTo.endsWith('/')) {
                    redirectTo = redirectTo + '/';
                }
                
                console.log('Redirecionando para:', redirectTo);
                console.log('URL completa:', window.location.origin + redirectTo);
                
                // Limpar flag de login em progresso
                sessionStorage.removeItem('login_in_progress');
                
                // Redirecionar imediatamente
                window.location.href = redirectTo;
                
            } else {
                // Erro no login
                let errorMessage = 'Erro ao fazer login';
                
                if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.non_field_errors && Array.isArray(data.non_field_errors)) {
                    errorMessage = data.non_field_errors[0];
                } else if (data.non_field_errors) {
                    errorMessage = data.non_field_errors;
                } else if (data.email && Array.isArray(data.email)) {
                    errorMessage = 'Email: ' + data.email[0];
                } else if (data.password && Array.isArray(data.password)) {
                    errorMessage = 'Senha: ' + data.password[0];
                } else if (typeof data === 'string') {
                    errorMessage = data;
                }
                
                AuthUtils.showMessage(errorMessage, 'error');
                AuthUtils.setLoading(submitButton, false);
                // Limpar flag de login em progresso em caso de erro
                sessionStorage.removeItem('login_in_progress');
            }
            
        } catch (error) {
            console.error('Erro no login:', error);
            AuthUtils.showMessage('Erro de conexão. Verifique sua internet e tente novamente.', 'error');
            AuthUtils.setLoading(submitButton, false);
            // Limpar flag de login em progresso em caso de erro
            sessionStorage.removeItem('login_in_progress');
        }
    });
    
    // Funcionalidade "Esqueceu a senha"
    const forgotPasswordLink = document.querySelector('.forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            const email = emailField.value;
            if (!email) {
                AuthUtils.showMessage('Digite seu email primeiro para recuperar a senha', 'info');
                emailField.focus();
                return;
            }
            
            if (!AuthUtils.validateEmail(email)) {
                AuthUtils.showMessage('Por favor, insira um email válido', 'error');
                emailField.focus();
                return;
            }
            
            // Enviar solicitação de recuperação de senha
            recuperarSenha(email);
        });
    }
    
    // Auto-focus no primeiro campo
    emailField.focus();
    
    // Permitir login com Enter
    loginForm.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});

// Função para recuperar senha
async function recuperarSenha(email) {
    try {
        AuthUtils.showMessage('Enviando email de recuperação...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/auth/password-reset/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });
        
        if (response.ok) {
            AuthUtils.showMessage(
                'Email de recuperação enviado! Verifique sua caixa de entrada.',
                'success'
            );
        } else {
            const data = await response.json();
            AuthUtils.showMessage(
                data.detail || 'Erro ao enviar email de recuperação',
                'error'
            );
        }
        
    } catch (error) {
        console.error('Erro ao recuperar senha:', error);
        AuthUtils.showMessage('Erro de conexão. Tente novamente.', 'error');
    }
}

// Função para login social (se implementado no futuro)
function loginSocial(provider) {
    // Implementar login com Google, Facebook, etc.
    window.location.href = `${API_BASE_URL}/auth/social/${provider}/`;
}

// Detectar se veio de uma tentativa de acesso não autorizado
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    
    if (message === 'login_required') {
        AuthUtils.showMessage('Você precisa fazer login para acessar esta página', 'info');
    } else if (message === 'session_expired') {
        AuthUtils.showMessage('Sua sessão expirou. Faça login novamente.', 'info');
    }
});
