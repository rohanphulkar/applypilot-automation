import React from "react";
import { FileText, ExternalLink } from "lucide-react";
import { CopyButton } from "../common/CopyButton.jsx";

export function ResumeCard({ urls = [], status = "COMPLETED" }) {
  if (!urls || urls.length === 0) {
    return (
      <div className="duo-card p-8 text-center select-none">
        <FileText size={28} className="mx-auto text-[#1cb0f6] mb-2 animate-pulse stroke-[2.5]" />
        <p className="text-sm font-black text-[#3c3c3c] dark:text-white">
          Tailored resume is generating or waiting for the Resume API.
        </p>
      </div>
    );
  }

  const getFormatLabel = (url, index) => {
    if (url.includes(".pdf") || index === 0) return { format: "PDF", name: "ATS Optimized Resume (PDF)" };
    if (url.includes(".docx")) return { format: "DOCX", name: "Word Document (DOCX)" };
    if (url.includes(".tex")) return { format: "LaTeX", name: "LaTeX Source (.tex)" };
    return { format: "FILE", name: `Resume Document #${index + 1}` };
  };

  return (
    <div className="space-y-4 select-none">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {urls.map((url, idx) => {
          const { format, name } = getFormatLabel(url, idx);

          return (
            <div
              key={idx}
              className="duo-card p-5 flex flex-col justify-between hover:border-[#1cb0f6] transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] text-[#1cb0f6] flex items-center justify-center font-black text-xs">
                      {format}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#3c3c3c] dark:text-white">
                        {name}
                      </h4>
                      <span className="text-[10px] uppercase text-[#58a700] dark:text-[#a5ed6e] font-black px-2 py-0.5 rounded-md bg-[#d7ffb8] dark:bg-[#1a3818] border border-[#58cc02] inline-block mt-1">
                        ATS 92+ Score Target
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-mono font-bold text-[#777777] dark:text-[#a5b6be] truncate mb-4 bg-[#f7f9fa] dark:bg-[#233a44] p-2.5 rounded-xl border-2 border-[#e5e5e5] dark:border-[#2e414c]">
                  {url}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t-2 border-[#e5e5e5] dark:border-[#2e414c]">
                <CopyButton text={url} label="Copy Link" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="duo-btn-primary px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5"
                >
                  <span>OPEN / DOWNLOAD</span>
                  <ExternalLink size={13} className="stroke-[3]" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ResumeCard;
