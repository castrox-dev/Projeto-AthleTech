# 🚀 Instruções de Migração para PostgreSQL (Neon)

## ⚠️ Problema Identificado

O sistema atual está configurado para SQLite, mas você quer migrar para PostgreSQL usando o Neon. Identifiquei alguns problemas de ambiente que precisam ser resolvidos primeiro.

## 🔧 Solução Passo a Passo

### 1. Configurar Ambiente Python

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual (Windows)
venv\Scripts\activate

# Ativar ambiente virtual (Linux/Mac)
source venv/bin/activate
```

### 2. Instalar Dependências

```bash
# Instalar todas as dependências (versões mais recentes)
pip install -r requirements.txt

# OU instalar manualmente
pip install Django
pip install djangorestframework
pip install psycopg2-binary
pip install python-decouple
pip install django-cors-headers
pip install djangorestframework-simplejwt
pip install Pillow
pip install PyJWT
pip install whitenoise
pip install dj-database-url
pip install gunicorn
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
# Executar script de dados iniciais
python create_initial_data.py
```

### 5. Testar Sistema

```bash
# Iniciar servidor
python manage.py runserver

# Em outro terminal, testar conexão
python test_postgresql_connection.py
```

### 6. Configuração Automática (Recomendado)

```bash
# Execute o script de configuração final
python setup_final.py
```

Este script irá:
- ✅ Criar arquivo .env com todas as configurações
- ✅ Instalar todas as dependências
- ✅ Executar migrações
- ✅ Criar superusuário
- ✅ Carregar dados iniciais
- ✅ Testar conexão

## 📁 Arquivos Criados

### Configurações
- ✅ `requirements.txt` - Atualizado com psycopg2-binary
- ✅ `academia_project/settings.py` - Configurado para PostgreSQL
- ✅ `config_database.py` - Configurações de exemplo

### Scripts de Migração
- ✅ `migrate_to_postgresql.py` - Script automatizado de migração
- ✅ `create_initial_data.py` - Script para dados iniciais
- ✅ `test_postgresql_connection.py` - Script de teste
- ✅ `setup_postgresql.py` - Script de configuração completa

### Documentação
- ✅ `MIGRATION_README.md` - Documentação técnica
- ✅ `INSTRUCOES_MIGRACAO.md` - Este arquivo

## 🎯 Configuração do Banco

O sistema está configurado para usar:

**Host**: ep-rapid-firefly-ac6hfh6q-pooler.sa-east-1.aws.neon.tech
**Database**: neondb
**User**: neondb_owner
**Password**: npg_fnLJ8i7aeTPy
**SSL**: Requerido

## 🔐 Configurações do Neon Auth

O sistema também está configurado com as variáveis do Neon Auth:

**STACK_PROJECT_ID**: ae1cf95f-cb0c-4520-bae0-afa91ca3c54e
**STACK_PUBLISHABLE_CLIENT_KEY**: pck_je6tp00zfkyz3d22sb5qs74zgxygmjsaqr0wp8ffszf8r
**STACK_SECRET_SERVER_KEY**: ssk_w1e1hdv71n5nspyfsjp2saw9yd4sstn5ezh6yrxsvrjyr

Essas configurações estão disponíveis no `settings.py` e podem ser usadas para integração com o Neon Auth.

## 🔍 Verificação

Após seguir os passos, verifique se:

1. ✅ O servidor Django inicia sem erros
2. ✅ A página inicial carrega (http://localhost:8000)
3. ✅ O admin funciona (http://localhost:8000/admin)
4. ✅ A API responde (http://localhost:8000/api/)

## 🚨 Troubleshooting

### Erro: "No module named django"
```bash
# Reinstalar Django
pip uninstall Django
pip install Django==5.2.6
```

### Erro: "No module named psycopg2"
```bash
# Instalar driver PostgreSQL
pip install psycopg2-binary==2.9.9
```

### Erro de Conexão PostgreSQL
- Verifique se a string de conexão está correta
- Confirme se o banco Neon está ativo
- Teste a conexão manualmente

### Erro de Migração
```bash
# Verificar status das migrações
python manage.py showmigrations

# Aplicar migrações específicas
python manage.py migrate academia 0001
```

## 📞 Próximos Passos

1. **Execute o ambiente virtual**:
   ```bash
   venv\Scripts\activate
   ```

2. **Instale as dependências**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Execute as migrações**:
   ```bash
   python manage.py migrate
   ```

4. **Teste o sistema**:
   ```bash
   python manage.py runserver
   ```

## 🎉 Resultado Esperado

Após a migração, você terá:

- ✅ Sistema funcionando com PostgreSQL (Neon)
- ✅ Todas as tabelas criadas
- ✅ Dados iniciais carregados
- ✅ API funcionando normalmente
- ✅ Interface web funcionando

---

**Nota**: Se encontrar problemas, execute os scripts na ordem indicada e verifique os logs de erro para diagnóstico.
