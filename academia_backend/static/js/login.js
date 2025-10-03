document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    
    // Adicionar validações aos campos
    AuthUtils.addFieldValidation(
        emailField,
        AuthUtils.validateEmail,
        'Por favor, insira um email válido'
    );
    
    AuthUtils.addFieldValidation(
        passwordField,
        (value) => value.length >= 6,
        'A senha deve ter pelo menos 6 caracteres'
    );
    
    // Manipular envio do formulário
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        const remember = formData.get('remember') === 'on';
        
        // Validar campos
        if (!AuthUtils.validateEmail(email)) {
            AuthUtils.showMessage('Por favor, insira um email válido', 'error');
            emailField.focus();
            return;
        }
        
        if (password.length < 6) {
            AuthUtils.showMessage('A senha deve ter pelo menos 6 caracteres', 'error');
            passwordField.focus();
            return;
        }
        
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
                    email: email,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Login bem-sucedido
                AuthUtils.saveTokens(data.access, data.refresh);
                
                // Salvar dados do usuário se fornecidos
                if (data.user) {
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                }
                
                AuthUtils.showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                
                // Redirecionar após 1 segundo
                setTimeout(() => {
                    const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/portal/';
                    window.location.href = redirectTo;
                }, 800);
                
            } else {
                // Erro no login
                let errorMessage = 'Erro ao fazer login';
                
                if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.non_field_errors) {
                    errorMessage = data.non_field_errors[0];
                } else if (data.email) {
                    errorMessage = 'Email: ' + data.email[0];
                } else if (data.password) {
                    errorMessage = 'Senha: ' + data.password[0];
                }
                
                AuthUtils.showMessage(errorMessage, 'error');
            }
            
        } catch (error) {
            console.error('Erro no login:', error);
            AuthUtils.showMessage('Erro de conexão. Tente novamente.', 'error');
        } finally {
            AuthUtils.setLoading(submitButton, false);
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
