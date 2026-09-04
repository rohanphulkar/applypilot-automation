import re
from typing import Any, Dict, List, Optional, Union

# =========================================================
# LATEX TEMPLATE (ATS 92+ Software Engineer Standard)
# =========================================================

LATEX_TEMPLATE = r"""
\documentclass[10pt,letterpaper]{article}

% ---------- Packages ----------
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[
    top=0.45in,
    bottom=0.45in,
    left=0.50in,
    right=0.50in
]{geometry}

\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{hyperref}
\usepackage{charter}
\usepackage{microtype}
\usepackage{xcolor}

% ---------- Colors ----------
\definecolor{primaryblack}{RGB}{13,14,16}
\definecolor{sectiongray}{RGB}{55,65,81}
\definecolor{mutedgray}{RGB}{100,111,121}

% ---------- Hyperlink Setup ----------
\hypersetup{
    colorlinks=true,
    urlcolor=black,
    linkcolor=black
}

% ---------- General Formatting ----------
\pagestyle{empty}

\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}

\setlist[itemize]{
    leftmargin=0.18in,
    itemsep=1.5pt,
    topsep=1.5pt,
    parsep=0pt,
    partopsep=0pt
}

% ---------- Section Formatting with Bottom Rule ----------
\titleformat{\section}
    {\large\bfseries\color{sectiongray}}
    {}
    {0pt}
    {}
    [\vspace{1pt}\titlerule]

\titlespacing*{\section}
    {0pt}
    {7pt}
    {3pt}

% ---------- Custom Commands ----------
\newcommand{\resumeHeader}[1]{
    \begin{center}
        {\LARGE\bfseries #1}
    \end{center}
}

\newcommand{\contactLine}[1]{
    \begin{center}
        \small #1
    \end{center}
}

\newcommand{\experienceHeading}[3]{
    \textbf{#1} \hfill #2\\
    \textit{#3}
}

% =========================================================
% DOCUMENT
% =========================================================

\begin{document}

% ---------- Header ----------
\resumeHeader{__NAME__}

\begin{center}
    \textbf{__TITLE__}
\end{center}

\contactLine{
__CONTACTS__
}

% ---------- Summary ----------
\section{SUMMARY}

__SUMMARY__

% ---------- Skills ----------
\section{SKILLS \& CORE COMPETENCIES}

__SKILLS__

% ---------- Experience ----------
\section{EXPERIENCE}

__EXPERIENCE__

% ---------- Projects ----------
\section{PROJECTS}

__PROJECTS__

% ---------- Education ----------
\section{EDUCATION}

__EDUCATION__

\end{document}
"""

LATEX_SPECIAL_CHARS = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}


def escape_latex(text: Any) -> str:
    """
    Escape normal text before inserting it into LaTeX using single-pass regex replacement.
    Also normalizes common Unicode characters that LaTeX might choke on.
    """
    if text is None:
        return ""

    text = str(text)

    # Replace common Unicode characters with LaTeX/ASCII equivalents
    unicode_replacements = {
        "–": "--",
        "—": "---",
        "’": "'",
        "‘": "'",
        "“": '"',
        "”": '"',
        "•": r"$\bullet$",
        "…": "...",
        "\u00a0": " ",
    }
    for old, new in unicode_replacements.items():
        text = text.replace(old, new)

    # Single-pass regex substitution for LaTeX special characters
    pattern = re.compile(r'[\\&%$#_{}~^]')
    return pattern.sub(lambda m: LATEX_SPECIAL_CHARS[m.group(0)], text)


def sanitize_filename(filename: Optional[str], default_name: str = "resume") -> str:
    if not filename or not isinstance(filename, str):
        return default_name

    filename = filename.strip()
    for ext in (".pdf", ".tex", ".docx"):
        if filename.lower().endswith(ext):
            filename = filename[:-len(ext)].strip()

    filename = re.sub(r"[^\w\s-]", "", filename)
    filename = filename.lstrip(". -_")
    filename = re.sub(r"\s+", "_", filename)

    return filename or default_name


def extract_short_role_slug(job_text: str, fallback_title: str = "Resume") -> str:
    """
    Extracts a short, concise, and direct 2-3 word role slug from job description text.
    Examples:
      'Senior Backend Engineer (Python / FastAPI)' -> 'Backend_Engineer'
      'Lead Full Stack Developer - Remote' -> 'Full_Stack_Developer'
      'Python Developer' -> 'Python_Developer'
    """
    if not job_text:
        return sanitize_filename(fallback_title, default_name="Resume")

    # High-priority common roles matching
    common_roles = [
        "Backend Engineer",
        "Frontend Engineer",
        "Full Stack Developer",
        "Full Stack Engineer",
        "Python Developer",
        "Software Engineer",
        "DevOps Engineer",
        "Platform Engineer",
        "Data Engineer",
        "Machine Learning Engineer",
        "Cloud Engineer",
        "Systems Engineer",
        "Backend Developer",
        "Frontend Developer",
        "Web Developer",
    ]
    for role in common_roles:
        if re.search(rf"\b{re.escape(role)}\b", job_text, re.IGNORECASE):
            return re.sub(r"\s+", "_", role)

    # Fallback: scan first 3 lines of job description for a title
    lines = [line.strip() for line in job_text.strip().split("\n") if line.strip()]
    first_few = " ".join(lines[:3])

    # Clean noise words
    cleaned = re.sub(r"\((?:remote|hybrid|onsite|full-time|part-time|contract)[^)]*\)", "", first_few, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:senior|junior|lead|staff|principal|experienced|urgent hiring|job id|position)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[^\w\s-]", "", cleaned)
    tokens = [
        t.capitalize()
        for t in cleaned.split()
        if t.lower() not in ("about", "the", "role", "looking", "for", "a", "an", "we", "are", "at", "in", "to", "and", "of", "with")
    ][:3]

    if tokens:
        return "_".join(tokens)

    return sanitize_filename(fallback_title, default_name="Resume")


def generate_short_role_filename(
    candidate_name: Optional[str],
    job_text: str = "",
    timestamp: Optional[str] = None,
    fallback_title: str = "Resume",
) -> str:
    """
    Generates a concise, direct filename combining Candidate Name + Short Role + Timestamp.
    Example: 'Rohan_Phulkar_Backend_Engineer_20260903_174100'
    """
    from datetime import datetime

    c_name = sanitize_filename(candidate_name, default_name="Candidate")
    role_slug = extract_short_role_slug(job_text, fallback_title=fallback_title)
    if not timestamp:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    return f"{c_name}_{role_slug}_{timestamp}"


def format_title(title: Any) -> str:
    if not title:
        return ""

    parts = str(title).split("•")
    return r" $\bullet$ ".join(
        escape_latex(part.strip())
        for part in parts
    )


def format_url(url: Any, display_text: Optional[str] = None) -> str:
    if not url:
        return ""

    url_str = str(url)
    if display_text is None:
        display_text = (
            url_str
            .replace("https://", "")
            .replace("http://", "")
            .rstrip("/")
        )

    safe_url = url_str.replace("%", r"\%").replace("#", r"\#")
    return (
        rf"\href{{{safe_url}}}"
        rf"{{{escape_latex(display_text)}}}"
    )


def build_contacts(personal: Dict[str, Any]) -> str:
    if not personal or not isinstance(personal, dict):
        return ""

    contacts = []
    email = personal.get("email")
    website = personal.get("website")
    github = personal.get("github")
    linkedin = personal.get("linkedin")

    if email:
        safe_email_url = str(email).replace("%", r"\%").replace("#", r"\#")
        contacts.append(
            rf"\href{{mailto:{safe_email_url}}}"
            rf"{{{escape_latex(email)}}}"
        )

    if website:
        contacts.append(format_url(website))

    if github:
        contacts.append(format_url(github))

    if linkedin:
        contacts.append(format_url(linkedin))

    return "\n    \\;|\\;\n".join(contacts)


def build_skills(skills: Union[List[Any], Dict[str, Any], str]) -> str:
    if not skills:
        return ""

    items: List[str] = []

    def _extract(val: Any):
        if isinstance(val, dict):
            s_name = val.get("skill") or val.get("name")
            if s_name and isinstance(s_name, str):
                items.append(escape_latex(s_name))
            else:
                for sub in val.values():
                    _extract(sub)
        elif isinstance(val, list):
            for sub in val:
                _extract(sub)
        elif val:
            s_str = str(val).strip()
            if s_str:
                items.append(escape_latex(s_str))

    if isinstance(skills, (dict, list)):
        _extract(skills)
        return ", ".join(items)
    else:
        return escape_latex(str(skills))


def build_experience(experience: List[Dict[str, Any]]) -> str:
    if not experience or not isinstance(experience, list):
        return ""

    jobs = []
    for job in experience:
        if not isinstance(job, dict):
            continue

        company = escape_latex(job.get("company", ""))
        dates = escape_latex(job.get("dates", ""))
        role = escape_latex(job.get("role", ""))

        lines = [
            rf"\experienceHeading{{{company}}}{{{dates}}}{{{role}}}",
            "",
            r"\begin{itemize}",
        ]

        bullets = job.get("bullets", [])
        if isinstance(bullets, list):
            for bullet in bullets:
                lines.append(f"    \\item {escape_latex(bullet)}")

        lines.append(r"\end{itemize}")

        tech_stack = job.get("tech_stack", [])
        if tech_stack and isinstance(tech_stack, list):
            tech = ", ".join(escape_latex(item) for item in tech_stack)
            lines.append("")
            lines.append(rf"\textit{{Tech Stack: {tech}}}")

        jobs.append("\n".join(lines))

    return "\n\n\\vspace{5pt}\n\n".join(jobs)


def build_projects(projects: List[Dict[str, Any]]) -> str:
    if not projects or not isinstance(projects, list):
        return ""

    blocks = []
    for project in projects:
        if not isinstance(project, dict):
            continue

        p_name = escape_latex(project.get("name", ""))
        p_url = project.get("url")
        if p_url:
            p_name = rf"\textbf{{{p_name}}} ({format_url(p_url)})"
        else:
            p_name = rf"\textbf{{{p_name}}}"

        lines = [
            p_name,
            r"\begin{itemize}",
        ]

        desc = project.get("description", [])
        if isinstance(desc, list):
            for item in desc:
                lines.append(rf"    \item {escape_latex(item)}")

        lines.append(r"\end{itemize}")

        tech = project.get("tech_stack", [])
        if tech and isinstance(tech, list):
            lines.append(rf"\textit{{Tech Stack: {', '.join(escape_latex(t) for t in tech)}}}")

        blocks.append("\n".join(lines))

    return "\n\n\\vspace{5pt}\n\n".join(blocks)


def build_education(education: Union[Dict[str, Any], List[Dict[str, Any]]]) -> str:
    if not education:
        return ""
    if isinstance(education, list):
        if not education:
            return ""
        education = education[0]
    if not isinstance(education, dict):
        return ""

    degree = escape_latex(education.get("degree", ""))
    institution = escape_latex(education.get("institution", ""))
    location = escape_latex(education.get("location", ""))
    year = escape_latex(education.get("year", ""))

    return rf"""
\textbf{{{degree}}} \hfill {year}\\
{institution}, {location}
""".strip()


def generate_latex(data: Dict[str, Any]) -> str:
    """
    Takes candidate resume data dict and generates ATS 92+ formatted LaTeX (.tex) string.
    """
    if not data or not isinstance(data, dict):
        data = {}

    personal = data.get("personal", {})
    if not isinstance(personal, dict):
        personal = {}

    name = escape_latex(personal.get("name", "") or data.get("name", ""))
    title = format_title(personal.get("title", "") or data.get("title", ""))
    contacts = build_contacts(personal)
    summary = escape_latex(data.get("summary", ""))
    skills = build_skills(data.get("skills", {}))
    experience = build_experience(data.get("experience", []))
    projects = build_projects(data.get("projects", []))
    education = build_education(data.get("education", {}))

    replacements = {
        "__NAME__": name,
        "__TITLE__": title,
        "__CONTACTS__": contacts,
        "__SUMMARY__": summary,
        "__SKILLS__": skills,
        "__EXPERIENCE__": experience,
        "__PROJECTS__": projects,
        "__EDUCATION__": education,
    }

    latex = LATEX_TEMPLATE
    for placeholder, value in replacements.items():
        latex = latex.replace(placeholder, value)

    return latex.strip() + "\n"
