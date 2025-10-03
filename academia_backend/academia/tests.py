from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Plano, Matricula, Exercicio, Treino, Avaliacao, Frequencia
from datetime import date, datetime, timedelta
from decimal import Decimal

User = get_user_model()

class UsuarioModelTest(TestCase):
    """Testes para o modelo Usuario"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_usuario_creation(self):
        """Testa a criação de um usuário"""
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertEqual(self.user.first_name, 'Test')
        self.assertFalse(self.user.is_active_member)
    
    def test_usuario_str(self):
        """Testa a representação string do usuário"""
        expected = f"{self.user.first_name} {self.user.last_name}"
        self.assertEqual(str(self.user), expected)

class PlanoModelTest(TestCase):
    """Testes para o modelo Plano"""
    
    def setUp(self):
        self.plano = Plano.objects.create(
            nome='Plano Mensal',
            descricao='Plano mensal da academia',
            preco=Decimal('99.90'),
            duracao_dias=30
        )
    
    def test_plano_creation(self):
        """Testa a criação de um plano"""
        self.assertEqual(self.plano.nome, 'Plano Mensal')
        self.assertEqual(self.plano.preco, Decimal('99.90'))
        self.assertTrue(self.plano.ativo)
    
    def test_plano_str(self):
        """Testa a representação string do plano"""
        expected = "Plano Mensal - R$ 99.90"
        self.assertEqual(str(self.plano), expected)

class ExercicioModelTest(TestCase):
    """Testes para o modelo Exercicio"""
    
    def setUp(self):
        self.exercicio = Exercicio.objects.create(
            nome='Supino Reto',
            categoria='peito',
            descricao='Exercício para desenvolvimento do peitoral',
            instrucoes='Deite no banco e empurre a barra',
            nivel='iniciante'
        )
    
    def test_exercicio_creation(self):
        """Testa a criação de um exercício"""
        self.assertEqual(self.exercicio.nome, 'Supino Reto')
        self.assertEqual(self.exercicio.categoria, 'peito')
        self.assertEqual(self.exercicio.nivel, 'iniciante')
        self.assertTrue(self.exercicio.ativo)
    
    def test_exercicio_str(self):
        """Testa a representação string do exercício"""
        expected = "Supino Reto (peito)"
        self.assertEqual(str(self.exercicio), expected)

class AvaliacaoModelTest(TestCase):
    """Testes para o modelo Avaliacao"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.avaliacao = Avaliacao.objects.create(
            usuario=self.user,
            data_avaliacao=date.today(),
            peso=Decimal('70.0'),
            altura=Decimal('175.0')
        )
    
    def test_avaliacao_creation(self):
        """Testa a criação de uma avaliação"""
        self.assertEqual(self.avaliacao.usuario, self.user)
        self.assertEqual(self.avaliacao.peso, Decimal('70.0'))
        self.assertEqual(self.avaliacao.altura, Decimal('175.0'))
    
    def test_imc_calculation(self):
        """Testa o cálculo automático do IMC"""
        # IMC = peso / (altura/100)²
        # IMC = 70 / (175/100)² = 70 / 3.0625 = 22.86
        expected_imc = Decimal('22.86')
        self.assertEqual(self.avaliacao.imc, expected_imc)

class APITest(APITestCase):
    """Testes para as APIs"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
    
    def test_register_api(self):
        """Testa a API de registro"""
        url = '/api/auth/register/'
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'password_confirm': 'newpass123',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())
    
    def test_login_api(self):
        """Testa a API de login"""
        url = '/api/auth/login/'
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_planos_list_api(self):
        """Testa a API de listagem de planos"""
        # Criar um plano
        Plano.objects.create(
            nome='Plano Teste',
            descricao='Plano para teste',
            preco=Decimal('50.00')
        )
        
        url = '/api/planos/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

class ViewTest(TestCase):
    """Testes para as views"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_home_view(self):
        """Testa a view da página inicial"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'AthleTech')
    
    def test_login_view_get(self):
        """Testa a view de login (GET)"""
        response = self.client.get('/login/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Login')
    
    def test_login_view_post(self):
        """Testa a view de login (POST)"""
        response = self.client.post('/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        # Deve redirecionar após login bem-sucedido
        self.assertEqual(response.status_code, 302)
