
import * as Dialog from '@radix-ui/react-dialog';
import React from 'react';

interface PaymentData {
  brCodeBase64: string;
  amount?: number;
  txid?: string;
  expiresAt?: string;
  [key: string]: any;
}

interface PaymentPopupProps {
  isOpen: boolean;
  paymentData: PaymentData | null;
  onClose: () => void;
}

const PaymentPopup = ({ isOpen, paymentData, onClose }: PaymentPopupProps) => {
  if (!isOpen || !paymentData) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
      <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            onClick={onClose}
            aria-label="Fechar"
          >
            &times;
          </button>
          <h2 className="text-xl font-bold mb-2">Pagamento via PIX</h2>
          <p className="mb-2">Scaneie o QR Code ou copie o código para pagar.</p>
          <div className="flex flex-col items-center my-4">
            <img src={paymentData.brCodeBase64} alt="QR Code PIX" className="w-48 h-48 object-contain border rounded shadow" />
            <span className="text-xs text-gray-500 mt-2">Escaneie o QR Code com seu app bancário</span>
          </div>
          <div className="mt-2">
            <p><strong>Valor:</strong> R$ {paymentData.amount?.toFixed(2) ?? '---'}</p>
            <p><strong>TxID:</strong> {paymentData.txid ?? '---'}</p>
            <p><strong>Expira em:</strong> {paymentData.expiresAt ?? '---'}</p>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default PaymentPopup;