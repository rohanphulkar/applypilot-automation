import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from config import settings
from schemas import JobStatusResponse, ResumeFiles

logger = logging.getLogger(__name__)


class JobManager:
    """
    In-memory registry for tracking async background resume tailoring jobs.
    """

    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}

    def create_job(
        self,
        job_id: str,
        filename: str,
        files: ResumeFiles,
        initial_status: str = "GENERATING",
    ) -> Dict[str, Any]:
        now_str = datetime.now().isoformat()
        job_record = {
            "job_id": job_id,
            "status": initial_status,
            "filename": filename,
            "files": files,
            "candidate": None,
            "error": None,
            "created_at": now_str,
            "updated_at": now_str,
        }
        self._jobs[job_id] = job_record
        return job_record

    def update_job(
        self,
        job_id: str,
        status: str,
        candidate: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if job_id not in self._jobs:
            return None

        record = self._jobs[job_id]
        record["status"] = status
        record["updated_at"] = datetime.now().isoformat()
        if candidate is not None:
            record["candidate"] = candidate
        if error is not None:
            record["error"] = error

        return record

    def get_job(self, job_id: str) -> Optional[JobStatusResponse]:
        if job_id not in self._jobs:
            return None

        data = self._jobs[job_id]
        return JobStatusResponse(**data)


# Global Singleton
job_manager = JobManager()


def load_master_resume() -> Dict[str, Any]:
    """
    Loads master resume JSON from disk.
    """
    path = settings.MASTER_RESUME_PATH
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Error reading master resume from %s: %s", path, e)

    # Fallback to minimal default
    return {
        "resume_name": "Rohan Phulkar",
        "personal": {
            "name": "Rohan Phulkar",
            "title": "Backend Engineer",
            "email": "hello@rohanphulkar.com",
            "website": "https://rohanphulkar.com",
            "github": "https://github.com/rohanphulkar",
            "linkedin": "https://linkedin.com/in/rohanphulkar",
        },
        "summary": "Backend Engineer specializing in Python, FastAPI, and PostgreSQL.",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker", "AWS"],
        "experience": [],
        "projects": [],
        "education": {
            "degree": "Higher Secondary (PCM)",
            "institution": "Government Higher Secondary School",
            "location": "Maheshwar, Madhya Pradesh",
            "year": "2019",
        },
    }


def save_master_resume(data: Dict[str, Any]) -> bool:
    """
    Saves master resume JSON to disk.
    """
    path = settings.MASTER_RESUME_PATH
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        logger.info("Saved master resume to %s", path)
        return True
    except Exception as e:
        logger.error("Failed to save master resume to %s: %s", path, e)
        return False
