import React, { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from "@/components/ui/button"
import { toast } from 'react-hot-toast'  // Add this import

interface QRCodeScannerProps {
  onScan: (sessionId: string) => void
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan }) => {
  const [showScanner, setShowScanner] = useState(false)
  const qrCodeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (showScanner && qrCodeRef.current) {
      scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scanner.render(onScanSuccess, (errorMessage: string) => {
        console.warn(`QR Code scanning failed: ${errorMessage}`);
        toast.error('QR Code scanning failed. Please try again.')  // Add this line
      });
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  });

  const onScanSuccess = (decodedText: string) => {
    onScan(decodedText);
    setShowScanner(false);
    toast.success('QR Code scanned successfully')  // Add this line
  };

  return (
    <div className="mb-6">
      <div className="mb-4 flex justify-center">
        <Button onClick={() => {
          setShowScanner(!showScanner)
          if (!showScanner) {
            toast.success('QR Code scanner activated')  // Add this line
          }
        }}>
          {showScanner ? 'Hide QR Scanner' : 'Scan QR Code'}
        </Button>
      </div>
      {showScanner && (
        <div id="qr-reader" ref={qrCodeRef} className="mb-6"></div>
      )}
    </div>
  )
}

export default QRCodeScanner
