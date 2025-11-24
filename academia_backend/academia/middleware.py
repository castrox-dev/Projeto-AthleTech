from django.utils.deprecation import MiddlewareMixin
from django.core.exceptions import DisallowedHost
from django.conf import settings


class DisableCSRFForAPI(MiddlewareMixin):
    """
    Middleware para desabilitar verificação CSRF em rotas de API REST.
    APIs REST com autenticação JWT não precisam de CSRF token.
    """
    
    def process_request(self, request):
        # Desabilitar CSRF para todas as rotas que começam com /api/
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None


class RailwayHostMiddleware(MiddlewareMixin):
    """
    Middleware para aceitar automaticamente domínios do Railway.
    Intercepta a validação de host antes do CommonMiddleware do Django.
    """
    
    def process_request(self, request):
        host = request.get_host().split(':')[0]  # Remove porta se houver
        
        # Se o host termina com .railway.app ou .up.railway.app, adicionar a ALLOWED_HOSTS
        if (host.endswith('.railway.app') or host.endswith('.up.railway.app')):
            if host not in settings.ALLOWED_HOSTS:
                settings.ALLOWED_HOSTS.append(host)
            # Marcar que o host é válido para evitar erro do Django
            request._railway_host_valid = True
            return None
        
        return None
    
    def process_exception(self, request, exception):
        # Se for erro de DisallowedHost e o host for do Railway, permitir
        if isinstance(exception, DisallowedHost):
            host = request.get_host().split(':')[0]
            if (host.endswith('.railway.app') or host.endswith('.up.railway.app')):
                if host not in settings.ALLOWED_HOSTS:
                    settings.ALLOWED_HOSTS.append(host)
                # Retornar None para continuar o processamento
                return None
        return None

