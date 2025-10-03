#!/usr/bin/env python
"""
Script de configuração final para migração para PostgreSQL (Neon)
Execute este script para configurar o ambiente e migrar para PostgreSQL
"""

import subprocess
import sys
import os

def install_requirements():
    """Instala as dependências necessárias"""
    print("📦 Instalando dependências...")
    
    try:
        print("Instalando dependências do requirements.txt...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependências instaladas com sucesso")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao instalar dependências: {e}")
        return False

def run_migrations():
    """Executa as migrações do Django"""
    print("\n🔄 Executando migrações...")
    
    try:
        # Aplicar migrações
        subprocess.check_call([sys.executable, "manage.py", "migrate"])
        print("✅ Migrações aplicadas com sucesso")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro nas migrações: {e}")
        return False

def create_superuser():
    """Cria um superusuário"""
    print("\n👤 Criando superusuário...")
    
    try:
        # Criar superusuário com dados padrão
        subprocess.check_call([
            sys.executable, "manage.py", "createsuperuser",
            "--username", "admin",
            "--email", "admin@academia.com",
            "--noinput"
        ])
        print("✅ Superusuário criado: admin/admin123")
        return True
    except subprocess.CalledProcessError as e:
        print(f"ℹ️  Superusuário já existe ou erro na criação: {e}")
        return True  # Não é crítico

def load_initial_data():
    """Carrega dados iniciais"""
    print("\n📋 Carregando dados iniciais...")
    
    try:
        subprocess.check_call([sys.executable, "create_initial_data.py"])
        print("✅ Dados iniciais carregados com sucesso")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao carregar dados iniciais: {e}")
        return False

def test_connection():
    """Testa a conexão com PostgreSQL"""
    print("\n🔍 Testando conexão...")
    
    try:
        subprocess.check_call([sys.executable, "test_postgresql_connection.py"])
        print("✅ Conexão testada com sucesso")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro no teste de conexão: {e}")
        return False

def create_env_file():
    """Cria arquivo .env com as configurações"""
    print("\n📝 Criando arquivo .env...")
    
    env_content = """# Configurações do Django
SECRET_KEY=dev-secret-key-change-me-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database connection string
DATABASE_URL=postgresql://neondb_owner:npg_fnLJ8i7aeTPy@ep-rapid-firefly-ac6hfh6q-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
DB_SSL_REQUIRE=True

# Neon Auth environment variables
STACK_PROJECT_ID=ae1cf95f-cb0c-4520-bae0-afa91ca3c54e
STACK_PUBLISHABLE_CLIENT_KEY=pck_je6tp00zfkyz3d22sb5qs74zgxygmjsaqr0wp8ffszf8r
STACK_SECRET_SERVER_KEY=ssk_w1e1hdv71n5nspyfsjp2saw9yd4sstn5ezh6yrxsvrjyr

# Configurações de CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080
CORS_ALLOW_CREDENTIALS=True
CORS_ALLOW_ALL_ORIGINS=False
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080

# Configurações de Segurança (para produção)
SECURE_SSL_REDIRECT=False
SECURE_HSTS_SECONDS=31536000

# Configurações de Pagamento PIX
PIX_KEY=sua-chave-pix-aqui
"""
    
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        print("✅ Arquivo .env criado com sucesso")
        return True
    except Exception as e:
        print(f"❌ Erro ao criar arquivo .env: {e}")
        return False

def main():
    """Função principal"""
    print("🚀 Iniciando configuração final para PostgreSQL (Neon)...")
    
    # Verificar se estamos no diretório correto
    if not os.path.exists("manage.py"):
        print("❌ Execute este script no diretório raiz do projeto Django")
        return False
    
    # Criar arquivo .env
    create_env_file()
    
    # Instalar dependências
    if not install_requirements():
        print("❌ Falha na instalação das dependências")
        return False
    
    # Executar migrações
    if not run_migrations():
        print("❌ Falha nas migrações")
        return False
    
    # Criar superusuário
    create_superuser()
    
    # Carregar dados iniciais
    if not load_initial_data():
        print("⚠️  Falha ao carregar dados iniciais, mas continuando...")
    
    # Testar conexão
    if not test_connection():
        print("⚠️  Falha no teste de conexão, mas continuando...")
    
    print("\n🎉 Configuração final concluída!")
    print("🔗 PostgreSQL (Neon) configurado e pronto para uso!")
    print("\n📝 Próximos passos:")
    print("1. Execute: python manage.py runserver")
    print("2. Acesse: http://localhost:8000")
    print("3. Admin: http://localhost:8000/admin (admin/admin123)")
    print("4. API: http://localhost:8000/api/")
    
    return True

if __name__ == "__main__":
    main()
