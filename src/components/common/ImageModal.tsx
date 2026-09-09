import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';

export const ImageModal: React.FC = () => {
  const { previewImageUrl, closeImagePreview } = useUIStore();

  if (!previewImageUrl) return null;

  return (
    <Dialog open={!!previewImageUrl} onOpenChange={open => !open && closeImagePreview()}>
      <DialogContent className="max-w-2xl p-2 bg-transparent border-0 shadow-2xl flex flex-col items-center">
        <DialogTitle className="sr-only">Attached Image Preview</DialogTitle>
        <div className="relative overflow-hidden rounded-xl bg-black/90 p-1">
          <img
            src={previewImageUrl}
            alt="Preview"
            className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
