import React, { useState, useRef } from 'react';
import { validatePhotoRecency, watermarkAndCompressPhoto, ProcessedPhoto } from '../../services/cameraService';

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
    <div className="mb-3">
      <label className="form-label extra-small fw-bold text-secondary text-uppercase mb-1">{label}</label>

      {errorMessage && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-2 rounded-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-6"></i>
          <div>{errorMessage}</div>
        </div>
      )}

      {previewUrl ? (
        <div className="position-relative border rounded-3 p-2 bg-light text-center">
          <img
            src={previewUrl}
            alt="Captured photo preview"
            className="img-fluid rounded-2 shadow-sm"
            style={{ maxHeight: '180px', objectFit: 'contain' }}
          />
          <button
            type="button"
            className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle shadow-sm"
            onClick={handleRemove}
            disabled={disabled || isProcessing}
            title="Remove and retake photo"
            style={{ width: '28px', height: '28px', padding: 0 }}
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="d-none"
            onChange={handleFileChange}
            disabled={disabled || isProcessing}
          />

          <button
            type="button"
            className="btn btn-outline-secondary w-100 py-3 rounded-3 border-dashed d-flex flex-column align-items-center justify-content-center shadow-none"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="spinner-border spinner-border-sm mb-2" role="status"></span>
                <span className="small text-muted">Validating & Watermarking...</span>
              </>
            ) : (
              <>
                <i className="bi bi-camera fs-3 mb-1 text-primary"></i>
                <span className="small fw-semibold text-dark">Take Photo with Camera</span>
                <span className="extra-small text-muted">Required: Within {maxRecencyHours} hours recency</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
