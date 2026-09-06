import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Check,
  Paperclip,
  CheckCircle2,
  Sparkles,
  RotateCw,
  AlertCircle,
  Eye,
  Layers,
} from "lucide-react";
import { CopyButton } from "../common/CopyButton.jsx";

const FALLBACK_PROFILE = {
  personal: {
    name: "Rohan Phulkar",
    title: "Backend Engineer | Python • FastAPI • PostgreSQL",
    email: "hello@rohanphulkar.com",
    phone: "+91-9876543210",
    location: "Indore, India",
    linkedin: "https://linkedin.com/in/rohanphulkar",
    github: "https://github.com/rohanphulkar",
    website: "https://rohanphulkar.com",
  },
  summary:
    "Backend Engineer specializing in Python, FastAPI, and PostgreSQL, experienced in designing and optimizing high-performance REST APIs and scalable backend solutions. Skilled in authentication, authorization, Redis caching, and deploying applications using Docker and AWS. Proven ability to collaborate with cross-functional teams to deliver robust backend services aligned with business goals.",
  skills: [
    "Python",
    "FastAPI",
    "PostgreSQL",
    "REST APIs",
    "Redis",
    "Docker",
    "AWS",
    "CI/CD (GitHub Actions)",
    "Microservices",
    "Database Architecture",
    "Query Optimization",
    "Authentication",
    "Authorization",
    "Distributed Systems",
  ],
  experience: [
    {
      company: "MyCareerSarthi",
      role: "Backend Engineer",
      dates: "Sep 2025 – Present",
      location: "Indore, India",
      bullets: [
        "Engineered scalable backend services using FastAPI, PostgreSQL, and Redis to support high-performance profile and matching workflows.",
        "Designed and optimized REST APIs for profile analysis and job matchmaking systems to enhance efficiency and relevance.",
        "Built optimized text searching indices to improve query performance and matchmaking accuracy.",
        "Collaborated with cross-functional teams translating business requirements into robust technical backend solutions.",
      ],
      tech_stack: ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "GitHub Actions"],
    },
    {
      company: "Epikdoc AI",
      role: "Back End Developer",
      dates: "Sep 2024 – Jul 2025",
      location: "Remote",
      bullets: [
        "Led backend development of a healthcare CRM with scalable REST APIs for patient management and appointment scheduling.",
        "Developed secure authentication and role-based access control (RBAC) systems to safeguard sensitive healthcare data.",
        "Utilized Docker for backend application containerization and automated testing.",
      ],
      tech_stack: ["Python", "FastAPI", "PostgreSQL", "Docker"],
    },
  ],
  projects: [],
  education: [
    {
      degree: "Bachelor of Technology in Computer Science & Engineering",
      institution: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
      location: "Madhya Pradesh, India",
      year: "2021",
    },
  ],
};

const ATTACHMENT_FORMAT_OPTIONS = [
  {
    id: "PDF",
    label: "PDF Document (.pdf)",
    badge: "Recommended",
    desc: "Fixed layout, ATS-optimized, ideal for recruiter scanning.",
  },
  {
    id: "DOCX",
    label: "Word Document (.docx)",
    badge: "Editable",
    desc: "Microsoft Word format for agency editing.",
  },
  {
    id: "BOTH",
    label: "Both (PDF + DOCX)",
    badge: "Dual Attachment",
    desc: "Includes both PDF and DOCX attachments in email.",
  },
  {
    id: "NONE",
    label: "None (Body Only)",
    badge: "No File",
    desc: "Sends only cover letter email body without attachments.",
  },
];

export function GoogleDocsResumePreview({
  resume = {},
  parsedJob = {},
  onUpdateAttachmentFormat,
  isUpdating = false,
}) {
  const [viewMode, setViewMode] = useState("docs"); // "docs" | "pdf"
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedFormat, setSelectedFormat] = useState(resume.attachmentFormat || "PDF");
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  // Sync selected format when prop changes
  useEffect(() => {
    if (resume.attachmentFormat) {
      setSelectedFormat(resume.attachmentFormat);
    }
  }, [resume.attachmentFormat]);

  const urls = resume.urls || [];
  const pdfUrl = resume.pdfUrl || urls.find((u) => u.includes(".pdf")) || urls[0];
  const docxUrl = resume.docxUrl || urls.find((u) => u.includes(".docx")) || urls[1];
  const candidate = resume.candidateData || FALLBACK_PROFILE;
  const filename = resume.filename || "Rohan_Phulkar_Resume";

  // Normalize candidate data
  const personal = candidate.personal || FALLBACK_PROFILE.personal;
  const summary = candidate.summary || FALLBACK_PROFILE.summary;
  const rawSkills = candidate.skills || FALLBACK_PROFILE.skills;
  const rawExperience = candidate.experience || FALLBACK_PROFILE.experience;
  const rawProjects = candidate.projects || [];
  const rawEducation = candidate.education || FALLBACK_PROFILE.education;

  // Fetch PDF as Blob for reliable inline iframe/object rendering without attachment forcing
  useEffect(() => {
    if (pdfUrl && viewMode === "pdf" && !pdfBlobUrl) {
      let isMounted = true;
      setIsLoadingPdf(true);
      setPdfError(null);

      fetch(pdfUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (isMounted) {
            const blobUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            setPdfBlobUrl(blobUrl);
            setIsLoadingPdf(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn("Failed to create PDF blob URL, falling back to direct URL:", err);
            setPdfError(err.message);
            setIsLoadingPdf(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [pdfUrl, viewMode, pdfBlobUrl]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  const handleFormatChange = (fmtId) => {
    setSelectedFormat(fmtId);
    if (onUpdateAttachmentFormat) {
      onUpdateAttachmentFormat(fmtId);
    }
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(130, z + 10));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(70, z - 10));

  // Clean up LaTeX formatting like '--' to '–'
  const cleanText = (str) => {
    if (!str || typeof str !== "string") return "";
    return str.replace(/--/g, "–").trim();
  };

  // Helper to render skills robustly (handles arrays, objects, and strings)
  const renderSkills = () => {
    if (Array.isArray(rawSkills)) {
      return (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {rawSkills.map((s, idx) => (
            <span
              key={idx}
              className="px-2.5 py-0.5 rounded-md bg-[#f3f4f6] text-[#1f2937] text-[11px] font-semibold border border-[#e5e7eb]"
            >
              {typeof s === "object" ? s.skill || s.name || JSON.stringify(s) : String(s)}
            </span>
          ))}
        </div>
      );
    }

    if (typeof rawSkills === "object" && rawSkills !== null) {
      return (
        <div className="space-y-1.5 text-xs text-[#374151]">
          {Object.entries(rawSkills).map(([cat, items], idx) => {
            const catName = cat
              .replace(/([A-Z])/g, " $1")
              .replace(/_/g, " ")
              .trim()
              .replace(/^\w/, (c) => c.toUpperCase());
            const itemsStr = Array.isArray(items)
              ? items.join(", ")
              : typeof items === "object"
              ? Object.values(items).join(", ")
              : String(items);

            return (
              <div key={idx}>
                <span className="font-bold text-[#111827]">{catName}: </span>
                <span>{itemsStr}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return <p className="text-xs text-[#374151]">{String(rawSkills)}</p>;
  };

  // Normalize education into array
  const educationList = Array.isArray(rawEducation)
    ? rawEducation
    : typeof rawEducation === "object" && rawEducation !== null
    ? [rawEducation]
    : [];

  return (
    <div className="space-y-5 select-none animate-in fade-in duration-200">
      {/* 1. Attachment Format Selection Bar */}
      <div className="duo-card p-4 sm:p-5 bg-white dark:bg-[#1b2b32] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Paperclip size={18} className="text-[#1cb0f6] stroke-3 shrink-0" />
            <div>
              <h4 className="text-xs sm:text-sm font-black text-[#3c3c3c] dark:text-white uppercase tracking-wider">
                Email Attachment Format
              </h4>
              <p className="text-[11px] text-[#777777] dark:text-[#a5b6be] font-bold">
                Select which resume format ApplyPilot will attach when delivering the outbound email
              </p>
            </div>
          </div>

          <span className="text-[10px] font-black uppercase text-[#58a700] dark:text-[#a5ed6e] bg-[#d7ffb8] dark:bg-[#1a3818] border border-[#58cc02] px-2.5 py-1 rounded-full self-start sm:self-auto">
            Selected: {selectedFormat}
          </span>
        </div>

        {/* Format Selector Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {ATTACHMENT_FORMAT_OPTIONS.map((opt) => {
            const isSelected = selectedFormat === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleFormatChange(opt.id)}
                className={`p-3 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#ddf4ff] dark:bg-[#162a35] border-[#1cb0f6] shadow-xs ring-2 ring-[#1cb0f6]/30"
                    : "bg-[#f7f9fa] dark:bg-[#233a44] border-[#e5e5e5] dark:border-[#2e414c] hover:border-[#1cb0f6]"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <span className="text-xs font-black text-[#3c3c3c] dark:text-white">
                    {opt.label}
                  </span>
                  {isSelected && (
                    <CheckCircle2 size={16} className="text-[#1cb0f6] stroke-3 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-[#777777] dark:text-[#a5b6be] font-bold leading-tight">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Google Docs Style Preview Container */}
      <div className="duo-card overflow-hidden bg-white dark:bg-[#1b2b32] border-2 border-[#e5e5e5] dark:border-[#2e414c]">
        {/* Google Docs Toolbar Header */}
        <div className="px-4 py-3 bg-[#f8fafd] dark:bg-[#15232a] border-b-2 border-[#e5e5e5] dark:border-[#2e414c] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Doc Title & Status */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <FileText size={18} className="stroke-3" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-[#3c3c3c] dark:text-white truncate max-w-xs sm:max-w-md">
                  {filename.endsWith(".pdf") ? filename : `${filename}.pdf`}
                </span>
                <span className="text-[10px] font-bold text-[#58cc02] dark:text-[#a5ed6e] bg-[#58cc02]/15 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                  <Check size={11} className="stroke-3" /> ATS 92+ Tailored
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#777777] dark:text-[#a5b6be] block">
                Google Docs Paginated View • Standard 8.5" × 11"
              </span>
            </div>
          </div>

          {/* View Mode & Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            {/* View Mode Switch */}
            <div className="inline-flex p-1 bg-[#e5e5e5] dark:bg-[#233a44] rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setViewMode("docs")}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                  viewMode === "docs"
                    ? "bg-white dark:bg-[#1b2b32] text-[#1cb0f6] shadow-xs"
                    : "text-[#777777] dark:text-[#a5b6be]"
                }`}
              >
                Docs View
              </button>
              {pdfUrl && (
                <button
                  type="button"
                  onClick={() => setViewMode("pdf")}
                  className={`px-3 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                    viewMode === "pdf"
                      ? "bg-white dark:bg-[#1b2b32] text-[#1cb0f6] shadow-xs"
                      : "text-[#777777] dark:text-[#a5b6be]"
                  }`}
                >
                  PDF Viewer
                </button>
              )}
            </div>

            {/* Zoom Controls (Docs View) */}
            {viewMode === "docs" && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#f0f4f9] dark:bg-[#233a44] rounded-xl border border-[#e5e5e5] dark:border-[#2e414c]">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[10px] font-mono font-bold text-[#3c3c3c] dark:text-white px-1">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            )}

            {/* Direct Download Links */}
            <div className="flex items-center gap-1.5">
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="duo-btn-primary px-3 py-1 text-[11px] font-black flex items-center gap-1"
                  title="Download / View PDF"
                >
                  <Download size={12} className="stroke-3" />
                  <span>PDF</span>
                </a>
              )}
              {docxUrl && (
                <a
                  href={docxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="duo-btn-secondary px-3 py-1 text-[11px] font-black flex items-center gap-1 text-[#1cb0f6]"
                  title="Download Word Document"
                >
                  <Download size={12} className="stroke-3" />
                  <span>DOCX</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Canvas */}
        <div className="bg-[#edf2f7] dark:bg-[#111a1f] p-4 sm:p-8 flex justify-center overflow-x-auto min-h-[720px]">
          {viewMode === "pdf" && pdfUrl ? (
            <div className="w-full max-w-4xl min-h-[800px] flex flex-col items-center justify-center bg-white rounded-xl shadow-2xl overflow-hidden border border-[#dadce0]">
              {isLoadingPdf && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RotateCw size={28} className="animate-spin text-[#1cb0f6]" />
                  <span className="text-xs font-bold text-[#777777]">Loading PDF Preview...</span>
                </div>
              )}

              {/* Object & Iframe with blob or direct URL */}
              {!isLoadingPdf && (
                <div className="w-full h-[850px] relative">
                  <object
                    data={pdfBlobUrl || pdfUrl}
                    type="application/pdf"
                    className="w-full h-full border-none"
                  >
                    <iframe
                      src={pdfBlobUrl || pdfUrl}
                      title="Resume PDF"
                      className="w-full h-full border-none"
                    />
                  </object>
                </div>
              )}
            </div>
          ) : (
            /* Google Docs Formatted Paper Page */
            <div
              className="bg-white text-[#202124] shadow-2xl rounded-xs p-8 sm:p-12 transition-transform origin-top select-text"
              style={{
                width: "816px",
                minHeight: "1056px",
                maxWidth: "100%",
                transform: `scale(${zoomLevel / 100})`,
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              }}
            >
              {/* Header Letterhead */}
              <div className="text-center space-y-1.5 pb-4 border-b-2 border-[#111827]">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827] uppercase">
                  {personal.name || "Rohan Phulkar"}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-[#374151]">
                  {personal.title || parsedJob.title || "Backend Engineer"}
                </p>
                <div className="text-[11px] font-medium text-[#4b5563] flex items-center justify-center flex-wrap gap-x-2 gap-y-1 pt-0.5">
                  {personal.email && <span>{personal.email}</span>}
                  {personal.phone && (
                    <>
                      <span>•</span>
                      <span>{personal.phone}</span>
                    </>
                  )}
                  {personal.location && (
                    <>
                      <span>•</span>
                      <span>{personal.location}</span>
                    </>
                  )}
                  {personal.linkedin && (
                    <>
                      <span>•</span>
                      <a
                        href={personal.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1a73e8] hover:underline"
                      >
                        LinkedIn
                      </a>
                    </>
                  )}
                  {personal.github && (
                    <>
                      <span>•</span>
                      <a
                        href={personal.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1a73e8] hover:underline"
                      >
                        GitHub
                      </a>
                    </>
                  )}
                  {personal.website && (
                    <>
                      <span>•</span>
                      <a
                        href={personal.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1a73e8] hover:underline"
                      >
                        Portfolio
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Section 1: Professional Summary */}
              {summary && (
                <div className="pt-4 space-y-1.5">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#111827] pb-0.5 border-b border-[#e5e7eb]">
                    Professional Summary
                  </h2>
                  <p className="text-xs leading-relaxed text-[#374151] text-justify">
                    {cleanText(summary)}
                  </p>
                </div>
              )}

              {/* Section 2: Technical Skills */}
              {rawSkills && (
                <div className="pt-4 space-y-2">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#111827] pb-0.5 border-b border-[#e5e7eb]">
                    Technical Skills
                  </h2>
                  {renderSkills()}
                </div>
              )}

              {/* Section 3: Professional Experience */}
              {Array.isArray(rawExperience) && rawExperience.length > 0 && (
                <div className="pt-4 space-y-3.5">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#111827] pb-0.5 border-b border-[#e5e7eb]">
                    Work Experience
                  </h2>

                  {rawExperience.map((exp, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                        <span>
                          {exp.role} — <span className="font-medium text-[#374151]">{exp.company}</span>
                        </span>
                        <span className="font-medium text-[#6b7280]">{cleanText(exp.dates)}</span>
                      </div>
                      {exp.location && (
                        <span className="text-[10px] text-[#6b7280] block -mt-0.5">
                          {exp.location}
                        </span>
                      )}
                      <ul className="list-disc list-inside space-y-1 text-xs text-[#374151] pt-0.5">
                        {Array.isArray(exp.bullets) &&
                          exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-snug">
                              {cleanText(b)}
                            </li>
                          ))}
                      </ul>
                      {Array.isArray(exp.tech_stack) && exp.tech_stack.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5 text-[10px] text-[#6b7280]">
                          <span className="font-semibold text-[#4b5563]">Tech Stack:</span>
                          <span>{exp.tech_stack.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Section 4: Projects */}
              {Array.isArray(rawProjects) && rawProjects.length > 0 && (
                <div className="pt-4 space-y-2.5">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#111827] pb-0.5 border-b border-[#e5e7eb]">
                    Key Projects
                  </h2>
                  {rawProjects.map((proj, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-[#111827]">
                        <span>
                          {proj.name}
                          {proj.url && (
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-[10px] text-[#1a73e8] font-normal underline inline-flex items-center gap-0.5"
                            >
                              Link <ExternalLink size={10} />
                            </a>
                          )}
                        </span>
                        {proj.tech_stack && (
                          <span className="font-normal text-[11px] text-[#6b7280]">
                            {Array.isArray(proj.tech_stack) ? proj.tech_stack.join(", ") : proj.tech_stack}
                          </span>
                        )}
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-xs text-[#374151]">
                        {Array.isArray(proj.description || proj.bullets) &&
                          (proj.description || proj.bullets).map((b, bIdx) => (
                            <li key={bIdx} className="leading-snug">
                              {cleanText(b)}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Section 5: Education */}
              {educationList.length > 0 && (
                <div className="pt-4 space-y-2">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#111827] pb-0.5 border-b border-[#e5e7eb]">
                    Education
                  </h2>
                  {educationList.map((edu, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-[#374151]">
                      <div>
                        <span className="font-bold text-[#111827]">{edu.degree}</span>
                        <span className="block text-[11px] text-[#6b7280]">
                          {edu.institution} {edu.location ? `• ${edu.location}` : ""}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#6b7280]">{cleanText(edu.year || edu.dates)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Google Docs Page Footer */}
              <div className="pt-8 text-center text-[10px] text-[#9ca3af]">
                <span>Page 1 of 1 • Tailored for {parsedJob.company || "Job Application"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GoogleDocsResumePreview;
