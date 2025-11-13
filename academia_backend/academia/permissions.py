from rest_framework.permissions import BasePermission

from .models import Usuario


class IsAcademiaAdmin(BasePermission):
    message = 'Apenas administradores da academia podem realizar esta ação.'

    def has_permission(self, request, view):
        user = request.user
        
        # Para DELETE, sempre permitir que chegue ao método destroy
        # A verificação completa será feita dentro do método destroy
        if request.method == 'DELETE':
            # Verificar apenas se está autenticado
            if not user:
                return False
            if not hasattr(user, 'is_authenticated') or not user.is_authenticated:
                return False
            # Permitir que chegue ao método destroy para fazer a verificação completa
            return True
        
        # Para outras operações, verificar permissão normalmente
        if not user:
            return False
        
        # Verificar autenticação - pode ser AnonymousUser
        if not hasattr(user, 'is_authenticated') or not user.is_authenticated:
            return False
        
        # Superusuários sempre têm permissão
        if hasattr(user, 'is_superuser') and user.is_superuser:
            return True
        
        # Verificar se é uma instância de Usuario
        if isinstance(user, Usuario):
            # Usar get_effective_role() para garantir que funcione corretamente
            try:
                effective_role = user.get_effective_role() if hasattr(user, 'get_effective_role') else getattr(user, 'role', None)
                return effective_role == Usuario.Role.ADMIN
            except Exception:
                # Fallback para verificação direta do role
                return getattr(user, 'role', None) == Usuario.Role.ADMIN
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Verifica permissão para operações em objetos específicos"""
        # Para DELETE, sempre permitir que o método destroy seja chamado
        # A verificação será feita dentro do método destroy
        if request.method == 'DELETE' or (hasattr(view, 'action') and view.action == 'destroy'):
            # Verificar apenas se o usuário está autenticado
            user = request.user
            if not user or not hasattr(user, 'is_authenticated') or not user.is_authenticated:
                return False
            # Permitir que o método destroy faça a verificação completa
            return True
        
        # Para outras operações, verificar permissão normalmente
        return self.has_permission(request, view)


class IsProfessorOrAdmin(BasePermission):
    message = 'Apenas professores ou administradores da academia podem realizar esta ação.'

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False):
            return True
        if isinstance(user, Usuario):
            return user.role in {Usuario.Role.ADMIN, Usuario.Role.PROFESSOR}
        return False

