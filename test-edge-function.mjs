// Teste do Edge Function create-abacate-payment
const testEdgeFunction = async () => {
  console.log('🧪 Testando Edge Function...');
  
  const testPayload = {
    orderData: {
      firstName: "João",
      lastName: "Silva", 
      email: "joao@teste.com",
      phone: "11999999999",
      cpf: "11144477735" // CPF válido para teste
    },
    total: 50.00,
    items: [
      {
        productId: "test-product",
        ticketId: "test-ticket",
        name: "Produto Teste",
        price: 50.00,
        quantity: 1,
        size: "M"
      }
    ]
  };

  try {
    const response = await fetch('https://pxcvoiffnandpdyotped.supabase.co/functions/v1/create-abacate-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3ZvaWZmbmFuZHBkeW90cGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4ODE3MTIsImV4cCI6MjA2MTQ1NzcxMn0.nP5x007Tb89eGe4wpZFdayQ_gQ_mQzDeW_NKf4ugHM8`
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📊 Status da resposta:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sucesso!', data);
    } else {
      const error = await response.text();
      console.error('❌ Erro:', error);
    }
    
  } catch (error) {
    console.error('💥 Erro de rede:', error);
  }
};

// Executar teste
testEdgeFunction();
