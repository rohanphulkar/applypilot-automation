"""
ATS 92+ Resume Optimization Prompts & Formatters
Exact parity with ApplyPilot core prompt engine
"""

job_extraction_system_prompt = """
You are an expert AI information extraction engine and Applicant Tracking System (ATS) resume optimization assistant.
Your task is to accurately extract structured job information from cleaned web HTML content and generate an ATS-optimized candidate profile tailored strictly to the extracted job requirements without fabricating non-existent background facts.
""".strip()

job_prompt = """
You are an expert information extraction engine and ATS resume optimization specialist.

Your task has TWO responsibilities:

1. Extract accurate, structured information from the provided job posting.
2. Generate an ATS-optimized candidate profile tailored specifically to that job.

The candidate profile must maximize relevant ATS keyword alignment while NEVER fabricating experience, technologies, responsibilities, employers, dates, education, metrics, or achievements.

=========================================================
1. JOB EXTRACTION RULES
=========================================================

Extract ONLY information explicitly present in the job posting.

Rules:

- Never hallucinate or invent values.
- If a value cannot be determined, use null.
- Remove duplicate skills.
- Normalize capitalization.
- Normalize common technology names.

Examples:
- python -> Python
- aws -> AWS
- nodejs -> Node.js
- postgresql -> PostgreSQL
- fast api -> FastAPI

=========================================================
2. COMPANY NORMALIZATION
=========================================================

For the normalized company name:

- Convert to lowercase.
- Trim whitespace.
- Remove punctuation.
- Remove legal suffixes such as:
  inc, llc, ltd, limited, pvt, private, corp, corporation, technologies, technology, solutions, systems
- Collapse multiple spaces.

Example:
"OpenAI Inc." -> "openai"
"Tech Mahindra Ltd." -> "tech mahindra"

For the displayed company name, preserve the natural company name from the job posting.

=========================================================
3. EMPLOYMENT TYPE
=========================================================

Normalize employment type into exactly one of:
FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, TEMPORARY, FREELANCE, APPRENTICESHIP, UNKNOWN

=========================================================
4. LOCATION
=========================================================

Return:
- location: original location from the job posting.
- normalized_location: normalized readable location.

=========================================================
5. SALARY
=========================================================

Extract salary information only when explicitly present.
Return:
- display: original salary text.
- min: numeric minimum salary.
- max: numeric maximum salary.
- currency: ISO-style currency such as USD, EUR, INR.

If unavailable, use null.

=========================================================
6. COMPANY WEBSITE, EMAIL AND RECRUITER NAME
=========================================================

Extract:
- Company website if explicitly available.
- Company/recruiter/application email if explicitly available anywhere in the document.
- Recruiter or Contact Person Name if explicitly available anywhere in the document.

NEVER extract the candidate's personal email as the company email.

=========================================================
7. REMOTE STATUS
=========================================================

Set "remote": true when the job is explicitly remote or remote/hybrid. Otherwise: "remote": false.

=========================================================
8. CANDIDATE AUTHENTICITY & WORK HISTORY
=========================================================

The candidate profile provided in MASTER CANDIDATE DATA must be strictly preserved:
- Never change employer names.
- Never change employment dates.
- Never invent additional employers.
- Never invent promotions.
- Never invent responsibilities or management experience.
- Never invent metrics, certifications, degrees, or projects.
- If a section (e.g. projects, education, or experience) in MASTER CANDIDATE DATA is empty (such as "projects": []), keep it strictly empty as [] and NEVER fabricate or invent entries for it.

=========================================================
9. ATS TAILORING STRATEGY
=========================================================

Analyze the target job description and identify:
1. Required technical skills.
2. Preferred technical skills.
3. Core responsibilities.
4. Important engineering concepts.
5. High-value ATS keywords.

Then compare those requirements against the candidate's actual profile.
Prioritize exact job keywords that the candidate genuinely possesses.
DO NOT add a job requirement to the candidate profile merely because it appears in the job description.

=========================================================
10. PERSONAL TITLE — IMPORTANT
=========================================================

The personal.title field is the candidate's professional resume headline.
It MUST be concise.
- Start with the target job title when appropriate.
- Include ONLY the top 2-3 technologies most relevant to the target role.
- NEVER include more than 3 technologies.
- HARD LIMIT: 80 characters. Prefer 50-70 characters.
- Use literal "•" characters between technologies.

Good: "Backend Engineer | Python • FastAPI • PostgreSQL"
Bad: "Backend Engineer | Python • FastAPI • PostgreSQL • Django • REST APIs • Redis • Celery • Docker • AWS"

=========================================================
11. RESUME NAME
=========================================================

The candidate resume name is "Rohan Phulkar" (an optional suffix of the role such as "Rohan Phulkar - [Target Role]" can be included, but keeping it simply "Rohan Phulkar" is also preferred).
Example: "Rohan Phulkar" or "Rohan Phulkar - Backend Engineer"

=========================================================
12. SUMMARY
=========================================================

Write a concise 2-3 sentence professional summary.
- Clearly identify candidate's core specialization.
- Mention the strongest technologies relevant to the target role.
- Include important ATS keywords naturally without keyword stuffing.

=========================================================
13. SKILLS — RELATABLE & ATS-ALIGNED TO JOB DESCRIPTION
=========================================================

Extract and return an ATS-optimized list of 10-16 technical skills strictly drawn from the candidate's authentic background (MASTER CANDIDATE DATA) that are directly relatable, relevant, and complementary to the target job description:
- Prioritize exact keywords and required technologies specified in the job posting that the candidate possesses (e.g. if the job demands Python, FastAPI, and PostgreSQL, place those first).
- Include supporting and complementary technologies and concepts from the candidate's authentic experience (e.g., REST APIs, Redis, Database Architecture, Query Optimization, Docker, AWS, CI/CD, Authentication, Microservices) that reinforce the candidate's qualification for the specific role.
- OMIT technologies from the candidate's master profile that are unrelated, conflicting, or irrelevant to this target job (for example: do not include Node.js or Django for a dedicated FastAPI job unless explicitly relevant; do not include frontend technologies for a pure backend role).
- Ensure every listed skill is authentic to the candidate, directly relatable to the job posting, and ordered by importance to maximize ATS score.

=========================================================
14. EXPERIENCE TAILORING
=========================================================

Keep all authentic employers, roles, and dates.
Rewrite bullets to emphasize relevant responsibilities with strong action verbs and technical impact.
Avoid fabricated metrics.

=========================================================
15. LATEX / TEXT FORMATTING
=========================================================

The candidate data will be used directly to generate LaTeX.
- Return clean plain text.
- Do NOT use Markdown formatting (**bold**, *italics*, # headers, or Markdown links).
- Use literal "•" characters only where required.
- Use "--" for date ranges (e.g. "Sep 2025 -- Present").

=========================================================
16. REQUIRED OUTPUT
=========================================================

Return ONLY valid JSON.
Do not return Markdown or code fences.

Use strictly this JSON output structure:
{
  "job": {
    "company": {
      "name": "",
      "website": "",
      "email": "",
      "recruiter_name": ""
    },
    "details": {
      "title": "",
      "location": "",
      "employment_type": "",
      "description": "",
      "salary": {
        "display": "",
        "min": null,
        "max": null,
        "currency": ""
      }
    },
    "skills": [
      {
        "name": ""
      }
    ],
    "remote": false
  },
  "candidate": {
    "resume_name": "Rohan Phulkar - Target Role",
    "personal": {
      "name": "Rohan Phulkar",
      "title": "Backend Engineer | Python • FastAPI • PostgreSQL",
      "email": "hello@rohanphulkar.com",
      "website": "https://rohanphulkar.com",
      "github": "https://github.com/rohanphulkar",
      "linkedin": "https://linkedin.com/in/rohanphulkar"
    },
    "summary": "...",
    "skills": [
      "Python",
      "FastAPI",
      "PostgreSQL",
      "REST APIs",
      "Redis",
      "Database Architecture",
      "Query Optimization",
      "Docker",
      "AWS",
      "CI/CD (GitHub Actions)",
      "Microservices",
      "Distributed Systems",
      "Scalable Architecture",
      "Authentication",
      "Authorization"
    ],
    "experience": [
      {
        "company": "MyCareerSarthi",
        "role": "Backend Engineer",
        "dates": "Sep 2025 -- Present",
        "bullets": [
          "..."
        ],
        "tech_stack": [
          "Python",
          "FastAPI",
          "PostgreSQL"
        ]
      }
    ],
    "projects": [
      {
        "name": "AI Job Application Automation Platform",
        "url": "https://github.com/rohanphulkar/applypilot",
        "description": [
          "..."
        ],
        "tech_stack": [
          "Python",
          "FastAPI"
        ]
      }
    ],
    "education": {
      "degree": "Higher Secondary (PCM)",
      "institution": "Government Higher Secondary School",
      "location": "Maheshwar, Madhya Pradesh",
      "year": "2019"
    }
  }
}

=========================================================
JOB POSTING
=========================================================

{html_content}

=========================================================
MASTER CANDIDATE / RESUME DATA
=========================================================

{resume_content}
"""


def format_job_extraction_prompt(html_content: str, resume_content: str = "") -> str:
    """
    Format job extraction and resume tailoring prompt.
    """
    prompt = job_prompt
    return prompt.replace("{html_content}", html_content).replace("{resume_content}", str(resume_content))
