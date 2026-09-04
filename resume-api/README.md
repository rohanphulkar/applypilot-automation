# Resume Generator API

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141+-009688.svg)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Motor_Async-47A248.svg)](https://www.mongodb.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991.svg)](https://openai.com)
[![AWS S3](https://img.shields.io/badge/AWS-S3_Storage-FF9900.svg)](https://aws.amazon.com/s3/)
[![LaTeX](https://img.shields.io/badge/LaTeX-pdflatex-008080.svg)](https://www.latex-project.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

A high-performance, asynchronous Python **FastAPI** microservice engineered for ATS 92+ resume tailoring with OpenAI, programmatic LaTeX `.tex` generation, `.pdf` compilation via `pdflatex`, `.docx` Word document creation, MongoDB persistence, and AWS S3 storage with instant non-blocking presigned download URLs.

---

## Architecture & Workflow

```
                                 +-------------------------------------+
                                 |   Client (Web / Mobile / API App)   |
                                 +------------------+------------------+
                                                    |
                      +-----------------------------+-----------------------------+
                      |                                                           |
                      v (Tailor Resume)                                           v (Job Listing & Detail)
        +----------------------------+                             +----------------------------+
        | POST /api/resume/tailor    |                             | GET /api/jobs              |
        | - Input: {job_description} |                             | GET /api/jobs/{id}         |
        | - Fetches Master Resume    |                             | DELETE /api/jobs/{id}      |
        |   directly from MongoDB    |                             | - Reads from MongoDB       |
        | - Creates S3 Job Folder:   |                             | - Returns fresh 7-day      |
        |   resumes/{role}-{ts}/     |                             |   Presigned Download URLs  |
        | - Returns 202 + Presigned  |                             +----------------------------+
        +-------------+--------------+
                      |
                      v (FastAPI Background Task)
        +-------------------------------------------------------+
        | 1. OpenAI ATS 92+ Tailoring (gpt-4o-mini)             |
        | 2. Programmatic .tex, .pdf (pdflatex), .docx builds   |
        | 3. Uploads to S3:                                     |
        |    resumes/{role}-{YYYY-MM-DD_HH-MM-SS}/              |
        |    ├── {name}_{role}.pdf                              |
        |    ├── {name}_{role}.docx                             |
        |    └── {name}_{role}.tex                              |
        | 4. Update MongoDB Document:                           |
        |    - status = "READY"                                 |
        |    - extracted_job, candidate, files, updated_at      |
        +-------------------------------------------------------+
```

---

## Key Features

- **Single Input Key (`job_description`)**: Provide only `{ "job_description": "..." }`. No need to send candidate data in the request.
- **MongoDB Master Resume Storage**: Candidate profile lives directly in MongoDB (`master_resume` collection), auto-seeded from `data/master_resume.json` on initial boot.
- **Dedicated S3 Job Folders**: Every job creates a clean S3 directory with the job role name and a human-readable timestamp:
  `resumes/{Role_Name}-{YYYY-MM-DD_HH-MM-SS}/{Candidate_Name}_{Role_Name}.pdf`
- **Instant Non-Blocking Presigned URLs**: Pre-calculates 7-day S3 download URLs returned immediately in the `202 Accepted` response.
- **ATS 92+ Triple-Format Generation**:
  - **LaTeX (`.tex`)**: Professional Charter typography, tight 0.45" margins, section rules (`\titlerule`), and regex character escaping.
  - **PDF (`.pdf`)**: Native `pdflatex` compilation with automatic auxiliary cleanup (`.aux`, `.log`, `.out`).
  - **Word (`.docx`)**: Clean `python-docx` layout with 7.5" right-aligned tab stops, Calibri font, XML borders (`#CCCCCC`), and dark blue links (`#1a56db`).
- **RESTful Job Management**: Full CRUD endpoints for web and mobile apps to list, search, filter, view, and delete tailored jobs.
- **Docker & Compose Ready**: Multi-stage `Dockerfile` with full LaTeX toolchain and `docker-compose.yml` for unified API and MongoDB deployment.

---

## Project Structure

```
resume-api/
├── Dockerfile                   # Production container with pdflatex & uv
├── docker-compose.yml           # Unified Compose stack (API + MongoDB)
├── .dockerignore                # Optimized build exclusions
├── .env                         # Environment variables (MongoDB, OpenAI, AWS S3)
├── .env.example                 # Template configuration
├── pyproject.toml               # Dependencies, metadata & CLI runner scripts
├── README.md                    # Service documentation
├── main.py                      # FastAPI application entrypoint & health checks
├── config.py                    # Environment settings loader
├── schemas.py                   # Pydantic request/response schemas
├── prompts.py                   # ATS 92+ OpenAI prompt engine
├── test_api.py                  # Integration test suite
├── data/
│   └── master_resume.json       # Master candidate profile seed
├── services/
│   ├── db_service.py            # Async Motor MongoDB driver & indexing
│   ├── openai_service.py        # OpenAI tailoring & structured extraction
│   ├── latex_service.py         # ATS LaTeX generation & role extraction
│   ├── pdf_service.py           # pdflatex compiler runner & cleanup
│   ├── docx_service.py          # ATS 92+ python-docx document builder
│   ├── s3_service.py            # AWS S3 uploads, folders & presigned URLs
│   └── job_service.py           # In-memory registry & fallback storage
└── routers/
    ├── resume.py                # Tailoring, generation & master resume routes
    └── jobs.py                  # Web & mobile Job CRUD routes
```

---

## Quick Start

### Option A: Local Development with `uv`

#### 1. Prerequisites
- **Python 3.12+**
- **MongoDB 7.0+**
- **pdflatex** (`sudo apt-get install -y texlive-latex-base texlive-latex-extra texlive-fonts-recommended`)

#### 2. Install & Configure
```bash
cd resume-api
cp .env.example .env
# Edit .env with your credentials (OPENAI_API_KEY, AWS_ACCESS_KEY_ID, MONGODB_URI)
uv sync
```

#### 3. Run the Service
```bash
# Using CLI script entrypoint
uv run resume-api

# Or using uvicorn directly
uv run uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

### Option B: Docker Compose Deployment

To build and launch the API and MongoDB containers together:

```bash
cd resume-api
docker compose up --build -d
```

To stop containers:
```bash
docker compose down
```

---

## API Documentation & Endpoints

Interactive Swagger UI documentation is available at:
- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

---

### 1. Tailor Resume against Job Description
`POST /api/resume/tailor`

**Request Body:**
```json
{
  "job_description": "We are seeking a Senior Backend Engineer proficient in Python, FastAPI, and PostgreSQL to design and scale high-throughput REST APIs and microservices. Experience with Redis caching and Docker is required.",
  "async_processing": true
}
```

**Response (`202 Accepted`):**
```json
{
  "success": true,
  "job_id": "job_20260903_175040_63c28fed",
  "status": "GENERATING",
  "filename": "Rohan_Phulkar_Backend_Engineer",
  "files": {
    "tex": {
      "key": "resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.tex",
      "s3_url": "https://applypilot-platform.s3.ap-south-1.amazonaws.com/resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.tex",
      "presigned_url": "https://applypilot-platform.s3.ap-south-1.amazonaws.com/resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.tex?X-Amz-..."
    },
    "pdf": {
      "key": "resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.pdf",
      "s3_url": "https://applypilot-platform.s3.ap-south-1.amazonaws.com/resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.pdf",
      "presigned_url": "https://applypilot-platform.s3.ap-south-1.amazonaws.com/resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.pdf?X-Amz-..."
    },
    "docx": {
      "key": "resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.docx",
      "s3_url": "https://applypilot-platform.s3.ap-south-1.amazonaws.com/resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.docx",
      "presigned_url": "https://applypilot-platform.s3.ap-south-1.amazonaws.com/resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.docx?X-Amz-..."
    }
  },
  "message": "Resume tailoring initiated. Files uploading to folder 'Backend_Engineer-2026-09-03_17-50-40'."
}
```

---

### 2. Check Job Status
`GET /api/resume/status/{job_id}`

---

### 3. Job Management (Web & Mobile Apps)

#### List Tailored Jobs (Paginated with Search & Filters)
`GET /api/jobs?page=1&limit=20&status=READY&search=TechFlow`

**Response (`200 OK`):**
```json
{
  "success": true,
  "total": 1,
  "page": 1,
  "limit": 20,
  "total_pages": 1,
  "jobs": [
    {
      "job_id": "job_20260903_175040_63c28fed",
      "title": "Senior Backend Engineer",
      "company_name": "TechFlow Innovations",
      "status": "READY",
      "filename": "Rohan_Phulkar_Backend_Engineer",
      "files": {
        "pdf": {
          "key": "resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.pdf",
          "s3_url": "https://applypilot-platform.s3.ap-south-1.amazonaws.com/resumes/Backend_Engineer-2026-09-03_17-50-40/Rohan_Phulkar_Backend_Engineer.pdf",
          "presigned_url": "https://..."
        },
        "docx": { "key": "...", "s3_url": "...", "presigned_url": "..." },
        "tex": { "key": "...", "s3_url": "...", "presigned_url": "..." }
      },
      "created_at": "2026-09-03T17:50:40.618123",
      "updated_at": "2026-09-03T17:50:52.644123"
    }
  ]
}
```

#### Get Full Job Detail
`GET /api/jobs/{job_id}`

#### Delete Job
`DELETE /api/jobs/{job_id}`

---

### 4. Master Resume Management (MongoDB)
- `GET /api/resume/master`: View candidate master profile from MongoDB
- `PUT /api/resume/master`: Update candidate master profile in MongoDB

---

### 5. Health Check
`GET /health`

**Response (`200 OK`):**
```json
{
  "status": "healthy",
  "service": "Resume Generator API",
  "version": "1.0.0",
  "checks": {
    "mongodb": "connected",
    "pdflatex": "available",
    "openai_api": "configured",
    "aws_s3": "configured"
  },
  "database": "resume_generator_db",
  "bucket": "applypilot-platform",
  "region": "ap-south-1",
  "openai_model": "gpt-4o-mini"
}
```

---

## Running Automated Tests

```bash
cd resume-api
uv run python test_api.py
```
