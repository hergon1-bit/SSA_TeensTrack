import React, { useState } from 'react';
import { UsersIcon } from './Icons';

interface LogoViewerProps {
  src?: string | null;
  alt: string;
  fallbackText?: string;
  className?: string;
  imgClassName?: string;
  fallbackIconClassName?: string;
}

export const LogoViewer: React.FC<LogoViewerProps> = ({
  src,
  alt,
  fallbackText = 'Seguimiento',
  className = 'w-10 h-10',
  imgClassName = 'w-full h-full object-contain',
  fallbackIconClassName = 'w-5 h-5 text-white'
}) => {
  const [hasError, setHasError] = useState(false);

  // Extraer hasta 2 iniciales a partir de las palabras del texto
  const getInitials = (text: string) => {
    if (!text) return 'ST';
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
  };

  const hasValidSrc = Boolean(src && typeof src === 'string' && src.trim() !== '' && !hasError);

  if (!hasValidSrc) {
    const initials = getInitials(fallbackText);
    return (
      <div 
        className={`flex items-center justify-center bg-primary text-white font-bold rounded-lg select-none shadow-sm transition-all shrink-0 ${className}`}
        title={fallbackText}
        aria-label={fallbackText}
      >
        {initials ? (
          <span className="text-sm font-semibold tracking-wide uppercase leading-none">
            {initials}
          </span>
        ) : (
          <UsersIcon className={fallbackIconClassName} />
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-lg shrink-0 ${className}`}>
      <img
        src={src!}
        alt={alt}
        className={imgClassName}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
};

export default LogoViewer;
