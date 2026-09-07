import ExifReader from 'exifreader';
import { getManilaDate, getFormattedDateTime } from './timeService';

export interface ProcessedPhoto {
  blob: Blob;
  base64: string;
  transactionId: string;
  captureDateStr: string; // YYYYMMDD
  captureTimeStr: string; // HHmm
}

/**
 * Validates photo recency using binary EXIF metadata.
 */
export async function validatePhotoRecency(
  file: File,
  maxRecencyHours: number = 3,
  isStrict: boolean = true
): Promise<{ isValid: boolean; photoDate: Date | null; error?: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    const dateTag = tags['DateTimeOriginal'] || tags['CreateDate'] || tags['ModifyDate'];

    if (!dateTag || !dateTag.description) {
      if (isStrict) {
        return {
          isValid: false,
          photoDate: null,
          error: 'Photo is missing camera metadata (EXIF). Please take a fresh photo using the device camera.'
        };
      }
      return { isValid: true, photoDate: getManilaDate() };
    }

    // EXIF Date format: "YYYY:MM:DD HH:MM:SS"
    const match = dateTag.description.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) {
      if (isStrict) {
        return { isValid: false, photoDate: null, error: 'Could not read timestamp from photo EXIF.' };
      }
      return { isValid: true, photoDate: getManilaDate() };
    }

    const [, year, month, day, hour, minute, second] = match.map(Number);
    const photoDate = new Date(year, month - 1, day, hour, minute, second);
    const now = getManilaDate();

    const diffHours = (now.getTime() - photoDate.getTime()) / (1000 * 60 * 60);

    if (diffHours > maxRecencyHours) {
      return {
        isValid: false,
        photoDate,
        error: `Photo is too old (${diffHours.toFixed(1)} hours ago). Allowed window is ${maxRecencyHours} hours.`
      };
    }

    return { isValid: true, photoDate };
  } catch (err: any) {
    if (isStrict) {
      return { isValid: false, photoDate: null, error: 'Failed to inspect photo: ' + err.message };
    }
    return { isValid: true, photoDate: getManilaDate() };
  }
}

/**
 * Watermarks and compresses a photo using HTML5 Canvas.
 */
export async function watermarkAndCompressPhoto(
  file: File,
  taggingNumber: string,
  commonName: string,
  actionType: string,
  operatorName: string,
  operatorEmail: string,
  photoDate: Date = getManilaDate(),
  transactionId: string = crypto.randomUUID()
): Promise<ProcessedPhoto> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Render dark overlay watermark banner
      const bannerHeight = Math.max(90, Math.round(height * 0.16));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

      // Text styling
      const fontSize = Math.max(14, Math.round(width * 0.024));
      ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = '#ffffff';

      const paddingLeft = Math.round(width * 0.03);
      const lineHeight = Math.round(fontSize * 1.35);
      const startY = height - bannerHeight + lineHeight;

      ctx.fillText(`${commonName} (${taggingNumber})`, paddingLeft, startY);
      ctx.fillText(
        `${actionType} · ${getFormattedDateTime(photoDate)} (Manila Time)`,
        paddingLeft,
        startY + lineHeight
      );
      ctx.fillText(
        `Reported By: ${operatorName} (${operatorEmail})`,
        paddingLeft,
        startY + lineHeight * 2
      );

      ctx.font = `400 ${Math.max(11, Math.round(fontSize * 0.75))}px monospace`;
      ctx.fillStyle = '#adb5bd';
      ctx.fillText(`Tx: ${transactionId}`, paddingLeft, startY + lineHeight * 3);

      // Export as Blob
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error('Failed to create image blob'));
            return;
          }

          const base64 = canvas.toDataURL('image/jpeg', 0.72).split(',')[1];
          const y = photoDate.getFullYear();
          const m = String(photoDate.getMonth() + 1).padStart(2, '0');
          const d = String(photoDate.getDate()).padStart(2, '0');
          const hh = String(photoDate.getHours()).padStart(2, '0');
          const mm = String(photoDate.getMinutes()).padStart(2, '0');

          resolve({
            blob,
            base64,
            transactionId,
            captureDateStr: `${y}${m}${d}`,
            captureTimeStr: `${hh}${mm}`
          });
        },
        'image/jpeg',
        0.72
      );
    };

    img.onerror = () => reject(new Error('Failed to load image into memory'));
    img.src = URL.createObjectURL(file);
  });
}
