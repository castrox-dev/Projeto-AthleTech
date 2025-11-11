from rest_framework.permissions import BasePermission

from .models import Usuario


class IsAcademiaAdmin(BasePermission):
    message = 'Apenas administradores da academia podem realizar esta ação.'

    def has_permission(self, request, view):
        user = request.user
        if not getattr(user, 'is_authenticated', False):
            return False
        if getattr(user, 'is_superuser', False):
            return True
        if isinstance(user, Usuario):
            return user.role == Usuario.Role.ADMIN
        return False


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

