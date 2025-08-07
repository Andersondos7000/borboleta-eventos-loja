// backend/abacatepay-server.js

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
// import { AbacatePay } from '@abacatepay/nodejs-sdk';
import fetch from 'node-fetch';

const app = express();
// const abacate = new AbacatePay(process.env.ABACATE_PAY_API_KEY);

app.use(cors());
app.use(bodyParser.json());

// Endpoint para criar pagamento PIX usando API REST oficial AbacatePay
app.post('/api/createPixPayment', async (req, res) => {
  try {
    const { amount, customerData, orderId, description } = req.body;
    // customerData: { name, email, cellphone, taxId }
    const apiKey = process.env.ABACATE_PAY_API_KEY;
    const url = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const body = {
      amount: amount || 1000,
      expiresIn: 3600, // 1 hora
      description: description || 'Pagamento via PIX',
      metadata: orderId ? { externalId: orderId } : undefined,
      customer: customerData && customerData.name && customerData.email && customerData.cellphone && customerData.taxId
        ? {
            name: customerData.name,
            email: customerData.email,
            cellphone: customerData.cellphone,
            taxId: customerData.taxId
          }
        : undefined
    };
    // Remove campos undefined
    Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (response.ok) {
      res.status(200).json(data);
    } else {
      res.status(response.status).json({ error: data.error || data.message || 'Erro ao criar PIX' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para consultar status do pagamento (desabilitado: SDK não está mais presente)
// app.post('/api/checkPixStatus', async (req, res) => {
//   try {
//     const { chargeId } = req.body;
//     if (!chargeId) return res.status(400).json({ error: 'chargeId obrigatório' });
//     const response = await abacate.getCharge(chargeId);
//     res.status(200).json({ data: response });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`AbacatePay backend rodando em http://localhost:${PORT}`);
});
