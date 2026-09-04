import React, { useState } from "react";
import { Mail, CheckCircle2, AlertCircle, Clock, FileText, RotateCw } from "lucide-react";
import { formatDate } from "../../utils/formatters.js";
import { CopyButton } from "../common/CopyButton.jsx";

export function EmailPreviewCard({
  email = {},
  resumeUrls = [],
  onRetry,
  isRetrying = false,
}) {
  const [viewMode, setViewMode] = useState("rendered"); // "rendered" | "plain"

  const {
    recruiterEmail,
    subject,
    body,
    messageId,
    smtpStatus = "PENDING",
    sentFolderStatus = "PENDING",
    sentAt,
  } = email;

  const getSmtpBadge = () => {
    if (smtpStatus === "SENT") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-[#d7ffb8] dark:bg-[#1a3818] text-[#58a700] dark:text-[#a5ed6e] border-2 border-[#58cc02]">
          <CheckCircle2 size={14} className="stroke-[3]" /> SMTP Sent
        </span>
      );
    }
    if (smtpStatus === "FAILED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-[#ffe5e5] dark:bg-[#38181a] text-[#ea2b2b] dark:text-[#ff7a7a] border-2 border-[#ff4b4b]">
          <AlertCircle size={14} className="stroke-[3]" /> SMTP Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-[#ddf4ff] dark:bg-[#162a35] text-[#1899d6] dark:text-[#1cb0f6] border-2 border-[#1cb0f6]">
        <Clock size={14} className="stroke-[3]" /> SMTP Pending
      </span>
    );
  };

  const getSentFolderBadge = () => {
    if (sentFolderStatus === "SAVED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-[#d7ffb8] dark:bg-[#1a3818] text-[#58a700] dark:text-[#a5ed6e] border-2 border-[#58cc02]">
          <CheckCircle2 size={14} className="stroke-[3]" /> IMAP Sent Synced
        </span>
      );
    }
    if (sentFolderStatus === "SKIPPED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-[#f7f9fa] dark:bg-[#233a44] text-[#777777] dark:text-[#a5b6be] border-2 border-[#e5e5e5] dark:border-[#2e414c]">
          IMAP Sync Skipped
        </span>
      );
    }
    if (sentFolderStatus === "FAILED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-[#ffe8cc] dark:bg-[#382512] text-[#e58600] dark:text-[#ff9600] border-2 border-[#ff9600]">
          <AlertCircle size={14} className="stroke-[3]" /> Sent Sync Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-[#f7f9fa] dark:bg-[#233a44] text-[#777777] dark:text-[#a5b6be] border-2 border-[#e5e5e5] dark:border-[#2e414c]">
        <Clock size={14} className="stroke-[3]" /> Sent Sync Pending
      </span>
    );
  };

  return (
    <div className="duo-card overflow-hidden select-none">
      {/* Header Info */}
      <div className="p-4 sm:p-6 border-b-2 border-[#e5e5e5] dark:border-[#2e414c] bg-[#f7f9fa] dark:bg-[#233a44]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] text-[#1cb0f6] flex items-center justify-center shrink-0">
              <Mail size={16} className="stroke-[2.5]" />
            </div>
            <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wide">
              Application Email Transmission
            </h3>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {getSmtpBadge()}
            {getSentFolderBadge()}
            {sentFolderStatus === "FAILED" && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="duo-btn-orange px-3.5 py-1 text-xs font-black flex items-center gap-1.5"
              >
                <RotateCw size={13} className={isRetrying ? "animate-spin" : "stroke-[2.5]"} /> Retry Sent Sync
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <span className="w-24 font-black text-[#777777] dark:text-[#a5b6be] uppercase text-[10px] shrink-0">From:</span>
            <span className="text-[#3c3c3c] dark:text-white font-black break-all">
              Rohan Phulkar &lt;hello@rohanphulkar.com&gt;
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <span className="w-24 font-black text-[#777777] dark:text-[#a5b6be] uppercase text-[10px] shrink-0">To:</span>
            <span className="text-[#3c3c3c] dark:text-white font-black break-all">
              {recruiterEmail || "Pending extraction..."}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
            <span className="w-24 font-black text-[#777777] dark:text-[#a5b6be] uppercase text-[10px] shrink-0">Subject:</span>
            <span className="text-[#3c3c3c] dark:text-white font-bold wrap-break-word">
              {subject || "Pending composition..."}
            </span>
          </div>
          {messageId && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="w-24 font-black text-[#777777] dark:text-[#a5b6be] uppercase text-[10px] shrink-0">Message-ID:</span>
              <span className="text-[#777777] dark:text-[#a5b6be] truncate max-w-md break-all">
                {messageId}
              </span>
              <CopyButton text={messageId} label="Copy ID" />
            </div>
          )}
          {sentAt && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
              <span className="w-24 font-black text-[#777777] dark:text-[#a5b6be] uppercase text-[10px] shrink-0">Sent Date:</span>
              <span className="text-[#3c3c3c] dark:text-[#e5e5e5] font-bold">
                {formatDate(sentAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between px-6 py-3 border-b-2 border-[#e5e5e5] dark:border-[#2e414c] bg-white dark:bg-[#1b2b32]">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("rendered")}
            className={`px-3.5 py-1.5 rounded-xl font-black uppercase text-xs transition-all cursor-pointer ${
              viewMode === "rendered"
                ? "bg-[#ddf4ff] dark:bg-[#162a35] text-[#1899d6] dark:text-[#1cb0f6] border-2 border-[#1cb0f6]"
                : "text-[#777777] dark:text-[#a5b6be] hover:bg-[#f7f9fa] dark:hover:bg-[#233a44] border-2 border-transparent"
            }`}
          >
            Formatted View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("plain")}
            className={`px-3.5 py-1.5 rounded-xl font-black uppercase text-xs transition-all cursor-pointer ${
              viewMode === "plain"
                ? "bg-[#ddf4ff] dark:bg-[#162a35] text-[#1899d6] dark:text-[#1cb0f6] border-2 border-[#1cb0f6]"
                : "text-[#777777] dark:text-[#a5b6be] hover:bg-[#f7f9fa] dark:hover:bg-[#233a44] border-2 border-transparent"
            }`}
          >
            Raw Plain Text
          </button>
        </div>
        {body && <CopyButton text={body} label="Copy Body" />}
      </div>

      {/* Email Body */}
      <div className="p-6 md:p-8">
        {body ? (
          viewMode === "rendered" ? (
            <div className="max-w-2xl text-sm leading-relaxed text-[#3c3c3c] dark:text-white space-y-4 font-bold">
              {body.split("\n\n").map((para, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <pre className="text-xs font-mono font-bold text-[#3c3c3c] dark:text-[#e5e5e5] bg-[#f7f9fa] dark:bg-[#233a44] p-4 rounded-2xl border-2 border-[#e5e5e5] dark:border-[#2e414c] whitespace-pre-wrap overflow-x-auto">
              {body}
            </pre>
          )
        ) : (
          <p className="text-xs font-bold text-[#777777] dark:text-[#a5b6be] text-center py-6">
            Email body will appear once composed by the automation engine.
          </p>
        )}
      </div>

      {/* Attachment Card */}
      {resumeUrls && resumeUrls.length > 0 && (
        <div className="px-6 py-4 border-t-2 border-[#e5e5e5] dark:border-[#2e414c] bg-[#f7f9fa] dark:bg-[#233a44]">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be] block mb-2">
            ATTACHMENTS (1 FILE)
          </span>
          <div className="inline-flex items-center gap-3 p-3 bg-white dark:bg-[#1b2b32] border-2 border-[#e5e5e5] dark:border-[#2e414c] rounded-2xl shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] flex items-center justify-center">
              <FileText size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-black text-[#3c3c3c] dark:text-white block">
                Resume.pdf
              </span>
              <span className="text-[10px] font-bold text-[#777777] dark:text-[#a5b6be]">
                Auto-attached to Outbound SMTP & Sent Folder
              </span>
            </div>
            <a
              href={resumeUrls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 duo-btn-primary px-3 py-1.5 text-xs font-black"
            >
              OPEN PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailPreviewCard;
