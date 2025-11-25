#!/usr/bin/env python
"""
Script para atualizar URLs de vídeos dos exercícios
Execute este script para adicionar vídeos de demonstração aos exercícios
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academia_project.settings')
django.setup()

from academia.models import Exercicio

def update_exercise_videos():
    """Atualiza os vídeos dos exercícios"""
    
    print("🎬 Atualizando vídeos dos exercícios...")
    
    # Dicionário de exercícios e seus vídeos
    # Adicione mais exercícios conforme necessário
    videos = {
        'Supino Reto': 'https://youtu.be/EZMYCLKuGow?si=0XcDZcH0AJqKfZNJ',
        # Adicione mais exercícios aqui no formato:
        # 'Nome do Exercício': 'URL do vídeo',
    }
    
    updated_count = 0
    not_found = []
    
    for nome_exercicio, video_url in videos.items():
        try:
            exercicio = Exercicio.objects.get(nome=nome_exercicio)
            exercicio.video_url = video_url
            exercicio.save()
            print(f"✅ {nome_exercicio}: vídeo atualizado")
            updated_count += 1
        except Exercicio.DoesNotExist:
            print(f"❌ {nome_exercicio}: exercício não encontrado")
            not_found.append(nome_exercicio)
    
    print(f"\n📊 Resumo:")
    print(f"   - Atualizados: {updated_count}")
    print(f"   - Não encontrados: {len(not_found)}")
    
    if not_found:
        print(f"\n⚠️  Exercícios não encontrados: {', '.join(not_found)}")
    
    print("\n✅ Processo concluído!")

if __name__ == '__main__':
    update_exercise_videos()

