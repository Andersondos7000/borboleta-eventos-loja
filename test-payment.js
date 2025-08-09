// Teste para verificar se brCodeBase64 está sendo retornado
const testPayment = async () => {
  try {
    console.log('Testando criação de pagamento...');
    
    const response = await fetch('http://127.0.0.1:54321/functions/v1/create-abacate-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Token de teste
      },
      body: JSON.stringify({
        orderData: {
          firstName: 'João',
          lastName: 'Silva',
          personType: 'fisica',
          cpf: '11144477735',
          country: 'Brasil',
          zipCode: '01310-100',
          address: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          phone: '11999887766',
          email: 'joao.silva@email.com',
          terms: true
        },
        total: 2500, // R$ 25,00
        items: [{
          name: 'Ingresso Teste',
          price: 2500,
          quantity: 1
        }]
      })
    });

    const data = await response.json();
    
    console.log('Status da resposta:', response.status);
    console.log('Resposta completa:', JSON.stringify(data, null, 2));
    
    if (data.success && data.paymentData) {
      console.log('\n=== VERIFICAÇÃO DOS CAMPOS ===');
      console.log('brCodeBase64 presente:', !!data.paymentData.brCodeBase64);
      console.log('brCode presente:', !!data.paymentData.brCode);
      console.log('ID do pagamento:', data.paymentData.id);
      
      if (data.paymentData.brCodeBase64) {
        console.log('brCodeBase64 (primeiros 50 chars):', data.paymentData.brCodeBase64.substring(0, 50) + '...');
      } else {
        console.log('❌ brCodeBase64 NÃO ENCONTRADO!');
      }
      
      if (data.paymentData.brCode) {
        console.log('brCode (primeiros 50 chars):', data.paymentData.brCode.substring(0, 50) + '...');
      } else {
        console.log('❌ brCode NÃO ENCONTRADO!');
      }
    } else {
      console.log('❌ Erro na criação do pagamento:', data.error);
    }
    
  } catch (error) {
    console.error('Erro no teste:', error);
  }
};

testPayment();