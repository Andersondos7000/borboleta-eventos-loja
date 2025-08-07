import React, { useState } from "react";
import PixPaymentPopup, { PaymentData, PaymentStatus } from "./PixPaymentPopup";
import { Button } from "./ui/button";

const PixPaymentDemo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  const createPayment = async () => {
    const newPaymentData = {
      amount: 150.0,
      description: "Pagamento de pedido",
      // Adicione outros dados exigidos pela API da Abacate Pay
    };

    try {
      const response = await fetch("https://api.abacatepay.com/charges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer abc_dev_LsWsb5rG4YSsKL2KCyP3Hm4n", // Token fornecido pelo usuário
        },
        body: JSON.stringify(newPaymentData),
      });

      const data = await response.json();

      if (response.ok) {
        const formattedData: PaymentData = {
          amount: data.amount,
          currency: data.currency,
          recipient: {
            name: data.recipient.name,
            document: data.recipient.document,
            bank: data.recipient.bank,
          },
          pixCode: data.pix_copy_paste,
          qrCodeImage: data.qr_code_image_base64,
          transactionId: data.transaction_id,
          expiresAt: new Date(data.expires_at),
        };

        setPaymentData(formattedData);
        setIsOpen(true);
      } else {
        console.error("Erro ao criar cobrança:", data);
        alert("Ocorreu um erro ao criar a cobrança. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro na comunicação com a API:", error);
      alert("Ocorreu um erro de rede. Tente novamente.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">PIX Payment Demo</h1>
        <Button onClick={createPayment}>Abrir Pagamento PIX</Button>
        {paymentData && (
          <PixPaymentPopup
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            paymentData={paymentData}
            status={status}
            onStatusChange={setStatus}
          />
        )}
      </div>
    </div>
  );
};

export default PixPaymentDemo;
