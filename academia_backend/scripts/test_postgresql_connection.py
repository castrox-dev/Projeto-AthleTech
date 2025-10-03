#!/usr/bin/env python
"""
Script para testar a conexão com PostgreSQL (Neon)
Execute este script para verificar se a conexão está funcionando
"""

import os
import sys
import django
from django.conf import settings
from django.db import connection
from django.core.management import execute_from_command_line

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academia_project.settings')
django.setup()

def test_postgresql_connection():
    """Testa a conexão com PostgreSQL"""
    
    print("🔍 Testando conexão com PostgreSQL (Neon)...")
    
    try:
        # Testar conexão básica
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"✅ Conexão estabelecida com sucesso!")
            print(f"📊 Versão do PostgreSQL: {version[0]}")
        
        # Testar se as tabelas existem
        print("\n🔍 Verificando tabelas...")
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = cursor.fetchall()
            
            if tables:
                print("✅ Tabelas encontradas:")
                for table in tables:
                    print(f"  - {table[0]}")
            else:
                print("⚠️  Nenhuma tabela encontrada. Execute as migrações primeiro.")
        
        # Testar operações básicas
        print("\n🧪 Testando operações básicas...")
        from academia.models import Usuario, Plano, Exercicio
        
        # Contar registros
        usuarios_count = Usuario.objects.count()
        planos_count = Plano.objects.count()
        exercicios_count = Exercicio.objects.count()
        
        print(f"📊 Estatísticas do banco:")
        print(f"  - Usuários: {usuarios_count}")
        print(f"  - Planos: {planos_count}")
        print(f"  - Exercícios: {exercicios_count}")
        
        print("\n✅ Teste de conexão concluído com sucesso!")
        print("🎯 PostgreSQL (Neon) está funcionando perfeitamente!")
        
    except Exception as e:
        print(f"❌ Erro na conexão: {e}")
        print("🔧 Verifique as configurações no settings.py")
        return False
    
    return True

def run_migrations():
    """Executa as migrações se necessário"""
    
    print("\n🔄 Verificando migrações...")
    
    try:
        # Verificar se há migrações pendentes
        execute_from_command_line(['manage.py', 'showmigrations'])
        
        # Aplicar migrações
        print("\n📊 Aplicando migrações...")
        execute_from_command_line(['manage.py', 'migrate'])
        
        print("✅ Migrações aplicadas com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro nas migrações: {e}")

if __name__ == '__main__':
    print("🚀 Iniciando teste de conexão PostgreSQL...")
    
    # Testar conexão
    if test_postgresql_connection():
        print("\n🎉 Sistema pronto para uso!")
    else:
        print("\n💡 Execute as migrações primeiro:")
        print("   python manage.py migrate")
        print("   python create_initial_data.py")
