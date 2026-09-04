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

__HEADER__

__BODY__

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

    if isinstance(skills, dict):
        lines = []
        for cat, items in skills.items():
            cat_label = escape_latex(str(cat).replace("_", " ").title())
            if isinstance(items, list):
                skill_str = ", ".join(escape_latex(str(s).strip()) for s in items if str(s).strip())
            elif isinstance(items, dict):
                nested = []
                for sub in items.values():
                    if isinstance(sub, list):
                        nested.extend(escape_latex(str(x).strip()) for x in sub if str(x).strip())
                    elif sub:
                        nested.append(escape_latex(str(sub).strip()))
                skill_str = ", ".join(nested)
            else:
                skill_str = escape_latex(str(items).strip())

            if skill_str:
                lines.append(rf"\textbf{{{cat_label}:}} {skill_str}")
        if lines:
            return "\\\\\n".join(lines)
        return ""

    if isinstance(skills, list):
        items: List[str] = []
        for s in skills:
            if isinstance(s, dict):
                val = s.get("skill") or s.get("name") or str(s)
                if val and str(val).strip():
                    items.append(escape_latex(str(val).strip()))
            elif s and str(s).strip():
                items.append(escape_latex(str(s).strip()))
        return ", ".join(items)

    return escape_latex(str(skills).strip())


def build_header(personal: Dict[str, Any], data: Dict[str, Any]) -> str:
    name = escape_latex(personal.get("name", "") or data.get("name", "")).strip()
    title = format_title(personal.get("title", "") or data.get("title", "")).strip()
    contacts = build_contacts(personal).strip()

    blocks = []
    if name:
        blocks.append(f"% ---------- Header ----------\n\\resumeHeader{{{name}}}")
    if title:
        blocks.append(f"\\begin{{center}}\n    \\textbf{{{title}}}\n\\end{{center}}")
    if contacts:
        blocks.append(f"\\contactLine{{\n{contacts}\n}}")
    return "\n\n".join(blocks)


def build_summary_section(summary: Any) -> str:
    if not summary:
        return ""
    text = escape_latex(summary).strip()
    if not text:
        return ""
    return f"% ---------- Summary ----------\n\\section{{SUMMARY}}\n\n{text}"


def build_skills_section(skills: Any) -> str:
    skills_text = build_skills(skills).strip()
    if not skills_text:
        return ""
    return f"% ---------- Skills ----------\n\\section{{SKILLS \\& CORE COMPETENCIES}}\n\n{skills_text}"


def build_experience(experience: List[Dict[str, Any]]) -> str:
    if not experience or not isinstance(experience, list):
        return ""

    jobs = []
    for job in experience:
        if not isinstance(job, dict):
            continue

        company = escape_latex(job.get("company", "")).strip()
        dates = escape_latex(job.get("dates", "")).strip()
        role = escape_latex(job.get("role", "")).strip()
        bullets = job.get("bullets", [])
        tech_stack = job.get("tech_stack", [])

        bullet_items = [escape_latex(b).strip() for b in bullets if str(b).strip()] if isinstance(bullets, list) else []
        tech_items = [escape_latex(t).strip() for t in tech_stack if str(t).strip()] if isinstance(tech_stack, list) else []

        if not company and not dates and not role and not bullet_items and not tech_items:
            continue

        lines = [
            rf"\experienceHeading{{{company}}}{{{dates}}}{{{role}}}",
        ]

        if bullet_items:
            lines.append("")
            lines.append(r"\begin{itemize}")
            for bullet in bullet_items:
                lines.append(f"    \\item {bullet}")
            lines.append(r"\end{itemize}")

        if tech_items:
            tech = ", ".join(tech_items)
            lines.append("")
            lines.append(rf"\textit{{Tech Stack: {tech}}}")

        jobs.append("\n".join(lines))

    return "\n\n\\vspace{5pt}\n\n".join(jobs)


def build_experience_section(experience: Any) -> str:
    exp_text = build_experience(experience).strip()
    if not exp_text:
        return ""
    return f"% ---------- Experience ----------\n\\section{{EXPERIENCE}}\n\n{exp_text}"


def build_projects(projects: List[Dict[str, Any]]) -> str:
    if not projects or not isinstance(projects, list):
        return ""

    blocks = []
    for project in projects:
        if not isinstance(project, dict):
            continue

        p_name = escape_latex(project.get("name", "")).strip()
        p_url = project.get("url")
        desc = project.get("description", [])
        tech = project.get("tech_stack", [])

        desc_items = [escape_latex(item).strip() for item in desc if str(item).strip()] if isinstance(desc, list) else []
        tech_items = [escape_latex(t).strip() for t in tech if str(t).strip()] if isinstance(tech, list) else []

        if not p_name and not desc_items and not tech_items:
            continue

        lines = []
        if p_url and p_name:
            lines.append(rf"\textbf{{{p_name}}} ({format_url(p_url)})")
        elif p_name:
            lines.append(rf"\textbf{{{p_name}}}")

        if desc_items:
            lines.append(r"\begin{itemize}")
            for item in desc_items:
                lines.append(rf"    \item {item}")
            lines.append(r"\end{itemize}")

        if tech_items:
            lines.append(rf"\textit{{Tech Stack: {', '.join(tech_items)}}}")

        if lines:
            blocks.append("\n".join(lines))

    return "\n\n\\vspace{5pt}\n\n".join(blocks)


def build_projects_section(projects: Any) -> str:
    proj_text = build_projects(projects).strip()
    if not proj_text:
        return ""
    return f"% ---------- Projects ----------\n\\section{{PROJECTS}}\n\n{proj_text}"


def build_education(education: Union[Dict[str, Any], List[Dict[str, Any]]]) -> str:
    if not education:
        return ""
    if isinstance(education, list):
        if not education:
            return ""
        valid_edus = [
            e for e in education
            if isinstance(e, dict) and any(str(e.get(k, "")).strip() for k in ("degree", "institution", "location", "year"))
        ]
        if not valid_edus:
            return ""
        edu_entries = []
        for edu in valid_edus:
            deg = escape_latex(edu.get("degree", "")).strip()
            inst = escape_latex(edu.get("institution", "")).strip()
            loc = escape_latex(edu.get("location", "")).strip()
            yr = escape_latex(edu.get("year", "")).strip()

            lines = []
            if deg and yr:
                lines.append(rf"\textbf{{{deg}}} \hfill {yr}\\")
            elif deg:
                lines.append(rf"\textbf{{{deg}}}\\")
            elif yr:
                lines.append(rf"\hfill {yr}\\")

            second_line = []
            if inst:
                second_line.append(inst)
            if loc:
                second_line.append(loc)
            if second_line:
                lines.append(", ".join(second_line))

            if lines:
                edu_entries.append("\n".join(lines))
        return "\n\n\\vspace{3pt}\n\n".join(edu_entries)

    if not isinstance(education, dict):
        return ""

    degree = escape_latex(education.get("degree", "")).strip()
    institution = escape_latex(education.get("institution", "")).strip()
    location = escape_latex(education.get("location", "")).strip()
    year = escape_latex(education.get("year", "")).strip()

    if not degree and not institution and not location and not year:
        return ""

    lines = []
    if degree and year:
        lines.append(rf"\textbf{{{degree}}} \hfill {year}\\")
    elif degree:
        lines.append(rf"\textbf{{{degree}}}\\")
    elif year:
        lines.append(rf"\hfill {year}\\")

    second_line = []
    if institution:
        second_line.append(institution)
    if location:
        second_line.append(location)
    if second_line:
        lines.append(", ".join(second_line))

    return "\n".join(lines).strip()


def build_education_section(education: Any) -> str:
    edu_text = build_education(education).strip()
    if not edu_text:
        return ""
    return f"% ---------- Education ----------\n\\section{{EDUCATION}}\n\n{edu_text}"


def generate_latex(data: Dict[str, Any]) -> str:
    """
    Takes candidate resume data dict and generates ATS 92+ formatted LaTeX (.tex) string.
    Only sections with non-empty content are rendered.
    """
    if not data or not isinstance(data, dict):
        data = {}

    personal = data.get("personal", {})
    if not isinstance(personal, dict):
        personal = {}

    header = build_header(personal, data)

    body_sections = [
        build_summary_section(data.get("summary", "") or personal.get("summary", "")),
        build_skills_section(data.get("skills", {})),
        build_experience_section(data.get("experience", [])),
        build_projects_section(data.get("projects", [])),
        build_education_section(data.get("education", {})),
    ]

    body = "\n\n".join([sec for sec in body_sections if sec])

    latex = LATEX_TEMPLATE
    latex = latex.replace("__HEADER__", header)
    latex = latex.replace("__BODY__", body)

    return latex.strip() + "\n"

