# Migração para PostgreSQL (Neon)

Este documento contém as instruções para migrar o projeto da academia do SQLite para PostgreSQL usando o Neon.

## 🚀 Passos para Migração

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes configurações:

```env
# Configurações do Django
SECRET_KEY=dev-secret-key-change-me-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Configurações do Banco de Dados PostgreSQL (Neon)
DATABASE_URL=postgresql://neondb_owner:npg_fnLJ8i7aeTPy@ep-rapid-firefly-ac6hfh6q-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
DB_SSL_REQUIRE=True

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
```

### 3. Executar Migrações

```bash
# Aplicar migrações no PostgreSQL
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser
```

### 4. Popular com Dados Iniciais

```bash
# Executar script para criar dados iniciais
python create_initial_data.py
```

### 5. Testar Conexão

```bash
# Testar conexão com PostgreSQL
python test_postgresql_connection.py
```

## 🔧 Scripts Disponíveis

### `migrate_to_postgresql.py`
Script automatizado para migração completa do SQLite para PostgreSQL.

### `create_initial_data.py`
Script para popular o banco com dados iniciais (planos, exercícios, usuário de teste).

### `test_postgresql_connection.py`
Script para testar a conexão e verificar se tudo está funcionando.

## 📊 Estrutura do Banco

O banco PostgreSQL será criado com as seguintes tabelas:

- **academia_usuario** - Usuários do sistema
- **academia_plano** - Planos de academia
- **academia_matricula** - Matrículas dos usuários
- **academia_exercicio** - Exercícios disponíveis
- **academia_treino** - Treinos dos usuários
- **academia_treinoexercicio** - Relacionamento treino-exercício
- **academia_avaliacao** - Avaliações físicas
- **academia_frequencia** - Controle de frequência
- **academia_pedido** - Pedidos de pagamento

## 🎯 Dados Iniciais

O sistema será populado com:

- **3 Planos**: Básico (R$ 89,90), Premium (R$ 149,90), VIP (R$ 199,90)
- **20 Exercícios**: Categorizados por grupo muscular
- **1 Usuário de Teste**: usuario@teste.com / 123456

## 🔍 Verificação

Após a migração, verifique se:

1. ✅ A conexão com PostgreSQL está funcionando
2. ✅ Todas as tabelas foram criadas
3. ✅ Os dados iniciais foram inseridos
4. ✅ O sistema está respondendo normalmente

## 🚨 Troubleshooting

### Erro de Conexão
- Verifique se a string de conexão está correta
- Confirme se o banco Neon está ativo
- Verifique as configurações de SSL

### Erro de Migração
- Execute `python manage.py showmigrations` para ver o status
- Use `python manage.py migrate --fake-initial` se necessário

### Erro de Dados
- Verifique se o usuário tem permissões no banco
- Confirme se as tabelas foram criadas corretamente

## 📞 Suporte

Em caso de problemas, verifique:

1. Logs do Django: `python manage.py runserver`
2. Logs do PostgreSQL no painel do Neon
3. Configurações de rede e firewall

---

**Nota**: Este projeto foi migrado do SQLite para PostgreSQL (Neon) mantendo toda a funcionalidade original.
