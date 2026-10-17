
import React, { ReactNode, useEffect } from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-[95vw]',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = '2xl' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 p-0 md:p-4 transition-opacity"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0" onClick={onClose}></div>
      <div className={`relative bg-surface rounded-t-2xl md:rounded-xl shadow-2xl border-t md:border border-border/80 w-full ${sizeClasses[size] || 'max-w-2xl'} max-h-[92dvh] md:max-h-[90vh] flex flex-col z-10 my-0 md:my-auto overflow-hidden pb-[env(safe-area-inset-bottom)] md:pb-0 transition-all`}>
        {/* Handle visual tipo Bottom Sheet para móviles (Sección 5.2) */}
        <div className="pt-2 pb-1 flex justify-center md:hidden shrink-0">
          <div className="w-12 h-1.5 bg-border rounded-full" />
        </div>

        <div className="px-5 py-3.5 border-b border-border/60 flex justify-between items-center bg-surface shrink-0">
          <h3 className="text-lg font-bold text-text-primary pr-4" id="modal-title">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-background/80 active:scale-95 transition"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 text-text-secondary">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
