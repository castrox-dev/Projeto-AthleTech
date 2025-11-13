// Configuração da API
const API_BASE_URL = window.API_CONFIG.API_BASE_URL;

// Utilitários de autenticação
class AuthUtils {
    static showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            
            // Estilos baseados no tipo
            messageDiv.style.color = '#fff';
            messageDiv.style.fontWeight = '500';
            
            if (type === 'error') {
                messageDiv.style.backgroundColor = '#dc3545';
                messageDiv.style.border = '1px solid #c82333';
            } else if (type === 'success') {
                messageDiv.style.backgroundColor = '#28a745';
                messageDiv.style.border = '1px solid #218838';
            } else if (type === 'info') {
                messageDiv.style.backgroundColor = '#17a2b8';
                messageDiv.style.border = '1px solid #138496';
            } else {
                messageDiv.style.backgroundColor = '#6c757d';
                messageDiv.style.border = '1px solid #5a6268';
            }
            
            // Auto-hide após 5 segundos (apenas para success e info)
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    messageDiv.style.display = 'none';
                }, 5000);
            }
        }
    }
    
    static setLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }
    
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static validatePassword(password) {
        // Mínimo 8 caracteres, pelo menos uma letra e um número
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
        return passwordRegex.test(password);
    }
    
    static validatePhone(phone) {
        // Formato brasileiro: (11) 99999-9999
        const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
        return phoneRegex.test(phone);
    }
    
    static formatPhone(value) {
        // Remove tudo que não é dígito
        const numbers = value.replace(/\D/g, '');
        
        // Aplica a máscara
        if (numbers.length <= 2) {
            return `(${numbers}`;
        } else if (numbers.length <= 6) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        } else if (numbers.length <= 10) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        } else {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
        }
    }
    
    static addFieldValidation(field, validationFn, errorMessage) {
        const formGroup = field.closest('.form-group');
        
        field.addEventListener('blur', function() {
            const isValid = validationFn(this.value);
            
            if (isValid) {
                field.classList.remove('invalid');
                field.classList.add('valid');
                formGroup.classList.remove('has-error');
            } else {
                field.classList.remove('valid');
                field.classList.add('invalid');
                formGroup.classList.add('has-error');
                
                let errorDiv = formGroup.querySelector('.error-message');
                if (!errorDiv) {
                    errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    formGroup.appendChild(errorDiv);
                }
                errorDiv.textContent = errorMessage;
            }
        });
        
        field.addEventListener('input', function() {
            if (field.classList.contains('invalid') || field.classList.contains('valid')) {
                const isValid = validationFn(this.value);
                
                if (isValid) {
                    field.classList.remove('invalid');
                    field.classList.add('valid');
                    formGroup.classList.remove('has-error');
                } else {
                    field.classList.remove('valid');
                    field.classList.add('invalid');
                    formGroup.classList.add('has-error');
                }
            }
        });
    }
    
    static saveTokens(accessToken, refreshToken) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
    }
    
    static getToken() {
        return localStorage.getItem('access_token');
    }
    
    static clearTokens() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
    }
    
    static isLoggedIn() {
        return !!localStorage.getItem('access_token');
    }
    
    static async makeAuthenticatedRequest(url, options = {}) {
        const token = this.getToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            if (response.status === 401) {
                // Token expirado, tentar renovar
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Tentar novamente com o novo token
                    mergedOptions.headers['Authorization'] = `Bearer ${this.getToken()}`;
                    return await fetch(url, mergedOptions);
                } else {
                    // Não conseguiu renovar, redirecionar para login
                    this.clearTokens();
                    window.location.href = '/login/';
                    return null;
                }
            }
            
            return response;
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    }
    
    static async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
            return false;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh: refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Erro ao renovar token:', error);
            return false;
        }
    }
}

// Configurações globais para formulários
document.addEventListener('DOMContentLoaded', function() {
    // Aplicar máscara de telefone automaticamente
    const phoneFields = document.querySelectorAll('input[type="tel"], input[name="phone"]');
    phoneFields.forEach(field => {
        field.addEventListener('input', function() {
            this.value = AuthUtils.formatPhone(this.value);
        });
    });
    
    // Verificar se já está logado e redirecionar se necessário
    // Mas apenas se não estivermos no meio de um processo de login (evitar loops)
    if (AuthUtils.isLoggedIn() && 
        (window.location.pathname.includes('/login/') || window.location.pathname.includes('/cadastro/')) &&
        !sessionStorage.getItem('login_in_progress')) {
        const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/portal/';
        // Usar replace para evitar adicionar ao histórico
        window.location.replace(redirectTo);
    }
});

// Interceptar erros de rede globalmente
window.addEventListener('unhandledrejection', function(event) {
    console.error('Erro não tratado:', event.reason);
    
    if (event.reason.name === 'TypeError' && event.reason.message.includes('fetch')) {
        AuthUtils.showMessage('Erro de conexão com o servidor. Verifique sua internet.', 'error');
    }
});

// Função para logout global
window.logout = function() {
    if (confirm('Tem certeza que deseja sair?')) {
        AuthUtils.clearTokens();
        window.location.href = '/';
    }
};
