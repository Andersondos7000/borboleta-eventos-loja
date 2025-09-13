import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the user with the token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token or user not found' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody));
    
    const { product_id, ticket_id, quantity, size, unit_price } = requestBody;

    // Validate required fields
    if (!quantity || quantity <= 0) {
      console.log('Invalid quantity:', quantity);
      return new Response(
        JSON.stringify({ error: 'Invalid quantity' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!product_id && !ticket_id) {
      console.log('Missing product_id and ticket_id');
      return new Response(
        JSON.stringify({ error: 'Either product_id or ticket_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate unit_price
    console.log('unit_price validation:', { unit_price, type: typeof unit_price });
    if (unit_price === undefined || unit_price === null || isNaN(Number(unit_price)) || Number(unit_price) < 0) {
      console.log('Invalid unit_price detected:', unit_price);
      return new Response(
        JSON.stringify({ error: `Invalid unit_price: must be a non-negative number. Received: ${unit_price} (${typeof unit_price})` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate total_price
    const totalPrice = Number(unit_price) * Number(quantity);
    
    // Prepare insert data based on whether it's a product or ticket
    const insertData: any = {
      user_id: user.id,
      quantity,
      unit_price: unit_price,
      total_price: totalPrice,
      size: size || null
    };

    // Add product_id or ticket_id (only include the one that's not null)
    if (product_id) {
      insertData.product_id = product_id;
      // Don't include ticket_id when we have product_id
    } else if (ticket_id) {
      insertData.ticket_id = ticket_id;
      // Don't include product_id when we have ticket_id
    }

    // Insert into cart_items table
    const { data, error } = await supabaseClient
      .from('cart_items')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to add item to cart', details: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});