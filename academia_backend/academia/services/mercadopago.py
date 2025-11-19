"""
Serviço de integração com Mercado Pago
Suporta tanto SDK tradicional quanto MCP (Model Context Protocol) quando disponível
"""
import mercadopago
from django.conf import settings
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class MercadoPagoService:
    """Serviço para gerenciar pagamentos via Mercado Pago"""
    
    def __init__(self):
        access_token = getattr(settings, 'MERCADOPAGO_ACCESS_TOKEN', None)
        if not access_token:
            raise ValueError("MERCADOPAGO_ACCESS_TOKEN não configurado nas settings")
        
        self.access_token = access_token
        self.use_mcp = getattr(settings, 'MERCADOPAGO_USE_MCP', False)
        
        # Usar SDK tradicional se MCP não estiver habilitado
        if not self.use_mcp:
            self.sdk = mercadopago.SDK(access_token)
            logger.debug("Mercado Pago usando SDK tradicional")
        else:
            self.sdk = None
            logger.info("Mercado Pago configurado para usar MCP (Model Context Protocol)")
    
    def _get_sdk(self):
        """Obtém o SDK, inicializando se necessário (fallback do MCP)"""
        if not self.sdk:
            logger.warning("MCP não disponível, inicializando SDK tradicional como fallback")
            self.sdk = mercadopago.SDK(self.access_token)
            self.use_mcp = False
        return self.sdk
    
    def criar_checkout_preference(self, pedido, usuario, plano, metodo_pagamento='pix'):
        """
        Cria uma preferência de checkout (Checkout Pro) no Mercado Pago
        Redireciona o usuário para o site do Mercado Pago para pagar
        
        Args:
            pedido: Instância do modelo Pedido
            usuario: Instância do modelo Usuario
            plano: Instância do modelo Plano
            metodo_pagamento: 'pix' ou 'cartao' ou None (todos)
            
        Returns:
            dict: Dados da preferência criada com init_point ou None em caso de erro
        """
        try:
            sdk = self._get_sdk()
            
            # URLs de retorno - garantir que sejam URLs válidas
            webhook_url = getattr(settings, 'MERCADOPAGO_WEBHOOK_URL', None)
            if webhook_url:
                base_url = str(webhook_url).rstrip('/')
            else:
                base_url = 'http://localhost:8000'
            
            # Garantir que base_url seja válido
            if not base_url or not base_url.startswith('http'):
                base_url = 'http://localhost:8000'
                logger.warning(f"⚠️ MERCADOPAGO_WEBHOOK_URL inválido, usando localhost: {base_url}")
            
            success_url = f"{base_url}/portal/?payment=success"
            failure_url = f"{base_url}/checkout/?pedido_id={pedido.id_publico}&payment=failed"
            pending_url = f"{base_url}/checkout/?pedido_id={pedido.id_publico}&payment=pending"
            
            # Validar URLs antes de usar
            logger.debug(f"URLs de retorno: success={success_url}, failure={failure_url}, pending={pending_url}")
            
            # Detectar modo TEST baseado no access_token
            # Tokens de teste começam com "TEST-" ou contêm "test" no nome
            # Tokens de produção começam com "APP_USR-"
            is_test = (
                self.access_token.startswith("TEST-") or 
                "TEST-" in self.access_token.upper() or
                (not self.access_token.startswith("APP_USR-") and "test" in self.access_token.lower())
            )
            
            # Log para debug
            logger.debug(f"Modo: {'TEST' if is_test else 'PRODUÇÃO'}")
            
            # Preparar dados da preferência
            # IMPORTANTE: back_urls DEVE ser definido e válido antes de auto_return
            # O Mercado Pago valida que back_urls.success existe e é válido antes de aceitar auto_return
            
            # Validar que success_url está definida e válida ANTES de criar back_urls
            if not success_url or not success_url.startswith('http'):
                logger.error(f"❌ ERRO: success_url inválida: {success_url}")
                raise ValueError(f"URL de sucesso inválida: {success_url}")
            
            # Criar back_urls com todas as URLs válidas
            back_urls = {
                "success": str(success_url).strip(),  # Garantir que é string e sem espaços
                "failure": str(failure_url).strip(),
                "pending": str(pending_url).strip()
            }
            
            # Validar novamente após criar o dicionário
            if not back_urls.get("success") or not back_urls["success"].startswith('http'):
                logger.error(f"❌ ERRO: back_urls.success inválida após criação: {back_urls.get('success')}")
                raise ValueError(f"back_urls.success inválida: {back_urls.get('success')}")
            
            logger.debug(f"back_urls criado: success={back_urls['success'][:50]}...")
            
            # Verificar se back_urls.success está válida ANTES de criar preference_data
            success_url_valid = (
                back_urls.get("success") and 
                isinstance(back_urls["success"], str) and
                back_urls["success"].strip().startswith('http') and 
                len(back_urls["success"].strip()) > 10
            )
            
            if not success_url_valid:
                logger.error(f"❌ ERRO: back_urls.success inválida antes de criar preference_data")
                logger.error(f"   Tipo: {type(back_urls.get('success'))}, Valor: {repr(back_urls.get('success'))}")
                raise ValueError(f"back_urls.success inválida: {back_urls.get('success')}")
            
            # Criar preference_data com TODOS os campos de uma vez
            # O Mercado Pago pode estar validando a estrutura completa, então vamos incluir tudo junto
            preference_data = {
                "items": [
                    {
                        "title": f"Plano {plano.nome} - {plano.duracao_dias} dias",
                        "quantity": 1,
                        "unit_price": float(pedido.valor),
                        "currency_id": "BRL"
                    }
                ],
                "external_reference": str(pedido.id_publico),
                "back_urls": {
                    "success": str(back_urls["success"]).strip(),
                    "failure": str(back_urls["failure"]).strip(),
                    "pending": str(back_urls["pending"]).strip()
                },
                "notification_url": f"{base_url}/api/payments/mercadopago/webhook/",
                "statement_descriptor": "ATHLETECH",
                "binary_mode": False,  # False permite pagamentos pendentes (necessário para PIX e account_money)
                "expires": False  # Não expirar a preferência
            }
            
            # Adicionar auto_return apenas se NÃO for localhost
            # O Mercado Pago pode não aceitar auto_return com URLs localhost
            is_localhost = base_url.startswith('http://localhost') or base_url.startswith('http://127.0.0.1')
            
            if not is_localhost and success_url_valid:
                preference_data["auto_return"] = "approved"
                logger.info("✅ auto_return configurado para redirecionamento automático (não é localhost)")
            else:
                if is_localhost:
                    logger.info("ℹ️ auto_return não configurado - localhost detectado (Mercado Pago pode não aceitar)")
                else:
                    logger.warning("⚠️ auto_return não configurado - success_url inválida")
            
            logger.debug(f"preference_data criado: auto_return={preference_data.get('auto_return', 'não configurado')}")
            
            # Configurar métodos de pagamento permitidos
            # IMPORTANTE: account_money (saldo do Mercado Pago) deve estar sempre permitido
            # Não excluir account_money explicitamente, pois ele é usado tanto para PIX quanto para saldo
            
            if is_test:
                # Em modo TEST, permitir todos os métodos para facilitar testes
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            elif metodo_pagamento == 'pix':
                # Para PIX, não configurar payment_methods ou configurar minimamente
                # O Mercado Pago automaticamente mostra PIX quando account_money está disponível
                # Excluir apenas cartões e boleto, mas deixar account_money (que inclui PIX e saldo)
                # Não excluir nenhum payment_method específico para garantir que PIX apareça
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [
                        {"id": "credit_card"},
                        {"id": "debit_card"},
                        {"id": "ticket"}
                    ],
                    # Não excluir payment_methods - isso permite PIX aparecer
                    # O account_money inclui tanto PIX quanto saldo do Mercado Pago
                    "excluded_payment_methods": [],
                    "installments": 1
                }
            elif metodo_pagamento == 'cartao':
                # Para cartão, permitir credit_card, debit_card e account_money (saldo)
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [
                        {"id": "ticket"}
                    ],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            else:
                # Permitir todos os métodos (incluindo account_money)
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            # Validar estrutura antes de enviar
            if not preference_data.get('back_urls', {}).get('success'):
                raise ValueError("back_urls.success não está definido ou está vazio")
            
            # Se auto_return estiver presente, garantir que success_url está válida
            if 'auto_return' in preference_data:
                success_url_final = preference_data.get('back_urls', {}).get('success', '')
                if not success_url_final or not success_url_final.startswith('http') or len(success_url_final) < 10:
                    del preference_data['auto_return']
                    logger.warning("auto_return removido - success_url inválida")
            
            # Criar preferência
            try:
                preference_response = sdk.preference().create(preference_data)
            except Exception as e:
                logger.error(f"Exceção ao criar preferência: {str(e)}")
                raise
            
            if preference_response["status"] == 201:
                preference = preference_response["response"]
                preference_id = preference.get("id")
                
                logger.info(f"Preferência criada - ID: {preference_id}")
                
                # Atualizar pedido com preference_id
                pedido.mercado_pago_preference_id = str(preference_id)
                pedido.save()
                
                # Retornar init_point (URL de redirecionamento)
                init_point = preference.get("init_point", "")
                sandbox_init_point = preference.get("sandbox_init_point", "")
                
                # Em modo TEST, SEMPRE usar sandbox_init_point
                # Em modo PRODUÇÃO, SEMPRE usar init_point
                # Isso evita o erro "Uma das partes é de teste"
                if is_test:
                    redirect_url = sandbox_init_point or init_point
                    if not redirect_url:
                        logger.error("Nenhum init_point disponível em modo TEST")
                        return None
                else:
                    redirect_url = init_point or sandbox_init_point
                    if not redirect_url:
                        logger.error("Nenhum init_point disponível em modo PRODUÇÃO")
                        return None
                
                return {
                    "preference_id": preference.get("id"),
                    "init_point": redirect_url,
                    "status": "pending"
                }
            else:
                error_detail = preference_response.get("response", {})
                error_message = error_detail.get("message", "Erro desconhecido")
                logger.error(f"Erro ao criar preferência: {error_message}")
                raise ValueError(f"Erro ao criar preferência no Mercado Pago: {error_message}")
                
        except Exception as e:
            logger.error(f"Exceção ao criar preferência: {str(e)}")
            return None
    
    def criar_pagamento_pix(self, pedido, usuario, plano):
        """
        DEPRECATED: Use criar_checkout_preference ao invés disso
        Mantido para compatibilidade
        """
        return self.criar_checkout_preference(pedido, usuario, plano, 'pix')
    
    def criar_pagamento_cartao(self, pedido, usuario, plano, token, installments=1, payment_method_id="visa"):
        """
        Cria um pagamento com cartão de crédito via Mercado Pago
        
        Args:
            pedido: Instância do modelo Pedido
            usuario: Instância do modelo Usuario
            plano: Instância do modelo Plano
            token: Token do cartão gerado pelo frontend
            installments: Número de parcelas
            payment_method_id: ID do método de pagamento (visa, mastercard, etc)
            
        Returns:
            dict: Dados do pagamento criado ou None em caso de erro
        """
        try:
            payment_data = {
                "transaction_amount": float(pedido.valor),
                "token": token,
                "description": f"Plano {plano.nome} - {plano.duracao_dias} dias",
                "installments": installments,
                "payment_method_id": payment_method_id,
                "payer": {
                    "email": usuario.email,
                },
                "external_reference": str(pedido.id_publico),
                "notification_url": f"{getattr(settings, 'MERCADOPAGO_WEBHOOK_URL', 'http://localhost:8000')}/api/payments/mercadopago/webhook/",
                "statement_descriptor": "ATHLETECH"
            }
            
            sdk = self._get_sdk()
            payment_response = sdk.payment().create(payment_data)
            
            if payment_response["status"] == 201:
                payment = payment_response["response"]
                
                pedido.mercado_pago_payment_id = payment.get("id")
                pedido.mercado_pago_status = payment.get("status")
                pedido.save()
                
                return {
                    "payment_id": payment.get("id"),
                    "status": payment.get("status"),
                    "status_detail": payment.get("status_detail"),
                }
            else:
                logger.error(f"Erro ao criar pagamento cartão: {payment_response}")
                return None
                
        except Exception as e:
            logger.error(f"Exceção ao criar pagamento cartão: {str(e)}")
            return None
    
    def consultar_pagamento(self, payment_id):
        """
        Consulta o status de um pagamento no Mercado Pago
        
        Args:
            payment_id: ID do pagamento no Mercado Pago
            
        Returns:
            dict: Dados do pagamento ou None
        """
        try:
            sdk = self._get_sdk()
            payment_response = sdk.payment().get(payment_id)
            
            if payment_response["status"] == 200:
                return payment_response["response"]
            else:
                logger.error(f"Erro ao consultar pagamento: {payment_response}")
                return None
                
        except Exception as e:
            logger.error(f"Exceção ao consultar pagamento: {str(e)}")
            return None
    
    def buscar_pagamentos_por_preference(self, preference_id):
        """
        Busca pagamentos relacionados a uma preferência (Checkout Pro)
        
        Args:
            preference_id: ID da preferência no Mercado Pago
            
        Returns:
            list: Lista de pagamentos ou None
        """
        try:
            sdk = self._get_sdk()
            # Buscar pagamentos usando filtro de preference_id
            filters = {"preference_id": preference_id}
            search_response = sdk.payment().search(filters=filters)
            
            if search_response["status"] == 200:
                results = search_response.get("response", {})
                payments = results.get("results", [])
                logger.info(f"Encontrados {len(payments)} pagamento(s) para preference_id: {preference_id}")
                return payments
            else:
                logger.error(f"Erro ao buscar pagamentos por preference: {search_response}")
                return None
                
        except Exception as e:
            logger.error(f"Exceção ao buscar pagamentos por preference: {str(e)}")
            return None
    
    def buscar_pagamentos_por_external_reference(self, external_reference):
        """
        Busca pagamentos por external_reference (ID público do pedido)
        
        Args:
            external_reference: ID público do pedido (UUID)
            
        Returns:
            list: Lista de pagamentos ou None
        """
        try:
            sdk = self._get_sdk()
            # Buscar pagamentos usando filtro de external_reference
            filters = {"external_reference": str(external_reference)}
            search_response = sdk.payment().search(filters=filters)
            
            if search_response["status"] == 200:
                results = search_response.get("response", {})
                payments = results.get("results", [])
                logger.info(f"Encontrados {len(payments)} pagamento(s) para external_reference: {external_reference}")
                return payments
            else:
                logger.error(f"Erro ao buscar pagamentos por external_reference: {search_response}")
                return None
                
        except Exception as e:
            logger.error(f"Exceção ao buscar pagamentos por external_reference: {str(e)}")
            return None
    
    def criar_assinatura(self, pedido, usuario, plano, token=None, payment_method_id="visa"):
        """
        Cria uma assinatura recorrente via Mercado Pago usando Checkout Pro
        Redireciona o usuário para o site do Mercado Pago
        
        Args:
            pedido: Instância do modelo Pedido
            usuario: Instância do modelo Usuario
            plano: Instância do modelo Plano
            token: Token do cartão (não usado mais, mantido para compatibilidade)
            payment_method_id: ID do método de pagamento (não usado mais)
            
        Returns:
            dict: Dados da preferência criada com init_point ou None em caso de erro
        """
        # Para assinaturas, vamos usar o Checkout Pro também
        # O Mercado Pago gerencia a recorrência após o primeiro pagamento
        return self.criar_checkout_preference(pedido, usuario, plano, 'cartao')
    
    def _calcular_frequencia(self, duracao_dias):
        """
        Calcula a frequência de cobrança baseado na duração do plano
        
        Args:
            duracao_dias: Duração do plano em dias
            
        Returns:
            int: Frequência em meses (1 = mensal, 3 = trimestral, 12 = anual)
        """
        if duracao_dias <= 35:
            return 1  # Mensal
        elif duracao_dias <= 95:
            return 3  # Trimestral
        elif duracao_dias <= 370:
            return 12  # Anual
        else:
            return 1  # Default mensal
    
    def consultar_assinatura(self, subscription_id):
        """
        Consulta o status de uma assinatura no Mercado Pago
        
        Args:
            subscription_id: ID da assinatura no Mercado Pago
            
        Returns:
            dict: Dados da assinatura ou None
        """
        try:
            sdk = self._get_sdk()
            subscription_response = sdk.preapproval().get(subscription_id)
            
            if subscription_response["status"] == 200:
                return subscription_response["response"]
            else:
                logger.error(f"Erro ao consultar assinatura: {subscription_response}")
                return None
                
        except Exception as e:
            logger.error(f"Exceção ao consultar assinatura: {str(e)}")
            return None
    
    def cancelar_assinatura(self, subscription_id):
        """
        Cancela uma assinatura no Mercado Pago
        
        Args:
            subscription_id: ID da assinatura no Mercado Pago
            
        Returns:
            dict: Resultado do cancelamento ou None
        """
        try:
            sdk = self._get_sdk()
            cancel_data = {"status": "cancelled"}
            cancel_response = sdk.preapproval().update(subscription_id, cancel_data)
            
            if cancel_response["status"] == 200:
                return cancel_response["response"]
            else:
                logger.error(f"Erro ao cancelar assinatura: {cancel_response}")
                return None
                
        except Exception as e:
            logger.error(f"Exceção ao cancelar assinatura: {str(e)}")
            return None
    
    def processar_webhook(self, data):
        """
        Processa notificação de webhook do Mercado Pago
        Suporta Checkout Pro (preference), pagamentos únicos e assinaturas
        
        Args:
            data: Dados recebidos do webhook
            
        Returns:
            dict: Resultado do processamento
        """
        try:
            # Verificar tipo de webhook
            type_event = data.get("type", "")
            action = data.get("action", "")
            data_id = data.get("data", {}).get("id")
            
            # Webhook de Checkout Pro (preference) - quando pagamento é aprovado
            if "payment" in type_event or action == "payment" or (data_id and not type_event):
                payment = self.consultar_pagamento(data_id)
                
                if not payment:
                    return {"success": False, "message": "Pagamento não encontrado"}
                
                external_ref = payment.get("external_reference")
                if not external_ref:
                    # Tentar buscar pelo preference_id se não tiver external_reference
                    preference_id = payment.get("preference_id")
                    if preference_id:
                        try:
                            from django.apps import apps
                            Pedido = apps.get_model('academia', 'Pedido')
                            # Buscar pelo preference_id
                            pedido = Pedido.objects.filter(mercado_pago_preference_id=str(preference_id)).first()
                            if not pedido:
                                # Tentar buscar pelo payment_id se for numérico (fallback)
                                try:
                                    pedido = Pedido.objects.filter(mercado_pago_payment_id=int(preference_id)).first()
                                except (ValueError, TypeError):
                                    pass
                            if pedido:
                                external_ref = str(pedido.id_publico)
                                # IMPORTANTE: Atualizar com o payment_id real se ainda não estiver salvo
                                payment_id = payment.get("id")
                                if payment_id:
                                    try:
                                        payment_id_int = int(payment_id) if str(payment_id).isdigit() else None
                                        if payment_id_int and not pedido.mercado_pago_payment_id:
                                            pedido.mercado_pago_payment_id = payment_id_int
                                            logger.info(f"Payment ID {payment_id_int} salvo no pedido {pedido.id_publico}")
                                    except (ValueError, TypeError) as e:
                                        logger.warning(f"Erro ao converter payment_id: {e}")
                                    pedido.mercado_pago_status = payment.get("status")
                                    pedido.mercado_pago_status_detail = payment.get("status_detail", "")
                                    pedido.save()
                        except Exception as e:
                            logger.warning(f"Erro ao buscar pedido por preference_id: {e}")
                            pass
                
                if external_ref:
                    try:
                        from django.apps import apps
                        Pedido = apps.get_model('academia', 'Pedido')
                        pedido = Pedido.objects.get(id_publico=external_ref)
                        if pedido.is_subscription:
                            return {
                                "success": True,
                                "type": "subscription_payment",
                                "payment_id": data_id,
                                "status": payment.get("status"),
                                "status_detail": payment.get("status_detail"),
                                "external_reference": external_ref,
                            }
                    except Exception:
                        pass
                
                return {
                    "success": True,
                    "type": "payment",
                    "payment_id": data_id,  # ID do pagamento do Mercado Pago
                    "status": payment.get("status"),
                    "status_detail": payment.get("status_detail"),
                    "external_reference": external_ref or payment.get("external_reference"),
                }
            
            # Webhook de assinatura (preapproval)
            if "preapproval" in type_event or action == "preapproval":
                if not data_id:
                    return {"success": False, "message": "Subscription ID não encontrado"}
                
                subscription = self.consultar_assinatura(data_id)
                
                if not subscription:
                    return {"success": False, "message": "Assinatura não encontrada"}
                
                return {
                    "success": True,
                    "type": "subscription",
                    "subscription_id": data_id,
                    "status": subscription.get("status"),
                    "external_reference": subscription.get("external_reference"),
                }
            
            return {"success": False, "message": "Tipo de webhook não reconhecido"}
            
        except Exception as e:
            logger.error(f"Exceção ao processar webhook: {str(e)}")
            return {"success": False, "message": str(e)}

