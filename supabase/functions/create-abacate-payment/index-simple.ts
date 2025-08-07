// Função Supabase Edge para criar pagamento PIX via AbacatePay REST API
// Endpoint oficial: https://api.abacatepay.com/v1/pixQrCode/create
// A chave da API deve estar em process.env.ABACATE_PAY_API_KEY
import { serve } from 'std/server';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }


  const apiKey = Deno.env.get('ABACATE_PAY_API_KEY');
  if (!apiKey) {
    console.error('API key não configurada');
    return new Response(JSON.stringify({ error: 'API key não configurada' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await req.json();
    console.log('Payload recebido:', body);
  } catch (e) {
    console.error('Erro ao fazer parse do JSON:', e);
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validação extra dos campos obrigatórios
  if (!body.value || !body.customer || !body.customer.email || !body.customer.name || !body.customer.document || !body.customer.phone) {
    console.error('Campos obrigatórios ausentes:', body);
    return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Exemplo de payload esperado pelo AbacatePay:
  // {
  //   value: number,
  //   customer: { name: string, email: string, document: string, phone: string },
  //   metadata: { ... }
  // }

  try {
    const abacateRes = await fetch('https://api.abacatepay.com/v1/pixQrCode/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const abacateData = await abacateRes.json();
    if (!abacateRes.ok) {
      console.error('Erro da API AbacatePay:', abacateData);
      return new Response(JSON.stringify({ error: abacateData.error || abacateData.message || 'Erro na API AbacatePay', details: abacateData }), {
        status: abacateRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(abacateData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Erro ao conectar com AbacatePay:', err);
    return new Response(JSON.stringify({ error: 'Erro ao conectar com AbacatePay', details: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
