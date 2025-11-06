from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Usuario, Plano, Matricula, Exercicio, Treino, TreinoExercicio, Avaliacao, Frequencia, Pedido

class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'phone', 'birth_date', 'gender', 'is_active_member',
            'created_at', 'password', 'password_confirm'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'created_at': {'read_only': True},
            'is_active_member': {'read_only': True},
        }

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("Usuário com este email já existe.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("As senhas não coincidem.")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        if not validated_data.get('username'):
            validated_data['username'] = validated_data['email']
        user = Usuario.objects.create_user(password=password, **validated_data)
        return user

class UsuarioProfileSerializer(serializers.ModelSerializer):
    """Serializer para perfil do usuário (sem senha)"""
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'birth_date', 'gender', 'is_active_member',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'username', 'created_at', 'updated_at']

class LoginSerializer(serializers.Serializer):
    """Serializer para login de usuários via API"""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError('Email e senha são obrigatórios.')

        try:
            user = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError('Usuário com este email não encontrado.')

        user = authenticate(username=user.username, password=password)

        if not user:
            raise serializers.ValidationError('Senha incorreta.')

        if not user.is_active:
            raise serializers.ValidationError('Conta desativada.')

        attrs['user'] = user
        return attrs

class PlanoSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Plano"""
    
    class Meta:
        model = Plano
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class MatriculaSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Matricula"""
    
    usuario_nome = serializers.CharField(source='usuario.get_full_name', read_only=True)
    plano_nome = serializers.CharField(source='plano.nome', read_only=True)
    
    class Meta:
        model = Matricula
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class ExercicioSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Exercicio"""
    
    class Meta:
        model = Exercicio
        fields = '__all__'
        read_only_fields = ['created_at']

class TreinoExercicioSerializer(serializers.ModelSerializer):
    """Serializer para exercícios dentro de um treino"""
    
    exercicio_nome = serializers.CharField(source='exercicio.nome', read_only=True)
    exercicio_categoria = serializers.CharField(source='exercicio.categoria', read_only=True)
    
    class Meta:
        model = TreinoExercicio
        fields = [
            'id', 'exercicio', 'exercicio_nome', 'exercicio_categoria',
            'series', 'repeticoes', 'peso', 'tempo_descanso',
            'observacoes', 'ordem'
        ]

class TreinoSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Treino"""
    
    exercicios_detalhes = TreinoExercicioSerializer(
        source='treinoexercicio_set', 
        many=True, 
        read_only=True
    )
    usuario_nome = serializers.CharField(source='usuario.get_full_name', read_only=True)
    
    class Meta:
        model = Treino
        fields = [
            'id', 'usuario', 'usuario_nome', 'nome', 'descricao',
            'exercicios_detalhes', 'data_criacao', 'ativo'
        ]
        read_only_fields = ['data_criacao']
    
    def to_representation(self, instance):
        """Garantir que exercicios_detalhes seja sempre uma lista"""
        representation = super().to_representation(instance)
        if 'exercicios_detalhes' not in representation or representation['exercicios_detalhes'] is None:
            representation['exercicios_detalhes'] = []
        return representation

class AvaliacaoSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Avaliacao"""
    
    usuario_nome = serializers.CharField(source='usuario.get_full_name', read_only=True)
    
    class Meta:
        model = Avaliacao
        fields = '__all__'
        read_only_fields = ['created_at', 'imc']

class FrequenciaSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Frequencia"""
    
    usuario_nome = serializers.CharField(source='usuario.get_full_name', read_only=True)
    tempo_permanencia = serializers.ReadOnlyField()
    
    class Meta:
        model = Frequencia
        fields = '__all__'

class CheckEmailSerializer(serializers.Serializer):
    """Serializer para verificar disponibilidade de email"""
    
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            return value
        return value

class PasswordResetSerializer(serializers.Serializer):
    """Serializer para reset de senha"""
    
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("Usuário com este email não encontrado.")
        return value

class EscolherPlanoSerializer(serializers.Serializer):
    """Serializer para escolher um plano"""
    
    plano_id = serializers.IntegerField()
    
    def validate_plano_id(self, value):
        try:
            plano = Plano.objects.get(id=value, ativo=True)
            return value
        except Plano.DoesNotExist:
            raise serializers.ValidationError("Plano não encontrado ou inativo.")

class DashboardSerializer(serializers.Serializer):
    """Serializer para dados do dashboard"""
    
    usuario = UsuarioProfileSerializer(read_only=True)
    matricula_ativa = MatriculaSerializer(read_only=True)
    treinos_recentes = TreinoSerializer(many=True, read_only=True)
    ultima_avaliacao = AvaliacaoSerializer(read_only=True)
    frequencia_mensal = serializers.IntegerField(read_only=True)

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer para mudança de senha"""
    
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    new_password_confirm = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError("As novas senhas não coincidem.")
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Senha atual incorreta.")
        return value

class PedidoSerializer(serializers.ModelSerializer):
    plano_nome = serializers.CharField(source='plano.nome', read_only=True)
    class Meta:
        model = Pedido
        fields = ['id', 'id_publico', 'usuario', 'plano', 'plano_nome', 'valor', 'metodo', 'status', 'pix_payload', 'pix_qr', 'criado_em']
        read_only_fields = ['id', 'id_publico', 'status', 'pix_payload', 'pix_qr', 'criado_em', 'usuario', 'valor']
