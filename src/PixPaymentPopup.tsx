import React, { useEffect, useState } from "react";
import QRCodeDisplay from "./QRCodeDisplay";

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  EXPIRED = "expired",
  ERROR = "error",
}

export interface PaymentData {
  amount: number;
  currency?: string;
  recipient: {
    name: string;
    document: string;
    bank: string;
  };
  pixCode: string;
  qrCodeImage: string;
  transactionId: string;
  expiresAt: Date;
}

interface PixPaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: PaymentData;
  status: PaymentStatus;
  onStatusChange: (status: PaymentStatus) => void;
}


const PixPaymentPopup: React.FC<PixPaymentPopupProps> = ({
  isOpen,
  onClose,
  paymentData,
  status,
  onStatusChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [localStatus, setLocalStatus] = useState(status);

  useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  // Limpa carrinho ao fechar se pago
  const handleClose = () => {
    if (localStatus === PaymentStatus.PAID) {
      // Notifica componente pai para limpar carrinho
      if (typeof window !== "undefined" && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent("pixPaymentConfirmed"));
      }
    }
    onClose();
  };

  // Copiar código PIX
  const handleCopyPix = () => {
    navigator.clipboard.writeText(paymentData.pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verificar pagamento
  const handleVerifyPayment = async () => {
    setVerifying(true);
    try {
      // Chamada real à API Abacate Pay
      // Exemplo:
      // const response = await fetch(`/api/abacatepay/status?txid=${paymentData.transactionId}`);
      // const { status: newStatus } = await response.json();
      // onStatusChange(newStatus);
      // Simulação:
      setTimeout(() => {
        onStatusChange(PaymentStatus.PAID);
        setVerifying(false);
      }, 1500);
    } catch (e) {
      onStatusChange(PaymentStatus.ERROR);
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={handleClose}
        >
          &times;
        </button>
        {/* Dados da empresa */}
        <div className="mb-2 flex items-center gap-2">
          <span className="font-bold text-orange-700">Borboleta Eventos</span>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Beneficiário</span>
        </div>
        <h2 className="text-xl font-bold mb-2">Pagamento via PIX</h2>
        <p className="mb-2">Escaneie o QR Code ou copie o código para pagar.</p>
        <div className="flex flex-col items-center mb-2">
          <QRCodeDisplay base64Image={paymentData.qrCodeImage} />
          <span className="text-xs text-gray-500 mt-1">Escaneie o QR Code com seu app bancário</span>
          <button
            className={`mt-2 px-3 py-1 rounded text-xs flex items-center gap-1 ${copied ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            onClick={handleCopyPix}
            title="Copiar código PIX"
          >
            {copied ? (
              <>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="green" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                Copiado
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke="#555" strokeWidth="2" /><rect x="2" y="2" width="13" height="13" rx="2" stroke="#555" strokeWidth="2" /></svg>
                Copiar código PIX
              </>
            )}
          </button>
        </div>
        <p className="mb-2">Valor: <span className="font-semibold">R$ {paymentData.amount.toFixed(2)}</span></p>
        <p className="mb-2">TxID: <span className="font-mono">{paymentData.transactionId || "---"}</span></p>
        <p className="mb-2">Expira em: <span className="font-mono">{paymentData.expiresAt.toISOString()}</span></p>
        <p className="mb-2">Copia e Cola PIX:</p>
        <div className="bg-gray-100 p-2 rounded mb-2 text-xs break-all select-all">
          {paymentData.pixCode}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {localStatus === PaymentStatus.PENDING && (
            <span className="text-yellow-600">Aguardando pagamento...</span>
          )}
          {localStatus === PaymentStatus.PAID && (
            <span className="text-green-600 font-bold">Pagamento Concluído!</span>
          )}
          {localStatus === PaymentStatus.EXPIRED && (
            <span className="text-red-600">Cobrança expirada.</span>
          )}
          {localStatus === PaymentStatus.ERROR && (
            <span className="text-red-600">Erro ao processar pagamento.</span>
          )}
          {/* Botão Verificar Pagamento */}
          {localStatus === PaymentStatus.PENDING && (
            <button
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
              onClick={handleVerifyPayment}
              disabled={verifying}
            >
              {verifying ? "Verificando..." : "Verificar Pagamento"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PixPaymentPopup;
