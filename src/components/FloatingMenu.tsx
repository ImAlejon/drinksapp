import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, QrCode, X, UserPlus, Share2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from "@/components/ui/input";
import * as QRCodeReact from 'qrcode.react'; // Updated import

// Define the props interface for QRCodeScanner
interface QRCodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose }) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    Html5Qrcode.getCameras().then((devices) => {
      setCameras(devices);
    }).catch((err) => {
      console.error('Error getting cameras', err);
    });
  }, []);

  useEffect(() => {
    if (cameras.length > 0) {
      initializeScanner();
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [cameras, currentCameraIndex]);

  const initializeScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: 250,
        videoConstraints: {
          deviceId: cameras[currentCameraIndex].id
        }
      },
      false
    );
    scannerRef.current.render(onScanSuccess, onScanFailure);
  };

  const onScanSuccess = (decodedText: string) => {
    onScan(decodedText);
  };

  const onScanFailure = (error: string) => {
    console.warn(`QR Code scanning failed: ${error}`);
  };

  const switchCamera = () => {
    setCurrentCameraIndex((prevIndex) => (prevIndex + 1) % cameras.length);
  };

  return (
    <div className="flex flex-col items-center">
      <div id="qr-reader" className="w-full max-w-sm aspect-square bg-gray-100 rounded-lg overflow-hidden"></div>
      <p className="mt-4 text-sm text-gray-500 text-center">
        Position the QR code within the frame to scan
      </p>
      {cameras.length > 1 && (
        <Button onClick={switchCamera} className="mt-4">
          Switch Camera
        </Button>
      )}
      <Button onClick={onClose} className="mt-4">
        <X className="mr-2 h-4 w-4" /> Close Scanner
      </Button>
    </div>
  );
};

// FloatingMenu component props
interface FloatingMenuProps {
  onCreatePlaylist: (playlistName: string) => Promise<void>;
  onJoinSession: (sessionId: string) => Promise<void>;
  sessionId: string | null;
  hasActiveSession: boolean;
}

const FloatingMenu: React.FC<FloatingMenuProps> = ({
  onCreatePlaylist,
  onJoinSession,
  sessionId,
  hasActiveSession
}) => {
  const [isScanQRCodeOpen, setIsScanQRCodeOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isJoinSessionOpen, setIsJoinSessionOpen] = useState(false);
  const [isShareQRCodeOpen, setIsShareQRCodeOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [inputSessionId, setInputSessionId] = useState('');

  const onScanSuccess = (decodedText: string) => {
    console.log(`QR Code detected: ${decodedText}`);
    setIsScanQRCodeOpen(false);
    onJoinSession(decodedText);
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playlistName.trim()) {
      await onCreatePlaylist(playlistName);
      setPlaylistName('');
      setIsCreatePlaylistOpen(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSessionId.trim()) {
      await onJoinSession(inputSessionId);
      setInputSessionId('');
      setIsJoinSessionOpen(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          className="fixed bottom-4 right-4 rounded-full w-12 h-12 p-0 shadow-lg"
          aria-label="Menu"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="grid gap-4">
          <Dialog open={isCreatePlaylistOpen} onOpenChange={setIsCreatePlaylistOpen}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" /> Create Playlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePlaylist}>
                <Input
                  type="text"
                  placeholder="Enter playlist name"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="mb-4"
                />
                <Button type="submit">Create Playlist</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isJoinSessionOpen} onOpenChange={setIsJoinSessionOpen}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start">
                <UserPlus className="mr-2 h-4 w-4" /> Join Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleJoinSession}>
                <Input
                  type="text"
                  placeholder="Enter session ID"
                  value={inputSessionId}
                  onChange={(e) => setInputSessionId(e.target.value)}
                  className="mb-4"
                />
                <Button type="submit">Join Session</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isScanQRCodeOpen} onOpenChange={setIsScanQRCodeOpen}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start">
                <QrCode className="mr-2 h-4 w-4" /> Scan QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Scan QR Code</DialogTitle>
              </DialogHeader>
              <QRCodeScanner 
                onScan={onScanSuccess} 
                onClose={() => setIsScanQRCodeOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isShareQRCodeOpen} onOpenChange={setIsShareQRCodeOpen}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start" disabled={!hasActiveSession}>
                <Share2 className="mr-2 h-4 w-4" /> Share QR Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Session QR Code</DialogTitle>
              </DialogHeader>
              {sessionId && (
                <div className="flex flex-col items-center">
                  <QRCodeReact.QRCodeSVG value={sessionId} size={200} />
                  <p className="mt-4 text-sm text-gray-500">
                    Scan this QR code to join the session
                  </p>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(sessionId);
                      // Optionally, you can show a toast notification here
                    }}
                    className="mt-4"
                  >
                    Copy Session ID
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default FloatingMenu;
