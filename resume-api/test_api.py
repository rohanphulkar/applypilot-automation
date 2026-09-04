import json
import logging
import os
import time
from pathlib import Path

from fastapi.testclient import TestClient
from main import app
from services.docx_service import generate_docx
from services.latex_service import generate_latex
from services.pdf_service import tex_to_pdf
from services.s3_service import compute_file_keys, generate_presigned_download_url

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_api")

SAMPLE_JD = """
Senior Backend Engineer (Python / FastAPI)
Company: TechFlow Innovations
Location: Remote

About the Role:
We are looking for a Senior Backend Engineer proficient in Python, FastAPI, and PostgreSQL to design and scale high-throughput REST APIs and microservices. You will work with Redis caching, Docker containerization, and AWS infrastructure.

Requirements:
- 3+ years experience with Python and FastAPI or Django
- Strong PostgreSQL query optimization and database design
- Hands-on experience with Redis, Docker, and CI/CD pipelines
- Experience building scalable RESTful architectures
"""


def test_full_pipeline_with_mongodb():
    with TestClient(app) as client:
        # 1. Health check
        logger.info("--- Testing GET /health ---")
        health_resp = client.get("/health")
        assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
        health_data = health_resp.json()
        logger.info("Health response: %s", health_data)
        assert health_data["checks"]["mongodb"] == "connected"
        assert health_data["checks"]["pdflatex"] == "available"
        assert health_data["checks"]["storage"] in ("aws_s3", "local_filesystem")
        logger.info("PASSED: Health check with MongoDB connected\n")

        # 2. Master resume
        logger.info("--- Testing GET /api/resume/master ---")
        master_resp = client.get("/api/resume/master")
        assert master_resp.status_code == 200
        master_data = master_resp.json()
        assert master_data["master_resume"]["personal"]["name"] == "Rohan Phulkar"
        logger.info("PASSED: Master resume endpoint\n")

        # 3. Local compilation
        logger.info("--- Testing Local LaTeX, PDF, and DOCX Generation ---")
        temp_dir = Path("./temp_test")
        temp_dir.mkdir(parents=True, exist_ok=True)
        tex_file = temp_dir / "test_resume.tex"
        docx_file = temp_dir / "test_resume.docx"

        latex_content = generate_latex(master_data["master_resume"])
        assert r"\documentclass[10pt,letterpaper]{article}" in latex_content
        assert r"\section{PROJECTS}" not in latex_content, "Empty projects section should not be rendered"
        with open(tex_file, "w", encoding="utf-8") as f:
            f.write(latex_content)

        pdf_file = tex_to_pdf(tex_file, cleanup_aux=True)
        assert pdf_file.exists()
        assert pdf_file.stat().st_size > 1000

        generate_docx(master_data["master_resume"], docx_file)
        assert docx_file.exists()
        assert docx_file.stat().st_size > 1000

        for f in (tex_file, pdf_file, docx_file):
            if f.exists():
                f.unlink()
        if temp_dir.exists():
            temp_dir.rmdir()
        logger.info("PASSED: Local compilation pipeline\n")

        # 4. Tailor Resume (Async + MongoDB)
        logger.info("--- Testing POST /api/resume/tailor (Async with MongoDB) ---")
        payload = {
            "job_description": SAMPLE_JD,
            "async_processing": True,
        }

        tailor_resp = client.post("/api/resume/tailor", json=payload)
        assert tailor_resp.status_code == 202, f"Tailor request failed: {tailor_resp.text}"
        tailor_data = tailor_resp.json()
        job_id = tailor_data["job_id"]
        filename = tailor_data["filename"]
        pdf_key = tailor_data["files"]["pdf"]["key"]
        logger.info("Tailor Job ID created: %s", job_id)
        logger.info("Generated Short Role Filename: %s", filename)
        logger.info("Generated S3 PDF Key: %s", pdf_key)
        assert "Rohan_Phulkar_Backend_Engineer" in filename, f"Expected role-based filename, got: {filename}"
        assert "resumes/Backend_Engineer-" in pdf_key, f"Expected S3 job folder with role name, got: {pdf_key}"
        assert "files" in tailor_data
        assert "pdf" in tailor_data["files"]

        # 5. Poll until READY
        logger.info("Polling job status until READY...")
        ready = False
        for i in range(30):
            status_resp = client.get(f"/api/resume/status/{job_id}")
            assert status_resp.status_code == 200
            s_data = status_resp.json()
            curr_status = s_data.get("status")
            logger.info("Poll %d: status = %s", i + 1, curr_status)
            if curr_status == "READY":
                ready = True
                break
            elif curr_status == "FAILED":
                raise RuntimeError(f"Job failed: {s_data.get('error')}")
            time.sleep(1)

        assert ready, "Job did not complete in time"
        logger.info("PASSED: POST /api/resume/tailor with MongoDB persistence\n")

        # 6. List Jobs from MongoDB
        logger.info("--- Testing GET /api/jobs (Web & Mobile API) ---")
        jobs_resp = client.get("/api/jobs?page=1&limit=10")
        assert jobs_resp.status_code == 200
        jobs_data = jobs_resp.json()
        assert jobs_data["success"] is True
        assert jobs_data["total"] >= 1
        logger.info("Total jobs in MongoDB: %d", jobs_data["total"])
        found_job = next((j for j in jobs_data["jobs"] if j["job_id"] == job_id), None)
        assert found_job is not None, f"Job {job_id} not found in listing"
        logger.info("Found job in list: %s - %s", found_job["company_name"], found_job["title"])
        assert "pdf" in found_job["files"]
        assert "presigned_url" in found_job["files"]["pdf"]
        logger.info("PASSED: GET /api/jobs listing endpoint\n")

        # 7. Get Job Detail from MongoDB
        logger.info("--- Testing GET /api/jobs/{job_id} ---")
        detail_resp = client.get(f"/api/jobs/{job_id}")
        assert detail_resp.status_code == 200
        detail_data = detail_resp.json()
        assert detail_data["job_id"] == job_id
        assert detail_data["status"] == "READY"
        assert detail_data["candidate"] is not None
        assert "personal" in detail_data["candidate"]
        assert "files" in detail_data
        assert "presigned_url" in detail_data["files"]["pdf"]
        logger.info("Job Detail Company: %s", detail_data.get("company_name"))
        logger.info("Tailored Title: %s", detail_data["candidate"]["personal"].get("title"))
        logger.info("PASSED: GET /api/jobs/{job_id} detail endpoint\n")

        # 8. Delete Job from MongoDB
        logger.info("--- Testing DELETE /api/jobs/{job_id} ---")
        del_resp = client.delete(f"/api/jobs/{job_id}")
        assert del_resp.status_code == 200
        del_data = del_resp.json()
        assert del_data["success"] is True
        logger.info("Deleted job: %s", job_id)

        # Verify 404 after deletion
        verify_resp = client.get(f"/api/jobs/{job_id}")
        assert verify_resp.status_code == 404
        logger.info("PASSED: DELETE /api/jobs/{job_id}\n")

        logger.info("==========================================")
        logger.info("ALL TESTS WITH MONGODB PASSED SUCCESSFULLY!")
        logger.info("==========================================")


if __name__ == "__main__":
    test_full_pipeline_with_mongodb()
