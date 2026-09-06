import React, { useState, useEffect } from "react";
import { CopyButton } from "../common/CopyButton.jsx";
import { Sparkles, FileText, Edit3, Check, X, Save, CheckCircle2 } from "lucide-react";

export function CoverLetterViewer({ content, status, onSave, isSaving = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(content || "");
  const [editedText, setEditedText] = useState(content || "");
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  useEffect(() => {
    if (content) {
      setLocalContent(content);
      setEditedText(content);
    }
  }, [content]);

  if (!localContent && !content) {
    return (
      <div className="duo-card p-6 sm:p-8 text-center select-none">
        <Sparkles size={28} className="mx-auto text-[#ce82ff] mb-2 animate-pulse stroke-[2.5]" />
        <p className="text-xs sm:text-sm font-black text-[#3c3c3c] dark:text-white">
          Cover letter generation is in progress or not yet triggered.
        </p>
      </div>
    );
  }

  const currentDisplay = isEditing ? editedText : localContent || content;
  const wordCount = currentDisplay.trim().split(/\s+/).filter(Boolean).length;
  const charCount = currentDisplay.length;

  const handleSave = async () => {
    const textToSave = editedText.trim();
    if (!textToSave) return;

    setLocalContent(textToSave);
    setIsEditing(false);

    if (onSave) {
      await onSave(textToSave);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3500);
    }
  };

  const handleCancel = () => {
    setEditedText(localContent || content || "");
    setIsEditing(false);
  };

  return (
    <div className="duo-card overflow-hidden">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#e5e5e5] dark:border-[#2e414c] bg-[#f7f9fa] dark:bg-[#233a44]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#f3e8ff] dark:bg-[#2c1838] border-2 border-[#ce82ff] text-[#ce82ff] flex items-center justify-center">
            <FileText size={16} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wide">
                Tailored Cover Letter
              </h3>
              {showSavedFeedback && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#58cc02] dark:text-[#a5ed6e] animate-in fade-in">
                  <CheckCircle2 size={12} className="stroke-[3]" /> Saved!
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono font-bold text-[#777777] dark:text-[#a5b6be]">
              {wordCount} words • {charCount} chars
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSave && !isEditing && (
            <button
              type="button"
              onClick={() => {
                setEditedText(localContent || content || "");
                setIsEditing(true);
              }}
              className="duo-btn-secondary px-3 py-1.5 text-xs font-black flex items-center gap-1.5"
            >
              <Edit3 size={14} className="stroke-[2.5]" /> Edit Letter
            </button>
          )}

          {isEditing && (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-xl text-[#777777] hover:text-[#ff4b4b] hover:bg-[#ffe5e5] dark:hover:bg-[#38181a] transition-colors cursor-pointer"
                title="Cancel Edit"
              >
                <X size={16} />
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="duo-btn-primary px-3 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} className="stroke-[2.5]" />
                <span>{isSaving ? "SAVING..." : "SAVE CHANGES"}</span>
              </button>
            </>
          )}

          <CopyButton text={localContent || content} label="Copy Letter" />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 md:p-8">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              rows={16}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-4 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#1cb0f6] text-sm leading-relaxed text-[#3c3c3c] dark:text-white font-mono focus:outline-hidden resize-y"
              placeholder="Write or edit your cover letter..."
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="duo-btn-secondary px-4 py-2 text-xs font-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="duo-btn-primary px-5 py-2 text-xs font-black flex items-center gap-2 cursor-pointer"
              >
                <Save size={14} className="stroke-[2.5]" />
                <span>{isSaving ? "SAVING..." : "SAVE CHANGES"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl text-sm leading-relaxed text-[#3c3c3c] dark:text-[#e5e5e5] font-bold selection:bg-[#d7ffb8] dark:selection:bg-[#1a3818]">
            {(localContent || content).split("\n\n").map((para, i) => (
              <p key={i} className="whitespace-pre-line text-sm leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CoverLetterViewer;
