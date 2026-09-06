import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Send,
  FileCode,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Trash2,
  FileText,
  RotateCw,
  AlertTriangle,
  Mail,
  Edit3,
} from "lucide-react";
import { createApplication, parseJobImage } from "../services/applications.service.js";
import MissingDetailsModal from "../components/applications/MissingDetailsModal.jsx";

const SAMPLE_JOB_DESCRIPTION = `
Senior Full Stack Engineer
Acme Cloud Technologies — San Francisco, CA (Hybrid / Remote)
Contact Recruiter: careers@acmecloud.tech

About the Role:
We are seeking an experienced Senior Full Stack Engineer to architect and scale our cloud-native workflow platform. You will build high-throughput distributed microservices, craft intuitive web interfaces, and optimize developer experience across our global systems.

Requirements & Qualifications:
- 5+ years of production experience building distributed systems with Node.js, TypeScript, Go, or Python.
- Strong proficiency with modern frontend frameworks (React, Next.js, TailwindCSS, State Management).
- Production experience with PostgreSQL, Redis, distributed message queues (BullMQ, Kafka, or RabbitMQ), and Docker.
- Experience designing resilient RESTful & GraphQL APIs, microservices, and CI/CD automation pipelines.
`.trim();

const extractEmailFromText = (text) => {
  if (!text) return null;
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (!matches || matches.length === 0) return null;
  const filtered = matches.filter(
    (m) => !m.endsWith(".png") && !m.endsWith(".jpg") && !m.endsWith(".jpeg") && !m.endsWith(".webp")
  );
  return filtered[0] || matches[0] || null;
};

export function NewApplicationPage() {
  const [inputMode, setInputMode] = useState("text"); // default to text for quick paste
  const [jobDescription, setJobDescription] = useState("");
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [screenshotInfo, setScreenshotInfo] = useState(null);
  const [storedImageFile, setStoredImageFile] = useState(null);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [isParsingImage, setIsParsingImage] = useState(false);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detectedEmail =
    parsedPreview?.applicationEmail ||
    parsedPreview?.recruiterEmail ||
    extractEmailFromText(jobDescription);

  const mutation = useMutation({
    mutationFn: (desc) =>
      createApplication({
        job_description: desc,
        screenshot: screenshotInfo
          ? { filename: screenshotInfo.name, contentType: screenshotInfo.type }
          : undefined,
      }),
    onSuccess: (res) => {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#58cc02", "#1cb0f6", "#ff9600", "#ce82ff"],
      });

      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });

      if (res.jobId) {
        navigate(`/applications/${res.jobId}`);
      } else {
        navigate("/applications");
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to submit job application.");
    },
  });

  // Handle image file selection & Vision OCR
  const processImageFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (PNG, JPG, WebP).");
      return;
    }

    setErrorMsg("");
    setIsParsingImage(true);
    setStoredImageFile(file);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      setScreenshotPreview(base64Data);
      setScreenshotInfo({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        type: file.type,
      });

      try {
        const response = await parseJobImage(base64Data, file.type);
        const parsed = response.data?.parsedJob || {};
        const text = response.data?.rawText || parsed.description || "";

        if (text) {
          setJobDescription(text);
          setParsedPreview(parsed);

          const email = parsed.applicationEmail || parsed.recruiterEmail;
          if (!email) {
            setIsMissingModalOpen(true);
          }
        } else {
          setErrorMsg(
            "Could not extract readable text from this screenshot. Please paste the text manually."
          );
        }
      } catch (err) {
        setErrorMsg(err.message || "Failed to analyze job description screenshot.");
      } finally {
        setIsParsingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Clipboard paste listener for direct Ctrl+V screenshots
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setInputMode("screenshot");
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRescan = async () => {
    if (inputMode === "screenshot" && storedImageFile) {
      setIsMissingModalOpen(false);
      await processImageFile(storedImageFile);
    } else {
      setIsMissingModalOpen(false);
      fileInputRef.current?.click();
    }
  };

  const handleSaveMissingDetails = (details) => {
    const updatedParsed = {
      ...(parsedPreview || {}),
      applicationEmail: details.recruiterEmail || details.applicationEmail,
      recruiterEmail: details.recruiterEmail || details.applicationEmail,
      company: details.company || parsedPreview?.company,
      title: details.title || parsedPreview?.title,
    };
    setParsedPreview(updatedParsed);

    let updatedText = jobDescription;
    if (details.recruiterEmail && !updatedText.includes(details.recruiterEmail)) {
      const emailLine = `\n\nContact / Recruiter Email: ${details.recruiterEmail}`;
      updatedText = updatedText ? updatedText + emailLine : `Job Application\n${emailLine}`;
      setJobDescription(updatedText);
    }

    setIsMissingModalOpen(false);
    setErrorMsg("");
    mutation.mutate(updatedText.trim());
  };

  const handleSkipMissingDetails = () => {
    setIsMissingModalOpen(false);
    setErrorMsg("");
    if (jobDescription.trim()) {
      mutation.mutate(jobDescription.trim());
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const text = jobDescription.trim();
    if (!text) {
      setErrorMsg("Please provide a job description or screenshot before starting.");
      return;
    }

    const email =
      parsedPreview?.applicationEmail ||
      parsedPreview?.recruiterEmail ||
      extractEmailFromText(text);

    if (!email) {
      setIsMissingModalOpen(true);
      return;
    }

    setErrorMsg("");
    mutation.mutate(text);
  };

  const handleLoadSample = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setParsedPreview({
      title: "Senior Full Stack Engineer",
      company: "Acme Cloud Technologies",
      applicationEmail: "careers@acmecloud.tech",
      location: "San Francisco, CA (Hybrid / Remote)",
    });
    setScreenshotPreview(null);
    setScreenshotInfo(null);
    setErrorMsg("");
  };

  const handleClear = () => {
    setJobDescription("");
    setParsedPreview(null);
    setScreenshotPreview(null);
    setScreenshotInfo(null);
    setStoredImageFile(null);
    setErrorMsg("");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6 animate-in fade-in duration-200 select-none">
      {/* Missing Details Pop-up Modal */}
      <MissingDetailsModal
        isOpen={isMissingModalOpen}
        onClose={() => setIsMissingModalOpen(false)}
        onSkip={handleSkipMissingDetails}
        parsedJob={parsedPreview || {}}
        onSaveDetails={handleSaveMissingDetails}
        onRescan={handleRescan}
        isRescanning={isParsingImage}
        inputMode={inputMode}
      />

      {/* Clean Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#3c3c3c] dark:text-white tracking-tight uppercase">
            New Application
          </h2>
          <p className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold mt-0.5">
            Submit a job posting to generate an ATS-tailored resume and cover letter for manual review.
          </p>
        </div>

        {/* Compact Mode Switcher */}
        <div className="inline-flex p-1 bg-[#f7f9fa] dark:bg-[#1b2b32] border-2 border-[#e5e5e5] dark:border-[#2e414c] rounded-2xl gap-1 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setInputMode("text")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              inputMode === "text"
                ? "bg-[#1cb0f6] text-white shadow-xs"
                : "text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white"
            }`}
          >
            <FileText size={14} className="stroke-3" />
            <span>Paste Text</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("screenshot")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              inputMode === "screenshot"
                ? "bg-[#1cb0f6] text-white shadow-xs"
                : "text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white"
            }`}
          >
            <ImageIcon size={14} className="stroke-3" />
            <span>Screenshot (OCR)</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Screenshot Upload Dropzone (When screenshot mode is active) */}
        {inputMode === "screenshot" && (
          <div className="duo-card p-4 sm:p-5 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) processImageFile(e.target.files[0]);
              }}
            />

            {!screenshotPreview ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#1cb0f6] bg-[#ddf4ff] dark:bg-[#162a35]"
                    : "border-[#e5e5e5] dark:border-[#2e414c] hover:border-[#1cb0f6] bg-[#f7f9fa] dark:bg-[#233a44]"
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] text-[#1cb0f6] flex items-center justify-center mx-auto mb-2">
                  <Upload size={20} className="stroke-3" />
                </div>
                <h4 className="text-xs font-black text-[#3c3c3c] dark:text-white uppercase tracking-wider">
                  Drag & Drop Screenshot or Click to Browse
                </h4>
                <p className="text-[11px] text-[#777777] dark:text-[#a5b6be] font-bold mt-0.5">
                  You can also press <kbd className="font-mono bg-white dark:bg-[#1b2b32] px-1 py-0.5 rounded border border-[#afafaf] text-[10px]">Ctrl+V</kbd> to paste directly
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={screenshotPreview}
                    alt="Job Screenshot"
                    className="w-12 h-12 rounded-xl object-cover border-2 border-[#1cb0f6] shrink-0"
                  />
                  <div>
                    <span className="text-xs font-black text-[#3c3c3c] dark:text-white block truncate max-w-xs">
                      {screenshotInfo?.name || "Job Screenshot.png"}
                    </span>
                    <span className="text-[10px] font-bold text-[#777777] dark:text-[#a5b6be]">
                      {screenshotInfo?.size} • Vision OCR Extraction
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="duo-btn-secondary px-3 py-1 text-[11px] font-black"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshotPreview(null);
                      setScreenshotInfo(null);
                      setStoredImageFile(null);
                    }}
                    className="p-1.5 rounded-xl text-[#777777] hover:text-[#ff4b4b] hover:bg-[#ffe5e5] dark:hover:bg-[#38181a] transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}

            {isParsingImage && (
              <div className="p-3 rounded-2xl bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] flex items-center gap-2.5 text-xs font-black text-[#1899d6] dark:text-[#1cb0f6] animate-pulse">
                <RotateCw size={15} className="animate-spin shrink-0 stroke-3" />
                <span>Extracting requirements using Vision OCR...</span>
              </div>
            )}
          </div>
        )}

        {/* Clean Monospace Textarea Card */}
        <div className="duo-card p-4 sm:p-5 relative space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="job_description"
              className="text-[11px] font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be]"
            >
              {inputMode === "screenshot" ? "Extracted Job Posting Text" : "Job Description Text"}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-[11px] font-black text-[#1cb0f6] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FileCode size={13} className="stroke-3" /> Load Sample
              </button>
              {jobDescription && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded-lg text-[#777777] dark:text-[#a5b6be] hover:text-[#ff4b4b] transition-colors cursor-pointer"
                  title="Clear Text"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <textarea
            id="job_description"
            rows={9}
            value={jobDescription}
            onChange={(e) => {
              setJobDescription(e.target.value);
              if (errorMsg) setErrorMsg("");
            }}
            placeholder="Paste job description, requirements, responsibilities, or recruiter email here..."
            className="w-full p-3.5 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c] text-xs font-mono font-bold leading-relaxed text-[#3c3c3c] dark:text-white placeholder:text-[#afafaf] focus:outline-hidden focus:border-[#1cb0f6] resize-y transition-colors"
          />

          {/* Minimalist Contact Email Status Line */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
            {detectedEmail ? (
              <div className="flex items-center gap-1.5 text-[#58a700] dark:text-[#a5ed6e] font-black">
                <CheckCircle2 size={14} className="text-[#58cc02] shrink-0 stroke-3" />
                <span>Contact Email: <span className="font-mono text-white bg-[#58cc02]/20 px-1.5 py-0.5 rounded-md">{detectedEmail}</span></span>
                <button
                  type="button"
                  onClick={() => setIsMissingModalOpen(true)}
                  className="text-[11px] text-[#1cb0f6] hover:underline ml-1 cursor-pointer"
                >
                  (edit)
                </button>
              </div>
            ) : jobDescription.trim() ? (
              <div className="flex items-center gap-1.5 text-[#ff9600] font-black">
                <AlertTriangle size={14} className="shrink-0 stroke-3" />
                <span>No contact email found in text — you will be prompted to add one.</span>
              </div>
            ) : (
              <span className="text-[11px] text-[#777777] dark:text-[#a5b6be] font-bold">
                Paste job text or drag a screenshot above
              </span>
            )}

            <span className="text-[11px] font-mono text-[#777777] dark:text-[#a5b6be] font-bold self-end sm:self-auto">
              {jobDescription.length} chars
            </span>
          </div>

          {errorMsg && (
            <div className="mt-3 p-3 rounded-2xl bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] text-[#ea2b2b] dark:text-[#ff7a7a] text-xs font-black">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            disabled={mutation.isPending || isParsingImage}
            className="w-full sm:w-auto duo-btn-primary px-7 py-3.5 text-xs sm:text-sm font-black tracking-wider flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            {mutation.isPending ? (
              <>
                <Sparkles size={16} className="animate-spin stroke-3" />
                <span>STARTING PIPELINE...</span>
              </>
            ) : (
              <>
                <Send size={16} className="stroke-3" />
                <span>START AUTOMATION PIPELINE</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewApplicationPage;
