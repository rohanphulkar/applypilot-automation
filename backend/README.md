# ApplyPilot — Job Application Automation Backend

ApplyPilot is a production-ready, beginner-friendly Node.js backend application designed to automate the entire job application lifecycle:

1. Accepting job descriptions via a non-blocking REST API.
2. Background processing via **BullMQ** and **Redis**.
3. Parsing structured job details and recruiter contact information using **OpenAI**.
4. Requesting tailored resumes from the **Resume API**.
5. Generating professional, role-tailored cover letters using **OpenAI**.
6. Compiling the complete RFC 5322 MIME email with PDF resume attachment.
7. Sending the email to recruiters via **Spacemail SMTP**.
8. Appending the **exact same raw MIME email** to the **Spacemail Sent folder** via **IMAP** (`ImapFlow`).
9. Ensuring **strict idempotency** so duplicate emails are never sent upon retries.

---

## Architecture Flow

```text
[ Client ]
    │
    │  POST /api/jobs  { "job_description": "..." }
    ▼
[ Express API Server ] ──> Creates Job record in MongoDB (status: QUEUED)
    │                  ──> Enqueues { applicationId } to BullMQ
    ▼
[ Immediate 202 Accepted Response ]
{
  "success": true,
  "message": "Job application processing queued",
  "jobId": "..."
}

═══════════════════════════════════════════════════════════════════════════
                      BullMQ Background Worker
═══════════════════════════════════════════════════════════════════════════
    │
    ├─► 1. Load Job from MongoDB (status: PROCESSING)
    │
    ├─► 2. Parse Job Description with OpenAI (status: PARSING_JOB)
    │      Extracts title, company, skills, recruiter email, etc.
    │      * If no recruiter email found -> Marks FAILED with clear reason.
    │
    ├─► 3. Call Resume Tailoring API (status: TAILORING_RESUME)
    │      Fetches ATS-optimized PDF resume download URLs.
    │
    ├─► 4. Generate Tailored Cover Letter with OpenAI (status: GENERATING_COVER_LETTER)
    │
    ├─► 5. Compose Email & Compile RFC 5322 MIME (status: COMPOSING_EMAIL)
    │      Downloads temporary resume PDF attachment & assigns stable Message-ID.
    │
    ├─► 6. Send MIME via Spacemail SMTP (status: SENDING_EMAIL)
    │      Sets email.smtpStatus = 'SENT'.
    │
    ├─► 7. Append Exact MIME to Spacemail Sent folder via IMAP (status: SAVING_TO_SENT)
    │      Sets email.sentFolderStatus = 'SAVED'.
    │
    └─► 8. Cleanup temp files & Mark COMPLETED (status: COMPLETED)
```

---

## Directory Structure

```text
backend/
├── src/
│   ├── config/
│   │   └── config.js              # Centralized configuration
│   ├── controllers/
│   │   └── job.controller.js      # REST API request handlers
│   ├── middlewares/
│   │   └── error.middleware.js    # Centralized error & 404 handlers
│   ├── models/
│   │   └── job.model.js           # Mongoose schema for Job lifecycle
│   ├── queues/
│   │   └── job.queue.js           # BullMQ queue definition & Redis client
│   ├── routes/
│   │   └── job.routes.js          # Express route definitions
│   ├── services/
│   │   ├── cover-letter.service.js# OpenAI cover letter generator
│   │   ├── email.service.js       # MIME compilation, SMTP & IMAP service
│   │   ├── job-parser.service.js  # OpenAI structured job description parser
│   │   ├── openai.service.js      # OpenAI API client wrapper
│   │   └── resume.service.js      # Resume Tailoring API client
│   ├── utils/
│   │   ├── errors.js              # Custom application error classes
│   │   └── logger.js              # Structured logger with secret sanitization
│   ├── workers/
│   │   └── job.worker.js          # BullMQ background worker orchestrator
│   ├── app.js                     # Express application configuration
│   ├── server.js                  # API server startup & graceful shutdown
│   └── worker.js                  # Worker startup & graceful shutdown
├── .env.example
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js**: v18.0.0 or higher (v22+ recommended)
- **MongoDB**: v6.0 or higher running locally or on MongoDB Atlas
- **Redis**: v6.0 or higher running locally or cloud Redis
- **OpenAI API Key**: Access to `gpt-4o-mini` or `gpt-4o`
- **Spacemail Account**: Email address and password with SMTP and IMAP access enabled

---

## Configuration & Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/applypilot

# Redis Connection for BullMQ
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=

# Worker Settings
WORKER_CONCURRENCY=3
WORKER_ATTEMPTS=3
WORKER_BACKOFF_DELAY=5000

# OpenAI API Settings
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# External Resume Tailoring API
RESUME_API_BASE_URL=http://localhost:8000
RESUME_API_KEY=
RESUME_API_ENDPOINT=/api/resume/tailor

# Spacemail Credentials
SPACEMAIL_EMAIL=your_name@spacemail.com
SPACEMAIL_PASSWORD=your_spacemail_password

# Spacemail SMTP Configuration (Outbound Mail)
SPACEMAIL_SMTP_HOST=mail.spacemail.com
SPACEMAIL_SMTP_PORT=465
SPACEMAIL_SMTP_SECURE=true

# Spacemail IMAP Configuration (Sent Folder Synchronization)
SPACEMAIL_IMAP_HOST=mail.spacemail.com
SPACEMAIL_IMAP_PORT=993
SPACEMAIL_IMAP_SECURE=true
```

---

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Start MongoDB**:
   ```bash
   # If running locally via systemd / docker:
   sudo systemctl start mongod
   # OR
   docker run -d --name applypilot-mongo -p 27017:27017 mongo:7
   ```

3. **Start Redis**:
   ```bash
   # If running locally via systemd / docker:
   sudo systemctl start redis-server
   # OR
   docker run -d --name applypilot-redis -p 6379:6379 redis:7-alpine
   ```

---

## Running the Application

### 1. Development Mode (API Server)
```bash
npm run dev
```
Starts the API server on `http://localhost:5000` with hot-reloading.

### 2. Development Mode (Worker Process)
In a separate terminal:
```bash
npm run worker:dev
```
Starts the BullMQ background worker listening for jobs.

### 3. Production Mode
Run the API and Worker as independent processes:
```bash
# Terminal 1 (API Server)
npm start

# Terminal 2 (Worker)
npm run worker
```

---

## REST API Endpoints

### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "ApplyPilot Backend",
  "timestamp": "2026-09-04T10:30:00.000Z"
}
```

---

### 2. Create Job Application
Enqueues a job description for background processing. Returns immediately.

```http
POST /api/jobs
Content-Type: application/json
```

**Request Body:**
```json
{
  "job_description": "We are seeking a Senior Backend Engineer at Acme Corp. Location: Remote. Requirements: 5+ years of Node.js, Express, MongoDB, and Redis experience. Please submit your application to careers@acmecorp.com."
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "message": "Job application processing queued",
  "jobId": "8f3d1b9a-4c2e-4b6a-9f1e-123456789abc"
}
```

---

### 3. Get Application Status & Details
Retrieves the real-time lifecycle state, extracted details, and error logs for an application.

```http
GET /api/jobs/:id
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "jobId": "8f3d1b9a-4c2e-4b6a-9f1e-123456789abc",
    "status": "COMPLETED",
    "originalJobDescription": "We are seeking a Senior Backend Engineer...",
    "parsedJob": {
      "title": "Senior Backend Engineer",
      "company": "Acme Corp",
      "location": "Remote",
      "employmentType": "FULL_TIME",
      "experienceMin": 5,
      "experienceMax": null,
      "salaryMin": null,
      "salaryMax": null,
      "salaryCurrency": null,
      "skills": "Node.js, Express, MongoDB, Redis",
      "responsibilities": "Lead backend development...",
      "requirements": "5+ years of experience...",
      "niceToHave": null,
      "applicationEmail": "careers@acmecorp.com",
      "applicationUrl": null,
      "sourceUrl": null,
      "sourcePlatform": null,
      "description": "..."
    },
    "resume": {
      "requestStatus": "COMPLETED",
      "urls": [
        "https://s3.amazonaws.com/.../Resume.pdf"
      ]
    },
    "coverLetter": {
      "status": "COMPLETED",
      "content": "Dear Hiring Team,\n\nI am writing to express my strong interest in the Senior Backend Engineer role at Acme Corp..."
    },
    "email": {
      "recruiterEmail": "careers@acmecorp.com",
      "subject": "Application for Senior Backend Engineer - Acme Corp",
      "body": "Dear Hiring Team...",
      "messageId": "<applypilot-8f3d1b9a-1725400000@spacemail.com>",
      "smtpStatus": "SENT",
      "sentFolderStatus": "SAVED"
    },
    "error": {
      "stage": null,
      "message": null
    },
    "createdAt": "2026-09-04T10:30:00.000Z",
    "updatedAt": "2026-09-04T10:30:45.000Z"
  }
}
```

---

### 4. List Job Applications (Paginated)
```http
GET /api/jobs?page=1&limit=20&status=COMPLETED
```

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

---

## Critical Features & Reliability Guarantees

### 1. Duplicate Email Prevention (Idempotency)
If a network error occurs while saving the email to the IMAP Sent folder after SMTP delivery succeeds:
- `email.smtpStatus` is stored as `"SENT"`.
- `email.sentFolderStatus` is marked as `"FAILED"`.
- BullMQ retries the job using exponential backoff.
- On retry, the worker detects `job.email.smtpStatus === 'SENT'` and **skips SMTP delivery**, executing only the missing IMAP Sent-folder operation.

### 2. Spacemail MIME Parity
The exact raw RFC 5322 byte buffer compiled by `MailComposer` (with the same `Message-ID`, timestamp, headers, and PDF attachment) is sent to the recruiter via SMTP and appended to the Spacemail `\Sent` mailbox via IMAP.

### 3. Graceful Shutdown
Both the API Server (`server.js`) and Worker Process (`worker.js`) listen for `SIGINT` and `SIGTERM` signals:
- Stops accepting new HTTP requests or pauses the BullMQ worker.
- Allows active jobs to finish or disconnects cleanly.
- Closes Mongoose database connections and Redis socket handles.

---

## Production Deployment Recommendations

1. **Process Management**: Use **PM2** or **Docker Compose** to run API instances and Worker instances separately:
   ```bash
   # Start API server cluster
   pm2 start src/server.js -i max --name "applypilot-api"

   # Start background workers
   pm2 start src/worker.js -i 2 --name "applypilot-worker"
   ```
2. **Environment Secrets**: Never commit `.env` to version control. Store secrets in your deployment environment (e.g. AWS Parameter Store, Doppler, or Kubernetes Secrets).
3. **Queue Monitoring**: You can connect BullMQ dashboard tools (such as Bull-Board) to monitor queues and retry failed tasks through a visual UI.
