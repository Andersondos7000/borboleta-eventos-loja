// server.js
// Servidor Express para rodar a API /api/createPixPayment


import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { AbacatePay } from '@abacatepay/nodejs-sdk';

const app = express();
const abacate = new AbacatePay(process.env.ABACATE_PAY_API_KEY);

app.use(cors());
app.use(bodyParser.json());

app.post('/api/createPixPayment', async (req, res) => {
  try {
    const { email, amount } = req.body;
    const valor = amount || 1000;
    const response = await abacate.createCharge({
      amount: valor,
      payer: email ? { email } : undefined,
    });
    res.status(200).json({ data: response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
