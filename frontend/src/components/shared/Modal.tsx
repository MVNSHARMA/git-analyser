import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Lock body scroll when modal is open
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white border-[3px] border-[#111827] rounded-none shadow-none overflow-hidden animate-fade-in z-10 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-[3px] border-[#111827] bg-[#fdfdfd]">
          {title ? (
            <h3 className="text-base font-black text-[#111827] uppercase tracking-wider">
              {title}
            </h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="text-[#111827] hover:bg-gray-100 border-2 border-[#111827] p-1.5 transition-colors brutal-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-white text-[#111827]">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
