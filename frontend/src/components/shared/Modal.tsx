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
      <div className="relative w-full max-w-md bg-canvas-default border border-default rounded-lg shadow-elevation-large overflow-hidden animate-fade-in z-10 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-default bg-canvas-subtle">
          {title ? (
            <h3 className="text-base font-semibold text-fg-default">
              {title}
            </h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg-default hover:bg-canvas-default border border-default rounded-md p-1.5 surface-hover"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 bg-canvas-default text-fg-default">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
