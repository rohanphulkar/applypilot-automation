import json
import logging
import re
from typing import Any, Dict, Optional

from config import settings
from openai import OpenAI
from prompts import format_job_extraction_prompt, job_extraction_system_prompt

logger = logging.getLogger(__name__)

_openai_client = None


def get_openai_client() -> Optional[OpenAI]:
    global _openai_client
    if _openai_client is None:
        if settings.OPENAI_API_KEY:
            _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        else:
            logger.warning("OPENAI_API_KEY not configured. LLM calls will fail or use fallback.")
            _openai_client = None
    return _openai_client


def clean_and_parse_json(raw_text: str, default: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Robustly extract and parse JSON from raw LLM output strings,
    stripping markdown code fences and extraneous text.
    """
    if default is None:
        default = {}

    if not raw_text or not isinstance(raw_text, str):
        return default

    cleaned = raw_text.strip()

    # Strip markdown code blocks if present
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

    # Find boundaries of JSON object or array
    start_brace = cleaned.find("{")
    start_bracket = cleaned.find("[")

    if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
        end_brace = cleaned.rfind("}")
        if end_brace != -1 and end_brace > start_brace:
            cleaned = cleaned[start_brace : end_brace + 1]
    elif start_bracket != -1:
        end_bracket = cleaned.rfind("]")
        if end_bracket != -1 and end_bracket > start_bracket:
            cleaned = cleaned[start_bracket : end_bracket + 1]

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: remove trailing commas before closing braces/brackets
        try:
            fixed = re.sub(r",\s*([}\]])", r"\1", cleaned)
            return json.loads(fixed)
        except Exception as err:
            logger.error("Failed to parse JSON output from LLM: %s. Snippet: %s", err, raw_text[:200])
            return default


def tailor_resume_with_openai(
    job_description: str,
    master_resume_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Calls OpenAI API using ApplyPilot's ATS 92+ prompt to extract job info
    and tailor the candidate profile specifically to the job description.

    Returns:
        Dict containing tailored 'candidate' and 'job' objects.
    """
    client = get_openai_client()
    if not client:
        logger.warning("No OpenAI client available. Returning master resume data.")
        return {
            "candidate": master_resume_data,
            "job": {"details": {"title": "Target Role", "description": job_description[:200]}},
        }

    system_prompt = job_extraction_system_prompt
    user_prompt = format_job_extraction_prompt(
        html_content=job_description,
        resume_content=json.dumps(master_resume_data, indent=2),
    )

    try:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            temperature=0.7,
            response_format={"type": "json_object"},
        )

        raw_content = response.choices[0].message.content or "{}"
        parsed = clean_and_parse_json(raw_content)

        candidate = parsed.get("candidate")
        if not candidate or not isinstance(candidate, dict):
            logger.warning("OpenAI response did not contain 'candidate' object, using fallback.")
            parsed["candidate"] = master_resume_data

        return parsed

    except Exception as e:
        logger.error("OpenAI resume tailoring call failed: %s", e, exc_info=True)
        return {
            "candidate": master_resume_data,
            "job": {"details": {"title": "Target Role", "description": job_description[:200]}},
        }
