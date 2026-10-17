import React, { ReactNode } from 'react';
import Modal from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  confirmButtonClassName?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  confirmText = 'Confirmar',
  confirmButtonClassName = 'bg-red-600 text-white hover:bg-red-700'
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-6">
        <p className="text-text-secondary">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] bg-surface border border-border text-text-secondary hover:text-text-primary px-5 py-2.5 rounded-xl hover:bg-surface/80 active:scale-[0.97] transition-all duration-200 font-semibold text-center flex items-center justify-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl active:scale-[0.97] shadow-md hover:shadow-lg transition-all duration-200 font-bold text-center flex items-center justify-center ${confirmButtonClassName}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;