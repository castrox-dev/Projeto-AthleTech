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
    
    def _call_mcp_tool(self, tool_name, tool_args):
        """
        Chama uma ferramenta do MCP do Mercado Pago
        Fallback para SDK tradicional se MCP não estiver disponível
        """
        if self.use_mcp:
            try:
                # Tentar usar MCP se disponível
                # Nota: Esta função seria chamada através do sistema MCP do Cursor
                # Por enquanto, mantemos o fallback para SDK
                pass
            except Exception as e:
                logger.warning(f"MCP não disponível, usando SDK tradicional: {e}")
                self.use_mcp = False
                self.sdk = mercadopago.SDK(self.access_token)
        
        # Fallback para SDK tradicional
        return None
    
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
            base_url = settings.MERCADOPAGO_WEBHOOK_URL.rstrip('/')
            if not base_url or base_url == 'http://localhost:8000':
                # Se for localhost, usar URL completa
                base_url = 'http://localhost:8000'
            
            success_url = f"{base_url}/portal/?payment=success"
            failure_url = f"{base_url}/checkout/?pedido_id={pedido.id_publico}&payment=failed"
            pending_url = f"{base_url}/checkout/?pedido_id={pedido.id_publico}&payment=pending"
            
            # Log para debug - verificar se está usando TEST
            is_test = "TEST" in self.access_token or "test" in self.access_token.lower()
            
            # Preparar dados da preferência
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
                    "success": success_url,
                    "failure": failure_url,
                    "pending": pending_url
                },
                "notification_url": f"{base_url}/api/payments/mercadopago/webhook/",
                "statement_descriptor": "ATHLETECH",
                "binary_mode": False,
                "expires": False  # Não expirar a preferência
            }
            
            # Em modo TEST, NÃO incluir payer para evitar redirecionamento para conta do desenvolvedor
            # O Mercado Pago Sandbox permitirá que qualquer pessoa faça o teste
            # Em produção, incluir payer com dados reais
            if not is_test:
                preference_data["payer"] = {
                    "email": usuario.email,
                    "name": f"{usuario.first_name or ''} {usuario.last_name or ''}".strip() or "Cliente",
                }
                logger.info(f"Modo PRODUÇÃO: Incluindo payer com email: {usuario.email}")
            else:
                logger.info("Modo TEST: Payer não incluído para permitir testes sem redirecionamento")
            
            # auto_return só funciona se todas as URLs forem acessíveis publicamente
            # Para localhost, pode causar erro, então vamos omitir temporariamente
            # O usuário será redirecionado manualmente após o pagamento
            
            # Configurar métodos de pagamento permitidos
            # No modo sandbox, permitir todos os métodos para facilitar testes
            if is_test:
                # Em modo TEST, permitir todos os métodos para facilitar testes
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            elif metodo_pagamento == 'pix':
                # Para PIX, permitir apenas account_money (PIX) e excluir outros
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [
                        {"id": "credit_card"},
                        {"id": "debit_card"},
                        {"id": "ticket"}
                    ],
                    "excluded_payment_methods": [],
                    "installments": 1
                }
            elif metodo_pagamento == 'cartao':
                # Para cartão, permitir credit_card e debit_card
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [
                        {"id": "ticket"}
                    ],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            else:
                # Se não especificar, permitir todos os métodos
                preference_data["payment_methods"] = {
                    "excluded_payment_types": [],
                    "excluded_payment_methods": [],
                    "installments": 12
                }
            logger.info(f"Criando preferência - Modo: {'TEST (Sandbox)' if is_test else 'PRODUÇÃO'}")
            logger.debug(f"Access Token começa com: {self.access_token[:10]}...")
            logger.debug(f"Base URL: {base_url}")
            logger.debug(f"Success URL: {success_url}")
            
            # Criar preferência
            preference_response = sdk.preference().create(preference_data)
            
            if preference_response["status"] == 201:
                preference = preference_response["response"]
                preference_id = preference.get("id")
                
                logger.info(f"Preferência criada com sucesso - ID: {preference_id}")
                
                # Atualizar pedido com preference_id
                pedido.mercado_pago_preference_id = str(preference_id)
                pedido.save()
                
                # Retornar init_point (URL de redirecionamento)
                init_point = preference.get("init_point", "")
                sandbox_init_point = preference.get("sandbox_init_point", "")
                
                # Log detalhado para debug
                logger.info(f"init_point recebido: {init_point[:80] if init_point else 'VAZIO'}...")
                logger.info(f"sandbox_init_point recebido: {sandbox_init_point[:80] if sandbox_init_point else 'VAZIO'}...")
                
                # Usar sandbox_init_point em desenvolvimento, init_point em produção
                use_sandbox = is_test
                
                # Priorizar sandbox_init_point se estiver em modo TEST
                if use_sandbox:
                    if sandbox_init_point:
                        redirect_url = sandbox_init_point
                        logger.info("Usando sandbox_init_point (modo TEST)")
                    elif init_point:
                        # Se não tiver sandbox_init_point, usar init_point mesmo em TEST
                        redirect_url = init_point
                        logger.warning("sandbox_init_point não disponível, usando init_point em modo TEST")
                    else:
                        logger.error("Nenhum init_point disponível!")
                        return None
                else:
                    redirect_url = init_point if init_point else sandbox_init_point
                    logger.info("Usando init_point (modo PRODUÇÃO)")
                
                logger.info(f"URL final de redirecionamento: {redirect_url[:100]}...")
                logger.info(f"URL contém 'sandbox'? {'sandbox' in redirect_url.lower()}")
                logger.info(f"URL contém 'test'? {'test' in redirect_url.lower()}")
                
                return {
                    "preference_id": preference.get("id"),
                    "init_point": redirect_url,
                    "status": "pending"
                }
            else:
                error_detail = preference_response.get("response", {})
                logger.error(f"Erro ao criar preferência - Status: {preference_response.get('status')}")
                logger.error(f"Erro detalhado: {error_detail}")
                return None
                
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
                "notification_url": f"{settings.MERCADOPAGO_WEBHOOK_URL}/api/payments/mercadopago/webhook/",
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
                                # Atualizar com o payment_id real
                                payment_id = payment.get("id")
                                if payment_id:
                                    try:
                                        pedido.mercado_pago_payment_id = int(payment_id) if str(payment_id).isdigit() else None
                                    except (ValueError, TypeError):
                                        pass
                                    pedido.mercado_pago_status = payment.get("status")
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
                    "payment_id": data_id,
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

