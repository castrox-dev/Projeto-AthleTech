# 🏋️ AthleTech - Sistema de Gestão de Academia

Sistema completo de gerenciamento de academia desenvolvido em Django com interface moderna e responsiva.

## ✨ Funcionalidades

### 👤 Portal do Aluno
- Visualização e edição de perfil
- Acompanhamento de treinos com vídeos demonstrativos
- Histórico de avaliações físicas
- Participação em torneios/competições internas

### 👨‍🏫 Painel do Professor
- Criação e gerenciamento de treinos
- Biblioteca de exercícios
- Agendamento de avaliações
- Acompanhamento de alunos

### 🔧 Dashboard Administrativo
- Gestão completa de alunos
- Controle de planos e matrículas
- Gerenciamento de professores
- Relatórios financeiros
- Organização de torneios

### 💰 Sistema de Pagamentos
- Integração com Mercado Pago
- Pagamento via PIX
- Pagamento via Cartão de Crédito
- Gestão de assinaturas

## 🚀 Tecnologias

- **Backend**: Django 5.2.6
- **Banco de Dados**: PostgreSQL
- **API**: Django REST Framework
- **Autenticação**: JWT (Simple JWT)
- **Pagamentos**: Mercado Pago SDK
- **Frontend**: HTML5, CSS3, JavaScript
- **Deploy**: Railway / Render / Heroku

## 📱 Responsividade

Sistema 100% responsivo com menu hamburger CSS puro para dispositivos móveis.

## 🛠️ Instalação

### 1. Clonar o repositório
```bash
git clone <repository-url>
cd academia_backend
```

### 2. Criar ambiente virtual
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac
```

### 3. Instalar dependências
```bash
pip install -r requirements.txt
```

### 4. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
SECRET_KEY=sua-secret-key-segura
DEBUG=False
DATABASE_URL=postgresql://user:password@host:port/database
DB_SSL_REQUIRE=True
MERCADOPAGO_ACCESS_TOKEN=seu-token-mercadopago
ALLOWED_HOSTS=seu-dominio.com
```

### 5. Executar migrações
```bash
python manage.py migrate
```

### 6. Coletar arquivos estáticos
```bash
python manage.py collectstatic --noinput
```

### 7. Carregar dados iniciais
```bash
python scripts/create_initial_data.py
```

### 8. Criar superusuário (admin)
```bash
python manage.py createsuperuser
```

### 9. Executar servidor
```bash
python manage.py runserver
```

## 📊 Modelos de Dados

| Modelo | Descrição |
|--------|-----------|
| **Usuario** | Usuários com perfis (aluno, professor, admin) |
| **Plano** | Planos de academia (Básico, Premium, Elite) |
| **Matricula** | Matrículas e assinaturas |
| **Exercicio** | Exercícios com vídeos demonstrativos |
| **Treino** | Treinos personalizados |
| **Avaliacao** | Avaliações físicas completas |
| **Torneio** | Competições internas |
| **Pedido** | Pedidos de pagamento |

## 🔗 Endpoints da API

### Autenticação
- `POST /api/auth/register/` - Registro
- `POST /api/auth/login/` - Login
- `GET /api/auth/user/` - Perfil

### Planos
- `GET /api/planos/` - Listar planos

### Treinos
- `GET /api/treinos/` - Treinos do aluno
- `GET /api/treinos/gerenciar/` - Gerenciar treinos (professor)

### Pagamentos
- `POST /api/pagamentos/criar-preferencia/` - Criar pagamento

## 🚀 Deploy

### Railway (Recomendado)
1. Conecte o repositório no Railway
2. Adicione um banco PostgreSQL
3. Configure as variáveis de ambiente
4. Deploy automático!

### Variáveis de Ambiente para Produção
```env
DEBUG=False
SECRET_KEY=sua-secret-key-segura
ALLOWED_HOSTS=*.railway.app,seu-dominio.com
DATABASE_URL=sua-url-do-banco
MERCADOPAGO_ACCESS_TOKEN=seu-token
```

## 📁 Estrutura do Projeto

```
academia_backend/
├── academia/                 # App principal
│   ├── models.py            # Modelos de dados
│   ├── views.py             # Views da API
│   ├── serializers.py       # Serializers
│   └── services/            # Serviços (Mercado Pago)
├── academia_project/        # Configurações
├── static/                  # Arquivos estáticos
│   ├── css/                # Estilos
│   ├── js/                 # JavaScript
│   ├── html/               # Templates
│   └── images/             # Imagens
├── scripts/                 # Scripts utilitários
├── requirements.txt         # Dependências
└── manage.py               # Script Django
```

## 📄 Licença

Este projeto está sob a licença MIT.

## 📞 Suporte

Para suporte técnico ou customizações, entre em contato.

---

**AthleTech** - Tecnologia e treino juntos para a sua melhor versão. 💪
