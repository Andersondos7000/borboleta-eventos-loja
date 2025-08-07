import React from "react";

interface QRCodeDisplayProps {
  base64Image: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ base64Image }) => {
  if (!base64Image) return null;
  return (
    <div className="flex flex-col items-center my-4">
      <img
        src={`data:image/png;base64,${base64Image}`}
        alt="QR Code PIX"
        className="w-40 h-40 object-contain border rounded shadow"
      />
      <span className="text-xs text-gray-500 mt-2">Escaneie o QR Code com seu app bancário</span>
    </div>
  );
};

export default QRCodeDisplay;
