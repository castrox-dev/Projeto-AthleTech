#!/usr/bin/env python
"""
Script de teste automatizado para verificar a configuração de pagamento
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'academia_project.settings')
django.setup()

from django.conf import settings
from django.test import Client
from django.contrib.auth import get_user_model
from academia.models import Plano, Pedido
from academia.services.mercadopago import MercadoPagoService
import json

User = get_user_model()

def print_header(text):
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def test_configuracao():
    """Testa se as variáveis de ambiente estão configuradas"""
    print_header("1. TESTE DE CONFIGURAÇÃO")
    
    access_token = getattr(settings, 'MERCADOPAGO_ACCESS_TOKEN', '')
    public_key = getattr(settings, 'MERCADOPAGO_PUBLIC_KEY', '')
    webhook_url = getattr(settings, 'MERCADOPAGO_WEBHOOK_URL', '')
    
    print(f"✓ Access Token: {'✅ Configurado' if access_token else '❌ NÃO CONFIGURADO'}")
    if access_token:
        print(f"  Primeiros 20 caracteres: {access_token[:20]}...")
    
    print(f"✓ Public Key: {'✅ Configurado' if public_key else '❌ NÃO CONFIGURADO'}")
    if public_key:
        print(f"  Primeiros 20 caracteres: {public_key[:20]}...")
    
    print(f"✓ Webhook URL: {webhook_url if webhook_url else '❌ NÃO CONFIGURADO'}")
    
    return bool(access_token and public_key)

def test_servico_mercadopago():
    """Testa se o serviço do Mercado Pago pode ser inicializado"""
    print_header("2. TESTE DE SERVIÇO MERCADO PAGO")
    
    try:
        service = MercadoPagoService()
        print("✅ Serviço MercadoPagoService inicializado com sucesso")
        print(f"  Usando MCP: {service.use_mcp}")
        print(f"  SDK disponível: {service.sdk is not None}")
        return True
    except ValueError as e:
        print(f"❌ Erro ao inicializar serviço: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

def test_endpoint_config_public():
    """Testa o endpoint de configuração pública"""
    print_header("3. TESTE DE ENDPOINT /api/config/public/")
    
    client = Client()
    response = client.get('/api/config/public/')
    
    if response.status_code == 200:
        data = json.loads(response.content)
        print("✅ Endpoint respondeu com sucesso")
        print(f"  Public Key retornada: {'✅ Sim' if data.get('mercadopago_public_key') else '❌ Não'}")
        if data.get('mercadopago_public_key'):
            print(f"  Primeiros 20 caracteres: {data['mercadopago_public_key'][:20]}...")
        return True
    else:
        print(f"❌ Endpoint retornou status {response.status_code}")
        print(f"  Resposta: {response.content.decode()}")
        return False

def test_modelo_pedido():
    """Testa se o modelo Pedido tem todos os campos necessários"""
    print_header("4. TESTE DE MODELO PEDIDO")
    
    campos_necessarios = [
        'mercado_pago_payment_id',
        'mercado_pago_status',
        'mercado_pago_subscription_id',
        'mercado_pago_subscription_status',
        'is_subscription',
        'subscription_start_date',
        'subscription_end_date',
    ]
    
    campos_faltando = []
    for campo in campos_necessarios:
        if not hasattr(Pedido, campo):
            campos_faltando.append(campo)
    
    if not campos_faltando:
        print("✅ Todos os campos necessários estão presentes no modelo Pedido")
        return True
    else:
        print(f"❌ Campos faltando: {', '.join(campos_faltando)}")
        return False

def test_urls_pagamento():
    """Testa se as URLs de pagamento estão configuradas"""
    print_header("5. TESTE DE URLs DE PAGAMENTO")
    
    from django.urls import reverse, NoReverseMatch
    
    urls_necessarias = [
        'pix_initiate',
        'pix_status',
        'cartao_initiate',
        'assinatura_status',
        'assinatura_cancelar',
        'mercadopago_webhook',
        'config_public',
    ]
    
    urls_ok = []
    urls_faltando = []
    
    for url_name in urls_necessarias:
        try:
            if url_name == 'pix_status':
                # Esta URL precisa de um UUID
                reverse('pix_status', kwargs={'pedido_id': '00000000-0000-0000-0000-000000000000'})
            elif url_name == 'assinatura_status':
                reverse('assinatura_status', kwargs={'pedido_id': '00000000-0000-0000-0000-000000000000'})
            elif url_name == 'assinatura_cancelar':
                reverse('assinatura_cancelar', kwargs={'pedido_id': '00000000-0000-0000-0000-000000000000'})
            else:
                reverse(url_name)
            urls_ok.append(url_name)
        except NoReverseMatch:
            urls_faltando.append(url_name)
    
    if not urls_faltando:
        print("✅ Todas as URLs de pagamento estão configuradas")
        for url in urls_ok:
            print(f"  ✓ {url}")
        return True
    else:
        print(f"❌ URLs faltando: {', '.join(urls_faltando)}")
        return False

def test_views_existem():
    """Testa se as views necessárias existem"""
    print_header("6. TESTE DE VIEWS")
    
    from academia import views
    
    views_necessarias = [
        'PixInitiateView',
        'PixStatusView',
        'CartaoInitiateView',
        'AssinaturaStatusView',
        'AssinaturaCancelarView',
        'MercadoPagoWebhookView',
        'ConfigPublicaView',
    ]
    
    views_ok = []
    views_faltando = []
    
    for view_name in views_necessarias:
        if hasattr(views, view_name):
            views_ok.append(view_name)
        else:
            views_faltando.append(view_name)
    
    if not views_faltando:
        print("✅ Todas as views necessárias existem")
        for view in views_ok:
            print(f"  ✓ {view}")
        return True
    else:
        print(f"❌ Views faltando: {', '.join(views_faltando)}")
        return False

def test_frontend_files():
    """Testa se os arquivos do frontend estão presentes"""
    print_header("7. TESTE DE ARQUIVOS FRONTEND")
    
    import os
    from pathlib import Path
    
    BASE_DIR = Path(__file__).resolve().parent
    
    arquivos_necessarios = [
        'static/js/checkout.js',
        'static/js/config.js',
        'static/html/checkout_frontend.html',
    ]
    
    arquivos_ok = []
    arquivos_faltando = []
    
    for arquivo in arquivos_necessarios:
        caminho = BASE_DIR / arquivo
        if caminho.exists():
            arquivos_ok.append(arquivo)
        else:
            arquivos_faltando.append(arquivo)
    
    if not arquivos_faltando:
        print("✅ Todos os arquivos do frontend estão presentes")
        for arquivo in arquivos_ok:
            print(f"  ✓ {arquivo}")
        return True
    else:
        print(f"❌ Arquivos faltando: {', '.join(arquivos_faltando)}")
        return False

def test_checkout_js_mercadopago():
    """Testa se checkout.js tem integração com Mercado Pago"""
    print_header("8. TESTE DE INTEGRAÇÃO FRONTEND")
    
    try:
        from pathlib import Path
        BASE_DIR = Path(__file__).resolve().parent
        checkout_js = BASE_DIR / 'static' / 'js' / 'checkout.js'
        
        if not checkout_js.exists():
            print("❌ Arquivo checkout.js não encontrado")
            return False
        
        conteudo = checkout_js.read_text(encoding='utf-8')
        
        checks = {
            'MercadoPago SDK': 'MercadoPago' in conteudo or 'mercadopago' in conteudo.lower(),
            'API config/public': '/api/config/public/' in conteudo,
            'API cartao/initiate': '/api/payments/cartao/initiate/' in conteudo,
            'API pix/initiate': '/api/payments/pix/initiate/' in conteudo,
            'Tokenização de cartão': 'card_tokens' in conteudo or 'createCardToken' in conteudo,
        }
        
        todos_ok = all(checks.values())
        
        for check, resultado in checks.items():
            status = "✅" if resultado else "❌"
            print(f"  {status} {check}")
        
        return todos_ok
        
    except Exception as e:
        print(f"❌ Erro ao verificar checkout.js: {e}")
        return False

def main():
    """Executa todos os testes"""
    print("\n" + "="*60)
    print("  TESTE AUTOMATIZADO DE CONFIGURAÇÃO DE PAGAMENTO")
    print("="*60)
    
    resultados = []
    
    resultados.append(("Configuração", test_configuracao()))
    resultados.append(("Serviço Mercado Pago", test_servico_mercadopago()))
    resultados.append(("Endpoint Config Público", test_endpoint_config_public()))
    resultados.append(("Modelo Pedido", test_modelo_pedido()))
    resultados.append(("URLs de Pagamento", test_urls_pagamento()))
    resultados.append(("Views", test_views_existem()))
    resultados.append(("Arquivos Frontend", test_frontend_files()))
    resultados.append(("Integração Frontend", test_checkout_js_mercadopago()))
    
    # Resumo
    print_header("RESUMO DOS TESTES")
    
    total = len(resultados)
    aprovados = sum(1 for _, resultado in resultados if resultado)
    
    for nome, resultado in resultados:
        status = "✅ PASSOU" if resultado else "❌ FALHOU"
        print(f"  {status} - {nome}")
    
    print(f"\n  Total: {aprovados}/{total} testes passaram")
    
    if aprovados == total:
        print("\n  🎉 TODOS OS TESTES PASSARAM! Sistema pronto para testes de pagamento.")
    else:
        print(f"\n  ⚠️  {total - aprovados} teste(s) falharam. Verifique os erros acima.")
    
    return aprovados == total

if __name__ == '__main__':
    sucesso = main()
    sys.exit(0 if sucesso else 1)

