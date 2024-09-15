import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreditPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (credits: number) => void;
  maxCredits: number;
}

const CreditPopup: React.FC<CreditPopupProps> = ({ isOpen, onClose, onConfirm, maxCredits }) => {
  const [credits, setCredits] = useState(0);

  const handleConfirm = () => {
    onConfirm(credits);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credits to Song</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-2">How many credits do you want to use for this song? (Max: {maxCredits})</p>
          <Input
            type="number"
            value={credits}
            onChange={(e) => setCredits(Math.min(Math.max(0, parseInt(e.target.value) || 0), maxCredits))}
            min={0}
            max={maxCredits}
          />
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreditPopup;