from datetime import timedelta
import os

from django.conf import settings
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
from rest_framework.decorators import action
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
    Torneio,
    ParticipanteTorneio,
    FaseTorneio,
    ExercicioFase,
    Chave,
    ResultadoPartida,
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
    TorneioSerializer,
    ParticipanteTorneioSerializer,
    FaseTorneioSerializer,
    ExercicioFaseSerializer,
    ChaveSerializer,
    ResultadoPartidaSerializer,
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
            
            # Obter URL de redirecionamento
            dashboard_url_name = user.get_dashboard_url_name()
            redirect_url = reverse(dashboard_url_name)
            
            # Log para debug (remover em produção se necessário)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f'Login - User: {user.email}, Role: {user.role}, Effective Role: {user.get_effective_role()}, Dashboard URL: {dashboard_url_name}, Redirect: {redirect_url}')

            return Response({
                'user': UsuarioProfileSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'redirect_url': redirect_url,
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
    # Removido permission_classes - será controlado por get_permissions()
    
    def get_queryset(self):
        queryset = Usuario.objects.all()
        
        # Filtrar por role se fornecido
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role=role)
        
        # Filtrar por busca
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        return queryset
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado baseado na ação"""
        # Para criação, usar UsuarioSerializer que permite definir role e senha
        if self.action == 'create':
            return UsuarioSerializer
        # Para outras ações, usar UsuarioProfileSerializer
        return UsuarioProfileSerializer
    
    def get_permissions(self):
        """Retorna as permissões baseadas na ação"""
        # Para DELETE, usar uma permissão mais permissiva que permite chegar ao método destroy
        if self.action == 'destroy' or self.request.method == 'DELETE':
            # Retornar uma permissão que apenas verifica autenticação
            # A verificação completa será feita no método destroy
            from rest_framework.permissions import IsAuthenticated
            return [IsAuthenticated()]
        
        # Para list/retrieve, permitir professores e admins verem usuários
        if self.action in ['list', 'retrieve']:
            return [IsProfessorOrAdmin()]
        
        # Para outras ações (create, update, etc), requer IsAcademiaAdmin
        return [IsAcademiaAdmin()]
    
    def create(self, request, *args, **kwargs):
        """Método customizado para criar usuários"""
        # Usar UsuarioSerializer para criação
        serializer = UsuarioSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Retornar usando UsuarioProfileSerializer para a resposta
            return Response(
                UsuarioProfileSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Método customizado para deletar usuários"""
        # Verificar permissão manualmente antes de prosseguir
        user = request.user
        
        if not user or not user.is_authenticated:
            return Response(
                {'detail': 'Usuário não autenticado.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Verificar se é admin ou superuser
        is_admin = False
        if hasattr(user, 'is_superuser') and user.is_superuser:
            is_admin = True
        elif isinstance(user, Usuario):
            effective_role = user.get_effective_role() if hasattr(user, 'get_effective_role') else getattr(user, 'role', None)
            is_admin = effective_role == Usuario.Role.ADMIN
        
        if not is_admin:
            return Response(
                {'detail': f'Apenas administradores podem deletar usuários. Seu papel atual: {getattr(user, "role", "N/A") if isinstance(user, Usuario) else "N/A"}'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance = self.get_object()
        
        # Verificar se o usuário está tentando deletar a si mesmo
        if instance == user:
            return Response(
                {'detail': 'Você não pode deletar sua própria conta.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se é um superuser tentando deletar
        if instance.is_superuser and not user.is_superuser:
            return Response(
                {'detail': 'Apenas superusuários podem deletar outros superusuários.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verificar e deletar registros relacionados antes de deletar o usuário
        # Isso evita erros de integridade de foreign key
        from django.db import transaction, connection
        
        try:
            with transaction.atomic():
                # Deletar registros da tabela funcaousuario se existir
                # Esta tabela pode existir no banco mas não estar no código atual
                try:
                    with connection.cursor() as cursor:
                        # Verificar se a tabela existe e deletar registros relacionados
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_schema = 'public' 
                                AND table_name = 'academia_funcaousuario'
                            );
                        """)
                        table_exists = cursor.fetchone()[0]
                        
                        if table_exists:
                            # Deletar registros da tabela funcaousuario relacionados ao usuário
                            cursor.execute("""
                                DELETE FROM academia_funcaousuario 
                                WHERE usuario_id = %s
                            """, [instance.id])
                except Exception:
                    # Continuar mesmo se não conseguir deletar dessa tabela
                    pass
                
                # Deletar o usuário (isso vai deletar automaticamente os relacionados com CASCADE)
                instance.delete()
                
                return Response(
                    {'detail': 'Usuário deletado com sucesso.'},
                    status=status.HTTP_204_NO_CONTENT
                )
        except Exception as e:
            # Verificar se é erro de integridade de foreign key
            error_str = str(e)
            if 'foreign key' in error_str.lower() or 'IntegrityError' in str(type(e).__name__):
                # Tentar identificar qual tabela está causando o problema
                constraint_name = ''
                if 'academia_funcaousuario' in error_str:
                    constraint_name = 'funcaousuario'
                elif 'academia_matricula' in error_str:
                    constraint_name = 'matrícula'
                elif 'academia_treino' in error_str:
                    constraint_name = 'treino'
                elif 'academia_avaliacao' in error_str:
                    constraint_name = 'avaliação'
                
                detail_msg = 'Não é possível deletar este usuário porque ele possui registros relacionados.'
                if constraint_name:
                    detail_msg += f' Registro relacionado: {constraint_name}.'
                detail_msg += ' Por favor, remova ou transfira esses registros antes de deletar o usuário.'
                
                return Response(
                    {
                        'detail': detail_msg,
                        'error_type': 'foreign_key_constraint',
                        'constraint': constraint_name if constraint_name else 'unknown'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Outros erros
            return Response(
                {
                    'detail': f'Erro ao deletar usuário: {str(e)}',
                    'error_type': 'unknown_error'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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


class AdminDashboardPage(TemplateView):
    """Página do dashboard do admin - autenticação via JWT no frontend"""
    template_name = 'html/admin_dashboard.html'

    def dispatch(self, request, *args, **kwargs):
        # Se houver sessão Django autenticada, verificar role
        # Mas não bloquear acesso se não houver sessão (autenticação via JWT no frontend)
        if request.user.is_authenticated:
            role = request.user.get_effective_role() if hasattr(request.user, 'get_effective_role') else Usuario.Role.ALUNO
            
            # Se não for admin ou superuser, redirecionar
            if not (request.user.is_superuser or role == Usuario.Role.ADMIN):
                if role == Usuario.Role.PROFESSOR:
                    return redirect('portal_professor_dashboard')
                return redirect('portal')

        # Permitir acesso - autenticação será verificada no frontend via JWT
        return super().dispatch(request, *args, **kwargs)


class ProfessorDashboardPage(TemplateView):
    """Página do dashboard do professor - autenticação via JWT no frontend"""
    template_name = 'html/professor_dashboard.html'

    def dispatch(self, request, *args, **kwargs):
        # Se houver sessão Django autenticada, verificar role
        # Mas não bloquear acesso se não houver sessão (autenticação via JWT no frontend)
        if request.user.is_authenticated:
            role = request.user.get_effective_role() if hasattr(request.user, 'get_effective_role') else Usuario.Role.ALUNO
            
            # Se for admin, redirecionar para dashboard do admin
            if request.user.is_superuser or role == Usuario.Role.ADMIN:
                return redirect('portal_admin_dashboard')
            
            # Se não for professor ou admin, redirecionar
            if role not in (Usuario.Role.PROFESSOR, Usuario.Role.ADMIN):
                return redirect('portal')

        # Permitir acesso - autenticação será verificada no frontend via JWT
        return super().dispatch(request, *args, **kwargs)


class AlunoPortalPage(TemplateView):
    """Página do portal do aluno - autenticação via JWT no frontend"""
    template_name = 'html/portal_frontend.html'

    def dispatch(self, request, *args, **kwargs):
        # Se houver sessão Django autenticada, verificar role e redirecionar se necessário
        # Mas não bloquear acesso se não houver sessão (autenticação via JWT no frontend)
        if request.user.is_authenticated:
            role = request.user.get_effective_role() if hasattr(request.user, 'get_effective_role') else Usuario.Role.ALUNO

            if role == Usuario.Role.ADMIN:
                return redirect('portal_admin_dashboard')
            if role == Usuario.Role.PROFESSOR:
                return redirect('portal_professor_dashboard')

        # Permitir acesso - autenticação será verificada no frontend via JWT
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

class ConfigPublicaView(APIView):
    """View para retornar configurações públicas (seguras para frontend)"""
    permission_classes = []  # Público - apenas dados seguros
    
    def get(self, request):
        """Retorna apenas configurações que podem ser expostas no frontend"""
        return Response({
            'mercadopago_public_key': getattr(settings, 'MERCADOPAGO_PUBLIC_KEY', ''),
        })


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

        # Criar checkout preference no Mercado Pago
        try:
            from .services.mercadopago import MercadoPagoService
            mp_service = MercadoPagoService()
            checkout_data = mp_service.criar_checkout_preference(pedido, request.user, plano, 'pix')
            
            if checkout_data and checkout_data.get('init_point'):
                return Response({
                    **PedidoSerializer(pedido).data,
                    'init_point': checkout_data.get('init_point'),
                    'preference_id': checkout_data.get('preference_id'),
                }, status=201)
            else:
                return Response({'detail': 'Erro ao criar checkout no Mercado Pago'}, status=500)
        except (ValueError, ImportError) as e:
            return Response({'detail': f'Erro ao processar pagamento: {str(e)}'}, status=500)

class PixStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pedido_id):
        try:
            pedido = Pedido.objects.get(id_publico=pedido_id, usuario=request.user)
        except Pedido.DoesNotExist:
            return Response({'detail': 'Pedido não encontrado'}, status=404)
        
        # Se tiver payment_id do Mercado Pago, consultar status atualizado
        if pedido.mercado_pago_payment_id:
            try:
                from .services.mercadopago import MercadoPagoService
                mp_service = MercadoPagoService()
                payment = mp_service.consultar_pagamento(pedido.mercado_pago_payment_id)
                
                if payment:
                    # Atualizar status do pedido baseado no status do Mercado Pago
                    mp_status = payment.get('status')
                    if mp_status == 'approved':
                        pedido.status = Pedido.STATUS_APROVADO
                    elif mp_status in ['cancelled', 'rejected']:
                        pedido.status = Pedido.STATUS_CANCELADO
                    elif mp_status == 'expired':
                        pedido.status = Pedido.STATUS_EXPIRADO
                    
                    pedido.mercado_pago_status = mp_status
                    pedido.mercado_pago_status_detail = payment.get('status_detail', '')
                    pedido.save()
            except (ValueError, ImportError):
                pass  # Ignorar se Mercado Pago não estiver configurado
        
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


class CartaoInitiateView(APIView):
    """View para criar pagamento com cartão de crédito via Mercado Pago Checkout Pro"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plano_id = request.data.get('plano_id')
        
        try:
            plano = Plano.objects.get(id=plano_id, ativo=True)
        except Plano.DoesNotExist:
            return Response({'detail': 'Plano inválido'}, status=400)

        # criar pedido pendente (assinatura)
        pedido = Pedido.objects.create(
            usuario=request.user,
            plano=plano,
            valor=plano.preco,
            metodo=Pedido.METODO_CARTAO,
            status=Pedido.STATUS_PENDENTE,
            is_subscription=True,
        )

        try:
            from .services.mercadopago import MercadoPagoService
            mp_service = MercadoPagoService()
            # Criar checkout preference (redireciona para Mercado Pago)
            checkout_data = mp_service.criar_checkout_preference(
                pedido, request.user, plano, 'cartao'
            )
            
            if checkout_data and checkout_data.get('init_point'):
                return Response({
                    **PedidoSerializer(pedido).data,
                    'init_point': checkout_data.get('init_point'),
                    'preference_id': checkout_data.get('preference_id'),
                }, status=201)
            else:
                return Response({'detail': 'Erro ao criar checkout no Mercado Pago'}, status=500)
                
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        except Exception as e:
            return Response({'detail': f'Erro ao processar pagamento: {str(e)}'}, status=500)
    
    def _criar_matricula(self, pedido):
        """Cria matrícula quando assinatura é aprovada"""
        from datetime import timedelta
        from django.utils import timezone
        
        data_inicio = pedido.subscription_start_date or timezone.now().date()
        data_fim = pedido.subscription_end_date or (data_inicio + timedelta(days=pedido.plano.duracao_dias))
        
        Matricula.objects.create(
            usuario=pedido.usuario,
            plano=pedido.plano,
            data_inicio=data_inicio,
            data_fim=data_fim,
            valor_pago=pedido.valor,
            status=Matricula.STATUS_ATIVA
        )


class AssinaturaStatusView(APIView):
    """View para consultar status de assinatura"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pedido_id):
        try:
            pedido = Pedido.objects.get(id_publico=pedido_id, usuario=request.user)
        except Pedido.DoesNotExist:
            return Response({'detail': 'Pedido não encontrado'}, status=404)
        
        # Se tiver subscription_id do Mercado Pago, consultar status atualizado
        if pedido.mercado_pago_subscription_id:
            try:
                from .services.mercadopago import MercadoPagoService
                mp_service = MercadoPagoService()
                subscription = mp_service.consultar_assinatura(pedido.mercado_pago_subscription_id)
                
                if subscription:
                    # Atualizar status do pedido baseado no status da assinatura
                    mp_status = subscription.get('status')
                    if mp_status in ['authorized', 'active']:
                        pedido.status = Pedido.STATUS_APROVADO
                    elif mp_status in ['cancelled', 'paused']:
                        pedido.status = Pedido.STATUS_CANCELADO
                    elif mp_status == 'pending':
                        pedido.status = Pedido.STATUS_PENDENTE
                    
                    pedido.mercado_pago_subscription_status = mp_status
                    pedido.save()
            except (ValueError, ImportError):
                pass  # Ignorar se Mercado Pago não estiver configurado
        
        return Response(PedidoSerializer(pedido).data)


class AssinaturaCancelarView(APIView):
    """View para cancelar assinatura"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pedido_id):
        try:
            pedido = Pedido.objects.get(id_publico=pedido_id, usuario=request.user)
        except Pedido.DoesNotExist:
            return Response({'detail': 'Pedido não encontrado'}, status=404)
        
        if not pedido.is_subscription:
            return Response({'detail': 'Este pedido não é uma assinatura'}, status=400)
        
        if not pedido.mercado_pago_subscription_id:
            return Response({'detail': 'ID de assinatura não encontrado'}, status=400)
        
        try:
            from .services.mercadopago import MercadoPagoService
            mp_service = MercadoPagoService()
            result = mp_service.cancelar_assinatura(pedido.mercado_pago_subscription_id)
            
            if result:
                pedido.status = Pedido.STATUS_CANCELADO
                pedido.mercado_pago_subscription_status = 'cancelled'
                pedido.save()
                
                # Cancelar matrícula ativa
                Matricula.objects.filter(
                    usuario=pedido.usuario,
                    status=Matricula.STATUS_ATIVA
                ).update(status=Matricula.STATUS_CANCELADA)
                
                return Response(PedidoSerializer(pedido).data)
            else:
                return Response({'detail': 'Erro ao cancelar assinatura'}, status=400)
                
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        except Exception as e:
            return Response({'detail': f'Erro ao cancelar assinatura: {str(e)}'}, status=500)


class MercadoPagoWebhookView(APIView):
    """View para receber webhooks do Mercado Pago"""
    permission_classes = []  # Webhook não precisa autenticação JWT
    
    def post(self, request):
        try:
            from .services.mercadopago import MercadoPagoService
            mp_service = MercadoPagoService()
            result = mp_service.processar_webhook(request.data)
            
            if not result.get('success'):
                return Response({'detail': result.get('message')}, status=400)
            
            # Buscar pedido pelo external_reference
            external_ref = result.get('external_reference')
            if not external_ref:
                return Response({'detail': 'External reference não encontrado'}, status=400)
            
            try:
                pedido = Pedido.objects.get(id_publico=external_ref)
            except Pedido.DoesNotExist:
                return Response({'detail': 'Pedido não encontrado'}, status=404)
            
            # Processar baseado no tipo (assinatura ou pagamento)
            webhook_type = result.get('type')
            
            if webhook_type == 'subscription':
                # Webhook de assinatura
                mp_status = result.get('status')
                pedido.mercado_pago_subscription_status = mp_status
                
                if mp_status in ['authorized', 'active']:
                    pedido.status = Pedido.STATUS_APROVADO
                    pedido.save()
                    # Criar/renovar matrícula
                    self._criar_matricula_se_necessario(pedido)
                elif mp_status in ['cancelled', 'paused']:
                    pedido.status = Pedido.STATUS_CANCELADO
                    pedido.save()
                    # Cancelar matrícula
                    Matricula.objects.filter(
                        usuario=pedido.usuario,
                        status=Matricula.STATUS_ATIVA
                    ).update(status=Matricula.STATUS_CANCELADA)
                elif mp_status == 'pending':
                    pedido.status = Pedido.STATUS_PENDENTE
                    pedido.save()
            
            elif webhook_type == 'subscription_payment':
                # Webhook de pagamento recorrente de assinatura
                mp_status = result.get('status')
                pedido.mercado_pago_status = mp_status
                pedido.mercado_pago_status_detail = result.get('status_detail', '')
                
                if mp_status == 'approved':
                    # Renovar matrícula quando pagamento recorrente é aprovado
                    self._renovar_matricula(pedido)
                elif mp_status in ['rejected', 'cancelled']:
                    # Pagamento recorrente falhou - suspender matrícula
                    Matricula.objects.filter(
                        usuario=pedido.usuario,
                        status=Matricula.STATUS_ATIVA
                    ).update(status=Matricula.STATUS_SUSPENSA)
            
            else:
                # Webhook de pagamento único
                mp_status = result.get('status')
                pedido.mercado_pago_status = mp_status
                pedido.mercado_pago_status_detail = result.get('status_detail', '')
                
                if mp_status == 'approved':
                    pedido.status = Pedido.STATUS_APROVADO
                    pedido.save()
                    # Criar matrícula se ainda não existir
                    self._criar_matricula_se_necessario(pedido)
                elif mp_status in ['cancelled', 'rejected']:
                    pedido.status = Pedido.STATUS_CANCELADO
                    pedido.save()
                elif mp_status == 'expired':
                    pedido.status = Pedido.STATUS_EXPIRADO
                    pedido.save()
            
            pedido.save()
            
            return Response({'success': True}, status=200)
            
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        except Exception as e:
            return Response({'detail': f'Erro ao processar webhook: {str(e)}'}, status=500)
    
    def _criar_matricula_se_necessario(self, pedido):
        """Cria matrícula se pagamento foi aprovado e ainda não existe matrícula ativa"""
        from datetime import timedelta
        from django.utils import timezone
        
        # Verificar se já existe matrícula ativa para este pedido
        matricula_existente = Matricula.objects.filter(
            usuario=pedido.usuario,
            status=Matricula.STATUS_ATIVA
        ).first()
        
        if not matricula_existente:
            data_inicio = pedido.subscription_start_date or timezone.now().date()
            data_fim = pedido.subscription_end_date or (data_inicio + timedelta(days=pedido.plano.duracao_dias))
            
            Matricula.objects.create(
                usuario=pedido.usuario,
                plano=pedido.plano,
                data_inicio=data_inicio,
                data_fim=data_fim,
                valor_pago=pedido.valor,
                status=Matricula.STATUS_ATIVA
            )
    
    def _renovar_matricula(self, pedido):
        """Renova matrícula quando pagamento recorrente é aprovado"""
        from datetime import timedelta
        from django.utils import timezone
        
        matricula = Matricula.objects.filter(
            usuario=pedido.usuario,
            status=Matricula.STATUS_ATIVA
        ).first()
        
        if matricula:
            # Renovar data de fim
            nova_data_fim = matricula.data_fim + timedelta(days=pedido.plano.duracao_dias)
            matricula.data_fim = nova_data_fim
            matricula.status = Matricula.STATUS_ATIVA
            matricula.save()
        else:
            # Criar nova matrícula se não existir
            self._criar_matricula_se_necessario(pedido)

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


# ==================== HANDLERS DE ERRO ====================

def handler404(request, exception):
    """Handler para erro 404 - Página não encontrada"""
    return render(request, 'html/404.html', {'exception': exception}, status=404)


def handler500(request):
    """Handler para erro 500 - Erro interno do servidor"""
    return render(request, 'html/500.html', status=500)


def handler403(request, exception):
    """Handler para erro 403 - Acesso negado"""
    return render(request, 'html/404.html', {'error_message': 'Acesso negado'}, status=403)


def handler400(request, exception):
    """Handler para erro 400 - Requisição inválida"""
    return render(request, 'html/404.html', {'error_message': 'Requisição inválida'}, status=400)

# ==================== VIEWS PARA TORNEIO ====================

def gerar_chaves_torneio(torneio):
    """Função auxiliar para gerar chaves do torneio automaticamente"""
    from math import log2, ceil, floor
    
    participantes_ativos = list(torneio.participantes.filter(ativo=True, eliminado=False))
    total_participantes = len(participantes_ativos)
    
    if total_participantes < 2:
        return False, "É necessário pelo menos 2 participantes para gerar as chaves"
    
    # Determinar número de fases baseado no total de participantes
    # Arredondar para cima para garantir que temos fases suficientes
    num_fases = int(ceil(log2(total_participantes)))
    
    # Mapeamento de número de fase para tipo
    fase_map = {
        1: 'final',
        2: 'semis',
        3: 'quartas',
        4: 'oitavas',
    }
    
    # Limpar fases e chaves existentes se houver
    torneio.fases.all().delete()
    
    # Criar fases do torneio (da última para a primeira)
    for i in range(num_fases, 0, -1):
        tipo_fase = fase_map.get(i, 'oitavas')
        FaseTorneio.objects.create(
            torneio=torneio,
            tipo_fase=tipo_fase,
            numero_fase=i
        )
    
    # Embaralhar participantes para sorteio
    import random
    random.shuffle(participantes_ativos)
    
    # Criar chaves da primeira fase (oitavas ou a fase inicial)
    primeira_fase = torneio.fases.order_by('numero_fase').last()  # Última fase criada (oitavas)
    if not primeira_fase:
        return False, "Erro ao criar primeira fase"
    
    # Calcular número de chaves na primeira fase
    num_chaves_primeira_fase = 2 ** (num_fases - 1)
    chave_num = 1
    
    # Criar chaves com participantes
    for i in range(0, min(len(participantes_ativos), num_chaves_primeira_fase * 2), 2):
        if i + 1 < len(participantes_ativos):
            Chave.objects.create(
                fase=primeira_fase,
                participante1=participantes_ativos[i],
                participante2=participantes_ativos[i + 1],
                numero_chave=chave_num
            )
        else:
            # Participante recebe bye (passa direto para próxima fase)
            Chave.objects.create(
                fase=primeira_fase,
                participante1=participantes_ativos[i],
                participante2=None,
                numero_chave=chave_num
            )
        chave_num += 1
    
    # Criar chaves vazias para as próximas fases
    for fase_num in range(num_fases - 1, 0, -1):
        fase = torneio.fases.get(numero_fase=fase_num)
        num_chaves_fase = 2 ** (fase_num - 1)
        for chave_num in range(1, num_chaves_fase + 1):
            Chave.objects.create(
                fase=fase,
                numero_chave=chave_num
            )
    
    return True, f"Chaves geradas com sucesso! {chave_num - 1} chaves criadas na primeira fase."

class TorneioViewSet(viewsets.ModelViewSet):
    """ViewSet para torneios"""
    
    queryset = Torneio.objects.all()
    serializer_class = TorneioSerializer
    
    def get_queryset(self):
        queryset = Torneio.objects.all()
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.prefetch_related('participantes', 'fases', 'fases__chaves', 'fases__exercicios')
    
    def get_permissions(self):
        """Permissões baseadas na ação"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Apenas admins podem criar/editar/deletar torneios
            return [IsAcademiaAdmin()]
        # Todos autenticados podem listar e ver detalhes
        return [permissions.IsAuthenticated()]
    
    def get_serializer_context(self):
        """Adicionar request ao contexto do serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Salvar criador do torneio"""
        serializer.save(criado_por=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAcademiaAdmin])
    def gerar_chaves(self, request, pk=None):
        """Ação para gerar chaves do torneio"""
        torneio = self.get_object()
        sucesso, mensagem = gerar_chaves_torneio(torneio)
        
        if sucesso:
            return Response({'message': mensagem}, status=status.HTTP_200_OK)
        return Response({'error': mensagem}, status=status.HTTP_400_BAD_REQUEST)

class ParticipanteTorneioViewSet(viewsets.ModelViewSet):
    """ViewSet para participantes do torneio"""
    
    queryset = ParticipanteTorneio.objects.all()
    serializer_class = ParticipanteTorneioSerializer
    
    def get_queryset(self):
        queryset = ParticipanteTorneio.objects.all()
        torneio_id = self.request.query_params.get('torneio', None)
        if torneio_id:
            queryset = queryset.filter(torneio_id=torneio_id)
        return queryset.select_related('usuario', 'torneio')
    
    def get_permissions(self):
        """Permissões baseadas na ação"""
        if self.action == 'create':
            # Alunos podem se inscrever, admins podem adicionar qualquer um
            return [permissions.IsAuthenticated()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            # Apenas admins podem editar/deletar participantes
            return [IsAcademiaAdmin()]
        # Todos podem listar e ver
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        """Criar participante - se for aluno, só pode se inscrever"""
        user = self.request.user
        torneio = serializer.validated_data['torneio']
        
        # Verificar se é admin ou se está se inscrevendo
        if user.get_effective_role() != Usuario.Role.ADMIN:
            # Aluno só pode se inscrever a si mesmo
            if serializer.validated_data.get('usuario') != user:
                raise PermissionDenied('Você só pode se inscrever no torneio.')
            
            # Verificar se já está inscrito
            if ParticipanteTorneio.objects.filter(torneio=torneio, usuario=user, ativo=True).exists():
                raise ValidationError('Você já está inscrito neste torneio.')
            
            # Verificar se há vagas
            if torneio.vagas_disponiveis <= 0:
                raise ValidationError('Não há vagas disponíveis neste torneio.')
            
            # Verificar se as inscrições estão abertas
            agora = timezone.now()
            if agora < torneio.data_inicio_inscricoes or agora > torneio.data_fim_inscricoes:
                raise ValidationError('As inscrições para este torneio não estão abertas no momento.')
        
        serializer.save()

class FaseTorneioViewSet(viewsets.ModelViewSet):
    """ViewSet para fases do torneio"""
    
    queryset = FaseTorneio.objects.all()
    serializer_class = FaseTorneioSerializer
    
    def get_queryset(self):
        queryset = FaseTorneio.objects.all()
        torneio_id = self.request.query_params.get('torneio', None)
        if torneio_id:
            queryset = queryset.filter(torneio_id=torneio_id)
        return queryset.prefetch_related('exercicios', 'chaves', 'chaves__participante1', 'chaves__participante2')
    
    def get_permissions(self):
        """Apenas admins e professores podem gerenciar fases"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessorOrAdmin()]
        return [permissions.IsAuthenticated()]

class ExercicioFaseViewSet(viewsets.ModelViewSet):
    """ViewSet para exercícios de uma fase"""
    
    queryset = ExercicioFase.objects.all()
    serializer_class = ExercicioFaseSerializer
    
    def get_queryset(self):
        queryset = ExercicioFase.objects.all()
        fase_id = self.request.query_params.get('fase', None)
        if fase_id:
            queryset = queryset.filter(fase_id=fase_id)
        return queryset.select_related('exercicio', 'fase')
    
    def get_permissions(self):
        """Apenas admins e professores podem gerenciar exercícios das fases"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessorOrAdmin()]
        return [permissions.IsAuthenticated()]

class ChaveViewSet(viewsets.ModelViewSet):
    """ViewSet para chaves do torneio"""
    
    queryset = Chave.objects.all()
    serializer_class = ChaveSerializer
    
    def get_queryset(self):
        queryset = Chave.objects.all()
        fase_id = self.request.query_params.get('fase', None)
        if fase_id:
            queryset = queryset.filter(fase_id=fase_id)
        return queryset.select_related('participante1', 'participante2', 'vencedor', 'fase')
    
    def get_permissions(self):
        """Apenas admins e professores podem editar chaves, todos podem ver"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessorOrAdmin()]
        return [permissions.IsAuthenticated()]

class ResultadoPartidaViewSet(viewsets.ModelViewSet):
    """ViewSet para resultados das partidas"""
    
    queryset = ResultadoPartida.objects.all()
    serializer_class = ResultadoPartidaSerializer
    
    def get_queryset(self):
        queryset = ResultadoPartida.objects.all()
        chave_id = self.request.query_params.get('chave', None)
        if chave_id:
            queryset = queryset.filter(chave_id=chave_id)
        return queryset.select_related('chave', 'vencedor', 'registrado_por')
    
    def get_permissions(self):
        """Apenas admins e professores podem registrar resultados"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsProfessorOrAdmin()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        """Salvar quem registrou o resultado e atualizar próximas fases"""
        resultado = serializer.save(registrado_por=self.request.user)
        
        # Atualizar próxima fase se necessário
        chave = resultado.chave
        vencedor = resultado.vencedor
        
        if vencedor and chave.fase:
            # Verificar se há próxima fase (número menor = fase mais avançada)
            proxima_fase = chave.fase.torneio.fases.filter(
                numero_fase=chave.fase.numero_fase - 1
            ).first()
            
            if proxima_fase:
                # Calcular qual chave na próxima fase baseado na chave atual
                # Chave 1 e 2 vão para chave 1, chave 3 e 4 vão para chave 2, etc.
                chave_num_proxima = (chave.numero_chave + 1) // 2
                proxima_chave = proxima_fase.chaves.filter(
                    numero_chave=chave_num_proxima
                ).first()
                
                if proxima_chave:
                    # Adicionar vencedor à próxima chave
                    # Se número da chave atual é ímpar, vai para participante1
                    # Se é par, vai para participante2
                    if chave.numero_chave % 2 == 1:
                        proxima_chave.participante1 = vencedor
                    else:
                        proxima_chave.participante2 = vencedor
                    proxima_chave.save()
