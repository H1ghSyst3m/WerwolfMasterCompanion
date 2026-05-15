import type { ReactNode } from "react";
import { Btn } from "./Btn";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  title: string;
  description: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  ariaLabel?: string;
}

export function ConfirmModal({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDisabled = false,
  ariaLabel = title,
}: ConfirmModalProps) {
  return (
    <Modal onClose={onCancel} ariaLabel={ariaLabel}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="text-sm text-gray-400 mt-2">{description}</div>
        </div>
        <div className="flex gap-2">
          <Btn onClick={onCancel} cls="flex-1 bg-gray-700 hover:bg-gray-600 text-white">
            {cancelLabel}
          </Btn>
          <Btn
            onClick={onConfirm}
            cls="flex-1 bg-red-600 hover:bg-red-500 text-white"
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
