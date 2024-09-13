import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus, Users, QrCode, Share2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Html5QrcodeScanner } from 'html5-qrcode';
import QRCode from 'react-qr-code';

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
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [isJoinSessionOpen, setIsJoinSessionOpen] = useState(false);
  const [isScanQRCodeOpen, setIsScanQRCodeOpen] = useState(false);
  const [isShowQRCodeOpen, setIsShowQRCodeOpen] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [inputSessionId, setInputSessionId] = useState('');

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (isScanQRCodeOpen) {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: 250 },
        false
      );
      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  });

  const onScanSuccess = (decodedText: string) => {
    console.log(`QR Code detected: ${decodedText}`);
    setIsScanQRCodeOpen(false);
    onJoinSession(decodedText);
  };

  const onScanFailure = (error: string) => {
    console.warn(`QR Code scanning failed: ${error}`);
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
    <>
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
                  <Users className="mr-2 h-4 w-4" /> Join Session
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Scan QR Code</DialogTitle>
                </DialogHeader>
                <div id="qr-reader" className="w-full"></div>
                <Button onClick={() => setIsScanQRCodeOpen(false)} className="mt-4">
                  <X className="mr-2 h-4 w-4" /> Close Scanner
                </Button>
              </DialogContent>
            </Dialog>
            {hasActiveSession && (
              <Dialog open={isShowQRCodeOpen} onOpenChange={setIsShowQRCodeOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full justify-start">
                    <Share2 className="mr-2 h-4 w-4" /> Show QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Session QR Code</DialogTitle>
                  </DialogHeader>
                  {sessionId && (
                    <div className="flex justify-center">
                      <QRCode value={sessionId} size={256} />
                    </div>
                  )}
                  <p className="mt-4 text-center">Session ID: {sessionId}</p>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default FloatingMenu;
