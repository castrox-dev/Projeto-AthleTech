from datetime import timedelta

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.db.models import Q
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.generic import TemplateView
from rest_framework import permissions, status, viewsets
from rest_framework.generics import ListAPIView, RetrieveAPIView, ListCreateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    Usuario,
    Plano,
    Matricula,
    Exercicio,
    Treino,
    TreinoExercicio,
    Avaliacao,
    Frequencia,
    Pedido,
)
from .serializers import (
    UsuarioSerializer,
    UsuarioProfileSerializer,
    LoginSerializer,
    PlanoSerializer,
    MatriculaSerializer,
    ExercicioSerializer,
    TreinoSerializer,
    AvaliacaoSerializer,
    FrequenciaSerializer,
    CheckEmailSerializer,
    PasswordResetSerializer,
    EscolherPlanoSerializer,
    DashboardSerializer,
    ChangePasswordSerializer,
    PedidoSerializer,
)
from .permissions import IsAcademiaAdmin, IsProfessorOrAdmin

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UsuarioSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UsuarioProfileSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'redirect_url': reverse(user.get_dashboard_url_name()),
                'message': 'Usuário criado com sucesso!'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    """View para login de usuários via API"""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']

            # Gerar tokens JWT
            refresh = RefreshToken.for_user(user)

            return Response({
                'user': UsuarioProfileSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'redirect_url': reverse(user.get_dashboard_url_name()),
                'message': 'Login realizado com sucesso!'
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class UserProfileView(APIView):
    """View para perfil do usuário autenticado"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UsuarioProfileSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        serializer = UsuarioProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CheckEmailView(APIView):
    """View para verificar disponibilidade de email"""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = CheckEmailSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            exists = Usuario.objects.filter(email=email).exists()
            return Response({'available': not exists})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetView(APIView):
    """View para reset de senha"""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            # Aqui você implementaria o envio de email
            # Por enquanto, apenas retornamos sucesso
            return Response({
                'message': 'Email de recuperação enviado com sucesso!'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(APIView):
    """View para mudança de senha"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Senha alterada com sucesso!'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para usuários (apenas para admins)"""
    
    queryset = Usuario.objects.all()
    serializer_class = UsuarioProfileSerializer
    permission_classes = [IsAcademiaAdmin]
    
    def get_queryset(self):
        queryset = Usuario.objects.all()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        return queryset

class PlanoViewSet(viewsets.ModelViewSet):
    """ViewSet para planos"""
    
    queryset = Plano.objects.filter(ativo=True)
    serializer_class = PlanoSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [IsAcademiaAdmin]
        return [permission() for permission in permission_classes]

class EscolherPlanoView(APIView):
    """View para escolher um plano"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = EscolherPlanoSerializer(data=request.data)
        if serializer.is_valid():
            plano_id = serializer.validated_data['plano_id']
            plano = Plano.objects.get(id=plano_id)
            
            # Verificar se já tem matrícula ativa
            matricula_ativa = Matricula.objects.filter(
                usuario=request.user,
                status='ativa'
            ).first()
            
            if matricula_ativa:
                return Response({
                    'error': 'Você já possui uma matrícula ativa.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Criar nova matrícula
            data_inicio = timezone.now().date()
            data_fim = data_inicio + timedelta(days=plano.duracao_dias)
            
            matricula = Matricula.objects.create(
                usuario=request.user,
                plano=plano,
                data_inicio=data_inicio,
                data_fim=data_fim,
                valor_pago=plano.preco
            )
            
            # Ativar usuário como membro
            request.user.is_active_member = True
            request.user.save()
            
            return Response({
                'message': f'Plano {plano.nome} escolhido com sucesso!',
                'matricula': MatriculaSerializer(matricula).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MatriculaViewSet(viewsets.ModelViewSet):
    """ViewSet para matrículas"""
    
    serializer_class = MatriculaSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAcademiaAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_academia_admin', False) or getattr(user, 'is_superuser', False):
            return Matricula.objects.all()
        return Matricula.objects.filter(usuario=user)

class ExercicioListView(ListAPIView):
    """View para listar exercícios"""
    
    queryset = Exercicio.objects.filter(ativo=True)
    serializer_class = ExercicioSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Exercicio.objects.filter(ativo=True)
        categoria = self.request.query_params.get('categoria', None)
        nivel = self.request.query_params.get('nivel', None)
        search = self.request.query_params.get('search', None)
        
        if categoria:
            queryset = queryset.filter(categoria=categoria)
        if nivel:
            queryset = queryset.filter(nivel=nivel)
        if search:
            queryset = queryset.filter(
                Q(nome__icontains=search) |
                Q(descricao__icontains=search)
            )
        
        return queryset

class TreinoListView(ListAPIView):
    """View para listar treinos do usuário"""
    
    serializer_class = TreinoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Treino.objects.filter(
            usuario=self.request.user, 
            ativo=True
        ).prefetch_related(
            'treinoexercicio_set',
            'treinoexercicio_set__exercicio'
        ).order_by('-data_criacao')

class TreinoDetailView(RetrieveAPIView):
    """View para detalhes de um treino"""
    
    serializer_class = TreinoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Treino.objects.filter(usuario=self.request.user)


class TreinoManageViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciamento de treinos por administradores e professores"""
    
    queryset = Treino.objects.all().prefetch_related(
        'treinoexercicio_set',
        'treinoexercicio_set__exercicio'
    )
    serializer_class = TreinoSerializer
    permission_classes = [IsProfessorOrAdmin]


class BaseRoleRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    allowed_roles: tuple[str, ...] = ()

    def test_func(self):
        user = self.request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if not hasattr(user, 'get_effective_role'):
            return False
        return user.get_effective_role() in self.allowed_roles


class AdminDashboardPage(BaseRoleRequiredMixin, TemplateView):
    template_name = 'html/admin_dashboard.html'
    allowed_roles = (Usuario.Role.ADMIN,)


class ProfessorDashboardPage(BaseRoleRequiredMixin, TemplateView):
    template_name = 'html/professor_dashboard.html'
    allowed_roles = (
        Usuario.Role.PROFESSOR,
        Usuario.Role.ADMIN,
    )


class AlunoPortalPage(LoginRequiredMixin, TemplateView):
    template_name = 'html/portal_frontend.html'

    def dispatch(self, request, *args, **kwargs):
        user = request.user
        if not user.is_authenticated:
            return super().dispatch(request, *args, **kwargs)

        role = user.get_effective_role() if hasattr(user, 'get_effective_role') else Usuario.Role.ALUNO

        if role == Usuario.Role.ADMIN:
            return redirect('portal_admin_dashboard')
        if role == Usuario.Role.PROFESSOR:
            return redirect('portal_professor_dashboard')

        return super().dispatch(request, *args, **kwargs)

class AvaliacaoListView(ListCreateAPIView):
    """View para listar avaliações do usuário e permitir cadastro por professores"""
    
    serializer_class = AvaliacaoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        effective_role = user.get_effective_role() if hasattr(user, 'get_effective_role') else None
        if user.is_superuser or effective_role in (Usuario.Role.ADMIN, Usuario.Role.PROFESSOR):
            aluno_id = self.request.query_params.get('usuario')
            if aluno_id:
                return Avaliacao.objects.filter(usuario_id=aluno_id)
            return Avaliacao.objects.all()
        return Avaliacao.objects.filter(usuario=user)
    
    def perform_create(self, serializer):
        user = self.request.user
        effective_role = user.get_effective_role() if hasattr(user, 'get_effective_role') else None
        if not (user.is_superuser or effective_role in (Usuario.Role.ADMIN, Usuario.Role.PROFESSOR)):
            raise PermissionDenied('Apenas professores ou administradores podem registrar avaliações.')
        
        aluno_id = self.request.data.get('usuario')
        aluno_nome = self.request.data.get('usuario_nome')

        try:
            if aluno_id:
                aluno = Usuario.objects.get(id=aluno_id)
            elif aluno_nome:
                nome_normalizado = aluno_nome.strip()
                if not nome_normalizado:
                    raise ValidationError({'usuario_nome': 'Informe o nome completo do aluno.'})
                partes = nome_normalizado.split()
                primeiro_nome = partes[0]
                restante = " ".join(partes[1:]) if len(partes) > 1 else ''
                consulta = Usuario.objects.filter(
                    Q(first_name__iexact=primeiro_nome) |
                    Q(username__iexact=nome_normalizado)
                )
                if restante:
                    consulta = consulta.filter(Q(last_name__icontains=restante) | Q(username__iexact=nome_normalizado))
                aluno = consulta.first()
                if not aluno:
                    raise Usuario.DoesNotExist
            else:
                raise ValidationError({'usuario': 'Informe o ID ou o nome completo do aluno.'})
        except Usuario.DoesNotExist:
            raise ValidationError({'usuario': 'Aluno não encontrado.'})
        
        serializer.save(usuario=aluno)

class DashboardView(APIView):
    """View para dados do dashboard do usuário"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Matrícula ativa
        matricula_ativa = Matricula.objects.filter(
            usuario=user,
            status='ativa'
        ).first()
        
        # Treinos recentes (últimos 5)
        treinos_recentes = Treino.objects.filter(
            usuario=user,
            ativo=True
        )[:5]
        
        # Última avaliação
        ultima_avaliacao = Avaliacao.objects.filter(
            usuario=user
        ).first()
        
        # Frequência do mês atual
        inicio_mes = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        frequencia_mensal = Frequencia.objects.filter(
            usuario=user,
            data_entrada__gte=inicio_mes
        ).count()
        
        data = {
            'usuario': user,
            'matricula_ativa': matricula_ativa,
            'treinos_recentes': treinos_recentes,
            'ultima_avaliacao': ultima_avaliacao,
            'frequencia_mensal': frequencia_mensal
        }
        
        serializer = DashboardSerializer(data)
        return Response(serializer.data)

class PixInitiateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plano_id = request.data.get('plano_id')
        try:
            plano = Plano.objects.get(id=plano_id, ativo=True)
        except Plano.DoesNotExist:
            return Response({'detail': 'Plano inválido'}, status=400)

        # criar pedido pendente
        pedido = Pedido.objects.create(
            usuario=request.user,
            plano=plano,
            valor=plano.preco,
            metodo=Pedido.METODO_PIX,
            status=Pedido.STATUS_PENDENTE,
        )

        # gerar payload simples (didático)
        from django.conf import settings as djsettings
        key = getattr(djsettings, 'PIX_KEY', '')
        payload = f"PIX-KEY:{key}|VALOR:{plano.preco}|PLANO:{plano.id}|PED:{pedido.id_publico}"
        pedido.pix_payload = payload
        pedido.pix_qr = payload
        pedido.save()

        return Response(PedidoSerializer(pedido).data, status=201)

class PixStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pedido_id):
        try:
            pedido = Pedido.objects.get(id_publico=pedido_id, usuario=request.user)
        except Pedido.DoesNotExist:
            return Response({'detail': 'Pedido não encontrado'}, status=404)
        return Response(PedidoSerializer(pedido).data)

class PixConfirmView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pedido_id):
        try:
            pedido = Pedido.objects.get(id_publico=pedido_id, usuario=request.user)
        except Pedido.DoesNotExist:
            return Response({'detail': 'Pedido não encontrado'}, status=404)

        if pedido.status == Pedido.STATUS_APROVADO:
            return Response(PedidoSerializer(pedido).data)

        # marcar como aprovado (simulação de webhook)
        pedido.status = Pedido.STATUS_APROVADO
        pedido.save()
        return Response(PedidoSerializer(pedido).data)

def login_view(request):
    if request.method == 'POST':
        identifier = request.POST.get('email')
        password = request.POST.get('password')

        user = authenticate(request, username=identifier, password=password)
        if user is None and identifier:
            try:
                user_obj = Usuario.objects.get(email=identifier)
            except Usuario.DoesNotExist:
                user_obj = None

            if user_obj:
                user = authenticate(request, username=user_obj.username, password=password)

        if user is not None:
            login(request, user)
            target = reverse(user.get_dashboard_url_name())
            return redirect(target)
        else:
            messages.error(request, 'Email ou senha inválidos.')

    return render(request, 'html/login.html')


@require_POST
def logout_view(request):
    logout(request)
    return redirect('login')
