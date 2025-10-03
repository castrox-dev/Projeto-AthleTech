from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect
from django.contrib import messages
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .models import Usuario, Plano, Matricula, Exercicio, Treino, TreinoExercicio, Avaliacao, Frequencia, Pedido
from .serializers import (
    UsuarioSerializer, UsuarioProfileSerializer, LoginSerializer,
    PlanoSerializer, MatriculaSerializer, ExercicioSerializer,
    TreinoSerializer, AvaliacaoSerializer, FrequenciaSerializer,
    CheckEmailSerializer, PasswordResetSerializer, EscolherPlanoSerializer,
    DashboardSerializer, ChangePasswordSerializer, PedidoSerializer
)

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
    permission_classes = [permissions.IsAdminUser]
    
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
            permission_classes = [permissions.IsAdminUser]
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
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Matricula.objects.all()
        return Matricula.objects.filter(usuario=self.request.user)

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
        return Treino.objects.filter(usuario=self.request.user, ativo=True)

class TreinoDetailView(RetrieveAPIView):
    """View para detalhes de um treino"""
    
    serializer_class = TreinoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Treino.objects.filter(usuario=self.request.user)

class AvaliacaoListView(ListAPIView):
    """View para listar avaliações do usuário"""
    
    serializer_class = AvaliacaoSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Avaliacao.objects.filter(usuario=self.request.user)

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
        email = request.POST.get('email')
        password = request.POST.get('password')

        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            return redirect('portal')  # redireciona para o portal
        else:
            messages.error(request, 'Email ou senha inválidos.')

    return render(request, 'login.html')  # seu template de login
