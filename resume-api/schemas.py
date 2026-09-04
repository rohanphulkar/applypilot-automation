from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class PersonalInfo(BaseModel):
    name: str = Field(default="", description="Candidate full name")
    title: str = Field(default="", description="Professional title headline (max 80 chars)")
    email: str = Field(default="", description="Contact email")
    website: Optional[str] = Field(default="", description="Personal portfolio website URL")
    github: Optional[str] = Field(default="", description="GitHub profile URL")
    linkedin: Optional[str] = Field(default="", description="LinkedIn profile URL")


class ExperienceItem(BaseModel):
    company: str = Field(..., description="Company name")
    role: str = Field(..., description="Job role or title")
    dates: str = Field(..., description="Employment dates range (e.g. 'Sep 2025 -- Present')")
    bullets: List[str] = Field(default_factory=list, description="List of bullet points describing impact")
    tech_stack: List[str] = Field(default_factory=list, description="Technologies used in this role")


class ProjectItem(BaseModel):
    name: str = Field(..., description="Project name")
    url: Optional[str] = Field(default="", description="Project or repository URL")
    description: List[str] = Field(default_factory=list, description="Project bullet points")
    tech_stack: List[str] = Field(default_factory=list, description="Technologies used in this project")


class EducationItem(BaseModel):
    degree: str = Field(default="", description="Degree or diploma name")
    institution: str = Field(default="", description="School, college or university name")
    location: str = Field(default="", description="Institution location")
    year: Union[str, int] = Field(default="", description="Graduation year")


class CandidateResume(BaseModel):
    resume_name: Optional[str] = Field(default="Rohan Phulkar", description="Candidate resume name (optional role suffix)")
    personal: PersonalInfo = Field(default_factory=PersonalInfo)
    summary: str = Field(default="", description="2-3 sentence ATS-aligned professional summary")
    skills: Union[List[str], Dict[str, Any]] = Field(default_factory=list, description="Technical skills list or categorized map")
    experience: List[ExperienceItem] = Field(default_factory=list, description="Professional experience entries")
    projects: List[ProjectItem] = Field(default_factory=list, description="Key projects")
    education: Union[EducationItem, List[EducationItem], Dict[str, Any]] = Field(default_factory=EducationItem, description="Education details")


class TailorResumeRequest(BaseModel):
    job_description: str = Field(..., description="Full job description text or HTML content to tailor against")
    async_processing: bool = Field(default=True, description="Whether to compile and upload in background tasks (returns presigned URLs immediately)")


class GenerateResumeRequest(BaseModel):
    candidate: Union[CandidateResume, Dict[str, Any]] = Field(..., description="Structured candidate resume object")
    async_processing: bool = Field(default=True, description="Whether to compile and upload in background tasks")
    filename: Optional[str] = Field(default=None, description="Optional custom base filename")


class CompileLatexRequest(BaseModel):
    tex_content: str = Field(..., description="Raw LaTeX document content")
    filename: Optional[str] = Field(default="custom_resume", description="Base filename for PDF export")


class FileInfo(BaseModel):
    key: str = Field(..., description="S3 object key")
    s3_url: str = Field(..., description="Direct S3 URL / public path")
    presigned_url: str = Field(..., description="Presigned S3 download URL with expiration")


class ResumeFiles(BaseModel):
    tex: FileInfo
    pdf: FileInfo
    docx: FileInfo


class TailorResumeResponse(BaseModel):
    success: bool = True
    job_id: str
    status: str = Field(..., description="Job status: PENDING, GENERATING, READY, FAILED")
    filename: str
    files: ResumeFiles
    message: str
    candidate: Optional[Dict[str, Any]] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str = Field(..., description="PENDING, GENERATING, READY, FAILED")
    filename: Optional[str] = None
    files: Optional[ResumeFiles] = None
    candidate: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


class MasterResumeResponse(BaseModel):
    success: bool = True
    master_resume: Dict[str, Any]


class UpdateMasterResumeRequest(BaseModel):
    master_resume: Dict[str, Any] = Field(..., description="Complete master resume JSON object to save")


# =========================================================
# JOB CRUD API SCHEMAS FOR WEB / MOBILE APPS
# =========================================================

class JobSummary(BaseModel):
    job_id: str
    title: Optional[str] = "Pending Tailoring"
    company_name: Optional[str] = "Target Company"
    status: str
    filename: str
    files: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str


class JobListResponse(BaseModel):
    success: bool = True
    total: int
    page: int
    limit: int
    total_pages: int
    jobs: List[JobSummary]


class JobDetailResponse(BaseModel):
    success: bool = True
    job_id: str
    title: Optional[str] = "Pending Tailoring"
    company_name: Optional[str] = "Target Company"
    job_description: str
    status: str
    filename: str
    extracted_job: Optional[Dict[str, Any]] = None
    candidate: Optional[Dict[str, Any]] = None
    files: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


class DeleteJobResponse(BaseModel):
    success: bool = True
    job_id: str
    message: str
