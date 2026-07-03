/**
 * Client-side image compression — resizes to maxW/maxH keeping aspect ratio
 * and re-encodes as JPEG/PNG. Prevents huge base64 payloads from failing
 * against ingress body-size limits.
 */
export const compressImage = (file, { maxWidth = 1400, maxHeight = 1400, quality = 0.85 } = {}) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('read failed'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('image decode failed'));
    img.onload = () => {
      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      // white bg for JPEG to avoid black transparency
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      // Use JPEG unless original is small PNG with transparency needs
      const mime = /png$/i.test(file.type) && file.size < 300 * 1024 ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, quality);
      resolve(dataUrl);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});
