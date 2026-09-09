import React, { useState, useRef } from 'react';
import { validatePhotoRecency, watermarkAndCompressPhoto, ProcessedPhoto } from '../../services/cameraService';
import { Camera, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

interface PhotoUploaderProps {
  label: string;
  taggingNumber: string;
  commonName: string;
  actionType: string;
  operatorName: string;
  operatorEmail: string;
  maxRecencyHours?: number;
  isStrict?: boolean;
  disabled?: boolean;
  onPhotoCaptured: (processed: ProcessedPhoto) => void;
  onPhotoRemoved: () => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  label,
  taggingNumber,
  commonName,
  actionType,
  operatorName,
  operatorEmail,
  maxRecencyHours = 3,
  isStrict = true,
  disabled = false,
  onPhotoCaptured,
  onPhotoRemoved
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1. Validate Photo Recency from EXIF
      const validation = await validatePhotoRecency(file, maxRecencyHours, isStrict);
      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Photo is not valid.');
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // 2. Compress and Apply Watermark
      const processed = await watermarkAndCompressPhoto(
        file,
        taggingNumber,
        commonName,
        actionType,
        operatorName,
        operatorEmail,
        validation.photoDate || undefined
      );

      setPreviewUrl('data:image/jpeg;base64,' + processed.base64);
      onPhotoCaptured(processed);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process camera image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onPhotoRemoved();
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </label>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <div>{errorMessage}</div>
        </div>
      )}

      {previewUrl ? (
        <div className="relative rounded-xl border border-border bg-muted/40 p-2 text-center overflow-hidden">
          <img
            src={previewUrl}
            alt="Captured photo preview"
            className="mx-auto max-h-44 rounded-lg object-contain shadow-xs"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-3 top-3 h-7 w-7 rounded-full shadow-md cursor-pointer"
            onClick={handleRemove}
            disabled={disabled || isProcessing}
            title="Remove and retake photo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isProcessing}
          />

          <button
            type="button"
            className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background hover:bg-accent/50 p-4 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Validating & Watermarking...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-1">
                  <Camera className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-foreground">Take Photo with Camera</span>
                <span className="text-[11px] text-muted-foreground">Within {maxRecencyHours} hours recency</span>
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
