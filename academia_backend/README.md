# 🏋️ Academia AthleTech - Backend

Sistema de gerenciamento de academia desenvolvido em Django com PostgreSQL (Neon).

## 🚀 Tecnologias

- **Backend**: Django 5.2.6
- **Banco de Dados**: PostgreSQL (Neon)
- **API**: Django REST Framework
- **Autenticação**: JWT (Simple JWT)
- **CORS**: django-cors-headers
- **Configuração**: python-decouple

## 📁 Estrutura do Projeto

```
academia_backend/
├── academia/                    # App principal
│   ├── models.py               # Modelos de dados
│   ├── views.py                # Views da API
│   ├── serializers.py          # Serializers
│   ├── urls.py                 # URLs da API
│   ├── admin.py                # Configuração do admin
│   └── migrations/             # Migrações do banco
├── academia_project/           # Configurações do projeto
│   ├── settings.py             # Configurações principais
│   ├── urls.py                 # URLs principais
│   └── wsgi.py                 # WSGI
├── scripts/                    # Scripts utilitários
│   ├── create_initial_data.py  # Dados iniciais
│   ├── test_postgresql_connection.py # Teste de conexão
│   ├── setup_final.py          # Configuração completa
│   └── config_database.py      # Configurações de exemplo
├── static/                     # Arquivos estáticos
├── templates/                  # Templates HTML
├── .env                        # Variáveis de ambiente
├── requirements.txt            # Dependências
└── manage.py                   # Script de gerenciamento
```

## 🛠️ Instalação e Configuração

### 1. Clonar o repositório
```bash
git clone <repository-url>
cd academia_backend
```

### 2. Criar ambiente virtual
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac
```

### 3. Instalar dependências
```bash
pip install -r requirements.txt
```

### 4. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
SECRET_KEY=sua-secret-key-aqui
DEBUG=True
DATABASE_URL=postgresql://user:password@host:port/database
DB_SSL_REQUIRE=True
```

### 5. Executar migrações
```bash
python manage.py migrate
```

### 6. Carregar dados iniciais
```bash
python scripts/create_initial_data.py
```

### 7. Criar superusuário
```bash
python manage.py createsuperuser
```

### 8. Executar servidor
```bash
python manage.py runserver
```

## 📊 Modelos de Dados

### Usuario
- Modelo customizado de usuário
- Campos: telefone, data de nascimento, gênero, status de membro

### Plano
- Planos de academia
- Campos: nome, descrição, preço, duração, benefícios

### Matricula
- Matrículas dos usuários
- Campos: usuário, plano, datas, status, valor

### Exercicio
- Exercícios disponíveis
- Campos: nome, categoria, nível, equipamento, instruções

### Treino
- Treinos dos usuários
- Relacionamento many-to-many com exercícios

### Avaliacao
- Avaliações físicas
- Campos: peso, altura, IMC, composição corporal

### Frequencia
- Controle de frequência
- Campos: entrada, saída, tempo de permanência

### Pedido
- Pedidos de pagamento (PIX)
- Campos: usuário, plano, valor, status

## 🔗 Endpoints da API

### Autenticação
- `POST /api/auth/register/` - Registro de usuário
- `POST /api/auth/login/` - Login
- `GET /api/auth/user/` - Perfil do usuário
- `POST /api/auth/password-reset/` - Reset de senha

### Planos
- `GET /api/planos/` - Listar planos
- `POST /api/planos/escolher/` - Escolher plano

### Exercícios
- `GET /api/exercicios/` - Listar exercícios
- `GET /api/exercicios/?categoria=peito` - Filtrar por categoria

### Treinos
- `GET /api/treinos/` - Listar treinos do usuário
- `GET /api/treinos/{id}/` - Detalhes do treino

### Dashboard
- `GET /api/dashboard/` - Dados do dashboard

### Pagamentos
- `POST /api/payments/pix/initiate/` - Iniciar pagamento PIX
- `GET /api/payments/pix/status/{id}/` - Status do pagamento

## 🧪 Testes

### Testar conexão com PostgreSQL
```bash
python scripts/test_postgresql_connection.py
```

### Executar testes
```bash
python manage.py test
```

## 📝 Scripts Utilitários

### `scripts/create_initial_data.py`
Cria dados iniciais no banco:
- 3 planos (Básico, Premium, VIP)
- 21 exercícios categorizados
- 1 usuário de teste

### `scripts/test_postgresql_connection.py`
Testa a conexão com PostgreSQL e verifica:
- Conexão com o banco
- Tabelas criadas
- Operações básicas

### `scripts/setup_final.py`
Script de configuração completa que:
- Instala dependências
- Executa migrações
- Cria superusuário
- Carrega dados iniciais
- Testa conexão

## 🔧 Configurações

### Banco de Dados
O sistema está configurado para usar PostgreSQL (Neon) por padrão.

### CORS
Configurado para aceitar requisições de:
- http://localhost:3000
- http://127.0.0.1:3000
- http://localhost:8080
- http://127.0.0.1:8080

### JWT
- Access token: 60 minutos
- Refresh token: 7 dias
- Rotação automática de tokens

## 🚀 Deploy

### Variáveis de Ambiente para Produção
```env
DEBUG=False
SECRET_KEY=sua-secret-key-segura
ALLOWED_HOSTS=seu-dominio.com
DATABASE_URL=sua-url-do-banco
DB_SSL_REQUIRE=True
SECURE_SSL_REDIRECT=True
```

### Comandos de Deploy
```bash
python manage.py collectstatic
python manage.py migrate
gunicorn academia_project.wsgi:application
```

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do Django
2. Execute os scripts de teste
3. Consulte a documentação da API

## 📄 Licença

Este projeto está sob a licença MIT.