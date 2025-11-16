Feature: Plataforma de Ingressos e Loja 
 
 Objetivos 
 - Autenticação de usuários e proteção de rotas 
 - Catálogo de produtos (roupas e ingressos) e detalhes 
 - Carrinho e checkout com cálculo de totais e termos 
 - Pagamentos via AbacatePay com QR Code Pix 
 - Confirmação de pagamento e emissão de tickets 
 - Webhooks AbacatePay: processamento e reconciliação 
 - Painéis administrativos: estoque, pedidos, desempenho 
 - Sincronização em tempo real e modo offline-first 
 
 Requisitos Funcionais 
 - Login/logout, recuperação de senha 
 - Listagem, filtragem e visualização de produtos 
 - Adição/remoção de itens no carrinho 
 - Coleta de informações do cliente e participantes 
 - Geração de QR Code e status do pagamento 
 - Atualização de pedidos via webhooks 
 - Visualização de pedidos recentes e controle de tickets 
 
 Requisitos Não Funcionais 
 - Performance aceitável em Vite/React 
 - Observabilidade com logs estruturados 
 - Testes unitários e de integração 
 - Segurança: sem exposição de segredos em logs 
 
 Integrações 
 - Supabase (Postgres) 
 - AbacatePay (API e webhooks) 
 
 Fluxos Críticos 
 - Checkout e pagamento 
 - Processamento de webhooks e reconciliação