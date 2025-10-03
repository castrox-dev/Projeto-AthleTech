#!/usr/bin/env python
"""
Script para criar dados iniciais no banco PostgreSQL
Execute este script após a migração para popular o banco com dados de exemplo
"""

import os
import sys
import django
from django.conf import settings
from decimal import Decimal
from datetime import date, timedelta

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academia_project.settings')
django.setup()

from academia.models import Usuario, Plano, Exercicio, Treino, TreinoExercicio

def create_initial_data():
    """Cria dados iniciais para o sistema da academia"""
    
    print("🚀 Criando dados iniciais...")
    
    # 1. Criar planos
    print("📋 Criando planos...")
    planos_data = [
        {
            'nome': 'Plano Básico',
            'descricao': 'Acesso à academia nos horários de funcionamento',
            'preco': Decimal('89.90'),
            'duracao_dias': 30,
            'beneficios': ['Acesso à academia', 'Uso de equipamentos básicos', 'Avaliação física mensal']
        },
        {
            'nome': 'Plano Premium',
            'descricao': 'Acesso completo com personal trainer',
            'preco': Decimal('149.90'),
            'duracao_dias': 30,
            'beneficios': ['Acesso à academia', 'Uso de todos os equipamentos', 'Personal trainer', 'Avaliação física semanal', 'Acesso a aulas especiais']
        },
        {
            'nome': 'Plano VIP',
            'descricao': 'Acesso 24h com todos os benefícios',
            'preco': Decimal('199.90'),
            'duracao_dias': 30,
            'beneficios': ['Acesso 24h', 'Uso de todos os equipamentos', 'Personal trainer dedicado', 'Avaliação física semanal', 'Acesso a todas as aulas', 'Suplementação inclusa']
        }
    ]
    
    for plano_data in planos_data:
        plano, created = Plano.objects.get_or_create(
            nome=plano_data['nome'],
            defaults=plano_data
        )
        if created:
            print(f"✅ Plano criado: {plano.nome}")
        else:
            print(f"ℹ️  Plano já existe: {plano.nome}")
    
    # 2. Criar exercícios
    print("💪 Criando exercícios...")
    exercicios_data = [
        # Peito
        {'nome': 'Supino Reto', 'categoria': 'peito', 'descricao': 'Exercício para desenvolvimento do peitoral', 'instrucoes': 'Deite no banco, segure a barra com pegada média e empurre para cima', 'equipamento': 'Barra e banco', 'nivel': 'iniciante'},
        {'nome': 'Supino Inclinado', 'categoria': 'peito', 'descricao': 'Exercício para parte superior do peitoral', 'instrucoes': 'Deite no banco inclinado e execute o movimento', 'equipamento': 'Barra e banco inclinado', 'nivel': 'intermediario'},
        {'nome': 'Flexão de Braço', 'categoria': 'peito', 'descricao': 'Exercício funcional para peitoral', 'instrucoes': 'Apoie as mãos no chão e empurre o corpo para cima', 'equipamento': 'Nenhum', 'nivel': 'iniciante'},
        
        # Costas
        {'nome': 'Puxada Frontal', 'categoria': 'costas', 'descricao': 'Exercício para desenvolvimento das costas', 'instrucoes': 'Puxe a barra em direção ao peito', 'equipamento': 'Pulley', 'nivel': 'iniciante'},
        {'nome': 'Remada Curvada', 'categoria': 'costas', 'descricao': 'Exercício para espessura das costas', 'instrucoes': 'Incline o tronco e puxe a barra em direção ao abdômen', 'equipamento': 'Barra', 'nivel': 'intermediario'},
        {'nome': 'Puxada Alta', 'categoria': 'costas', 'descricao': 'Exercício para largura das costas', 'instrucoes': 'Puxe a barra atrás da nuca', 'equipamento': 'Pulley', 'nivel': 'avancado'},
        
        # Pernas
        {'nome': 'Agachamento', 'categoria': 'pernas', 'descricao': 'Exercício fundamental para pernas', 'instrucoes': 'Desça flexionando os joelhos e quadris', 'equipamento': 'Barra', 'nivel': 'iniciante'},
        {'nome': 'Leg Press', 'categoria': 'pernas', 'descricao': 'Exercício para quadríceps', 'instrucoes': 'Empurre a plataforma com as pernas', 'equipamento': 'Leg Press', 'nivel': 'iniciante'},
        {'nome': 'Stiff', 'categoria': 'pernas', 'descricao': 'Exercício para posterior de coxa', 'instrucoes': 'Mantenha as pernas estendidas e flexione o tronco', 'equipamento': 'Barra', 'nivel': 'intermediario'},
        
        # Braços
        {'nome': 'Rosca Bíceps', 'categoria': 'bracos', 'descricao': 'Exercício para bíceps', 'instrucoes': 'Flexione os cotovelos elevando a barra', 'equipamento': 'Barra ou halteres', 'nivel': 'iniciante'},
        {'nome': 'Tríceps Pulley', 'categoria': 'bracos', 'descricao': 'Exercício para tríceps', 'instrucoes': 'Estenda os cotovelos empurrando a barra para baixo', 'equipamento': 'Pulley', 'nivel': 'iniciante'},
        {'nome': 'Martelo', 'categoria': 'bracos', 'descricao': 'Exercício para antebraços', 'instrucoes': 'Execute a rosca com pegada neutra', 'equipamento': 'Halteres', 'nivel': 'intermediario'},
        
        # Ombros
        {'nome': 'Desenvolvimento', 'categoria': 'ombros', 'descricao': 'Exercício para deltoides', 'instrucoes': 'Empurre a barra para cima acima da cabeça', 'equipamento': 'Barra ou halteres', 'nivel': 'iniciante'},
        {'nome': 'Elevação Lateral', 'categoria': 'ombros', 'descricao': 'Exercício para deltoides laterais', 'instrucoes': 'Eleve os halteres lateralmente', 'equipamento': 'Halteres', 'nivel': 'iniciante'},
        {'nome': 'Elevação Frontal', 'categoria': 'ombros', 'descricao': 'Exercício para deltoides anteriores', 'instrucoes': 'Eleve a barra à frente do corpo', 'equipamento': 'Barra', 'nivel': 'iniciante'},
        
        # Abdômen
        {'nome': 'Abdominal Supra', 'categoria': 'abdomen', 'descricao': 'Exercício para reto abdominal', 'instrucoes': 'Deite e eleve o tronco', 'equipamento': 'Nenhum', 'nivel': 'iniciante'},
        {'nome': 'Prancha', 'categoria': 'abdomen', 'descricao': 'Exercício isométrico para core', 'instrucoes': 'Mantenha posição de flexão apoiado nos antebraços', 'equipamento': 'Nenhum', 'nivel': 'iniciante'},
        {'nome': 'Abdominal Infra', 'categoria': 'abdomen', 'descricao': 'Exercício para parte inferior do abdômen', 'instrucoes': 'Eleve as pernas mantendo o tronco fixo', 'equipamento': 'Nenhum', 'nivel': 'intermediario'},
        
        # Cardio
        {'nome': 'Esteira', 'categoria': 'cardio', 'descricao': 'Exercício cardiovascular', 'instrucoes': 'Caminhe ou corra na esteira', 'equipamento': 'Esteira', 'nivel': 'iniciante'},
        {'nome': 'Bicicleta Ergométrica', 'categoria': 'cardio', 'descricao': 'Exercício cardiovascular de baixo impacto', 'instrucoes': 'Pedale na bicicleta ergométrica', 'equipamento': 'Bicicleta Ergométrica', 'nivel': 'iniciante'},
        {'nome': 'Elíptico', 'categoria': 'cardio', 'descricao': 'Exercício cardiovascular completo', 'instrucoes': 'Use o equipamento elíptico', 'equipamento': 'Elíptico', 'nivel': 'iniciante'},
    ]
    
    for exercicio_data in exercicios_data:
        exercicio, created = Exercicio.objects.get_or_create(
            nome=exercicio_data['nome'],
            defaults=exercicio_data
        )
        if created:
            print(f"✅ Exercício criado: {exercicio.nome}")
        else:
            print(f"ℹ️  Exercício já existe: {exercicio.nome}")
    
    # 3. Criar usuário de exemplo
    print("👤 Criando usuário de exemplo...")
    try:
        usuario_exemplo = Usuario.objects.create_user(
            username='usuario.teste',
            email='usuario@teste.com',
            password='123456',
            first_name='Usuário',
            last_name='Teste',
            phone='11999999999',
            birth_date=date(1990, 1, 1),
            gender='male',
            is_active_member=True
        )
        print("✅ Usuário de exemplo criado: usuario@teste.com / 123456")
    except:
        print("ℹ️  Usuário de exemplo já existe")
    
    print("✅ Dados iniciais criados com sucesso!")
    print("🎯 Sistema pronto para uso!")

if __name__ == '__main__':
    create_initial_data()
