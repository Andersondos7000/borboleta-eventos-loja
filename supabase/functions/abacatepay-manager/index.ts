import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Types
interface User {
  id: string;
  email: string;
}

interface OrderData {
  firstName: string;
  lastName: string;
  email?: string;
  cpf: string;
  phone?: string;
}

interface OrderItem {
  productId?: string;
  ticketId?: string;
  price: number;
  quantity: number;
  size?: string;
}

interface WebhookData {
  external_reference: string;
  status: string;
  [key: string]: unknown;
}

interface PaymentStatusResponse {
  success: boolean;
  data: unknown;
}

interface AbacatePayResponse {
  id: string;
  url: string;
  status: string;
  amount: number;
  customer: {
    name: string;
    email: string;
    taxId: string;
    cellphone: string;
  };
  expiresAt: string;
  qrCode?: string;
}

// Utility functions
const normalizeString = (str: string): string => str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const isTestUser = (orderData: OrderData, isTestFlag: boolean): boolean => {
  return isTestFlag || 
    (normalizeString(orderData?.firstName) === normalizeString("João") && 
     normalizeString(orderData?.lastName) === normalizeString("Silva"));
};

const isDevelopmentMode = (): boolean => {
  return Deno.env.get('ENVIRONMENT') !== 'production' || 
         Deno.env.get('SUPABASE_URL')?.includes('localhost') ||
         Deno.env.get('SUPABASE_URL')?.includes('supabase.co');
};

const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '(11) 99999-9999';
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
};

const formatCPF = (cpf: string): string => {
  return cpf.replace(/[^0-9]/g, '');
};

const createSupabaseClients = (): { supabaseClient: SupabaseClient; supabaseService: SupabaseClient } => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
  
  return { supabaseClient, supabaseService };
};

// Authentication handler
const authenticateUser = async (req: Request, orderData: OrderData, isTestFlag: boolean): Promise<User> => {
  // Para testes ou modo desenvolvimento, sempre retornar usuário de teste
  if (isTestFlag || isDevelopmentMode()) {
    return {
      id: "test-user-id",
      email: orderData.email || "teste.pix@exemplo.com"
    };
  }
  
  const { supabaseClient } = createSupabaseClients();
  const authHeader = req.headers.get("Authorization");
  
  // If no auth header, create guest user
  if (!authHeader) {
    return {
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: orderData.email || `guest-${Date.now()}@temp.com`
    };
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseClient.auth.getUser(token);
  
  // If token is invalid, create guest user
  if (error || !data.user) {
    return {
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: orderData.email || `guest-${Date.now()}@temp.com`
    };
  }
  
  return {
    id: data.user.id,
    email: data.user.email || ""
  };
};

// Payment creation handler
const createPayment = async (orderData: OrderData, total: number, items: OrderItem[], user: User, isTestFlag: boolean, req?: Request) => {
  const { supabaseService } = createSupabaseClients();
  
  // Get API key from environment or header
  let apiKey = Deno.env.get('ABACATEPAY_API_KEY');
  if (!apiKey && req) {
    apiKey = req.headers.get('ABACATEPAY_API_KEY');
  }
  if (!apiKey) {
    throw new Error('ABACATEPAY_API_KEY not configured in environment or headers');
  }
  
  // Create order in database
  let order;
  if (isTestUser(orderData, isTestFlag)) {
    order = {
      id: `test-order-${Date.now()}`,
      user_id: user.id,
      total: total,
      status: "pending"
    };
  } else {
    const { data: newOrder, error: orderError } = await supabaseService
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: total,
        status: "pending",
        payment_status: "pending",
        order_number: `ORD-${Date.now()}`,
        subtotal: total,
        metadata: {
          customer: {
            firstName: orderData.firstName,
            lastName: orderData.lastName,
            email: orderData.email,
            cpf: orderData.cpf,
            phone: orderData.phone
          }
        }
      })
      .select()
      .single();

    if (orderError) throw orderError;
    order = newOrder;
    
    // Validate and insert order items
    await validateAndInsertOrderItems(supabaseService, items, order.id);
  }

  // Create payment with Abacate Pay
  const abacatePayload = {
    frequency: "ONE_TIME",
    methods: ["PIX"],
    products: [
      {
        externalId: `order-${order.id}`,
        name: `Pedido #${order.id}`,
        description: `Pedido realizado em ${new Date().toLocaleDateString('pt-BR')}`,
        quantity: 1,
        price: total * 100
      }
    ],
    returnUrl: "https://queren.vercel.app/checkout",
    completionUrl: "https://queren.vercel.app/checkout/success",
    customer: {
      name: `${orderData.firstName} ${orderData.lastName}`,
      email: orderData.email || user.email,
      taxId: orderData.cpf.replace(/[^0-9]/g, ''),
      cellphone: orderData.phone ? orderData.phone.replace(/[^0-9]/g, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : '(11) 99999-9999'
    },
    allowCoupons: false
  };

  const abacateResponse = await fetch("https://api.abacatepay.com/v1/billing/create", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(abacatePayload),
  });

  if (!abacateResponse.ok) {
    const errorText = await abacateResponse.text();
    throw new Error(`Abacate Pay API error: ${abacateResponse.status} - ${errorText}`);
  }

  const paymentData = await abacateResponse.json();

  // Update order status (skip for test users)
  if (!isTestUser(orderData, isTestFlag)) {
    await supabaseService
      .from("orders")
      .update({ 
        order_status: "confirmed",
        payment_status: "awaiting_payment",
        payment_id: paymentData.id,
        payment_method: "pix"
      })
      .eq("id", order.id);
  }

  return {
    success: true,
    orderId: order.id,
    paymentData: paymentData
  };
};

// Validate and insert order items
const validateAndInsertOrderItems = async (supabaseService: SupabaseClient, items: OrderItem[], orderId: string) => {
  const productIds = items.filter((item: OrderItem) => item.productId).map((item: OrderItem) => item.productId);
  const ticketIds = items.filter((item: OrderItem) => item.ticketId).map((item: OrderItem) => item.ticketId);
  
  // Validate products exist
  if (productIds.length > 0) {
    const { data: existingProducts, error: productCheckError } = await supabaseService
      .from("products")
      .select("id")
      .in("id", productIds);
    
    if (productCheckError) throw productCheckError;
    
    const existingProductIds = existingProducts?.map((p: Product) => p.id) || [];
    const missingProducts = productIds.filter((id: string) => !existingProductIds.includes(id));
    
    if (missingProducts.length > 0) {
      throw new Error(`Products not found: ${missingProducts.join(', ')}`);
    }
  }
  
  // Validate tickets exist
  if (ticketIds.length > 0) {
    const { data: existingTickets, error: ticketCheckError } = await supabaseService
      .from("tickets")
      .select("id")
      .in("id", ticketIds);
    
    if (ticketCheckError) throw ticketCheckError;
    
    const existingTicketIds = existingTickets?.map((t: Ticket) => t.id) || [];
    const missingTickets = ticketIds.filter((id: string) => !existingTicketIds.includes(id));
    
    if (missingTickets.length > 0) {
      throw new Error(`Tickets not found: ${missingTickets.join(', ')}`);
    }
  }

  // Insert order items
  const orderItems = items.map((item: OrderItem) => ({
    order_id: orderId,
    product_id: item.productId || 'b140f554-6145-4935-828c-7162d4d05140', // Produto Teste
    ticket_id: item.ticketId || null,
    product_name: `Produto ${item.productId || 'Test'}`,
    unit_price: item.price,
    quantity: item.quantity,
    product_size: item.size || null
  }));

  const { error: itemsError } = await supabaseService
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;
};

// Check payment status
const checkPaymentStatus = async (transactionId: string, isTestMode: boolean = false, req?: Request): Promise<PaymentStatusResponse> => {
  if (!transactionId) {
    throw new Error("Transaction ID is required");
  }
  
  // Get API key from environment or header
  let apiKey = Deno.env.get('ABACATEPAY_API_KEY');
  if (!apiKey && req) {
    apiKey = req.headers.get('ABACATEPAY_API_KEY');
  }
  if (!apiKey) {
    throw new Error('ABACATEPAY_API_KEY not configured in environment or headers');
  }

  // Se for modo de teste, desenvolvimento, ou ID de teste, retornar dados mock
  if (isTestMode || isDevelopmentMode() || transactionId.startsWith('test-') || transactionId.startsWith('bill_test')) {
    return {
      success: true,
      data: {
        id: transactionId,
        status: "PENDING",
        amount: 100,
        currency: "BRL",
        created_at: new Date().toISOString(),
        payment_method: "PIX",
        customer: {
          name: "João Silva Santos",
          email: "teste.pix@exemplo.com",
          cpf: "11144477735"
        },
        pix: {
          qr_code: "00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-426614174000520400005303986540510.005802BR5913TESTE EMPRESA6009SAO PAULO62070503***6304ABCD",
          expires_at: new Date(Date.now() + 3600000).toISOString()
        },
        devMode: true
      }
    };
  }

  const abacateResponse = await fetch(`https://api.abacatepay.com/v1/billing/${transactionId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!abacateResponse.ok) {
    const errorText = await abacateResponse.text();
    throw new Error(`Abacate Pay API error: ${abacateResponse.status} - ${errorText}`);
  }

  const paymentStatus = await abacateResponse.json();
  
  return {
    success: true,
    data: paymentStatus
  };
};

// Process webhook
const processWebhook = async (webhookData: WebhookData): Promise<{ success: boolean; message: string }> => {
  const { supabaseService } = createSupabaseClients();
  const { external_reference, status } = webhookData;
  
  if (!external_reference) {
    throw new Error("Missing external_reference in webhook data");
  }

  // Map payment status to order and payment status
  let orderStatus = "pending";
  let paymentStatus = "pending";
  
  switch (status) {
    case "paid":
      orderStatus = "confirmed";
      paymentStatus = "paid";
      break;
    case "failed":
    case "cancelled":
      orderStatus = "cancelled";
      paymentStatus = "failed";
      break;
    case "pending":
      orderStatus = "pending";
      paymentStatus = "awaiting_payment";
      break;
  }

  // Update order in database
  const { error } = await supabaseService
    .from("orders")
    .update({
      order_status: orderStatus,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", external_reference);

  if (error) {
    throw error;
  }
  
  return { 
    success: true, 
    message: `Order ${external_reference} updated to status: ${orderStatus}` 
  };
};

// Main handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, orderData, items, transactionId, webhookData, forceTestMode } = await req.json();
    
    // Determine if we're in test mode
    const isTestFlag = forceTestMode === true || isTestUser(orderData, forceTestMode === true);
    
    // Authenticate user (handles test mode internally)
    const user = await authenticateUser(req, orderData, isTestFlag);
    
    let result;
    
    switch (action) {
      case "create":
        case "create_payment":
          result = await createPayment(orderData, totalAmount, items, user, isTestFlag, req);
          break;
        
        case "check":
        case "check_payment_status":
          result = await checkPaymentStatus(transactionId, isTestFlag, req);
          break;
      
      case "webhook":
        result = await processWebhook(webhookData);
        break;
      
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});