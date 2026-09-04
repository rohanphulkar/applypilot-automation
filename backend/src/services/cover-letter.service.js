import { generateTextCompletion } from "./openai.service.js";
import logger from "../utils/logger.js";
import { PipelineError } from "../utils/errors.js";

const COVER_LETTER_SYSTEM_PROMPT = `
You are an expert career advisor and executive copywriter.
Your task is to write a highly professional, compelling, and concise cover letter for a job application.

GUIDELINES:
1. Tone: Professional, confident, articulate, and enthusiastic.
2. Structure:
   - Greeting (use recruiter name if available, otherwise "Dear Hiring Team,")
   - Opening paragraph: State the target position, company name, and immediate excitement/fit.
   - Body paragraph(s): Highlight core technical strengths, relevant engineering experience, and direct alignment with the key skills and responsibilities mentioned in the job description.
   - Closing paragraph: Professional call-to-action expressing desire for an interview.
   - Sign-off: "Sincerely," followed by the applicant's name if known, or a clean professional sign-off.
3. Length: 3-4 compact paragraphs (under 300 words).
4. No placeholders like "[Your Name]" or "[Insert Date]" — if a detail is unknown, write smoothly around it or use natural phrasing.
5. Return ONLY the clean cover letter text.
`.trim();

/**
 * Generate a customized cover letter using OpenAI.
 *
 * @param {object} params
 * @param {object} params.parsedJob - Extracted job details
 * @param {string} params.originalJobDescription - Raw job text
 * @param {string} [applicationId] - Application ID for logging
 * @returns {Promise<string>} Clean cover letter text
 */
export async function generateCoverLetter({ parsedJob, originalJobDescription }, applicationId = null) {
  logger.info("Generating cover letter with OpenAI", {
    applicationId,
    stage: "GENERATING_COVER_LETTER",
  });

  const jobSummary = `
Target Role: ${parsedJob.title || "Software Engineer"}
Company: ${parsedJob.company || "the company"}
Required Skills: ${parsedJob.skills || "Not specified"}
Key Responsibilities: ${parsedJob.responsibilities || "Not specified"}
Requirements: ${parsedJob.requirements || "Not specified"}

Original Job Posting Excerpt:
${originalJobDescription.slice(0, 1500)}
`.trim();

  const userPrompt = `
Please generate a tailored, professional cover letter based on the following job details:

${jobSummary}
`.trim();

  try {
    const coverLetter = await generateTextCompletion(
      COVER_LETTER_SYSTEM_PROMPT,
      userPrompt,
      { temperature: 0.5 }
    );

    logger.info("Successfully generated cover letter", {
      applicationId,
      stage: "GENERATING_COVER_LETTER",
      length: coverLetter.length,
    });

    return coverLetter;
  } catch (error) {
    logger.error(`Cover letter generation failed: ${error.message}`, {
      applicationId,
      stage: "GENERATING_COVER_LETTER",
    });
    throw new PipelineError(
      "GENERATING_COVER_LETTER",
      `Failed to generate cover letter: ${error.message}`
    );
  }
}

export default {
  generateCoverLetter,
};
