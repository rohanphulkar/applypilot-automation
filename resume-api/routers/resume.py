import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from config import settings
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from schemas import (
    CandidateResume,
    CompileLatexRequest,
    FileInfo,
    GenerateResumeRequest,
    JobStatusResponse,
    MasterResumeResponse,
    ResumeFiles,
    TailorResumeRequest,
    TailorResumeResponse,
    UpdateMasterResumeRequest,
)
from services.db_service import (
    db_create_job,
    db_get_job,
    db_get_master_resume,
    db_save_master_resume,
    db_update_job,
)
from services.docx_service import generate_docx
from services.job_service import job_manager, load_master_resume, save_master_resume
from services.latex_service import (
    extract_short_role_slug,
    generate_latex,
    generate_short_role_filename,
    sanitize_filename,
)
from services.openai_service import tailor_resume_with_openai
from services.pdf_service import tex_to_pdf
from services.s3_service import (
    compute_file_keys,
    compute_file_keys_from_name,
    compute_job_folder_and_keys,
    generate_presigned_download_url,
    get_s3_public_url,
    upload_file_to_s3,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resume", tags=["Resume Generation & Tailoring"])


def _build_resume_files_info(keys: Dict[str, str], download_filename: str) -> ResumeFiles:
    """
    Constructs ResumeFiles response object containing S3 public URLs and Presigned GET URLs.
    """
    return ResumeFiles(
        tex=FileInfo(
            key=keys["tex"],
            s3_url=get_s3_public_url(keys["tex"]),
            presigned_url=generate_presigned_download_url(
                keys["tex"], filename=f"{download_filename}.tex"
            ),
        ),
        pdf=FileInfo(
            key=keys["pdf"],
            s3_url=get_s3_public_url(keys["pdf"]),
            presigned_url=generate_presigned_download_url(
                keys["pdf"], filename=f"{download_filename}.pdf"
            ),
        ),
        docx=FileInfo(
            key=keys["docx"],
            s3_url=get_s3_public_url(keys["docx"]),
            presigned_url=generate_presigned_download_url(
                keys["docx"], filename=f"{download_filename}.docx"
            ),
        ),
    )


async def execute_tailoring_pipeline(
    job_id: str,
    job_description: str,
    master_resume: Dict[str, Any],
    folder_name: str,
    base_filename: str,
    keys: Dict[str, str],
):
    """
    Background worker pipeline that:
    1. Tailors resume content via OpenAI API (ATS 92+ prompt)
    2. Builds .tex document
    3. Compiles .pdf document via pdflatex
    4. Generates .docx document via python-docx
    5. Uploads all 3 formats to dedicated S3 job folder (resumes/{role}-{timestamp}/)
    6. Updates MongoDB and in-memory registry status to READY
    """
    logger.info("Starting background tailoring pipeline for job %s (folder: %s)...", job_id, folder_name)
    try:
        # Step 1: OpenAI Tailoring
        tailored_data = tailor_resume_with_openai(
            job_description=job_description,
            master_resume_data=master_resume,
        )
        extracted_job = tailored_data.get("job")
        candidate_json = tailored_data.get("candidate", master_resume)

        # Prepare local working directory (mirrors S3 folder structure)
        work_dir = settings.MEDIA_DIR / folder_name
        work_dir.mkdir(parents=True, exist_ok=True)

        tex_path = work_dir / f"{base_filename}.tex"
        docx_path = work_dir / f"{base_filename}.docx"

        # Step 2: Generate .tex file
        latex_str = generate_latex(candidate_json)
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex_str)

        # Step 3: Compile .pdf file via pdflatex
        pdf_path = tex_to_pdf(tex_path, cleanup_aux=True)

        # Step 4: Generate .docx file
        generate_docx(candidate_json, docx_path)

        # Step 5: Upload all files to AWS S3 in dedicated job folder
        upload_file_to_s3(tex_path, keys["tex"])
        upload_file_to_s3(pdf_path, keys["pdf"])
        upload_file_to_s3(docx_path, keys["docx"])

        # Build files dict for persistence
        files_dict = {
            "tex": {
                "key": keys["tex"],
                "s3_url": get_s3_public_url(keys["tex"]),
                "presigned_url": generate_presigned_download_url(
                    keys["tex"], filename=f"{base_filename}.tex"
                ),
            },
            "pdf": {
                "key": keys["pdf"],
                "s3_url": get_s3_public_url(keys["pdf"]),
                "presigned_url": generate_presigned_download_url(
                    keys["pdf"], filename=f"{base_filename}.pdf"
                ),
            },
            "docx": {
                "key": keys["docx"],
                "s3_url": get_s3_public_url(keys["docx"]),
                "presigned_url": generate_presigned_download_url(
                    keys["docx"], filename=f"{base_filename}.docx"
                ),
            },
        }

        # Step 6: Mark job as READY in MongoDB and In-Memory registry
        await db_update_job(
            job_id=job_id,
            status="READY",
            extracted_job=extracted_job,
            candidate=candidate_json,
            files_dict=files_dict,
        )

        job_manager.update_job(
            job_id=job_id,
            status="READY",
            candidate=candidate_json,
        )
        logger.info("Successfully completed resume tailoring for job %s!", job_id)

    except Exception as e:
        logger.error("Error executing tailoring pipeline for job %s: %s", job_id, e, exc_info=True)
        await db_update_job(
            job_id=job_id,
            status="FAILED",
            error=str(e),
        )
        job_manager.update_job(
            job_id=job_id,
            status="FAILED",
            error=str(e),
        )


async def execute_direct_generation_pipeline(
    job_id: str,
    candidate_data: Dict[str, Any],
    timestamped_name: str,
    keys: Dict[str, str],
):
    """
    Generates .tex, .pdf, .docx from pre-structured candidate data and uploads to S3.
    """
    logger.info("Starting direct resume generation for job %s...", job_id)
    try:
        work_dir = settings.MEDIA_DIR
        work_dir.mkdir(parents=True, exist_ok=True)

        tex_path = work_dir / f"{timestamped_name}.tex"
        docx_path = work_dir / f"{timestamped_name}.docx"

        # 1. LaTeX
        latex_str = generate_latex(candidate_data)
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex_str)

        # 2. PDF
        pdf_path = tex_to_pdf(tex_path, cleanup_aux=True)

        # 3. DOCX
        generate_docx(candidate_data, docx_path)

        # 4. S3 Uploads
        upload_file_to_s3(tex_path, keys["tex"])
        upload_file_to_s3(pdf_path, keys["pdf"])
        upload_file_to_s3(docx_path, keys["docx"])

        files_dict = {
            "tex": {
                "key": keys["tex"],
                "s3_url": get_s3_public_url(keys["tex"]),
                "presigned_url": generate_presigned_download_url(
                    keys["tex"], filename=f"{timestamped_name}.tex"
                ),
            },
            "pdf": {
                "key": keys["pdf"],
                "s3_url": get_s3_public_url(keys["pdf"]),
                "presigned_url": generate_presigned_download_url(
                    keys["pdf"], filename=f"{timestamped_name}.pdf"
                ),
            },
            "docx": {
                "key": keys["docx"],
                "s3_url": get_s3_public_url(keys["docx"]),
                "presigned_url": generate_presigned_download_url(
                    keys["docx"], filename=f"{timestamped_name}.docx"
                ),
            },
        }

        await db_update_job(
            job_id=job_id,
            status="READY",
            candidate=candidate_data,
            files_dict=files_dict,
        )

        job_manager.update_job(
            job_id=job_id,
            status="READY",
            candidate=candidate_data,
        )
        logger.info("Direct generation completed for job %s!", job_id)

    except Exception as e:
        logger.error("Direct generation failed for job %s: %s", job_id, e, exc_info=True)
        await db_update_job(
            job_id=job_id,
            status="FAILED",
            error=str(e),
        )
        job_manager.update_job(
            job_id=job_id,
            status="FAILED",
            error=str(e),
        )


# =========================================================
# ROUTE ENDPOINTS
# =========================================================

@router.post(
    "/tailor",
    response_model=TailorResumeResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Tailor Master Resume against Job Description via OpenAI",
)
async def tailor_resume(
    request: TailorResumeRequest,
    background_tasks: BackgroundTasks,
):
    """
    Takes a single `job_description` input key.
    Loads the master resume directly from MongoDB, tailors it with OpenAI,
    stores files in a dedicated S3 folder formatted as `{role_name}-{human_readable_timestamp}`,
    persists records to MongoDB, and returns non-blocking Presigned download URLs.
    """
    if not request.job_description or not request.job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'job_description' must not be empty.",
        )

    # 1. Fetch master resume directly from MongoDB
    master_data = await db_get_master_resume()

    # 2. Extract clean short role and compute dedicated S3 job folder with human-readable timestamp
    raw_name = (
        master_data.get("name")
        or master_data.get("personal", {}).get("name")
        or "Rohan_Phulkar"
    )
    role_slug = extract_short_role_slug(
        job_text=request.job_description,
        fallback_title="Backend_Engineer",
    )
    human_timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    folder_name, base_filename, keys = compute_job_folder_and_keys(
        candidate_name=raw_name,
        role_slug=role_slug,
        timestamp=human_timestamp,
    )

    # 3. Generate unique job ID and presigned download URLs immediately
    job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    files_info = _build_resume_files_info(keys, base_filename)

    # 4. Register job record in-memory and in MongoDB
    job_manager.create_job(
        job_id=job_id,
        filename=base_filename,
        files=files_info,
        initial_status="GENERATING",
    )

    files_dict = {
        "tex": files_info.tex.model_dump(),
        "pdf": files_info.pdf.model_dump(),
        "docx": files_info.docx.model_dump(),
    }

    await db_create_job(
        job_id=job_id,
        job_description=request.job_description,
        filename=base_filename,
        files_dict=files_dict,
        master_resume=master_data,
        initial_status="GENERATING",
    )

    # 5. Handle execution (async background task or synchronous)
    if request.async_processing:
        background_tasks.add_task(
            execute_tailoring_pipeline,
            job_id=job_id,
            job_description=request.job_description,
            master_resume=master_data,
            folder_name=folder_name,
            base_filename=base_filename,
            keys=keys,
        )
        return TailorResumeResponse(
            success=True,
            job_id=job_id,
            status="GENERATING",
            filename=base_filename,
            files=files_info,
            message=f"Resume tailoring initiated. Files uploading to folder '{folder_name}'.",
            candidate=None,
        )
    else:
        # Synchronous execution
        await execute_tailoring_pipeline(
            job_id=job_id,
            job_description=request.job_description,
            master_resume=master_data,
            folder_name=folder_name,
            base_filename=base_filename,
            keys=keys,
        )
        job_result = await db_get_job(job_id)
        return TailorResumeResponse(
            success=True,
            job_id=job_id,
            status=job_result.get("status", "READY") if job_result else "READY",
            filename=base_filename,
            files=files_info,
            message="Resume tailored and uploaded successfully.",
            candidate=job_result.get("candidate") if job_result else None,
        )


@router.get(
    "/status/{job_id}",
    response_model=JobStatusResponse,
    summary="Get Resume Generation Background Job Status",
)
async def get_job_status(job_id: str):
    """
    Polls the status of an ongoing or completed resume generation task from MongoDB / memory.
    """
    # Check MongoDB first
    doc = await db_get_job(job_id)
    if doc:
        files_data = doc.get("files")
        resume_files = None
        if files_data and "pdf" in files_data:
            resume_files = ResumeFiles(
                tex=FileInfo(**files_data["tex"]),
                pdf=FileInfo(**files_data["pdf"]),
                docx=FileInfo(**files_data["docx"]),
            )

        return JobStatusResponse(
            job_id=doc["job_id"],
            status=doc.get("status", "READY"),
            filename=doc.get("filename"),
            files=resume_files,
            candidate=doc.get("candidate"),
            error=doc.get("error"),
            created_at=doc.get("created_at", ""),
            updated_at=doc.get("updated_at", ""),
        )

    # In-memory fallback
    job_record = job_manager.get_job(job_id)
    if not job_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job ID '{job_id}' not found.",
        )
    return job_record


@router.get(
    "/master",
    response_model=MasterResumeResponse,
    summary="Retrieve Persistent Master Resume from MongoDB",
)
async def get_master_resume():
    """
    Returns the candidate master resume stored directly in MongoDB.
    """
    data = await db_get_master_resume()
    return MasterResumeResponse(success=True, master_resume=data)


@router.put(
    "/master",
    response_model=MasterResumeResponse,
    summary="Update Persistent Master Resume in MongoDB",
)
async def update_master_resume(request: UpdateMasterResumeRequest):
    """
    Updates the candidate master resume directly in MongoDB.
    """
    saved = await db_save_master_resume(request.master_resume)
    if not saved:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save updated master resume to MongoDB.",
        )
    return MasterResumeResponse(success=True, master_resume=request.master_resume)


@router.post(
    "/generate",
    response_model=TailorResumeResponse,
    summary="Generate Resume from Structured Candidate JSON (Direct)",
)
async def generate_resume_from_json(
    request: GenerateResumeRequest,
    background_tasks: BackgroundTasks,
):
    """
    Directly compiles .tex, .pdf, .docx from pre-structured candidate JSON without calling OpenAI.
    """
    candidate_dict = (
        request.candidate.model_dump()
        if hasattr(request.candidate, "model_dump")
        else dict(request.candidate)
    )

    raw_name = (
        request.filename
        or candidate_dict.get("name")
        or candidate_dict.get("personal", {}).get("name")
        or "resume"
    )
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    timestamped_name, keys = compute_file_keys(base_name=raw_name, timestamp=timestamp)

    job_id = f"job_{timestamp}_{uuid.uuid4().hex[:8]}"
    files_info = _build_resume_files_info(keys, timestamped_name)

    job_manager.create_job(
        job_id=job_id,
        filename=timestamped_name,
        files=files_info,
        initial_status="GENERATING",
    )

    files_dict = {
        "tex": files_info.tex.model_dump(),
        "pdf": files_info.pdf.model_dump(),
        "docx": files_info.docx.model_dump(),
    }

    await db_create_job(
        job_id=job_id,
        job_description="Direct JSON Generation",
        filename=timestamped_name,
        files_dict=files_dict,
        master_resume=candidate_dict,
        initial_status="GENERATING",
    )

    if request.async_processing:
        background_tasks.add_task(
            execute_direct_generation_pipeline,
            job_id=job_id,
            candidate_data=candidate_dict,
            timestamped_name=timestamped_name,
            keys=keys,
        )
        return TailorResumeResponse(
            success=True,
            job_id=job_id,
            status="GENERATING",
            filename=timestamped_name,
            files=files_info,
            message="Resume generation started in background.",
            candidate=candidate_dict,
        )
    else:
        await execute_direct_generation_pipeline(
            job_id=job_id,
            candidate_data=candidate_dict,
            timestamped_name=timestamped_name,
            keys=keys,
        )
        return TailorResumeResponse(
            success=True,
            job_id=job_id,
            status="READY",
            filename=timestamped_name,
            files=files_info,
            message="Resume generated and uploaded successfully.",
            candidate=candidate_dict,
        )


@router.post(
    "/compile-latex",
    summary="Compile Raw LaTeX String to PDF and Upload to S3",
)
async def compile_latex_endpoint(request: CompileLatexRequest):
    """
    Accepts raw LaTeX string, compiles it to PDF via pdflatex, and uploads to S3.
    """
    if not request.tex_content or not request.tex_content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'tex_content' must not be empty.",
        )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    timestamped_name = f"{sanitize_filename(request.filename)}_{timestamp}"

    work_dir = settings.MEDIA_DIR
    work_dir.mkdir(parents=True, exist_ok=True)

    tex_file = work_dir / f"{timestamped_name}.tex"
    with open(tex_file, "w", encoding="utf-8") as f:
        f.write(request.tex_content)

    try:
        pdf_file = tex_to_pdf(tex_file, cleanup_aux=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"LaTeX compilation failed: {e}",
        )

    pdf_key = f"{settings.S3_KEY_PREFIX.strip('/')}/{timestamped_name}.pdf"
    tex_key = f"{settings.S3_KEY_PREFIX.strip('/')}/{timestamped_name}.tex"

    pdf_s3_url = upload_file_to_s3(pdf_file, pdf_key)
    tex_s3_url = upload_file_to_s3(tex_file, tex_key)

    pdf_presigned = generate_presigned_download_url(pdf_key, filename=f"{timestamped_name}.pdf")
    tex_presigned = generate_presigned_download_url(tex_key, filename=f"{timestamped_name}.tex")

    return {
        "success": True,
        "filename": timestamped_name,
        "pdf": {
            "key": pdf_key,
            "s3_url": pdf_s3_url,
            "presigned_url": pdf_presigned,
        },
        "tex": {
            "key": tex_key,
            "s3_url": tex_s3_url,
            "presigned_url": tex_presigned,
        },
    }
