from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import Plano, Exercicio
from decimal import Decimal

User = get_user_model()

class SimpleModelTest(TestCase):
    """Testes simples para os modelos"""
    
    def test_usuario_creation(self):
        """Testa a criação de um usuário"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.first_name, 'Test')
        self.assertFalse(user.is_active_member)
    
    def test_plano_creation(self):
        """Testa a criação de um plano"""
        plano = Plano.objects.create(
            nome='Plano Mensal',
            descricao='Plano mensal da academia',
            preco=Decimal('99.90'),
            duracao_dias=30
        )
        self.assertEqual(plano.nome, 'Plano Mensal')
        self.assertEqual(plano.preco, Decimal('99.90'))
        self.assertTrue(plano.ativo)
    
    def test_exercicio_creation(self):
        """Testa a criação de um exercício"""
        exercicio = Exercicio.objects.create(
            nome='Supino Reto',
            categoria='peito',
            descricao='Exercício para desenvolvimento do peitoral',
            instrucoes='Deite no banco e empurre a barra',
            nivel='iniciante'
        )
        self.assertEqual(exercicio.nome, 'Supino Reto')
        self.assertEqual(exercicio.categoria, 'peito')
        self.assertEqual(exercicio.nivel, 'iniciante')
        self.assertTrue(exercicio.ativo)

class SimpleAPITest(APITestCase):
    """Testes simples para as APIs"""
    
    def setUp(self):
        self.client = APIClient()
    
    def test_planos_list(self):
        """Testa a listagem de planos"""
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

class SimpleViewTest(TestCase):
    """Testes simples para as views"""
    
    def setUp(self):
        self.client = Client()
    
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
