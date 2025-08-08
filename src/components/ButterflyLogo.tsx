
import React from 'react';

export const ButterflyLogo: React.FC<{className?: string}> = ({ className = "" }) => {
  return (
    <div className={`butterfly-icon ${className}`}>
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <path
          d="M12 2C11 3.5 9 5.5 6.5 6.5C4 7.5 1 7.9 1 11C1 12.5 1.5 13 1.5 13C1.5 13 2 13.5 4 13.5C5 13.5 7 13.2 9 10.5L12 15M12 2C13 3.5 15 5.5 17.5 6.5C20 7.5 23 7.9 23 11C23 12.5 22.5 13 22.5 13C22.5 13 22 13.5 20 13.5C19 13.5 17 13.2 15 10.5L12 15M12 15L12.5 19.5M12 15L11.5 19.5M11.5 19.5C9.5 20 8.6 21.4 8.5 22.5H15.5C15.4 21.4 14.5 20 12.5 19.5M11.5 19.5C12.2 19.3 12.8 19.3 12.5 19.5"
          stroke="#F97316"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default ButterflyLogo;
