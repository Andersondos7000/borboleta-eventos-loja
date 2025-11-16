import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Manter conexões ativas para SSE
const activeConnections = new Map<string, ReadableStreamDefaultController>();

serve(async (req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { persistSession: false }
      }
    );

    // Endpoint para Server-Sent Events
    if (pathname === "/sse" && req.method === "GET") {
      const clientId = url.searchParams.get("clientId") || crypto.randomUUID();
      
      const stream = new ReadableStream({
        start(controller) {
          // Registrar conexão
          activeConnections.set(clientId, controller);
          
          // Enviar evento de conexão
          controller.enqueue(`data: ${JSON.stringify({
            type: "connected",
            clientId,
            timestamp: new Date().toISOString()
          })}\n\n`);

          // Configurar polling para mudanças na tabela webhooks
          const pollInterval = setInterval(async () => {
            try {
              const { data: webhooks, error } = await supabaseService
                .from("webhooks")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10);

              if (!error && webhooks) {
                controller.enqueue(`data: ${JSON.stringify({
                  type: "webhooks_update",
                  data: webhooks,
                  timestamp: new Date().toISOString()
                })}\n\n`);
              }
            } catch (err) {
              console.error("Polling error:", err);
            }
          }, 2000); // Poll a cada 2 segundos

          // Cleanup quando conexão fechar
          const cleanup = () => {
            clearInterval(pollInterval);
            activeConnections.delete(clientId);
          };

          // Detectar desconexão
          req.signal?.addEventListener("abort", cleanup);
        },
        
        cancel() {
          activeConnections.delete(clientId);
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Endpoint para notificar mudanças (chamado por outras Edge Functions)
    if (pathname === "/notify" && req.method === "POST") {
      const notification = await req.json();
      
      // Enviar para todas as conexões ativas
      for (const [clientId, controller] of activeConnections) {
        try {
          controller.enqueue(`data: ${JSON.stringify({
            type: "notification",
            data: notification,
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (err) {
          console.error(`Error sending to client ${clientId}:`, err);
          activeConnections.delete(clientId);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        sentTo: activeConnections.size 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Endpoint para status das conexões
    if (pathname === "/status" && req.method === "GET") {
      return new Response(JSON.stringify({
        activeConnections: activeConnections.size,
        connections: Array.from(activeConnections.keys())
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Endpoint para buscar webhooks recentes
    if (pathname === "/webhooks" && req.method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      
      const { data: webhooks, error, count } = await supabaseService
        .from("webhooks")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({
        data: webhooks,
        count,
        limit,
        offset
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ 
      error: "Endpoint not found",
      availableEndpoints: ["/sse", "/notify", "/status", "/webhooks"]
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Edge Function error:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});