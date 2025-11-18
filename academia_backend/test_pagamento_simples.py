#!/usr/bin/env python
"""
Script de teste simplificado que verifica apenas a estrutura do código
sem depender do banco de dados
"""
import os
import sys
from pathlib import Path

def test_arquivos_existem():
    """Testa se os arquivos necessários existem"""
    print("\n" + "="*60)
    print("  TESTE DE ARQUIVOS E ESTRUTURA")
    print("="*60)
    
    BASE_DIR = Path(__file__).resolve().parent
    
    arquivos_necessarios = {
        'Backend': [
            'academia/services/mercadopago.py',
            'academia/views.py',
            'academia/urls.py',
            'academia/models.py',
        ],
        'Frontend': [
            'static/js/checkout.js',
            'static/js/config.js',
            'static/html/checkout_frontend.html',
        ],
        'Configuração': [
            'academia_project/settings.py',
            '.env.example',
            'requirements.txt',
        ]
    }
    
    todos_ok = True
    
    for categoria, arquivos in arquivos_necessarios.items():
        print(f"\n{categoria}:")
        for arquivo in arquivos:
            caminho = BASE_DIR / arquivo
            if caminho.exists():
                print(f"  [OK] {arquivo}")
            else:
                print(f"  [ERRO] {arquivo} (NAO ENCONTRADO)")
                todos_ok = False
    
    return todos_ok

def test_checkout_js_integracao():
    """Testa se checkout.js tem a integração com Mercado Pago"""
    print("\n" + "="*60)
    print("  TESTE DE INTEGRAÇÃO NO checkout.js")
    print("="*60)
    
    BASE_DIR = Path(__file__).resolve().parent
    checkout_js = BASE_DIR / 'static' / 'js' / 'checkout.js'
    
    if not checkout_js.exists():
        print("[ERRO] Arquivo checkout.js nao encontrado")
        return False
    
    conteudo = checkout_js.read_text(encoding='utf-8')
    
    checks = {
        'Carrega Public Key via API': '/api/config/public/' in conteudo,
        'Inicia pagamento PIX': '/api/payments/pix/initiate/' in conteudo,
        'Cria assinatura cartão': '/api/payments/cartao/initiate/' in conteudo,
        'Usa MercadoPago SDK': 'MercadoPago' in conteudo or 'new MercadoPago' in conteudo,
        'Tokenização de cartão': 'card_tokens' in conteudo or 'createCardToken' in conteudo,
        'Polling de status PIX': 'pix/status' in conteudo,
    }
    
    todos_ok = all(checks.values())
    
    for check, resultado in checks.items():
        status = "[OK]" if resultado else "[ERRO]"
        print(f"  {status} {check}")
    
    return todos_ok

def test_config_js():
    """Testa se config.js carrega Public Key via API"""
    print("\n" + "="*60)
    print("  TESTE DE config.js")
    print("="*60)
    
    BASE_DIR = Path(__file__).resolve().parent
    config_js = BASE_DIR / 'static' / 'js' / 'config.js'
    
    if not config_js.exists():
        print("[ERRO] Arquivo config.js nao encontrado")
        return False
    
    conteudo = config_js.read_text(encoding='utf-8')
    
    checks = {
        'Carrega Public Key via API': '/api/config/public/' in conteudo,
        'Define window.MERCADOPAGO_PUBLIC_KEY': 'MERCADOPAGO_PUBLIC_KEY' in conteudo,
    }
    
    todos_ok = all(checks.values())
    
    for check, resultado in checks.items():
        status = "[OK]" if resultado else "[ERRO]"
        print(f"  {status} {check}")
    
    return todos_ok

def test_checkout_html():
    """Testa se checkout_frontend.html tem o SDK do Mercado Pago"""
    print("\n" + "="*60)
    print("  TESTE DE checkout_frontend.html")
    print("="*60)
    
    BASE_DIR = Path(__file__).resolve().parent
    checkout_html = BASE_DIR / 'static' / 'html' / 'checkout_frontend.html'
    
    if not checkout_html.exists():
        print("[ERRO] Arquivo checkout_frontend.html nao encontrado")
        return False
    
    conteudo = checkout_html.read_text(encoding='utf-8')
    
    checks = {
        'SDK Mercado Pago incluído': 'sdk.mercadopago.com' in conteudo,
        'Script checkout.js incluído': 'checkout.js' in conteudo,
    }
    
    todos_ok = all(checks.values())
    
    for check, resultado in checks.items():
        status = "[OK]" if resultado else "[ERRO]"
        print(f"  {status} {check}")
    
    return todos_ok

def test_views_estrutura():
    """Testa se as views necessárias existem no código"""
    print("\n" + "="*60)
    print("  TESTE DE VIEWS (ESTRUTURA)")
    print("="*60)
    
    BASE_DIR = Path(__file__).resolve().parent
    views_py = BASE_DIR / 'academia' / 'views.py'
    
    if not views_py.exists():
        print("[ERRO] Arquivo views.py nao encontrado")
        return False
    
    conteudo = views_py.read_text(encoding='utf-8')
    
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
    
    for view in views_necessarias:
        if f'class {view}' in conteudo:
            views_ok.append(view)
        else:
            views_faltando.append(view)
    
    if not views_faltando:
        print("[OK] Todas as views necessarias estao presentes:")
        for view in views_ok:
            print(f"  [OK] {view}")
        return True
    else:
        print("[ERRO] Views faltando:")
        for view in views_faltando:
            print(f"  [ERRO] {view}")
        return False

def test_urls_estrutura():
    """Testa se as URLs necessárias existem"""
    print("\n" + "="*60)
    print("  TESTE DE URLs (ESTRUTURA)")
    print("="*60)
    
    BASE_DIR = Path(__file__).resolve().parent
    urls_py = BASE_DIR / 'academia' / 'urls.py'
    
    if not urls_py.exists():
        print("[ERRO] Arquivo urls.py nao encontrado")
        return False
    
    conteudo = urls_py.read_text(encoding='utf-8')
    
    urls_necessarias = [
        'pix/initiate',
        'pix/status',
        'cartao/initiate',
        'assinatura/status',
        'assinatura/cancelar',
        'mercadopago/webhook',
        'config/public',
    ]
    
    urls_ok = []
    urls_faltando = []
    
    for url in urls_necessarias:
        if url in conteudo:
            urls_ok.append(url)
        else:
            urls_faltando.append(url)
    
    if not urls_faltando:
        print("[OK] Todas as URLs necessarias estao presentes:")
        for url in urls_ok:
            print(f"  [OK] {url}")
        return True
    else:
        print("[ERRO] URLs faltando:")
        for url in urls_faltando:
            print(f"  [ERRO] {url}")
        return False

def test_servico_mercadopago_estrutura():
    """Testa se o serviço MercadoPago tem os métodos necessários"""
    print("\n" + "="*60)
    print("  TESTE DE SERVIÇO MERCADOPAGO (ESTRUTURA)")
    print("="*60)
    
    BASE_DIR = Path(__file__).resolve().parent
    service_py = BASE_DIR / 'academia' / 'services' / 'mercadopago.py'
    
    if not service_py.exists():
        print("[ERRO] Arquivo mercadopago.py nao encontrado")
        return False
    
    conteudo = service_py.read_text(encoding='utf-8')
    
    metodos_necessarios = [
        'criar_pagamento_pix',
        'criar_assinatura',
        'consultar_pagamento',
        'consultar_assinatura',
        'cancelar_assinatura',
        'processar_webhook',
    ]
    
    metodos_ok = []
    metodos_faltando = []
    
    for metodo in metodos_necessarios:
        if f'def {metodo}' in conteudo:
            metodos_ok.append(metodo)
        else:
            metodos_faltando.append(metodo)
    
    if not metodos_faltando:
        print("[OK] Todos os metodos necessarios estao presentes:")
        for metodo in metodos_ok:
            print(f"  [OK] {metodo}")
        return True
    else:
        print("[ERRO] Metodos faltando:")
        for metodo in metodos_faltando:
            print(f"  [ERRO] {metodo}")
        return False

def test_modelo_pedido_estrutura():
    """Testa se o modelo Pedido tem os campos necessários"""
    print("\n" + "="*60)
    print("  TESTE DE MODELO PEDIDO (ESTRUTURA)")
    print("="*60)
    
    BASE_DIR = Path(__file__).resolve().parent
    models_py = BASE_DIR / 'academia' / 'models.py'
    
    if not models_py.exists():
        print("[ERRO] Arquivo models.py nao encontrado")
        return False
    
    conteudo = models_py.read_text(encoding='utf-8')
    
    campos_necessarios = [
        'mercado_pago_payment_id',
        'mercado_pago_status',
        'mercado_pago_subscription_id',
        'mercado_pago_subscription_status',
        'is_subscription',
        'subscription_start_date',
        'subscription_end_date',
    ]
    
    campos_ok = []
    campos_faltando = []
    
    for campo in campos_necessarios:
        if campo in conteudo:
            campos_ok.append(campo)
        else:
            campos_faltando.append(campo)
    
    if not campos_faltando:
        print("[OK] Todos os campos necessarios estao presentes:")
        for campo in campos_ok:
            print(f"  [OK] {campo}")
        return True
    else:
        print("[ERRO] Campos faltando:")
        for campo in campos_faltando:
            print(f"  [ERRO] {campo}")
        return False

def main():
    """Executa todos os testes"""
    print("\n" + "="*60)
    print("  TESTE DE ESTRUTURA DE PAGAMENTO")
    print("="*60)
    
    resultados = []
    
    resultados.append(("Arquivos", test_arquivos_existem()))
    resultados.append(("checkout.js", test_checkout_js_integracao()))
    resultados.append(("config.js", test_config_js()))
    resultados.append(("checkout.html", test_checkout_html()))
    resultados.append(("Views", test_views_estrutura()))
    resultados.append(("URLs", test_urls_estrutura()))
    resultados.append(("Serviço MercadoPago", test_servico_mercadopago_estrutura()))
    resultados.append(("Modelo Pedido", test_modelo_pedido_estrutura()))
    
    # Resumo
    print("\n" + "="*60)
    print("  RESUMO DOS TESTES")
    print("="*60)
    
    total = len(resultados)
    aprovados = sum(1 for _, resultado in resultados if resultado)
    
    for nome, resultado in resultados:
        status = "[OK] PASSOU" if resultado else "[ERRO] FALHOU"
        print(f"  {status} - {nome}")
    
    print(f"\n  Total: {aprovados}/{total} testes passaram")
    
    if aprovados == total:
        print("\n  [SUCESSO] TODOS OS TESTES DE ESTRUTURA PASSARAM!")
        print("  [OK] O codigo esta configurado corretamente.")
        print("  [AVISO] Lembre-se de configurar o arquivo .env com suas credenciais do Mercado Pago")
    else:
        print(f"\n  [AVISO] {total - aprovados} teste(s) falharam. Verifique os erros acima.")
    
    return aprovados == total

if __name__ == '__main__':
    sucesso = main()
    sys.exit(0 if sucesso else 1)

