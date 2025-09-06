
import React from 'react';

export const ButterflyLogo: React.FC<{className?: string}> = ({ className = "" }) => {
  return (
    <div className={`butterfly-icon ${className}`}>
      {/* SVG removido, mantendo apenas o espaço */}
    </div>
  );
};

export default ButterflyLogo;
