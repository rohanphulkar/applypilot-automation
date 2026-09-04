import logging
import shutil
import sys
from contextlib import asynccontextmanager

from config import settings
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from routers.jobs import router as jobs_router
from routers.resume import router as resume_router
from services.db_service import close_mongo_connection, connect_to_mongo, get_database
from services.job_service import load_master_resume

# Configure structured logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("resume_generator_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing %s v%s...", settings.APP_NAME, settings.APP_VERSION)

    # 1. Connect to MongoDB
    await connect_to_mongo()

    # 2. Check pdflatex binary
    pdflatex_path = shutil.which("pdflatex")
    if pdflatex_path:
        logger.info("LaTeX compiler found: %s", pdflatex_path)
    else:
        logger.warning("pdflatex NOT found in PATH. PDF compilation will fail.")

    # 3. Check master resume
    master = load_master_resume()
    logger.info(
        "Master resume loaded: %s (%s)",
        master.get("personal", {}).get("name"),
        master.get("personal", {}).get("title"),
    )

    # 4. Check OpenAI
    if settings.OPENAI_API_KEY:
        logger.info("OpenAI API key configured (model: %s)", settings.OPENAI_MODEL)
    else:
        logger.warning("OPENAI_API_KEY not configured. Resume tailoring will use fallback.")

    # 5. Check S3
    if settings.AWS_S3_BUCKET:
        logger.info(
            "AWS S3 bucket configured: %s (region: %s)",
            settings.AWS_S3_BUCKET,
            settings.AWS_REGION,
        )
    else:
        logger.warning("AWS_S3_BUCKET not configured. Local media will be used.")

    yield

    # Shutdown sequence
    logger.info("Shutting down %s...", settings.APP_NAME)
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="ATS 92+ Resume Optimization, LaTeX/PDF/DOCX Generation, MongoDB Persistence, and AWS S3 Presigned URLs",
    lifespan=lifespan,
)

# CORS Middleware for Web and Mobile Apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(resume_router)
app.include_router(jobs_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    db = get_database()
    mongo_connected = False
    if db is not None:
        try:
            await db.command("ping")
            mongo_connected = True
        except Exception:
            mongo_connected = False

    pdflatex_found = shutil.which("pdflatex") is not None
    openai_configured = bool(settings.OPENAI_API_KEY)
    s3_configured = bool(settings.AWS_S3_BUCKET and settings.AWS_ACCESS_KEY_ID)

    all_healthy = mongo_connected and pdflatex_found and openai_configured and s3_configured

    return {
        "status": "healthy" if all_healthy else "degraded",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checks": {
            "mongodb": "connected" if mongo_connected else "disconnected",
            "pdflatex": "available" if pdflatex_found else "missing",
            "openai_api": "configured" if openai_configured else "missing_key",
            "aws_s3": "configured" if s3_configured else "missing_credentials",
        },
        "database": settings.MONGODB_DB_NAME,
        "bucket": settings.AWS_S3_BUCKET,
        "region": settings.AWS_REGION,
        "openai_model": settings.OPENAI_MODEL,
    }


def start():
    """
    CLI entrypoint executed via 'resume-generator' or 'resume-api' command.
    """
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)


if __name__ == "__main__":
    start()
