from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
import uuid

class Usuario(AbstractUser):
    """Modelo customizado de usuário para a academia"""
    
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrador'
        PROFESSOR = 'professor', 'Professor'
        ALUNO = 'aluno', 'Aluno'
    
    GENDER_CHOICES = [
    ('male', 'Masculino'),
    ('female', 'Feminino'),
    ('other', 'Outro'),
    ]

    
    phone = models.CharField('Telefone', max_length=20, blank=True, null=True)
    birth_date = models.DateField('Data de Nascimento', blank=True, null=True)
    gender = models.CharField('Gênero', max_length=6, choices=GENDER_CHOICES, blank=True, null=True)
    role = models.CharField('Função', max_length=20, choices=Role.choices, default=Role.ALUNO)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    is_active_member = models.BooleanField('Membro Ativo', default=False)
    
    # Campos específicos para professores
    especialidade = models.CharField('Especialidade', max_length=100, blank=True, null=True)
    cref = models.CharField('CREF', max_length=20, blank=True, null=True, help_text='Formato: 000000-G/UF')
    
    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}" if self.first_name else self.username

    @property
    def is_academia_admin(self):
        return self.get_effective_role() == self.Role.ADMIN

    @property
    def is_professor(self):
        return self.get_effective_role() == self.Role.PROFESSOR

    def get_effective_role(self) -> str:
        if self.is_superuser:
            return self.Role.ADMIN
        return self.role or self.Role.ALUNO

    def save(self, *args, **kwargs):
        # Garantir que administradores tenham acesso ao admin do Django
        self.is_staff = bool((self.role == self.Role.ADMIN) or self.is_superuser)
        super().save(*args, **kwargs)

    def get_dashboard_url_name(self):
        # Usar get_effective_role() para garantir o role correto
        effective_role = self.get_effective_role()
        if self.is_superuser or effective_role == self.Role.ADMIN:
            return 'portal_admin_dashboard'
        if effective_role == self.Role.PROFESSOR:
            return 'portal_professor_dashboard'
        return 'portal'

class Plano(models.Model):
    """Modelo para planos da academia"""
    
    nome = models.CharField('Nome', max_length=100)
    descricao = models.TextField('Descrição')
    preco = models.DecimalField('Preço', max_digits=8, decimal_places=2)
    duracao_dias = models.IntegerField('Duração em Dias', default=30)
    ativo = models.BooleanField('Ativo', default=True)
    beneficios = models.JSONField('Benefícios', default=list)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'Plano'
        verbose_name_plural = 'Planos'
        ordering = ['preco']
    
    def __str__(self):
        return f"{self.nome} - R$ {self.preco}"

class Matricula(models.Model):
    """Modelo para matrículas dos usuários"""
    
    STATUS_CHOICES = [
        ('ativa', 'Ativa'),
        ('suspensa', 'Suspensa'),
        ('cancelada', 'Cancelada'),
        ('vencida', 'Vencida'),
    ]
    
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='matriculas')
    plano = models.ForeignKey(Plano, on_delete=models.CASCADE, related_name='matriculas')
    data_inicio = models.DateField('Data de Início')
    data_fim = models.DateField('Data de Fim')
    status = models.CharField('Status', max_length=20, choices=STATUS_CHOICES, default='ativa')
    valor_pago = models.DecimalField('Valor Pago', max_digits=8, decimal_places=2)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'Matrícula'
        verbose_name_plural = 'Matrículas'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.usuario} - {self.plano} ({self.status})"

class Exercicio(models.Model):
    """Modelo para exercícios disponíveis"""
    
    CATEGORIA_CHOICES = [
        ('peito', 'Peito'),
        ('costas', 'Costas'),
        ('pernas', 'Pernas'),
        ('bracos', 'Braços'),
        ('ombros', 'Ombros'),
        ('abdomen', 'Abdômen'),
        ('cardio', 'Cardio'),
    ]
    
    nome = models.CharField('Nome', max_length=100)
    categoria = models.CharField('Categoria', max_length=20, choices=CATEGORIA_CHOICES)
    descricao = models.TextField('Descrição')
    instrucoes = models.TextField('Instruções')
    equipamento = models.CharField('Equipamento', max_length=100, blank=True)
    nivel = models.CharField('Nível', max_length=20, choices=[
        ('iniciante', 'Iniciante'),
        ('intermediario', 'Intermediário'),
        ('avancado', 'Avançado'),
    ])
    imagem = models.ImageField('Imagem', upload_to='exercicios/', blank=True, null=True)
    video_url = models.URLField('URL do Vídeo', blank=True)
    ativo = models.BooleanField('Ativo', default=True)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Exercício'
        verbose_name_plural = 'Exercícios'
        ordering = ['categoria', 'nome']
    
    def __str__(self):
        return f"{self.nome} ({self.categoria})"

class Treino(models.Model):
    """Modelo para treinos dos usuários"""
    
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='treinos')
    nome = models.CharField('Nome', max_length=100)
    descricao = models.TextField('Descrição', blank=True)
    exercicios = models.ManyToManyField(Exercicio, through='TreinoExercicio')
    data_criacao = models.DateTimeField('Data de Criação', auto_now_add=True)
    ativo = models.BooleanField('Ativo', default=True)
    
    class Meta:
        verbose_name = 'Treino'
        verbose_name_plural = 'Treinos'
        ordering = ['-data_criacao']
    
    def __str__(self):
        return f"{self.nome} - {self.usuario}"

class TreinoExercicio(models.Model):
    """Modelo intermediário para exercícios em treinos"""
    
    treino = models.ForeignKey(Treino, on_delete=models.CASCADE)
    exercicio = models.ForeignKey(Exercicio, on_delete=models.CASCADE)
    series = models.IntegerField('Séries', validators=[MinValueValidator(1)])
    repeticoes = models.IntegerField('Repetições', validators=[MinValueValidator(1)])
    peso = models.DecimalField('Peso (kg)', max_digits=5, decimal_places=2, blank=True, null=True)
    tempo_descanso = models.IntegerField('Tempo de Descanso (segundos)', blank=True, null=True)
    observacoes = models.TextField('Observações', blank=True)
    ordem = models.IntegerField('Ordem', default=1)
    
    class Meta:
        verbose_name = 'Exercício do Treino'
        verbose_name_plural = 'Exercícios do Treino'
        ordering = ['ordem']
    
    def __str__(self):
        return f"{self.exercicio.nome} - {self.series}x{self.repeticoes}"

class Avaliacao(models.Model):
    """Modelo para avaliações físicas"""
    
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='avaliacoes')
    data_avaliacao = models.DateField('Data da Avaliação')
    peso = models.DecimalField('Peso (kg)', max_digits=5, decimal_places=2)
    altura = models.DecimalField('Altura (cm)', max_digits=5, decimal_places=2)
    percentual_gordura = models.DecimalField('% Gordura', max_digits=5, decimal_places=2, blank=True, null=True)
    massa_muscular = models.DecimalField('Massa Muscular (kg)', max_digits=5, decimal_places=2, blank=True, null=True)
    imc = models.DecimalField('IMC', max_digits=5, decimal_places=2, blank=True, null=True)
    perimetro_peito = models.DecimalField('Perímetro Peito (cm)', max_digits=5, decimal_places=2, blank=True, null=True)
    perimetro_cintura = models.DecimalField('Perímetro Cintura (cm)', max_digits=5, decimal_places=2, blank=True, null=True)
    perimetro_quadril = models.DecimalField('Perímetro Quadril (cm)', max_digits=5, decimal_places=2, blank=True, null=True)
    perimetro_braco = models.DecimalField('Perímetro Braço (cm)', max_digits=5, decimal_places=2, blank=True, null=True)
    perimetro_coxa = models.DecimalField('Perímetro Coxa (cm)', max_digits=5, decimal_places=2, blank=True, null=True)
    observacoes = models.TextField('Observações', blank=True)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'
        ordering = ['-data_avaliacao']
    
    def save(self, *args, **kwargs):
        # Calcular IMC automaticamente
        if self.peso and self.altura:
            altura_metros = self.altura / 100
            self.imc = self.peso / (altura_metros ** 2)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Avaliação de {self.usuario} - {self.data_avaliacao}"

class Frequencia(models.Model):
    """Modelo para controle de frequência"""
    
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='frequencias')
    data_entrada = models.DateTimeField('Data/Hora de Entrada')
    data_saida = models.DateTimeField('Data/Hora de Saída', blank=True, null=True)
    observacoes = models.TextField('Observações', blank=True)
    
    class Meta:
        verbose_name = 'Frequência'
        verbose_name_plural = 'Frequências'
        ordering = ['-data_entrada']
    
    def __str__(self):
        return f"{self.usuario} - {self.data_entrada.strftime('%d/%m/%Y %H:%M')}"
    
    @property
    def tempo_permanencia(self):
        """Calcula o tempo de permanência na academia"""
        if self.data_saida:
            return self.data_saida - self.data_entrada
        return None

class Pedido(models.Model):
    """Pedido de pagamento atrelado a uma matrícula/plano."""
    METODO_PIX = 'pix'
    METODO_CARTAO = 'cartao'
    METODO_CHOICES = [
        (METODO_PIX, 'PIX'),
        (METODO_CARTAO, 'Cartão de Crédito'),
    ]

    STATUS_PENDENTE = 'pendente'
    STATUS_APROVADO = 'aprovado'
    STATUS_CANCELADO = 'cancelado'
    STATUS_EXPIRADO = 'expirado'
    STATUS_CHOICES = [
        (STATUS_PENDENTE, 'Pendente'),
        (STATUS_APROVADO, 'Aprovado'),
        (STATUS_CANCELADO, 'Cancelado'),
        (STATUS_EXPIRADO, 'Expirado'),
    ]

    id_publico = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    usuario = models.ForeignKey('Usuario', on_delete=models.CASCADE, related_name='pedidos')
    plano = models.ForeignKey('Plano', on_delete=models.PROTECT, related_name='pedidos')
    valor = models.DecimalField(max_digits=8, decimal_places=2)
    metodo = models.CharField(max_length=10, choices=METODO_CHOICES, default=METODO_PIX)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDENTE)
    
    # Campos PIX
    pix_payload = models.TextField(blank=True)
    pix_qr = models.TextField(blank=True)
    
    # Campos Mercado Pago - Pagamentos únicos
    mercado_pago_payment_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    mercado_pago_preference_id = models.CharField(max_length=200, blank=True, null=True, db_index=True, help_text='ID da preferência do Checkout Pro')
    mercado_pago_status = models.CharField(max_length=50, blank=True)
    mercado_pago_status_detail = models.CharField(max_length=100, blank=True)
    
    # Campos Mercado Pago - Assinaturas
    mercado_pago_subscription_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    mercado_pago_subscription_status = models.CharField(max_length=50, blank=True)
    is_subscription = models.BooleanField('É Assinatura', default=False)
    subscription_start_date = models.DateField('Data de Início da Assinatura', null=True, blank=True)
    subscription_end_date = models.DateField('Data de Fim da Assinatura', null=True, blank=True)
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return f"Pedido {self.id_publico} - {self.usuario} - {self.plano} - {self.status}"

class Torneio(models.Model):
    """Modelo para torneios/competições internas da academia"""
    
    STATUS_CHOICES = [
        ('inscricoes_abertas', 'Inscrições Abertas'),
        ('em_andamento', 'Em Andamento'),
        ('finalizado', 'Finalizado'),
        ('cancelado', 'Cancelado'),
    ]
    
    nome = models.CharField('Nome do Torneio', max_length=200)
    descricao = models.TextField('Descrição')
    data_inicio_inscricoes = models.DateTimeField('Data de Início das Inscrições')
    data_fim_inscricoes = models.DateTimeField('Data de Fim das Inscrições')
    data_inicio = models.DateTimeField('Data de Início do Torneio')
    data_fim = models.DateTimeField('Data de Fim do Torneio', blank=True, null=True)
    status = models.CharField('Status', max_length=20, choices=STATUS_CHOICES, default='inscricoes_abertas')
    max_participantes = models.IntegerField('Máximo de Participantes', default=16)
    regras = models.TextField('Regras do Torneio', blank=True)
    premio = models.TextField('Prêmio', blank=True)
    criado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='torneios_criados')
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'Torneio'
        verbose_name_plural = 'Torneios'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.nome} - {self.get_status_display()}"
    
    @property
    def total_participantes(self):
        return self.participantes.filter(ativo=True).count()
    
    @property
    def vagas_disponiveis(self):
        return max(0, self.max_participantes - self.total_participantes)

class ParticipanteTorneio(models.Model):
    """Modelo para participantes de um torneio"""
    
    torneio = models.ForeignKey(Torneio, on_delete=models.CASCADE, related_name='participantes')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='participacoes_torneios')
    data_inscricao = models.DateTimeField('Data de Inscrição', auto_now_add=True)
    ativo = models.BooleanField('Ativo', default=True)
    eliminado = models.BooleanField('Eliminado', default=False)
    posicao_final = models.IntegerField('Posição Final', blank=True, null=True)
    observacoes = models.TextField('Observações', blank=True)
    
    class Meta:
        verbose_name = 'Participante do Torneio'
        verbose_name_plural = 'Participantes do Torneio'
        unique_together = ['torneio', 'usuario']
        ordering = ['data_inscricao']
    
    def __str__(self):
        return f"{self.usuario} - {self.torneio}"

class FaseTorneio(models.Model):
    """Modelo para fases do torneio (oitavas, quartas, semis, final)"""
    
    TIPO_FASE_CHOICES = [
        ('oitavas', 'Oitavas de Final'),
        ('quartas', 'Quartas de Final'),
        ('semis', 'Semi-Final'),
        ('final', 'Final'),
        ('terceiro_lugar', 'Disputa de 3º Lugar'),
    ]
    
    torneio = models.ForeignKey(Torneio, on_delete=models.CASCADE, related_name='fases')
    tipo_fase = models.CharField('Tipo de Fase', max_length=20, choices=TIPO_FASE_CHOICES)
    numero_fase = models.IntegerField('Número da Fase', default=1)
    data_inicio = models.DateTimeField('Data de Início', blank=True, null=True)
    data_fim = models.DateTimeField('Data de Fim', blank=True, null=True)
    concluida = models.BooleanField('Concluída', default=False)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Fase do Torneio'
        verbose_name_plural = 'Fases do Torneio'
        ordering = ['torneio', 'numero_fase']
        unique_together = ['torneio', 'tipo_fase']
    
    def __str__(self):
        return f"{self.torneio} - {self.get_tipo_fase_display()}"

class ExercicioFase(models.Model):
    """Modelo para exercícios de cada fase do torneio"""
    
    fase = models.ForeignKey(FaseTorneio, on_delete=models.CASCADE, related_name='exercicios')
    exercicio = models.ForeignKey(Exercicio, on_delete=models.CASCADE, related_name='fases_torneio')
    ordem = models.IntegerField('Ordem', default=1)
    series = models.IntegerField('Séries', validators=[MinValueValidator(1)], default=3)
    repeticoes = models.IntegerField('Repetições', validators=[MinValueValidator(1)], default=10)
    peso_minimo = models.DecimalField('Peso Mínimo (kg)', max_digits=5, decimal_places=2, blank=True, null=True)
    peso_maximo = models.DecimalField('Peso Máximo (kg)', max_digits=5, decimal_places=2, blank=True, null=True)
    tempo_limite = models.IntegerField('Tempo Limite (segundos)', blank=True, null=True)
    criterio_vitoria = models.CharField('Critério de Vitória', max_length=100, blank=True, 
                                       help_text='Ex: Maior número de repetições, Menor tempo, etc.')
    pontos = models.IntegerField('Pontos', default=1, help_text='Pontos que este exercício vale na fase')
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Exercício da Fase'
        verbose_name_plural = 'Exercícios da Fase'
        ordering = ['fase', 'ordem']
    
    def __str__(self):
        return f"{self.fase} - {self.exercicio.nome}"

class Chave(models.Model):
    """Modelo para chaves/partidas do torneio"""
    
    fase = models.ForeignKey(FaseTorneio, on_delete=models.CASCADE, related_name='chaves')
    participante1 = models.ForeignKey(ParticipanteTorneio, on_delete=models.CASCADE, 
                                       related_name='chaves_como_participante1', blank=True, null=True)
    participante2 = models.ForeignKey(ParticipanteTorneio, on_delete=models.CASCADE, 
                                      related_name='chaves_como_participante2', blank=True, null=True)
    numero_chave = models.IntegerField('Número da Chave', default=1)
    vencedor = models.ForeignKey(ParticipanteTorneio, on_delete=models.SET_NULL, 
                                related_name='chaves_vencidas', blank=True, null=True)
    data_partida = models.DateTimeField('Data da Partida', blank=True, null=True)
    concluida = models.BooleanField('Concluída', default=False)
    observacoes = models.TextField('Observações', blank=True)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'Chave'
        verbose_name_plural = 'Chaves'
        ordering = ['fase', 'numero_chave']
    
    def __str__(self):
        p1_nome = 'Aguardando'
        p2_nome = 'Aguardando'
        try:
            if self.participante1:
                p1_nome = str(self.participante1.usuario) if hasattr(self.participante1, 'usuario') else 'Participante 1'
            if self.participante2:
                p2_nome = str(self.participante2.usuario) if hasattr(self.participante2, 'usuario') else 'Participante 2'
        except:
            pass
        return f"Chave {self.numero_chave}: {p1_nome} vs {p2_nome}"
    
    @property
    def tem_dois_participantes(self):
        return self.participante1 is not None and self.participante2 is not None

class ResultadoPartida(models.Model):
    """Modelo para resultados das partidas do torneio"""
    
    chave = models.OneToOneField(Chave, on_delete=models.CASCADE, related_name='resultado')
    participante1_pontos = models.IntegerField('Pontos Participante 1', default=0)
    participante2_pontos = models.IntegerField('Pontos Participante 2', default=0)
    vencedor = models.ForeignKey(ParticipanteTorneio, on_delete=models.SET_NULL, 
                                related_name='resultados_vencedor', blank=True, null=True)
    detalhes = models.JSONField('Detalhes do Resultado', default=dict, 
                               help_text='Detalhes dos exercícios realizados por cada participante')
    observacoes = models.TextField('Observações', blank=True)
    registrado_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, 
                                      related_name='resultados_registrados')
    data_registro = models.DateTimeField('Data de Registro', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Resultado da Partida'
        verbose_name_plural = 'Resultados das Partidas'
    
    def __str__(self):
        vencedor_nome = 'Não definido'
        try:
            if self.vencedor and hasattr(self.vencedor, 'usuario'):
                vencedor_nome = str(self.vencedor.usuario)
        except:
            pass
        return f"Resultado: Chave {self.chave.numero_chave if hasattr(self.chave, 'numero_chave') else 'N/A'} - Vencedor: {vencedor_nome}"
    
    def save(self, *args, **kwargs):
        # Atualizar o vencedor na chave quando salvar o resultado
        super().save(*args, **kwargs)
        if self.vencedor:
            self.chave.vencedor = self.vencedor
            self.chave.concluida = True
            self.chave.save()
            
            # Marcar o perdedor como eliminado
            if self.chave.participante1 == self.vencedor:
                perdedor = self.chave.participante2
            else:
                perdedor = self.chave.participante1
            
            if perdedor:
                perdedor.eliminado = True
                perdedor.save()