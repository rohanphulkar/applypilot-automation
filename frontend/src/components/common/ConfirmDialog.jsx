import React from "react";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  isOpen,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="duo-card bg-white dark:bg-[#1b2b32] p-6 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white p-1 rounded-xl cursor-pointer"
        >
          <X size={18} className="stroke-[2.5]" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] text-[#ff4b4b] flex items-center justify-center shrink-0">
            <AlertTriangle size={24} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#3c3c3c] dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-[#777777] dark:text-[#a5b6be] mt-1.5 leading-relaxed font-bold">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#e5e5e5] dark:border-[#2e414c]">
          <button
            type="button"
            onClick={onCancel}
            className="duo-btn-secondary px-4 py-2 text-xs font-black"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-black ${
              variant === "danger" ? "duo-btn-danger" : "duo-btn-primary"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
