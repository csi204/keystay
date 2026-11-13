/**
 * KeyStay Client-Side Image Compression Helper
 *
 * Resizes slip images onto an HTML5 Canvas to a maximum dimension of maxWidth (default 1000px)
 * and exports as a JPEG Data URL (`data:image/jpeg;base64,...`, approx 60-100KB).
 * Provides a reliable fallback for non-browser / node test environments.
 */

export async function compressImageToBase64(
  file: File | Blob,
  maxWidth = 1000,
  quality = 0.75
): Promise<string> {
  if (!file) {
    throw new Error('No file provided for compression');
  }

  // Non-browser or SSR / Node environment fallback
  const isBrowserWithCanvas =
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function' &&
    typeof Image !== 'undefined';

  if (!isBrowserWithCanvas) {
    if (typeof file.arrayBuffer === 'function') {
      const arrayBuffer = await file.arrayBuffer();
      const base64 =
        typeof Buffer !== 'undefined'
          ? Buffer.from(arrayBuffer).toString('base64')
          : btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return `data:image/jpeg;base64,${base64}`;
    }

    if (typeof FileReader !== 'undefined') {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = () => reject(new Error('FileReader failed in fallback'));
        reader.readAsDataURL(file);
      });
    }

    throw new Error('Unsupported environment for image compression');
  }

  // Browser HTML5 Canvas compression pipeline
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();

      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale dimensions proportionally if larger than maxWidth
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // If canvas 2D context is unavailable, fall back to reader data URL
            resolve(dataUrl);
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          // If canvas operations fail, resolve with uncompressed data URL
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        // If image decoding fails, resolve with raw data URL
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
