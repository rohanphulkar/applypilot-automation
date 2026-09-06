import { generateJSONCompletion, generateVisionJSONCompletion } from "./openai.service.js";
import logger from "../utils/logger.js";
import { PipelineError } from "../utils/errors.js";

const JOB_PARSER_SYSTEM_PROMPT = `
You are an expert AI information extraction engine specialized in analyzing job descriptions and postings.
Your task is to accurately extract structured job details from the provided job description text or screenshot.

RULES:
1. Extract ONLY information explicitly present in the job posting.
2. Never hallucinate or invent values. If a field is not mentioned or cannot be determined, return null.
3. For employmentType: normalize to one of "FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "TEMPORARY", "FREELANCE", or null.
4. For salary: extract minimum and maximum as numbers if present, along with ISO currency code (e.g. USD, EUR, INR, GBP).
5. For applicationEmail & recruiterName: extract the recruiter/hiring manager name (e.g. "Aditya Jain") and contact email if present anywhere in the text. Look carefully for emails like careers@company.com, jobs@company.com, hr@company.com, or specific recruiter addresses. If none is found, return null.
6. For skills, responsibilities, requirements, and niceToHave: summarize or list them as clean, comma-separated or newline-separated text strings.
7. Return ONLY a valid JSON object matching the required schema. Do not output markdown code blocks or additional text.

REQUIRED JSON OUTPUT SCHEMA:
{
  "title": "string | null",
  "company": "string | null",
  "recruiterName": "string | null",
  "location": "string | null",
  "employmentType": "string | null",
  "experienceMin": "number | null",
  "experienceMax": "number | null",
  "salaryMin": "number | null",
  "salaryMax": "number | null",
  "salaryCurrency": "string | null",
  "skills": "string | null",
  "responsibilities": "string | null",
  "requirements": "string | null",
  "niceToHave": "string | null",
  "applicationEmail": "string | null",
  "applicationUrl": "string | null",
  "sourceUrl": "string | null",
  "sourcePlatform": "string | null",
  "description": "string"
}
`.trim();

const VISION_SYSTEM_PROMPT = `
You are an expert AI vision extraction engine specialized in transcribing and analyzing job description screenshots.
Your task is:
1. Transcribe the entire job posting visible in the image verbatim into the "description" field.
2. Accurately extract all structured job details (title, company, recruiterName, location, employmentType, salary, requirements, responsibilities, skills, and application email/URL).
Follow all standard extraction rules strictly.
`.trim();

/**
 * Validates and normalizes the parsed job data to strictly match schema.
 *
 * @param {object} raw
 * @param {string} [fallbackText=""]
 * @returns {object}
 */
function normalizeParsedJob(raw, fallbackText = "") {
  const desc =
    typeof raw.description === "string" && raw.description.trim()
      ? raw.description.trim()
      : fallbackText.trim();

  const parsed = {
    title: typeof raw.title === "string" ? raw.title.trim() : null,
    company: typeof raw.company === "string" ? raw.company.trim() : null,
    recruiterName: typeof raw.recruiterName === "string" ? raw.recruiterName.trim() : null,
    location: typeof raw.location === "string" ? raw.location.trim() : null,
    employmentType:
      typeof raw.employmentType === "string" ? raw.employmentType.trim() : null,

    experienceMin:
      typeof raw.experienceMin === "number" ? raw.experienceMin : null,
    experienceMax:
      typeof raw.experienceMax === "number" ? raw.experienceMax : null,

    salaryMin: typeof raw.salaryMin === "number" ? raw.salaryMin : null,
    salaryMax: typeof raw.salaryMax === "number" ? raw.salaryMax : null,
    salaryCurrency:
      typeof raw.salaryCurrency === "string"
        ? raw.salaryCurrency.trim().toUpperCase()
        : null,

    skills:
      typeof raw.skills === "string"
        ? raw.skills.trim()
        : Array.isArray(raw.skills)
        ? raw.skills.join(", ")
        : null,
    responsibilities:
      typeof raw.responsibilities === "string"
        ? raw.responsibilities.trim()
        : Array.isArray(raw.responsibilities)
        ? raw.responsibilities.join("\n")
        : null,
    requirements:
      typeof raw.requirements === "string"
        ? raw.requirements.trim()
        : Array.isArray(raw.requirements)
        ? raw.requirements.join("\n")
        : null,
    niceToHave:
      typeof raw.niceToHave === "string"
        ? raw.niceToHave.trim()
        : Array.isArray(raw.niceToHave)
        ? raw.niceToHave.join("\n")
        : null,

    applicationEmail:
      typeof raw.applicationEmail === "string" && raw.applicationEmail.includes("@")
        ? raw.applicationEmail.trim().toLowerCase()
        : null,
    applicationUrl:
      typeof raw.applicationUrl === "string" ? raw.applicationUrl.trim() : null,

    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl.trim() : null,
    sourcePlatform:
      typeof raw.sourcePlatform === "string" ? raw.sourcePlatform.trim() : null,

    description: desc,
  };

  const missingFields = [];
  if (!parsed.applicationEmail) missingFields.push("recruiterEmail");
  if (!parsed.company) missingFields.push("company");
  if (!parsed.title) missingFields.push("title");

  parsed.missingFields = missingFields;
  parsed.hasMissingDetails = missingFields.length > 0;

  return parsed;
}

/**
 * Parse job description using OpenAI.
 *
 * @param {string} jobDescription - Raw job description text
 * @param {string} [applicationId] - Application ID for logging
 * @returns {Promise<object>} Structured parsed job object
 */
export async function parseJobDescription(jobDescription, applicationId = null) {
  logger.info("Starting job description parsing with OpenAI", {
    applicationId,
    stage: "PARSING_JOB",
  });

  if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
    throw new PipelineError("PARSING_JOB", "Job description cannot be empty.");
  }

  const userPrompt = `
JOB DESCRIPTION:

${jobDescription}
`.trim();

  try {
    const rawResult = await generateJSONCompletion(
      JOB_PARSER_SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.1 }
    );

    const parsedJob = normalizeParsedJob(rawResult, jobDescription);

    logger.info("Successfully parsed job description", {
      applicationId,
      stage: "PARSING_JOB",
      jobTitle: parsedJob.title,
      company: parsedJob.company,
      applicationEmail: parsedJob.applicationEmail,
    });

    return parsedJob;
  } catch (error) {
    logger.error(`Job parsing failed: ${error.message}`, {
      applicationId,
      stage: "PARSING_JOB",
    });
    throw new PipelineError("PARSING_JOB", `Failed to parse job description: ${error.message}`);
  }
}

/**
 * Parse job description from uploaded screenshot image using Vision LLM.
 *
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} [mimeType="image/png"] - Image mime type
 * @param {string} [applicationId] - Application ID for logging
 * @returns {Promise<{ rawText: string, parsedJob: object }>}
 */
export async function parseJobDescriptionImage(
  base64Data,
  mimeType = "image/png",
  applicationId = null
) {
  logger.info("Starting job description screenshot OCR vision parsing", {
    applicationId,
    stage: "PARSING_JOB_IMAGE",
  });

  if (!base64Data) {
    throw new PipelineError("PARSING_JOB", "Screenshot image data is required.");
  }

  const userPrompt = `
Analyze the attached job description screenshot. Transcribe all text clearly into the "description" field and extract all structured fields matching the JSON schema.
`.trim();

  try {
    const rawResult = await generateVisionJSONCompletion(
      VISION_SYSTEM_PROMPT,
      userPrompt,
      base64Data,
      mimeType,
      { temperature: 0.1 }
    );

    const parsedJob = normalizeParsedJob(rawResult, rawResult.description || "");

    logger.info("Successfully transcribed and parsed job screenshot", {
      applicationId,
      jobTitle: parsedJob.title,
      company: parsedJob.company,
      applicationEmail: parsedJob.applicationEmail,
    });

    return {
      rawText: parsedJob.description,
      parsedJob,
    };
  } catch (error) {
    logger.error(`Job screenshot parsing failed: ${error.message}`, {
      applicationId,
    });
    throw new PipelineError(
      "PARSING_JOB",
      `Failed to parse job description screenshot: ${error.message}`
    );
  }
}

export default {
  parseJobDescription,
  parseJobDescriptionImage,
};
