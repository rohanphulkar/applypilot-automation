import logging
import math
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from schemas import (
    DeleteJobResponse,
    JobDetailResponse,
    JobListResponse,
    JobSummary,
)
from services.db_service import db_delete_job, db_get_job, db_list_jobs

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["Job Management (Web & Mobile Apps)"])


@router.get(
    "",
    response_model=JobListResponse,
    summary="List Tailored Jobs (Paginated with Search & Filters)",
)
async def list_jobs_endpoint(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(default=None, description="Filter by status (e.g. READY, GENERATING, FAILED)"),
    search: Optional[str] = Query(default=None, description="Search term matching company, title, or description"),
):
    """
    Returns a paginated list of tailored jobs with company names, job titles,
    generation status, and regenerated presigned download URLs for easy integration
    in web and mobile applications.
    """
    items, total = await db_list_jobs(
        page=page,
        limit=limit,
        status_filter=status,
        search=search,
    )

    total_pages = math.ceil(total / limit) if total > 0 else 1

    summaries = [
        JobSummary(
            job_id=doc["job_id"],
            title=doc.get("title") or "Target Role",
            company_name=doc.get("company_name") or "Target Company",
            status=doc.get("status", "READY"),
            filename=doc.get("filename", doc["job_id"]),
            files=doc.get("files"),
            created_at=doc.get("created_at", ""),
            updated_at=doc.get("updated_at", ""),
        )
        for doc in items
    ]

    return JobListResponse(
        success=True,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        jobs=summaries,
    )


@router.get(
    "/{job_id}",
    response_model=JobDetailResponse,
    summary="Get Tailored Job Details by Job ID",
)
async def get_job_detail_endpoint(job_id: str):
    """
    Retrieves full details of a tailored job, including:
    - Full input job description
    - Extracted job and company metadata
    - Tailored candidate resume JSON
    - Fresh, valid S3 Presigned Download URLs for .pdf, .docx, and .tex
    """
    doc = await db_get_job(job_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found.",
        )

    return JobDetailResponse(
        success=True,
        job_id=doc["job_id"],
        title=doc.get("title") or "Target Role",
        company_name=doc.get("company_name") or "Target Company",
        job_description=doc.get("job_description", ""),
        status=doc.get("status", "READY"),
        filename=doc.get("filename", doc["job_id"]),
        extracted_job=doc.get("extracted_job"),
        candidate=doc.get("candidate"),
        files=doc.get("files"),
        error=doc.get("error"),
        created_at=doc.get("created_at", ""),
        updated_at=doc.get("updated_at", ""),
    )


@router.delete(
    "/{job_id}",
    response_model=DeleteJobResponse,
    summary="Delete a Tailored Job Record",
)
async def delete_job_endpoint(job_id: str):
    """
    Deletes a tailored job record from the database.
    """
    deleted = await db_delete_job(job_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found or already deleted.",
        )

    return DeleteJobResponse(
        success=True,
        job_id=job_id,
        message=f"Job '{job_id}' deleted successfully.",
    )
