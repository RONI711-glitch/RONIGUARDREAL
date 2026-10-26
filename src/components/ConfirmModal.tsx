import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmPhrase?: string;
  userPhraseInput?: string;
  onPhraseChange?: (val: string) => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
  confirmPhrase,
  userPhraseInput,
  onPhraseChange,
}) => {
  if (!isOpen) return null;

  const isPhraseSatisfied = !confirmPhrase || (userPhraseInput?.trim().toUpperCase() === confirmPhrase.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0f0a1c] border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-600/30 flex items-center justify-center text-purple-400">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed mb-5">{message}</p>

        {confirmPhrase && onPhraseChange && (
          <div className="mb-5">
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Type <span className="text-purple-300 font-mono font-bold">{confirmPhrase}</span> to confirm:
            </label>
            <input
              type="text"
              value={userPhraseInput || ''}
              onChange={(e) => onPhraseChange(e.target.value)}
              placeholder={confirmPhrase}
              className="w-full px-3 py-2 rounded-lg bg-[#07040d] border border-purple-900/40 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-neutral-700 hover:border-neutral-500 text-neutral-300 text-sm font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!isPhraseSatisfied}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md ${
              isDestructive
                ? isPhraseSatisfied
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40'
                  : 'bg-red-950/40 text-neutral-500 cursor-not-allowed border border-red-900/30'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
