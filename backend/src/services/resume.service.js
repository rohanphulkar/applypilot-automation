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
    const urls = [];

    // Extract PDF and other artifact URLs from response
    if (data.files) {
      if (data.files.pdf?.presigned_url) urls.push(data.files.pdf.presigned_url);
      else if (data.files.pdf?.s3_url) urls.push(data.files.pdf.s3_url);

      if (data.files.docx?.presigned_url) urls.push(data.files.docx.presigned_url);
      else if (data.files.docx?.s3_url) urls.push(data.files.docx.s3_url);
    } else if (Array.isArray(data.urls)) {
      urls.push(...data.urls);
    } else if (data.url) {
      urls.push(data.url);
    } else if (data.pdf_url) {
      urls.push(data.pdf_url);
    }

    if (urls.length === 0) {
      throw new Error("Resume API did not return any valid resume URLs.");
    }

    const primaryUrl = urls[0];

    logger.info("Successfully received tailored resume URLs", {
      applicationId,
      stage: "TAILORING_RESUME",
      urlCount: urls.length,
      primaryUrl,
    });

    return {
      urls,
      primaryUrl,
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
