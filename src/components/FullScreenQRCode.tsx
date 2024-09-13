import React from 'react';
import QRCode from 'react-qr-code';

interface FullScreenQRCodeProps {
  value: string;
  onClose: () => void;
}

const FullScreenQRCode: React.FC<FullScreenQRCodeProps> = ({ value, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 cursor-pointer"
      onClick={onClose}
    >
      <div className="bg-white p-8 rounded-lg">
        <QRCode value={value} size={256} />
      </div>
    </div>
  );
};

export default FullScreenQRCode;
