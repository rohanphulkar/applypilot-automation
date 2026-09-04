import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from config import settings
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from services.s3_service import generate_presigned_download_url

logger = logging.getLogger(__name__)

_mongo_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def get_client() -> Optional[AsyncIOMotorClient]:
    global _mongo_client
    return _mongo_client


def get_database() -> Optional[AsyncIOMotorDatabase]:
    global _db
    return _db


async def connect_to_mongo():
    """
    Connect to MongoDB and initialize collections & indexes.
    """
    global _mongo_client, _db
    try:
        logger.info("Connecting to MongoDB at %s...", settings.MONGODB_URI)
        _mongo_client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
        )
        _db = _mongo_client[settings.MONGODB_DB_NAME]

        # Ping database to verify connection
        await _db.command("ping")
        logger.info("Connected to MongoDB successfully! Database: %s", settings.MONGODB_DB_NAME)

        # Create indexes on 'jobs' collection
        jobs_collection = _db["jobs"]
        await jobs_collection.create_index("job_id", unique=True)
        await jobs_collection.create_index([("created_at", -1)])
        await jobs_collection.create_index("status")
        await jobs_collection.create_index("company_name")
        logger.info("MongoDB indexes verified on 'jobs' collection.")

        # Ensure master resume is seeded in MongoDB
        await _ensure_master_resume_seeded()

    except Exception as e:
        logger.warning("MongoDB connection failed or unavailable: %s. Operations will fallback gracefully.", e)
        _mongo_client = None
        _db = None


async def close_mongo_connection():
    """
    Closes the MongoDB client connection.
    """
    global _mongo_client, _db
    if _mongo_client:
        logger.info("Closing MongoDB connection...")
        _mongo_client.close()
        _mongo_client = None
        _db = None


def _refresh_presigned_urls(files_dict: Dict[str, Any], timestamped_name: str) -> Dict[str, Any]:
    """
    Ensures file presigned download URLs are fresh and generated for the client.
    """
    refreshed = {}
    for fmt in ("tex", "pdf", "docx"):
        item = files_dict.get(fmt, {})
        key = item.get("key")
        s3_url = item.get("s3_url", "")
        if key:
            refreshed[fmt] = {
                "key": key,
                "s3_url": s3_url,
                "presigned_url": generate_presigned_download_url(
                    key, filename=f"{timestamped_name}.{fmt}"
                ),
            }
        else:
            refreshed[fmt] = item
    return refreshed


# =========================================================
# MASTER RESUME DATABASE OPERATIONS
# =========================================================

DEFAULT_MASTER_ID = "default_master_resume"


def _load_local_master_file() -> Dict[str, Any]:
    """Loads master resume from local JSON file as initial seed / fallback."""
    path = settings.MASTER_RESUME_PATH
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Error reading local master resume from %s: %s", path, e)

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


async def _ensure_master_resume_seeded():
    """Seeds master resume into MongoDB if not present."""
    db = get_database()
    if db is None:
        return

    try:
        existing = await db["master_resume"].find_one({"_id": DEFAULT_MASTER_ID})
        if not existing:
            initial_data = _load_local_master_file()
            initial_data["_id"] = DEFAULT_MASTER_ID
            initial_data["updated_at"] = datetime.now().isoformat()
            await db["master_resume"].insert_one(initial_data)
            logger.info("Seeded default master resume into MongoDB collection 'master_resume'.")
    except Exception as e:
        logger.error("Failed to seed master resume in MongoDB: %s", e)


async def db_get_master_resume() -> Dict[str, Any]:
    """
    Fetches the master resume directly from MongoDB.
    Falls back to local file if MongoDB is unreachable.
    """
    db = get_database()
    if db is not None:
        try:
            doc = await db["master_resume"].find_one({"_id": DEFAULT_MASTER_ID})
            if doc:
                doc_clean = dict(doc)
                doc_clean.pop("_id", None)
                return doc_clean
        except Exception as e:
            logger.error("Failed to fetch master resume from MongoDB: %s", e)

    return _load_local_master_file()


async def db_save_master_resume(master_data: Dict[str, Any]) -> bool:
    """
    Updates the master resume directly in MongoDB and syncs to disk backup.
    """
    db = get_database()
    now_iso = datetime.now().isoformat()

    # 1. Update in MongoDB
    if db is not None:
        try:
            doc_to_save = dict(master_data)
            doc_to_save["_id"] = DEFAULT_MASTER_ID
            doc_to_save["updated_at"] = now_iso
            await db["master_resume"].replace_one(
                {"_id": DEFAULT_MASTER_ID},
                doc_to_save,
                upsert=True,
            )
            logger.info("Saved master resume to MongoDB.")
        except Exception as e:
            logger.error("Failed to update master resume in MongoDB: %s", e)
            return False

    # 2. Local disk backup
    try:
        settings.MASTER_RESUME_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(settings.MASTER_RESUME_PATH, "w", encoding="utf-8") as f:
            json.dump(master_data, f, indent=2)
    except Exception as err:
        logger.warning("Could not sync local master resume backup: %s", err)

    return True


# =========================================================
# DATABASE OPERATIONS FOR JOBS
# =========================================================

async def db_create_job(
    job_id: str,
    job_description: str,
    filename: str,
    files_dict: Dict[str, Any],
    master_resume: Optional[Dict[str, Any]] = None,
    initial_status: str = "GENERATING",
) -> Dict[str, Any]:
    """
    Creates a new tailored job record in MongoDB.
    """
    db = get_database()
    now_iso = datetime.now().isoformat()

    doc = {
        "_id": job_id,
        "job_id": job_id,
        "title": "Pending Tailoring",
        "company_name": "Target Company",
        "job_description": job_description,
        "status": initial_status,
        "filename": filename,
        "extracted_job": None,
        "candidate": master_resume,
        "files": files_dict,
        "error": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    if db is not None:
        try:
            await db["jobs"].insert_one(doc)
            logger.info("Inserted job %s into MongoDB", job_id)
        except Exception as e:
            logger.error("Failed to insert job %s into MongoDB: %s", job_id, e)

    return doc


async def db_update_job(
    job_id: str,
    status: str,
    extracted_job: Optional[Dict[str, Any]] = None,
    candidate: Optional[Dict[str, Any]] = None,
    files_dict: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Updates a tailored job record in MongoDB upon generation completion or failure.
    """
    db = get_database()
    now_iso = datetime.now().isoformat()

    update_fields: Dict[str, Any] = {
        "status": status,
        "updated_at": now_iso,
    }

    if extracted_job:
        update_fields["extracted_job"] = extracted_job
        company = extracted_job.get("company", {})
        details = extracted_job.get("details", {})
        if company and company.get("name"):
            update_fields["company_name"] = company.get("name")
        if details and details.get("title"):
            update_fields["title"] = details.get("title")

    if candidate:
        update_fields["candidate"] = candidate
        if not update_fields.get("title") and candidate.get("personal", {}).get("title"):
            update_fields["title"] = candidate.get("personal", {}).get("title")

    if files_dict:
        update_fields["files"] = files_dict

    if error is not None:
        update_fields["error"] = error

    if db is not None:
        try:
            result = await db["jobs"].find_one_and_update(
                {"job_id": job_id},
                {"$set": update_fields},
                return_document=True,
            )
            return result
        except Exception as e:
            logger.error("Failed to update job %s in MongoDB: %s", job_id, e)

    return None


async def db_get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches a single job record from MongoDB by job_id with fresh presigned URLs.
    """
    db = get_database()
    if db is None:
        return None

    try:
        doc = await db["jobs"].find_one({"job_id": job_id})
        if doc:
            filename = doc.get("filename") or job_id
            if "files" in doc and isinstance(doc["files"], dict):
                doc["files"] = _refresh_presigned_urls(doc["files"], filename)
            return doc
    except Exception as e:
        logger.error("Failed to query job %s in MongoDB: %s", job_id, e)

    return None


async def db_list_jobs(
    page: int = 1,
    limit: int = 20,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Lists paginated tailored job records with search and status filters.
    """
    db = get_database()
    if db is None:
        return [], 0

    query: Dict[str, Any] = {}

    if status_filter:
        query["status"] = status_filter

    if search and search.strip():
        search_regex = {"$regex": search.strip(), "$options": "i"}
        query["$or"] = [
            {"company_name": search_regex},
            {"title": search_regex},
            {"job_description": search_regex},
        ]

    skip = (page - 1) * limit

    try:
        total = await db["jobs"].count_documents(query)
        cursor = db["jobs"].find(query).sort("created_at", -1).skip(skip).limit(limit)
        items = []
        async for doc in cursor:
            filename = doc.get("filename") or doc.get("job_id")
            if "files" in doc and isinstance(doc["files"], dict):
                doc["files"] = _refresh_presigned_urls(doc["files"], filename)
            items.append(doc)
        return items, total
    except Exception as e:
        logger.error("Failed to list jobs from MongoDB: %s", e)
        return [], 0


async def db_delete_job(job_id: str) -> bool:
    """
    Deletes a job document from MongoDB.
    """
    db = get_database()
    if db is None:
        return False

    try:
        result = await db["jobs"].delete_one({"job_id": job_id})
        return result.deleted_count > 0
    except Exception as e:
        logger.error("Failed to delete job %s from MongoDB: %s", job_id, e)
        return False
