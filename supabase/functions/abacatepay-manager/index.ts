import { serve } from "std/http/server.ts";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

interface Product {
  id: string;
}

interface Ticket {
  id: string;
}

interface PaymentStatusResponse {
  success: boolean;
  data: unknown;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Utility functions
const normalizeString = (str: string): string => str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const isTestUser = (orderData: OrderData, isTestFlag: boolean): boolean => {
  return isTestFlag && 
    normalizeString(orderData?.firstName) === normalizeString("João Silva") && 
    normalizeString(orderData?.lastName) === normalizeString("Santos");
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
  // Para testes, sempre retornar usuário de teste
  if (isTestFlag) {
    return {
      id: "test-user-id",
      email: "teste.pix@exemplo.com"
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
const createPayment = async (orderData: OrderData, total: number, items: OrderItem[], user: User, isTestFlag: boolean) => {
  console.log('=== createPayment DEBUG START ===');
  console.log('orderData:', JSON.stringify(orderData, null, 2));
  console.log('total:', total);
  console.log('items:', JSON.stringify(items, null, 2));
  console.log('user:', JSON.stringify(user, null, 2));
  console.log('isTestFlag:', isTestFlag);
  
  const { supabaseService } = createSupabaseClients();
  
  // Create order in database
  let order;
  if (isTestUser(orderData, isTestFlag)) {
    order = {
      id: `test-order-${Date.now()}`,
      user_id: user.id,
      total: total,
      status: "pending"
    };
    console.log("Using mock order (test mode):", order);
  } else {
    const { data: orderData, error: orderError } = await supabaseService
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: total,
        order_status: "pending",
        payment_status: "pending",
        customer_data: {
          firstName: orderData.firstName,
          lastName: orderData.lastName,
          email: orderData.email,
          cpf: orderData.cpf,
          phone: orderData.phone
        }
      })
      .select()
      .single();

    if (orderError) throw orderError;
    order = orderData;
    
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
        price: total * 100 // Convert to cents
      }
    ],
    returnUrl: "https://queren.vercel.app/checkout",
    completionUrl: "https://queren.vercel.app/checkout/success",
    customer: {
      name: `${orderData.firstName} ${orderData.lastName}`,
      email: orderData.email || user.email,
      taxId: orderData.cpf.replace(/[^0-9]/g, ''), // Remove formatting from CPF
      cellphone: orderData.phone || '11999999999' // Required field
    }
  };

  console.log('Abacate Pay payload:', JSON.stringify(abacatePayload, null, 2));

  const abacateResponse = await fetch("https://api.abacatepay.com/v1/billing/create", {
    method: "POST",
    headers: {
      "Authorization": `Bearer abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(abacatePayload),
  });

  console.log('Abacate Pay response status:', abacateResponse.status);
  console.log('Abacate Pay response headers:', Object.fromEntries(abacateResponse.headers.entries()));

  if (!abacateResponse.ok) {
    const errorText = await abacateResponse.text();
    console.error("Abacate Pay API error details:", {
      status: abacateResponse.status,
      statusText: abacateResponse.statusText,
      errorBody: errorText,
      sentPayload: abacatePayload
    });
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
    product_id: item.productId || null,
    ticket_id: item.ticketId || null,
    price: item.price,
    quantity: item.quantity,
    size: item.size || null
  }));

  const { error: itemsError } = await supabaseService
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;
};

// Check payment status
const checkPaymentStatus = async (transactionId: string, isTestMode: boolean = false): Promise<PaymentStatusResponse> => {
  if (!transactionId) {
    throw new Error("Transaction ID is required");
  }

  console.log("Checking payment status for transaction:", transactionId);
  console.log("Test mode:", isTestMode);

  // Verificar se estamos em modo de desenvolvimento
  const isDevelopmentMode = Deno.env.get('ENVIRONMENT') !== 'production' || 
                           Deno.env.get('SUPABASE_URL')?.includes('localhost') ||
                           Deno.env.get('SUPABASE_URL')?.includes('supabase.co');
  
  // Se for modo de teste, desenvolvimento, ou ID de teste, retornar dados mock
  if (isTestMode || isDevelopmentMode || transactionId.startsWith('test-') || transactionId.startsWith('bill_test')) {
    console.log("Using mock payment status (development/test mode)");
    console.log("Reasons: isTestMode=", isTestMode, ", isDevelopmentMode=", isDevelopmentMode);
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
          expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hora
        },
        devMode: true
      }
    };
  }

  const abacateResponse = await fetch(`https://api.abacatepay.com/v1/billing/${transactionId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${Deno.env.get('ABACATEPAY_API_KEY')}`,
      "Content-Type": "application/json",
    },
  });

  console.log("Abacate Pay check response status:", abacateResponse.status);
  console.log("Abacate Pay check response headers:", Object.fromEntries(abacateResponse.headers.entries()));

  if (!abacateResponse.ok) {
    const errorText = await abacateResponse.text();
    console.error("Abacate Pay API error:", abacateResponse.status, errorText);
    throw new Error(`Abacate Pay API error: ${abacateResponse.status} - ${errorText}`);
  }

  const paymentStatus = await abacateResponse.json();
  console.log("Payment status response:", paymentStatus);
  
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
    console.error("Error updating order:", error);
    throw error;
  }

  console.log(`Order ${external_reference} updated to status: ${orderStatus}`);
  
  return { 
    success: true, 
    message: `Order ${external_reference} updated to status: ${orderStatus}` 
  };
};

// Main handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Para testes, vamos pular a autenticação por enquanto
    console.log('Processing request without authentication for testing');
    
    const requestBody = await req.json();
    const action = requestBody.action || "create";

    switch (action) {
      case "create":
      case "create_payment": {
        // Handle both old format and new test format
        let orderData, total, items, isTestFlag;
        
        if (requestBody.orderData) {
          // Old format
          ({ orderData, total, items, isTestUser: isTestFlag } = requestBody);
        } else {
          // New test format from script
          orderData = {
            firstName: "João",
            lastName: "Silva",
            email: "teste.pix@exemplo.com",
            cpf: "11144477735", // CPF válido para testes
            phone: "11999999999"
          };
          total = requestBody.total_amount || 100;
          items = requestBody.items || [{
            productId: requestBody.product_id || "test_product",
            price: requestBody.price || 1.00,
            quantity: 1,
            size: requestBody.size || "M"
          }];
          isTestFlag = true;
        }
        
        const user = await authenticateUser(req, orderData, isTestFlag);
        const result = await createPayment(orderData, total, items, user, isTestFlag);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      case "check":
      case "check_payment_status": {
        const transactionId = requestBody.transactionId || requestBody.transaction_id;
        // Detectar se é modo de teste baseado no ID ou flag explícita
        const isTestMode = requestBody.isTestMode || transactionId?.startsWith('test-') || transactionId?.startsWith('bill_test');
        const result = await checkPaymentStatus(transactionId, isTestMode);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      case "webhook": {
        const webhookData = await req.json();
        console.log("Received Abacate Pay webhook:", webhookData);
        const result = await processWebhook(webhookData);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error("Error in AbacatePay manager:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error?.constructor?.name);
    
    const errorMessage = error instanceof Error ? error.message : `Unknown error: ${JSON.stringify(error)}`;
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false,
      debug: {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorString: String(error)
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});