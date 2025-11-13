from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    Usuario, Plano, Matricula, Exercicio, Treino, TreinoExercicio, 
    Avaliacao, Frequencia, Pedido, Torneio, ParticipanteTorneio, 
    FaseTorneio, ExercicioFase, Chave, ResultadoPartida
)

class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'phone', 'birth_date', 'gender', 'role', 'is_active_member',
            'created_at', 'password', 'password_confirm'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'created_at': {'read_only': True},
            'is_active_member': {'read_only': True},
            # role não é read_only para permitir que admins definam o role na criação
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
            'phone', 'birth_date', 'gender', 'role', 'is_active_member',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'username', 'created_at', 'updated_at', 'role']

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
    exercicios = TreinoExercicioSerializer(many=True, write_only=True, required=False)
    
    class Meta:
        model = Treino
        fields = [
            'id', 'usuario', 'usuario_nome', 'nome', 'descricao',
            'exercicios', 'exercicios_detalhes', 'data_criacao', 'ativo'
        ]
        read_only_fields = ['data_criacao']
    
    def to_representation(self, instance):
        """Garantir que exercicios_detalhes seja sempre uma lista"""
        representation = super().to_representation(instance)
        if 'exercicios_detalhes' not in representation or representation['exercicios_detalhes'] is None:
            representation['exercicios_detalhes'] = []
        return representation

    def create(self, validated_data):
        exercicios_data = validated_data.pop('exercicios', [])
        treino = Treino.objects.create(**validated_data)
        for ordem, exercicio_info in enumerate(exercicios_data, start=1):
            exercicio = exercicio_info.get('exercicio')
            if not exercicio:
                continue
            TreinoExercicio.objects.create(
                treino=treino,
                exercicio=exercicio,
                series=exercicio_info.get('series') or 3,
                repeticoes=exercicio_info.get('repeticoes') or 10,
                peso=exercicio_info.get('peso'),
                tempo_descanso=exercicio_info.get('tempo_descanso'),
                observacoes=exercicio_info.get('observacoes', ''),
                ordem=exercicio_info.get('ordem') or ordem,
            )
        return treino

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

# Serializers para Torneio
class ParticipanteTorneioSerializer(serializers.ModelSerializer):
    """Serializer para participantes do torneio"""
    usuario_nome = serializers.CharField(source='usuario.get_full_name', read_only=True)
    usuario_email = serializers.CharField(source='usuario.email', read_only=True)
    usuario_id = serializers.IntegerField(source='usuario.id', read_only=True)
    
    class Meta:
        model = ParticipanteTorneio
        fields = ['id', 'torneio', 'usuario', 'usuario_id', 'usuario_nome', 'usuario_email', 
                  'data_inscricao', 'ativo', 'eliminado', 'posicao_final', 'observacoes']
        read_only_fields = ['id', 'data_inscricao']

class ExercicioFaseSerializer(serializers.ModelSerializer):
    """Serializer para exercícios de uma fase"""
    exercicio_nome = serializers.CharField(source='exercicio.nome', read_only=True)
    exercicio_categoria = serializers.CharField(source='exercicio.categoria', read_only=True)
    exercicio_id = serializers.IntegerField(source='exercicio.id', read_only=True)
    
    class Meta:
        model = ExercicioFase
        fields = ['id', 'fase', 'exercicio', 'exercicio_id', 'exercicio_nome', 'exercicio_categoria',
                  'ordem', 'series', 'repeticoes', 'peso_minimo', 'peso_maximo', 'tempo_limite',
                  'criterio_vitoria', 'pontos', 'created_at']
        read_only_fields = ['id', 'created_at']

class ChaveSerializer(serializers.ModelSerializer):
    """Serializer para chaves do torneio"""
    participante1_nome = serializers.CharField(source='participante1.usuario.get_full_name', read_only=True)
    participante2_nome = serializers.CharField(source='participante2.usuario.get_full_name', read_only=True)
    vencedor_nome = serializers.CharField(source='vencedor.usuario.get_full_name', read_only=True)
    fase_nome = serializers.CharField(source='fase.get_tipo_fase_display', read_only=True)
    tem_resultado = serializers.SerializerMethodField()
    
    class Meta:
        model = Chave
        fields = ['id', 'fase', 'fase_nome', 'participante1', 'participante1_nome',
                  'participante2', 'participante2_nome', 'numero_chave', 'vencedor', 
                  'vencedor_nome', 'data_partida', 'concluida', 'observacoes', 
                  'tem_resultado', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_tem_resultado(self, obj):
        return hasattr(obj, 'resultado')

class ResultadoPartidaSerializer(serializers.ModelSerializer):
    """Serializer para resultados das partidas"""
    chave_info = ChaveSerializer(source='chave', read_only=True)
    vencedor_nome = serializers.CharField(source='vencedor.usuario.get_full_name', read_only=True)
    registrado_por_nome = serializers.CharField(source='registrado_por.get_full_name', read_only=True)
    
    class Meta:
        model = ResultadoPartida
        fields = ['id', 'chave', 'chave_info', 'participante1_pontos', 'participante2_pontos',
                  'vencedor', 'vencedor_nome', 'detalhes', 'observacoes', 'registrado_por',
                  'registrado_por_nome', 'data_registro']
        read_only_fields = ['id', 'data_registro']

class FaseTorneioSerializer(serializers.ModelSerializer):
    """Serializer para fases do torneio"""
    exercicios = ExercicioFaseSerializer(many=True, read_only=True)
    chaves = ChaveSerializer(many=True, read_only=True)
    total_chaves = serializers.SerializerMethodField()
    chaves_concluidas = serializers.SerializerMethodField()
    
    class Meta:
        model = FaseTorneio
        fields = ['id', 'torneio', 'tipo_fase', 'numero_fase', 'data_inicio', 'data_fim',
                  'concluida', 'exercicios', 'chaves', 'total_chaves', 'chaves_concluidas', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_total_chaves(self, obj):
        return obj.chaves.count()
    
    def get_chaves_concluidas(self, obj):
        return obj.chaves.filter(concluida=True).count()

class TorneioSerializer(serializers.ModelSerializer):
    """Serializer para torneios"""
    criado_por_nome = serializers.CharField(source='criado_por.get_full_name', read_only=True)
    total_participantes = serializers.IntegerField(read_only=True)
    vagas_disponiveis = serializers.IntegerField(read_only=True)
    participantes = ParticipanteTorneioSerializer(many=True, read_only=True)
    fases = FaseTorneioSerializer(many=True, read_only=True)
    usuario_inscrito = serializers.SerializerMethodField()
    
    class Meta:
        model = Torneio
        fields = ['id', 'nome', 'descricao', 'data_inicio_inscricoes', 'data_fim_inscricoes',
                  'data_inicio', 'data_fim', 'status', 'max_participantes', 'total_participantes',
                  'vagas_disponiveis', 'regras', 'premio', 'criado_por', 'criado_por_nome',
                  'participantes', 'fases', 'usuario_inscrito', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_participantes', 'vagas_disponiveis']
    
    def get_usuario_inscrito(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.participantes.filter(usuario=request.user, ativo=True).exists()
        return False
