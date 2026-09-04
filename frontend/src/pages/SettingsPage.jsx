import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Server,
  Database,
  Mail,
  Sparkles,
  FileCode,
  Radio,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import { getSettings, testEmailConnection } from "../services/settings.service.js";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";

export function SettingsPage() {
  const [testResult, setTestResult] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: getSettings,
    refetchInterval: 10000,
  });

  const testEmailMutation = useMutation({
    mutationFn: testEmailConnection,
    onSuccess: (res) => {
      setTestResult(res?.data || res);
    },
    onError: (err) => {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || "Connection test failed",
        diagnostics: err.response?.data?.diagnostics || {},
      });
    },
  });

  if (isLoading && !data) {
    return <LoadingSkeleton count={6} type="card" />;
  }

  const s = data?.data || {};
  const database = s.database || {};
  const redis = s.redis || {};
  const openai = s.openai || {};
  const resumeApi = s.resumeApi || {};
  const email = s.email || { smtp: {}, imap: {} };
  const worker = s.worker || {};

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200 select-none">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] text-xs font-black uppercase mb-1">
          <ShieldCheck size={14} className="stroke-[2.5]" /> Infrastructure & Provider Diagnostics
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-[#3c3c3c] dark:text-white tracking-tight uppercase">
          System Settings & Status
        </h2>
        <p className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold">
          Inspect connection health, service integrations, and runtime configuration
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* OpenAI Card */}
        <div className="duo-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#f3e8ff] dark:bg-[#2c1838] border-2 border-[#ce82ff] text-[#ce82ff] flex items-center justify-center">
              <Sparkles size={22} className="stroke-[2.5]" />
            </div>
            {openai.configured ? (
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#58a700] dark:text-[#a5ed6e] bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] px-3 py-1 rounded-full">
                <CheckCircle2 size={13} className="stroke-3" /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#ea2b2b] bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] px-3 py-1 rounded-full">
                <AlertCircle size={13} className="stroke-3" /> Missing Key
              </span>
            )}
          </div>

          <div>
            <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wide">
              OpenAI LLM Engine
            </h3>
            <p className="text-xs font-bold text-[#777777] dark:text-[#a5b6be] mt-0.5">
              Drives Job Description Parsing & Cover Letter Generation
            </p>
          </div>

          <div className="pt-2 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Model:</span>
              <span className="font-black">{openai.model || "gpt-4o-mini"}</span>
            </div>
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Status:</span>
              <span className="font-bold">{openai.configured ? "Ready for generation" : "Needs OPENAI_API_KEY"}</span>
            </div>
          </div>
        </div>

        {/* Resume API Card */}
        <div className="duo-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] text-[#1cb0f6] flex items-center justify-center">
              <FileCode size={22} className="stroke-[2.5]" />
            </div>
            {resumeApi.configured ? (
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#58a700] dark:text-[#a5ed6e] bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] px-3 py-1 rounded-full">
                <CheckCircle2 size={13} className="stroke-3" /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#777777] bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] px-3 py-1 rounded-full">
                Disabled
              </span>
            )}
          </div>

          <div>
            <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wide">
              Resume Tailoring API
            </h3>
            <p className="text-xs font-bold text-[#777777] dark:text-[#a5b6be] mt-0.5">
              Generates ATS 92+ optimized PDF & DOCX resumes
            </p>
          </div>

          <div className="pt-2 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Base URL:</span>
              <span className="truncate max-w-37.5 font-bold">{resumeApi.baseUrl}</span>
            </div>
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Endpoint:</span>
              <span className="font-bold">{resumeApi.endpoint}</span>
            </div>
          </div>
        </div>

        {/* Universal Email Provider Card */}
        <div className="duo-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#f3e8ff] dark:bg-[#2c1838] border-2 border-[#ce82ff] text-[#ce82ff] flex items-center justify-center">
              <Mail size={22} className="stroke-[2.5]" />
            </div>
            {email.configured ? (
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#58a700] dark:text-[#a5ed6e] bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] px-3 py-1 rounded-full">
                <CheckCircle2 size={13} className="stroke-3" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#e58600] bg-[#ffe8cc] dark:bg-[#382512] border-2 border-[#ff9600] px-3 py-1 rounded-full">
                <AlertCircle size={13} className="stroke-3" /> Not Configured
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wide">
                Email Provider
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#ddf4ff] dark:bg-[#162a35] text-[#1899d6] border border-[#1cb0f6]">
                {email.providerHint || "Universal"}
              </span>
            </div>
            <p className="text-xs text-[#777777] dark:text-[#a5b6be] font-mono font-bold mt-0.5 truncate">
              {email.address}
            </p>
          </div>

          <div className="pt-2 space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Sender Name:</span>
              <span className="font-bold">{email.displayName || "Rohan Phulkar"}</span>
            </div>
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">SMTP:</span>
              <span className="font-bold">{email.smtp?.host}:{email.smtp?.port}</span>
            </div>
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">IMAP:</span>
              <span className="font-bold">{email.imap?.enabled ? `${email.imap?.host}:${email.imap?.port}` : "Disabled"}</span>
            </div>
          </div>

          {/* Interactive Test Email Connection Button */}
          <div className="pt-3 border-t-2 border-[#e5e5e5] dark:border-[#2e414c]">
            <button
              type="button"
              onClick={() => testEmailMutation.mutate()}
              disabled={testEmailMutation.isPending}
              className="w-full duo-btn-accent py-2 px-3 text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCw size={14} className={testEmailMutation.isPending ? "animate-spin" : "stroke-[2.5]"} />
              <span>{testEmailMutation.isPending ? "TESTING CONNECTION..." : "TEST EMAIL CONNECTION"}</span>
            </button>

            {testResult && (
              <div className={`mt-3 p-3 rounded-xl border-2 text-[11px] font-mono font-bold ${
                testResult.success
                  ? "bg-[#d7ffb8] dark:bg-[#1a3818] border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e]"
                  : "bg-[#ffe5e5] dark:bg-[#38181a] border-[#ff4b4b] text-[#ea2b2b] dark:text-[#ff7a7a]"
              }`}>
                <div className="flex items-center gap-1.5 font-black uppercase mb-1">
                  {testResult.success ? <CheckCircle2 size={13} className="stroke-3" /> : <AlertCircle size={13} className="stroke-3" />}
                  <span>{testResult.message}</span>
                </div>
                {testResult.diagnostics?.smtp && (
                  <div className="text-[10px] opacity-90">
                    SMTP: {testResult.diagnostics.smtp.ok ? `OK (${testResult.diagnostics.smtp.latencyMs}ms)` : `Failed: ${testResult.diagnostics.smtp.error}`}
                  </div>
                )}
                {testResult.diagnostics?.imap && (
                  <div className="text-[10px] opacity-90">
                    IMAP: {testResult.diagnostics.imap.ok ? `OK (${testResult.diagnostics.imap.latencyMs}ms, Folder: ${testResult.diagnostics.imap.sentFolder})` : `Failed: ${testResult.diagnostics.imap.error}`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MongoDB Database Card */}
        <div className="duo-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] flex items-center justify-center">
              <Database size={22} className="stroke-[2.5]" />
            </div>
            <span
              className={`inline-flex items-center gap-1 text-xs font-black uppercase px-3 py-1 rounded-full border-2 ${
                database.status === "connected"
                  ? "text-[#58a700] dark:text-[#a5ed6e] bg-[#d7ffb8] dark:bg-[#1a3818] border-[#58cc02]"
                  : "text-[#ea2b2b] bg-[#ffe5e5] border-[#ff4b4b]"
              }`}
            >
              {database.status === "connected" ? <CheckCircle2 size={13} className="stroke-3" /> : <AlertCircle size={13} className="stroke-3" />}
              {database.status}
            </span>
          </div>

          <div>
            <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wide">
              MongoDB Database
            </h3>
            <p className="text-xs font-bold text-[#777777] dark:text-[#a5b6be] mt-0.5">
              Primary application state & timeline store
            </p>
          </div>

          <div className="pt-2 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Host:</span>
              <span className="font-bold">{database.host}</span>
            </div>
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Database:</span>
              <span className="font-bold">{database.name}</span>
            </div>
          </div>
        </div>

        {/* Redis & BullMQ Queue Card */}
        <div className="duo-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] text-[#ff4b4b] flex items-center justify-center">
              <Server size={22} className="stroke-[2.5]" />
            </div>
            <span
              className={`inline-flex items-center gap-1 text-xs font-black uppercase px-3 py-1 rounded-full border-2 ${
                redis.status === "connected"
                  ? "text-[#58a700] dark:text-[#a5ed6e] bg-[#d7ffb8] dark:bg-[#1a3818] border-[#58cc02]"
                  : "text-[#ea2b2b] bg-[#ffe5e5] border-[#ff4b4b]"
              }`}
            >
              {redis.status === "connected" ? <CheckCircle2 size={13} className="stroke-3" /> : <AlertCircle size={13} className="stroke-3" />}
              {redis.status}
            </span>
          </div>

          <div>
            <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wide">
              Redis Task Store
            </h3>
            <p className="text-xs font-bold text-[#777777] dark:text-[#a5b6be] mt-0.5">
              BullMQ background job broker
            </p>
          </div>

          <div className="pt-2 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Host & Port:</span>
              <span className="font-bold">{redis.host}:{redis.port}</span>
            </div>
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Queue Name:</span>
              <span className="font-bold">job-application</span>
            </div>
          </div>
        </div>

        {/* Worker Process Card */}
        <div className="duo-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] text-[#1cb0f6] flex items-center justify-center">
              <Radio size={22} className="stroke-[2.5]" />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-black uppercase text-[#58a700] dark:text-[#a5ed6e] bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] px-3 py-1 rounded-full">
              <CheckCircle2 size={13} className="stroke-3" /> Active Worker
            </span>
          </div>

          <div>
            <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wide">
              BullMQ Worker Process
            </h3>
            <p className="text-xs font-bold text-[#777777] dark:text-[#a5b6be] mt-0.5">
              Concurrent background execution engine
            </p>
          </div>

          <div className="pt-2 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Concurrency:</span>
              <span className="font-bold">{worker.concurrency} concurrent job(s)</span>
            </div>
            <div className="flex items-center justify-between text-[#3c3c3c] dark:text-white">
              <span className="text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[10px]">Max Retries:</span>
              <span className="font-bold">{worker.attempts} attempts (exp. backoff)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
