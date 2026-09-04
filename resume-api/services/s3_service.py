import logging
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple, Union

import boto3
from botocore.exceptions import ClientError
from config import settings
from services.latex_service import sanitize_filename

logger = logging.getLogger(__name__)

# Initialize boto3 S3 client
_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        if (
            settings.USE_S3
            and settings.AWS_ACCESS_KEY_ID
            and settings.AWS_SECRET_ACCESS_KEY
            and settings.AWS_S3_BUCKET
        ):
            _s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
            )
        else:
            _s3_client = None
    return _s3_client


def compute_job_folder_and_keys(
    candidate_name: str,
    role_slug: str,
    timestamp: Optional[str] = None,
) -> Tuple[str, str, Dict[str, str]]:
    """
    Computes a dedicated folder and keys for each tailored job.

    Folder format:
      resumes/{role_slug}-{YYYY-MM-DD_HH-MM-SS}/

    File names:
      {candidate_name}_{role_slug}.{ext}

    Returns:
      (folder_name, base_filename, { "tex": key, "pdf": key, "docx": key })
    """
    sanitized_candidate = sanitize_filename(candidate_name, default_name="Candidate")
    sanitized_role = sanitize_filename(role_slug, default_name="Resume")

    if not timestamp:
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

    prefix = settings.S3_KEY_PREFIX.strip("/")
    folder_name = f"{sanitized_role}-{timestamp}"
    base_filename = f"{sanitized_candidate}_{sanitized_role}"

    keys = {
        "tex": f"{prefix}/{folder_name}/{base_filename}.tex",
        "pdf": f"{prefix}/{folder_name}/{base_filename}.pdf",
        "docx": f"{prefix}/{folder_name}/{base_filename}.docx",
    }
    return folder_name, base_filename, keys


def compute_file_keys(
    base_name: str,
    timestamp: Optional[str] = None,
) -> Tuple[str, Dict[str, str]]:
    """
    Backward-compatible single-folder key generator.
    """
    sanitized = sanitize_filename(base_name, default_name="resume")
    if not timestamp:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    timestamped_name = f"{sanitized}_{timestamp}"
    keys = compute_file_keys_from_name(timestamped_name)
    return timestamped_name, keys


def compute_file_keys_from_name(timestamped_name: str) -> Dict[str, str]:
    """
    Computes keys for tex, pdf, and docx from an exact filename.
    """
    prefix = settings.S3_KEY_PREFIX.strip("/")
    return {
        "tex": f"{prefix}/{timestamped_name}.tex",
        "pdf": f"{prefix}/{timestamped_name}.pdf",
        "docx": f"{prefix}/{timestamped_name}.docx",
    }


def get_s3_public_url(key: str) -> str:
    """
    Returns the media URL (AWS S3 public URL or local FastAPI /media URL).
    """
    clean_key = key.lstrip("/")
    if settings.USE_S3 and settings.AWS_S3_BUCKET:
        return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{clean_key}"

    base_url = settings.PUBLIC_BASE_URL.rstrip("/")
    return f"{base_url}/media/{clean_key}"


def generate_presigned_download_url(
    key: str,
    expiration: Optional[int] = None,
    filename: Optional[str] = None,
) -> str:
    """
    Generates a download URL.
    Uses AWS S3 Presigned URL when USE_S3=true and configured;
    otherwise returns direct local FastAPI /media URL.
    """
    clean_key = key.lstrip("/")
    if settings.USE_S3 and settings.AWS_S3_BUCKET:
        client = get_s3_client()
        if client:
            if expiration is None:
                expiration = settings.PRESIGNED_URL_EXPIRATION

            params = {
                "Bucket": settings.AWS_S3_BUCKET,
                "Key": clean_key,
            }
            if filename:
                params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'

            try:
                presigned_url = client.generate_presigned_url(
                    "get_object",
                    Params=params,
                    ExpiresIn=expiration,
                )
                return presigned_url
            except ClientError as e:
                logger.error("Failed to generate presigned URL for %s: %s", clean_key, e)

    return get_s3_public_url(clean_key)


def upload_file_to_s3(
    file_path: Union[str, Path],
    key: str,
    content_type: Optional[str] = None,
) -> str:
    """
    Stores the file in local media directory and optionally uploads to AWS S3 if USE_S3 is enabled.
    """
    path = Path(file_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    clean_key = key.lstrip("/")
    local_target = (settings.MEDIA_DIR / clean_key).resolve()

    # Ensure local directory exists and copy if not already at target location
    local_target.parent.mkdir(parents=True, exist_ok=True)
    if path != local_target:
        import shutil
        shutil.copy2(path, local_target)

    # If S3 is enabled, upload to AWS S3
    if settings.USE_S3 and settings.AWS_S3_BUCKET:
        client = get_s3_client()
        if client:
            if not content_type:
                if path.suffix == ".pdf":
                    content_type = "application/pdf"
                elif path.suffix == ".docx":
                    content_type = (
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    )
                elif path.suffix == ".tex":
                    content_type = "text/x-tex; charset=utf-8"
                else:
                    content_type, _ = mimetypes.guess_type(str(path))
                    if not content_type:
                        content_type = "application/octet-stream"

            extra_args = {
                "ContentType": content_type,
            }

            try:
                client.upload_file(
                    str(local_target),
                    settings.AWS_S3_BUCKET,
                    clean_key,
                    ExtraArgs=extra_args,
                )
                s3_url = get_s3_public_url(clean_key)
                logger.info("Uploaded to S3: %s -> %s", local_target.name, s3_url)
                return s3_url
            except Exception as e:
                logger.error("S3 upload failed for %s: %s", local_target, e)

    local_url = get_s3_public_url(clean_key)
    logger.info("File saved to local media: %s -> %s", local_target, local_url)
    return local_url
