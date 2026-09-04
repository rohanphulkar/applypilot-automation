# ApplyPilot — Full Stack Job Application Automation Platform

ApplyPilot is a complete, production-ready, full-stack platform designed to automate the entire job application lifecycle:

1. **Intelligent Extraction**: Uses **OpenAI** to extract structured job details, required skills, salary, experience, and recruiter contact emails from raw job descriptions.
2. **Resume Tailoring**: Communicates with the **Resume API** to generate ATS 92+ optimized PDF and DOCX resumes.
3. **Executive Cover Letter**: Crafts role-specific, professional cover letters using **OpenAI**.
4. **RFC 5322 MIME Compilation**: Assembles the exact MIME email with resume attachment and stable Message-ID.
5. **Universal Outbound Email Sending**: Dispatches the email to recruiters via any configured **SMTP** provider (Gmail, Outlook, Spacemail, Zoho, Custom SMTP).
6. **IMAP Sent Folder Synchronization**: Appends the **exact same raw MIME email** into the user's **Sent Mailbox** via **IMAP** with dynamic folder discovery.
7. **Strict Idempotency & Safe Retries**: Independently tracks `smtpStatus` vs `sentFolderStatus`. Retrying an application whose IMAP failed will **never resend duplicate emails** to recruiters.
8. **Duolingo Dark Theme UI**: A gamified, responsive dashboard built with **React 19**, **Vite**, **TailwindCSS**, **TanStack Query**, **Zustand**, and **Recharts**, featuring signature 3D tactile buttons, gamified streak/gems/hearts metrics, and animated lesson-path progress tracking.

---

## 🐳 Docker Deployment (Single-Command Setup)

Run the entire platform (**MongoDB**, **Redis**, **Resume Tailoring API**, **Backend Express API**, **BullMQ Background Worker**, and **Frontend with Nginx Gateway**) with a single command:

```bash
docker compose up --build -d
```

### Accessing the Platform:
- **Web Application & UI (Nginx Gateway)**: [http://localhost](http://localhost) (or [http://localhost:3000](http://localhost:3000))
- **Backend REST API**: [http://localhost:5000](http://localhost:5000)
- **Resume Generator API**: [http://localhost:8001](http://localhost:8001)
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`

---

## 📁 Architecture & Services Breakdown

```text
applypilot/
├── docker-compose.yml            # Unified single-file container orchestration
├── .env                          # Unified platform environment variables
│
├── frontend/                     # React 19 + Vite + Duolingo Dark Theme
│   ├── src/                      # UI Components, Pages, Layouts, Zustand store
│   ├── nginx.conf                # Nginx SPA router & API reverse proxy
│   └── Dockerfile                # Multi-stage build (Node -> Nginx)
│
├── backend/                      # Node.js + Express + BullMQ + Mongoose
│   ├── src/
│   │   ├── config/               # Centralized configuration
│   │   ├── controllers/          # Dashboard, Jobs, Tasks, Settings controllers
│   │   ├── models/               # Mongoose Job schema & timeline
│   │   ├── queues/               # BullMQ queue & Redis client
│   │   ├── services/             # OpenAI, Universal Email, Resume Client
│   │   ├── workers/              # Idempotent BullMQ pipeline worker
│   │   ├── server.js             # API server entrypoint
│   │   └── worker.js             # Dedicated worker entrypoint
│   └── Dockerfile
│
├── resume-api/                   # Python FastAPI + pdflatex + ATS Engine
│   ├── routers/                  # /api/resume/tailor & /api/jobs
│   ├── services/                 # LaTeX compiler, DOCX, S3 presigned URLs
│   ├── main.py
│   └── Dockerfile
│
└── media/                        # Generated PDF/DOCX local storage
```

---

## 🚀 Local Development Setup

### 1. Backend API & Worker
```bash
cd backend
npm install
npm run dev           # Starts API server on http://localhost:5000
npm run worker:dev    # Starts BullMQ worker in a separate terminal
```

### 2. Resume Generator API (Python)
```bash
cd resume-api
uv run uvicorn main:app --host 0.0.0.0 --port 8001
```

### 3. Frontend Dashboard
```bash
cd frontend
npm install
npm run dev           # Starts Vite dev server on http://localhost:5173
```

---

## 📡 REST API Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Subsystem health check (MongoDB, Redis, OpenAI) |
| `GET` | `/api/dashboard` | Dashboard metrics, status distribution, and activity feeds |
| `POST` | `/api/jobs` | Enqueue job description (Returns immediately with `jobId`) |
| `GET` | `/api/jobs` | List applications (`?search=`, `?status=`, `?sort=`, `?page=`, `?limit=`) |
| `GET` | `/api/jobs/:id` | Full application lifecycle state, extracted details, and timeline logs |
| `POST` | `/api/jobs/:id/retry` | Idempotent retry of a failed application |
| `DELETE` | `/api/jobs/:id` | Delete application record |
| `GET` | `/api/tasks` | BullMQ queue tasks inspector (`waiting`, `active`, `completed`, `failed`) |
| `GET` | `/api/settings` | System diagnostics & provider configuration overview |
| `POST` | `/api/resume/tailor` | Generate ATS-optimized tailored resume PDF & DOCX |

---

## 💡 Universal Email Configuration Guide

### 1. Gmail
- **`EMAIL_USER`**: `your_name@gmail.com`
- **`EMAIL_PASS`**: 16-character [Google App Password](https://myaccount.google.com/apppasswords)
- **`SMTP_HOST`**: `smtp.gmail.com` | **`SMTP_PORT`**: `465` | **`SMTP_SECURE`**: `true`
- **`IMAP_HOST`**: `imap.gmail.com` | **`IMAP_PORT`**: `993` | **`IMAP_SECURE`**: `true`

### 2. Microsoft Outlook / Office 365
- **`EMAIL_USER`**: `your_name@outlook.com`
- **`EMAIL_PASS`**: App Password or Account Password
- **`SMTP_HOST`**: `smtp.office365.com` | **`SMTP_PORT`**: `587` | **`SMTP_SECURE`**: `false`
- **`IMAP_HOST`**: `outlook.office365.com` | **`IMAP_PORT`**: `993` | **`IMAP_SECURE`**: `true`

### 3. Spacemail
- **`EMAIL_USER`**: `your_name@spacemail.com`
- **`EMAIL_PASS`**: Your Spacemail Password
- **`SMTP_HOST`**: `mail.spacemail.com` | **`SMTP_PORT`**: `587` | **`SMTP_SECURE`**: `false`
- **`IMAP_HOST`**: `mail.spacemail.com` | **`IMAP_PORT`**: `993` | **`IMAP_SECURE`**: `true`

---

## 🔒 Reliability & Duplicate Email Prevention

If the IMAP Sent folder synchronization fails after SMTP has already sent the email:
1. `email.smtpStatus` is stored as `"SENT"`.
2. `email.sentFolderStatus` is marked as `"FAILED"`.
3. The BullMQ worker retries using exponential backoff.
4. On retry, the worker detects that `smtpStatus === "SENT"` and **skips the SMTP stage**, only attempting the missing IMAP Sent-folder operation.
5. Recruiters will **never receive duplicate emails**.
