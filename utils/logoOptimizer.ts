export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export const validateLogoFile = (file: File): FileValidationResult => {
  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml'
  ];

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato no soportado. Se admiten PNG (recomendado), JPG, WEBP o SVG.'
    };
  }

  if (file.size > MAX_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `El archivo pesa ${sizeInMb} MB. El tamaño máximo permitido es de 2 MB.`
    };
  }

  return { valid: true };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('No se pudo convertir el archivo a Base64.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export interface OptimizedLogo {
  dataUrl: string;
  width: number;
  height: number;
  format: 'PNG' | 'JPEG';
}

const logoCache = new Map<string, OptimizedLogo>();

/**
 * Optimiza y escala el logo usando Canvas para incrustarlo en jsPDF de forma ultra-rápida.
 * - Limita la resolución máxima manteniendo la relación de aspecto.
 * - Cachea el resultado en memoria para que descargas consecutivas tomen 0ms.
 * - Cuenta con timeout de seguridad (1.5s) para nunca bloquear la interfaz.
 */
export const optimizeLogoForPDF = async (
  rawLogoSrc: string | null | undefined,
  maxWidth = 400,
  maxHeight = 160,
  timeoutMs = 1500
): Promise<OptimizedLogo | null> => {
  if (!rawLogoSrc || typeof rawLogoSrc !== 'string' || rawLogoSrc.trim() === '') {
    return null;
  }

  if (logoCache.has(rawLogoSrc)) {
    return logoCache.get(rawLogoSrc)!;
  }

  const processPromise = new Promise<OptimizedLogo>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        if (!w || !h) {
          return reject(new Error('Dimensiones de imagen inválidas'));
        }

        // Relación de aspecto proporcional
        const scale = Math.min(maxWidth / w, maxHeight / h, 1);
        const targetWidth = Math.max(1, Math.round(w * scale));
        const targetHeight = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('No se pudo inicializar el contexto 2D de Canvas'));
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const isPng = rawLogoSrc.startsWith('data:image/png') || rawLogoSrc.toLowerCase().includes('.png');
        const format: 'PNG' | 'JPEG' = isPng ? 'PNG' : 'JPEG';
        const mimeType = isPng ? 'image/png' : 'image/jpeg';

        const optimizedDataUrl = canvas.toDataURL(mimeType, 0.92);

        const result: OptimizedLogo = {
          dataUrl: optimizedDataUrl,
          width: targetWidth,
          height: targetHeight,
          format
        };

        logoCache.set(rawLogoSrc, result);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(err);
    img.src = rawLogoSrc;
  });

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  try {
    return await Promise.race([processPromise, timeoutPromise]);
  } catch (err) {
    console.warn('[pdfLogoOptimizer] Fallback aplicado:', err);
    return null;
  }
};
