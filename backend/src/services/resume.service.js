import axios from "axios";
import config from "../config/config.js";
import logger from "../utils/logger.js";
import { PipelineError } from "../utils/errors.js";

/**
 * Service to communicate with the Resume Tailoring API.
 *
 * @param {string} jobDescription - Raw or parsed job description
 * @param {string} [applicationId] - Application ID for tracking
 * @returns {Promise<{ urls: string[], primaryUrl: string }>}
 */
export async function tailorResume(jobDescription, applicationId = null) {
  logger.info("Calling Resume API for resume tailoring", {
    applicationId,
    stage: "TAILORING_RESUME",
  });

  const url = `${config.resumeApi.baseUrl.replace(/\/$/, "")}${config.resumeApi.endpoint}`;

  const headers = {
    "Content-Type": "application/json",
  };

  if (config.resumeApi.apiKey) {
    headers["Authorization"] = `Bearer ${config.resumeApi.apiKey}`;
    headers["X-API-Key"] = config.resumeApi.apiKey;
  }

  try {
    const response = await axios.post(
      url,
      {
        job_description: jobDescription,
        async_processing: false, // Request synchronous completion so URLs are ready immediately
      },
      {
        headers,
        timeout: 120000, // 2-minute timeout for AI tailoring & compilation
      }
    );

    const data = response.data;
    if (data?.status === "FAILED" || data?.success === false) {
      throw new Error(data?.error || data?.message || "Resume API reported tailoring failure");
    }

    const rawUrls = [];

    // Extract PDF and other artifact URLs from response
    if (data?.files?.pdf) {
      if (data.files.pdf.presigned_url) rawUrls.push(data.files.pdf.presigned_url);
      else if (data.files.pdf.s3_url) rawUrls.push(data.files.pdf.s3_url);

      if (data.files.docx?.presigned_url) rawUrls.push(data.files.docx.presigned_url);
      else if (data.files.docx?.s3_url) rawUrls.push(data.files.docx.s3_url);
    } else if (Array.isArray(data.urls)) {
      rawUrls.push(...data.urls);
    } else if (data.url) {
      rawUrls.push(data.url);
    } else if (data.pdf_url) {
      rawUrls.push(data.pdf_url);
    }

    if (rawUrls.length === 0) {
      throw new Error("Resume API did not return any valid resume URLs.");
    }

    const baseUrl = config.resumeApi.baseUrl.replace(/\/$/, "");
    const formatUrl = (u) => {
      if (!u) return null;
      if (u.startsWith("http://") || u.startsWith("https://")) return u;
      return `${baseUrl}/${u.replace(/^\//, "")}`;
    };

    const urls = rawUrls.map(formatUrl).filter(Boolean);
    const primaryUrl = urls[0];

    const pdfRaw = data?.files?.pdf?.presigned_url || data?.files?.pdf?.s3_url || rawUrls.find(u => u?.includes(".pdf")) || urls[0];
    const docxRaw = data?.files?.docx?.presigned_url || data?.files?.docx?.s3_url || rawUrls.find(u => u?.includes(".docx")) || urls.find(u => u?.includes(".docx"));
    const texRaw = data?.files?.tex?.presigned_url || data?.files?.tex?.s3_url || rawUrls.find(u => u?.includes(".tex")) || urls.find(u => u?.includes(".tex"));

    logger.info("Successfully received tailored resume URLs", {
      applicationId,
      stage: "TAILORING_RESUME",
      urlCount: urls.length,
      primaryUrl,
    });

    return {
      urls,
      primaryUrl,
      pdfUrl: formatUrl(pdfRaw),
      docxUrl: formatUrl(docxRaw),
      texUrl: formatUrl(texRaw),
      candidateData: data?.candidate || null,
      filename: data?.filename || null,
    };
  } catch (error) {
    const errorMsg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message;

    logger.error(`Resume API call failed: ${errorMsg}`, {
      applicationId,
      stage: "TAILORING_RESUME",
    });

    throw new PipelineError("TAILORING_RESUME", `Resume API failed: ${errorMsg}`);
  }
}

export default {
  tailorResume,
};
