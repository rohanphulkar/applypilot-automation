import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, label = "Copy", className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer select-none ${
        copied
          ? "bg-[#d7ffb8] dark:bg-[#1a3818] text-[#58a700] dark:text-[#a5ed6e] border-2 border-[#58cc02]"
          : "bg-white dark:bg-[#1b2b32] text-[#777777] dark:text-[#a5b6be] hover:bg-[#f7f9fa] dark:hover:bg-[#233a44] hover:text-[#3c3c3c] dark:hover:text-white border-2 border-[#e5e5e5] dark:border-[#2e414c] border-b-4 border-b-[#d4d4d4] dark:border-b-[#202f37] active:border-b-2 active:translate-y-[2px]"
      } ${className}`}
    >
      {copied ? <Check size={13} className="text-[#58cc02] stroke-[3]" /> : <Copy size={13} className="stroke-[2.5]" />}
      <span>{copied ? "COPIED!" : label}</span>
    </button>
  );
}

export default CopyButton;
