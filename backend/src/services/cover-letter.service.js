import fs from "fs";
import path from "path";
import axios from "axios";
import config from "../config/config.js";
import { generateTextCompletion } from "./openai.service.js";
import logger from "../utils/logger.js";
import { PipelineError } from "../utils/errors.js";

/**
 * Loads the candidate master profile from resume-api, disk, or centralized config.
 *
 * @returns {Promise<object>} Candidate profile object
 */
export async function loadCandidateProfile() {
  // 1. Try local master_resume.json on disk
  const possiblePaths = [
    path.resolve(process.cwd(), "../resume-api/data/master_resume.json"),
    path.resolve(process.cwd(), "resume-api/data/master_resume.json"),
    path.resolve(process.cwd(), "data/master_resume.json"),
    "/home/rohan/Desktop/nodejs-tasks/applypilot/resume-api/data/master_resume.json",
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        if (data && (data.personal || data.resume_name)) {
          return data;
        }
      }
    } catch (err) {
      logger.debug(`Could not read master resume from ${filePath}:`, err.message);
    }
  }

  // 2. Try fetching from resume-api endpoint
  try {
    const url = `${config.resumeApi.baseUrl.replace(/\/$/, "")}/api/resume/master`;
    const res = await axios.get(url, { timeout: 3000 });
    if (res.data?.resume) return res.data.resume;
    if (res.data?.personal) return res.data;
  } catch (err) {
    logger.debug("Could not fetch master resume from resume-api:", err.message);
  }

  // 3. Centralized profile fallback from configuration
  return {
    personal: {
      name: config.email.name || "Rohan Phulkar",
      title: "Backend Engineer",
      email: config.email.address || "hello@rohanphulkar.com",
    },
    summary:
      "Backend Engineer specializing in Python, FastAPI, Django, and PostgreSQL, experienced in designing scalable backend services, REST APIs, Redis caching, and Docker containerization.",
    skills: [
      "Python",
      "FastAPI",
      "Django",
      "Node.js",
      "PostgreSQL",
      "MySQL",
      "Redis",
      "Docker",
      "AWS",
      "REST APIs",
      "Microservices",
    ],
    experience: [
      {
        company: "MyCareerSarthi",
        role: "Backend Engineer",
        bullets: [
          "Engineered scalable backend services using FastAPI, PostgreSQL, and Redis.",
          "Designed and optimized REST APIs for profile analysis and job matchmaking systems.",
        ],
      },
      {
        company: "Epikdoc AI",
        role: "Back End Developer",
        bullets: [
          "Led backend development of a healthcare CRM with scalable REST APIs.",
          "Developed secure authentication and role-based access control (RBAC) systems.",
        ],
      },
    ],
  };
}

/**
 * Generate a tailored, professional cover letter grounded in the candidate's actual resume and the target job description.
 *
 * @param {object} params
 * @param {object} params.parsedJob - Extracted structured job details
 * @param {string} params.originalJobDescription - Raw job text
 * @param {string} [params.applicantName] - Override applicant name
 * @param {string} [applicationId] - Application ID for logging
 * @returns {Promise<string>} Clean, personalized cover letter text
 */
export async function generateCoverLetter(
  { parsedJob = {}, originalJobDescription = "", applicantName: nameOverride = null },
  applicationId = null
) {
  logger.info("Generating personalized cover letter with OpenAI", {
    applicationId,
    stage: "GENERATING_COVER_LETTER",
    targetRole: parsedJob.title,
    company: parsedJob.company,
  });

  const profile = await loadCandidateProfile();
  const applicantName =
    nameOverride ||
    profile.personal?.name ||
    profile.resume_name ||
    config.email.name ||
    "Rohan Phulkar";

  const applicantTitle = profile.personal?.title || "Backend Engineer";
  const applicantSummary = profile.summary || "";
  const applicantSkills = Array.isArray(profile.skills)
    ? profile.skills.join(", ")
    : profile.skills || "Python, FastAPI, Django, PostgreSQL, Redis, Docker";

  const applicantExperience = Array.isArray(profile.experience)
    ? profile.experience
        .map(
          (exp) =>
            `- ${exp.role} at ${exp.company} (${exp.dates || ""}): ${(exp.bullets || []).join(" ")}`
        )
        .join("\n")
    : "Experienced in building scalable backend services and REST APIs with Python, FastAPI, Django, and PostgreSQL.";

  const recruiterName = parsedJob.recruiterName || null;
  const targetRole = parsedJob.title || "Software Engineer";
  const targetCompany = parsedJob.company || "the organization";
  const requiredSkills = parsedJob.skills || "Not specified";
  const keyResponsibilities = parsedJob.responsibilities || "Not specified";
  const keyRequirements = parsedJob.requirements || "Not specified";

  const systemPrompt = `
You are an expert executive copywriter and senior engineering career strategist representing the applicant: ${applicantName}.

OBJECTIVE:
Craft an exceptionally catchy, concise, and highly relatable cover letter for ${applicantName} applying for the ${targetRole} position at ${targetCompany}.

CORE PRINCIPLES:
1. LENGTH & SCANNABILITY (STRICT 175-225 WORDS / 3 FOCUSED PARAGRAPHS):
   - Recruiters spend less than 30 seconds scanning cover letters. Keep it tight, punchy, and impactful.
   - Avoid fluff, passive phrasing, and generic filler. Every sentence must demonstrate immediate value.

2. CATCHY, MODERN OPENING (NO DRY CLICHÉS):
   - Do NOT start with boring clichés like "I am writing to express my interest in..." or "Please accept my resume for...".
   - Start with a compelling, energetic hook that highlights ${applicantName}'s passion for what ${targetCompany} is building and immediate technical synergy as a ${applicantTitle}.

3. DEEPLY RELATABLE & RESUME-GROUNDED TECHNICAL FIT:
   - Match ${applicantName}'s real achievements (e.g. Python, FastAPI, Django, PostgreSQL, Redis, Docker, REST APIs, database indexing) directly to the core challenges and requirements in the job description.
   - Speak like an experienced, thoughtful software engineer—confident, clear, and pragmatic.
   - NEVER hallucinate fake experience, invented degrees, or 8+ years when the resume shows ~3-4 years.

4. STRUCTURE:
   - Salutation: ${
     recruiterName
       ? `Dear ${recruiterName},`
       : `If a recruiter/hiring manager name is clearly visible in the job posting excerpt, use "Dear [First Last],"; otherwise use "Dear ${targetCompany} Team,".`
   }
   - Paragraph 1 (Catchy Hook & Value Alignment, ~40 words): Immediate enthusiasm for the role and why ${applicantName}'s background is uniquely positioned to accelerate ${targetCompany}'s goals.
   - Paragraph 2 (Technical Impact & Relatability, ~100 words): 1-2 concrete, quantifiable achievements from ${applicantName}'s real experience (e.g., at MyCareerSarthi / Epikdoc AI) solving similar challenges to those listed in the JD.
   - Paragraph 3 (Closing & Enthusiasm, ~45 words): Express excitement for an interview conversation, thanking them for their time.
   - Sign-off:
Sincerely,
${applicantName}

5. ZERO PLACEHOLDERS:
   - Never output bracketed text like "[Your Name]", "[Date]", "[Company]", or template tokens.
   - Return ONLY the clean, formatted cover letter text.
`.trim();

  const userPrompt = `
APPLICANT RESUME & BACKGROUND:
- Name: ${applicantName}
- Current Title: ${applicantTitle}
- Summary: ${applicantSummary}
- Core Skills: ${applicantSkills}
- Work Experience & Achievements:
${applicantExperience}

TARGET JOB POSTING DETAILS:
- Target Role: ${targetRole}
- Target Company: ${targetCompany}
- Recruiter / Hiring Contact: ${recruiterName || "Not explicitly specified"}
- Required Skills: ${requiredSkills}
- Key Responsibilities: ${keyResponsibilities}
- Key Requirements: ${keyRequirements}

JOB POSTING EXCERPT:
${originalJobDescription.slice(0, 1800)}
`.trim();

  try {
    const coverLetter = await generateTextCompletion(systemPrompt, userPrompt, {
      temperature: 0.4,
    });

    // Post-processing safety check: Guarantee applicant's real name is present and no placeholder remains
    let cleanedLetter = coverLetter.trim();
    if (cleanedLetter.includes("[Your Name]") || cleanedLetter.includes("[Candidate Name]")) {
      cleanedLetter = cleanedLetter
        .replace(/\[Your Name\]/gi, applicantName)
        .replace(/\[Candidate Name\]/gi, applicantName)
        .replace(/\[Insert Name\]/gi, applicantName);
    }

    if (!cleanedLetter.includes(applicantName)) {
      cleanedLetter = `${cleanedLetter}\n\nSincerely,\n${applicantName}`;
    }

    logger.info("Successfully generated grounded cover letter", {
      applicationId,
      stage: "GENERATING_COVER_LETTER",
      applicantName,
      length: cleanedLetter.length,
    });

    return cleanedLetter;
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
  loadCandidateProfile,
  generateCoverLetter,
};
