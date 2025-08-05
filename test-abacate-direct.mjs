// Teste direto da API AbacatePay
console.log("🔍 Testando API AbacatePay...");

const API_KEY = "abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n";
const API_URL = "https://api.abacatepay.com/v1/pixQrCode/create";

const testPayload = {
  amount: 10000, // R$ 100,00 em centavos
  expiresIn: 3600,
  description: "Teste - Borboleta Eventos",
  customer: {
    name: "João Teste",
    email: "joao@teste.com",
    cellphone: "11999999999",
    taxId: "11144477735" // CPF válido para teste
  }
};

try {
  console.log("📤 Enviando requisição...");
  console.log("URL:", API_URL);
  console.log("Payload:", JSON.stringify(testPayload, null, 2));
  
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(testPayload),
  });

  console.log("📥 Status da resposta:", response.status);
  console.log("📥 Headers:", Object.fromEntries(response.headers.entries()));

  const responseText = await response.text();
  console.log("📥 Resposta completa:", responseText);

  if (response.ok) {
    console.log("✅ API Key válida! AbacatePay respondeu com sucesso.");
    const data = JSON.parse(responseText);
    console.log("💳 Payment ID:", data.id);
  } else {
    console.log("❌ Erro na API AbacatePay:");
    console.log("Status:", response.status);
    console.log("Response:", responseText);
  }

} catch (error) {
  console.error("🚨 Erro na requisição:", error.message);
}
