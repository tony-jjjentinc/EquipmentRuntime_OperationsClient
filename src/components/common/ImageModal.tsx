import React from 'react';
import { useUIStore } from '../../store/useUIStore';

export const ImageModal: React.FC = () => {
  const { previewImageUrl, closeImagePreview } = useUIStore();

  if (!previewImageUrl) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(3px)' }}
      onClick={closeImagePreview}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-content bg-transparent border-0 text-center">
          <div className="text-end mb-2">
            <button
              type="button"
              className="btn btn-close btn-close-white shadow-none"
              onClick={closeImagePreview}
            ></button>
          </div>
          <img
            src={previewImageUrl}
            alt="Preview"
            className="img-fluid rounded-3 shadow-lg mx-auto"
            style={{ maxHeight: '80vh', objectFit: 'contain' }}
          />
        </div>
      </div>
    </div>
  );
};
