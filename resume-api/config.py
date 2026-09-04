import os
from pathlib import Path
from dotenv import load_dotenv

# Try loading .env from current directory or parent workspace directory
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

if (BASE_DIR / ".env").exists():
    load_dotenv(BASE_DIR / ".env")
elif (ROOT_DIR / ".env").exists():
    load_dotenv(ROOT_DIR / ".env")
else:
    load_dotenv()


class Settings:
    # App
    APP_NAME: str = "Resume Generator API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))

    # MongoDB Configuration
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "resume_generator_db")

    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # AWS S3 Storage
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "applypilot-platform")
    S3_KEY_PREFIX: str = os.getenv("S3_KEY_PREFIX", "resumes")
    PRESIGNED_URL_EXPIRATION: int = int(os.getenv("PRESIGNED_URL_EXPIRATION", "604800"))  # 7 days

    # Media & Storage Paths
    DATA_DIR: Path = BASE_DIR / "data"
    MEDIA_DIR: Path = ROOT_DIR / "media" / "resumes"
    TEMP_DIR: Path = BASE_DIR / "temp"

    # Master Resume File Path
    MASTER_RESUME_PATH: Path = DATA_DIR / "master_resume.json"


settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
