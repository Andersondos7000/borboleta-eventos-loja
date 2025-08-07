import { AbacatePay } from '@abacatepay/nodejs-sdk';

const abacate = new AbacatePay(process.env.ABACATE_PAY_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  try {
    const { email, amount } = req.body;
    const valor = amount || 1000; // valor em centavos, padrão R$10,00
    const response = await abacate.createCharge({
      amount: valor,
      payer: email ? { email } : undefined,
    });
    res.status(200).json({ data: response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// http://localhost:3005/api/createPixPayment
