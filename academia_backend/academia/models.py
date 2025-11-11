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
        if self.is_superuser or self.role == self.Role.ADMIN:
            return 'portal_admin_dashboard'
        if self.role == self.Role.PROFESSOR:
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
    """Pedido de pagamento (PIX) atrelado a uma matrícula/plano."""
    METODO_PIX = 'pix'
    METODO_CHOICES = [
        (METODO_PIX, 'PIX'),
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
    pix_payload = models.TextField(blank=True)
    pix_qr = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-criado_em']

    def __str__(self):
        return f"Pedido {self.id_publico} - {self.usuario} - {self.plano} - {self.status}"
