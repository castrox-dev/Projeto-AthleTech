from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Usuario, Plano, Matricula, Exercicio, Treino, TreinoExercicio, 
    Avaliacao, Frequencia, Pedido, Torneio, ParticipanteTorneio, 
    FaseTorneio, ExercicioFase, Chave, ResultadoPartida
)

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    """Admin para o modelo Usuario customizado"""
    
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active_member', 'is_staff']
    list_filter = ['role', 'is_active_member', 'is_staff', 'is_active', 'gender', 'created_at']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering = ['-created_at']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Permissões da Academia', {
            'fields': ('role', 'is_active_member')
        }),
        ('Contato e Perfil', {
            'fields': ('phone', 'birth_date', 'gender')
        }),
        ('Datas', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Permissões da Academia', {
            'fields': ('role',)
        }),
        ('Contato e Perfil', {
            'fields': ('phone', 'birth_date', 'gender')
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if not request.user.is_superuser:
            readonly.append('role')
        return readonly

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if not request.user.is_superuser and 'role' in form.base_fields:
            form.base_fields['role'].disabled = True
        return form

@admin.register(Plano)
class PlanoAdmin(admin.ModelAdmin):
    """Admin para o modelo Plano"""
    
    list_display = ['nome', 'preco', 'duracao_dias', 'ativo', 'created_at']
    list_filter = ['ativo', 'created_at']
    search_fields = ['nome', 'descricao']
    ordering = ['preco']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'descricao', 'preco', 'duracao_dias', 'ativo')
        }),
        ('Benefícios', {
            'fields': ('beneficios',)
        }),
        ('Datas', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(Matricula)
class MatriculaAdmin(admin.ModelAdmin):
    """Admin para o modelo Matricula"""
    
    list_display = ['usuario', 'plano', 'status', 'data_inicio', 'data_fim', 'valor_pago']
    list_filter = ['status', 'data_inicio', 'data_fim', 'plano']
    search_fields = ['usuario__username', 'usuario__email', 'plano__nome']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informações da Matrícula', {
            'fields': ('usuario', 'plano', 'status')
        }),
        ('Período', {
            'fields': ('data_inicio', 'data_fim')
        }),
        ('Financeiro', {
            'fields': ('valor_pago',)
        }),
        ('Datas', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(Exercicio)
class ExercicioAdmin(admin.ModelAdmin):
    """Admin para o modelo Exercicio"""
    
    list_display = ['nome', 'categoria', 'nivel', 'equipamento', 'ativo']
    list_filter = ['categoria', 'nivel', 'ativo', 'created_at']
    search_fields = ['nome', 'descricao', 'equipamento']
    ordering = ['categoria', 'nome']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'categoria', 'nivel', 'ativo')
        }),
        ('Descrição', {
            'fields': ('descricao', 'instrucoes', 'equipamento')
        }),
        ('Mídia', {
            'fields': ('imagem', 'video_url')
        }),
        ('Data', {
            'fields': ('created_at',)
        }),
    )

class TreinoExercicioInline(admin.TabularInline):
    """Inline para exercícios em treinos"""
    
    model = TreinoExercicio
    extra = 1
    fields = ['exercicio', 'series', 'repeticoes', 'peso', 'tempo_descanso', 'ordem']
    ordering = ['ordem']

@admin.register(Treino)
class TreinoAdmin(admin.ModelAdmin):
    """Admin para o modelo Treino"""
    
    list_display = ['nome', 'usuario', 'ativo', 'data_criacao']
    list_filter = ['ativo', 'data_criacao', 'usuario']
    search_fields = ['nome', 'descricao', 'usuario__username']
    ordering = ['-data_criacao']
    readonly_fields = ['data_criacao']
    inlines = [TreinoExercicioInline]
    
    fieldsets = (
        ('Informações do Treino', {
            'fields': ('usuario', 'nome', 'descricao', 'ativo')
        }),
        ('Data', {
            'fields': ('data_criacao',)
        }),
    )

@admin.register(Avaliacao)
class AvaliacaoAdmin(admin.ModelAdmin):
    """Admin para o modelo Avaliacao"""
    
    list_display = ['usuario', 'data_avaliacao', 'peso', 'altura', 'imc', 'percentual_gordura']
    list_filter = ['data_avaliacao', 'created_at']
    search_fields = ['usuario__username', 'usuario__email']
    ordering = ['-data_avaliacao']
    readonly_fields = ['created_at', 'imc']
    
    fieldsets = (
        ('Informações da Avaliação', {
            'fields': ('usuario', 'data_avaliacao')
        }),
        ('Medidas Básicas', {
            'fields': ('peso', 'altura', 'imc')
        }),
        ('Composição Corporal', {
            'fields': ('percentual_gordura', 'massa_muscular')
        }),
        ('Observações', {
            'fields': ('observacoes',)
        }),
        ('Data', {
            'fields': ('created_at',)
        }),
    )

@admin.register(Frequencia)
class FrequenciaAdmin(admin.ModelAdmin):
    """Admin para o modelo Frequencia"""
    
    list_display = ['usuario', 'data_entrada', 'data_saida', 'tempo_permanencia_display']
    list_filter = ['data_entrada', 'data_saida']
    search_fields = ['usuario__username', 'usuario__email']
    ordering = ['-data_entrada']
    
    def tempo_permanencia_display(self, obj):
        """Exibe o tempo de permanência formatado"""
        tempo = obj.tempo_permanencia
        if tempo:
            total_seconds = int(tempo.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            return f"{hours}h {minutes}min"
        return "Em andamento"
    
    tempo_permanencia_display.short_description = "Tempo de Permanência"
    
    fieldsets = (
        ('Informações da Frequência', {
            'fields': ('usuario', 'data_entrada', 'data_saida')
        }),
        ('Observações', {
            'fields': ('observacoes',)
        }),
    )

# Customizar o título do admin
admin.site.site_header = "Academia AthleTech  - Administração"
admin.site.site_title = "Academia Admin"
admin.site.index_title = "Painel de Administração"

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ['id_publico', 'usuario', 'plano', 'valor', 'metodo', 'status', 'criado_em']
    list_filter = ['status', 'metodo', 'criado_em']
    search_fields = ['usuario__email', 'usuario__username', 'plano__nome', 'id_publico']
    readonly_fields = ['id_publico', 'criado_em', 'atualizado_em', 'pix_payload', 'pix_qr']

class ExercicioFaseInline(admin.TabularInline):
    """Inline para exercícios de uma fase"""
    model = ExercicioFase
    extra = 1
    fields = ['exercicio', 'ordem', 'series', 'repeticoes', 'pontos', 'criterio_vitoria']
    ordering = ['ordem']

class ChaveInline(admin.TabularInline):
    """Inline para chaves de uma fase"""
    model = Chave
    extra = 0
    fields = ['numero_chave', 'participante1', 'participante2', 'vencedor', 'concluida', 'data_partida']
    readonly_fields = ['vencedor']

@admin.register(Torneio)
class TorneioAdmin(admin.ModelAdmin):
    """Admin para o modelo Torneio"""
    list_display = ['nome', 'status', 'data_inicio', 'max_participantes', 'total_participantes', 'criado_por', 'created_at']
    list_filter = ['status', 'data_inicio', 'created_at']
    search_fields = ['nome', 'descricao']
    readonly_fields = ['created_at', 'updated_at', 'total_participantes', 'vagas_disponiveis']
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('nome', 'descricao', 'status', 'criado_por')
        }),
        ('Período de Inscrições', {
            'fields': ('data_inicio_inscricoes', 'data_fim_inscricoes')
        }),
        ('Período do Torneio', {
            'fields': ('data_inicio', 'data_fim')
        }),
        ('Configurações', {
            'fields': ('max_participantes', 'total_participantes', 'vagas_disponiveis')
        }),
        ('Detalhes', {
            'fields': ('regras', 'premio')
        }),
        ('Datas', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(ParticipanteTorneio)
class ParticipanteTorneioAdmin(admin.ModelAdmin):
    """Admin para o modelo ParticipanteTorneio"""
    list_display = ['usuario', 'torneio', 'data_inscricao', 'ativo', 'eliminado', 'posicao_final']
    list_filter = ['ativo', 'eliminado', 'data_inscricao', 'torneio']
    search_fields = ['usuario__username', 'usuario__email', 'torneio__nome']
    ordering = ['torneio', 'data_inscricao']

@admin.register(FaseTorneio)
class FaseTorneioAdmin(admin.ModelAdmin):
    """Admin para o modelo FaseTorneio"""
    list_display = ['torneio', 'tipo_fase', 'numero_fase', 'concluida', 'data_inicio', 'data_fim']
    list_filter = ['tipo_fase', 'concluida', 'torneio']
    search_fields = ['torneio__nome']
    inlines = [ExercicioFaseInline, ChaveInline]
    ordering = ['torneio', 'numero_fase']

@admin.register(ExercicioFase)
class ExercicioFaseAdmin(admin.ModelAdmin):
    """Admin para o modelo ExercicioFase"""
    list_display = ['fase', 'exercicio', 'ordem', 'series', 'repeticoes', 'pontos']
    list_filter = ['fase__torneio', 'fase__tipo_fase']
    search_fields = ['exercicio__nome', 'fase__torneio__nome']
    ordering = ['fase', 'ordem']

@admin.register(Chave)
class ChaveAdmin(admin.ModelAdmin):
    """Admin para o modelo Chave"""
    list_display = ['fase', 'numero_chave', 'participante1', 'participante2', 'vencedor', 'concluida', 'data_partida']
    list_filter = ['concluida', 'fase__torneio', 'fase__tipo_fase']
    search_fields = ['participante1__usuario__username', 'participante2__usuario__username', 'fase__torneio__nome']
    ordering = ['fase', 'numero_chave']

@admin.register(ResultadoPartida)
class ResultadoPartidaAdmin(admin.ModelAdmin):
    """Admin para o modelo ResultadoPartida"""
    list_display = ['chave', 'participante1_pontos', 'participante2_pontos', 'vencedor', 'registrado_por', 'data_registro']
    list_filter = ['data_registro', 'chave__fase__torneio']
    search_fields = ['chave__participante1__usuario__username', 'chave__participante2__usuario__username']
    readonly_fields = ['data_registro']
    ordering = ['-data_registro']
