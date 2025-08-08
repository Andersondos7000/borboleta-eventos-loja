import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust for production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log("create-order function started.");

  // Handle preflight CORS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, customer, billing, items } = await req.json();
    const abacateApiKey = Deno.env.get('ABACATEPAY_API_KEY');

    console.log(`ABACATEPAY_API_KEY loaded: ${!!abacateApiKey}`);

    if (!abacateApiKey) {
      throw new Error('Missing ABACATEPAY_API_KEY');
    }

    // Create PIX QR Code on AbacatePay
    const abacateResponse = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${abacateApiKey}`,
      },
      body: JSON.stringify({
        amount: amount, // Amount in cents
        description: 'Pagamento de pedido',
        expiresIn: 3600, // 1 hour expiration
        customer: customer ? {
          name: customer.name,
          cellphone: customer.phone,
          email: customer.email,
          taxId: customer.cpf
        } : undefined
      }),
    });

    const abacateData = await abacateResponse.json();

    console.log('AbacatePay Response Status:', abacateResponse.status);
    console.log('AbacatePay Response Data:', JSON.stringify(abacateData, null, 2));

    if (!abacateResponse.ok) {
      console.error('AbacatePay Error:', abacateData);
      throw new Error(abacateData.message || 'Failed to create charge on AbacatePay');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert order into your database
    const { data: orderData, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: customer.id || null, // Allow null for guest orders
        amount: amount,
        status: 'pending',
        abacate_charge_id: abacateData.data.id,
        customer_data: customer,
        billing_data: billing,
        items: items || []
      })
      .select()
      .single();

    if (orderError) {
      console.error('Supabase Error:', orderError);
      throw orderError;
    }

    // Return order data with PIX information
    const responseData = { 
      order: orderData, 
      charge: abacateData.data,
      pixData: {
        qrCodeUrl: abacateData.data.brCodeBase64,
        pixCode: abacateData.data.brCode,
        amount: abacateData.data.amount,
        expiresAt: abacateData.data.expiresAt
      }
    };
    
    console.log('Final Response Data:', JSON.stringify(responseData, null, 2));
    
    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error('Error in create-order function:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});