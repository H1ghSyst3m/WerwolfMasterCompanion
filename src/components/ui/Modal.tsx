import { useEffect, useRef } from "react";

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
  ariaLabel?: string;
}

export function Modal({ children, onClose, ariaLabel = "Dialog" }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={e => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose?.();
          }
        }}
        className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full border border-gray-600 shadow-2xl max-h-[90vh] overflow-y-auto outline-none"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
