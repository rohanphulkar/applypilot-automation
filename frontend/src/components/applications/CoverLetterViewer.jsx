import React from "react";
import { CopyButton } from "../common/CopyButton.jsx";
import { Sparkles, FileText } from "lucide-react";

export function CoverLetterViewer({ content, status = "COMPLETED" }) {
  if (!content) {
    return (
      <div className="duo-card p-8 text-center select-none">
        <Sparkles size={28} className="mx-auto text-[#ce82ff] mb-2 animate-pulse stroke-[2.5]" />
        <p className="text-sm font-black text-[#3c3c3c] dark:text-white">
          Cover letter generation is in progress or not yet triggered.
        </p>
      </div>
    );
  }

  const wordCount = content.trim().split(/\s+/).length;
  const charCount = content.length;

  return (
    <div className="duo-card overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#e5e5e5] dark:border-[#2e414c] bg-[#f7f9fa] dark:bg-[#233a44]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#f3e8ff] dark:bg-[#2c1838] border-2 border-[#ce82ff] text-[#ce82ff] flex items-center justify-center">
            <FileText size={16} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wide">
              Tailored Cover Letter
            </h3>
            <span className="text-[10px] font-mono font-bold text-[#777777] dark:text-[#a5b6be]">
              {wordCount} words • {charCount} chars
            </span>
          </div>
        </div>
        <CopyButton text={content} label="Copy Letter" />
      </div>

      {/* Formatted Content */}
      <div className="p-6 md:p-8 space-y-4 max-w-3xl text-sm leading-relaxed text-[#3c3c3c] dark:text-[#e5e5e5] font-bold selection:bg-[#d7ffb8] dark:selection:bg-[#1a3818]">
        {content.split("\n\n").map((para, i) => (
          <p key={i} className="whitespace-pre-line text-sm leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}

export default CoverLetterViewer;
