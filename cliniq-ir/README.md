# ClinIQ — Clinical Records Explorer

A standalone Week 5 Information Retrieval assignment with a **React + TypeScript frontend**, a **FastAPI backend**, and a **SQLite database with FTS5 keyword search**. This is a new educational project, created after the original ClinIQ repository was unavailable. Every clinical record is fictional. It does not generate diagnoses.

## Start on Windows

Requires Python 3.12+ with SQLite FTS5 and Node.js 22.12+ (Node 24 also works).

**Double-click `Run ClinIQ.bat`** in this folder. It installs missing dependencies on the first launch, starts both services, and opens your browser after they are ready. The first launch requires internet access. Keep its terminal open while using ClinIQ; press Ctrl+C to stop both services. Startup errors remain visible in the terminal.

From this `cliniq-ir` folder:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
powershell -ExecutionPolicy Bypass -File scripts\start.ps1
```

Open **http://127.0.0.1:5173**. Keep the start terminal open; Ctrl+C stops both services. The backend and frontend are separate processes on ports 8000 and 5173. No cloud credentials or API keys are needed. API documentation: http://127.0.0.1:8000/docs.

If PowerShell scripts are restricted, the explicit process-local `-ExecutionPolicy Bypass` above avoids changing the machine policy. `npm.cmd` also works without loading the restricted `npm.ps1` wrapper.

### Run in two terminals instead

After setup, in terminal 1:

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

In terminal 2, from the project root:

```powershell
cd frontend
npm.cmd run dev
```

On macOS/Linux: create `.venv` with `python3 -m venv .venv`, install `backend/requirements-lock.txt`, run `.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --no-access-log`, and run `npm ci && npm run dev` in `frontend`.

## Demo accounts

All three use the password **`DemoClinic!2026`**.

| Email | Role | Collection |
| --- | --- | --- |
| `doctor@cliniq.demo` | Doctor | Northstar: 7 patients, 8 encounters, 23 documents |
| `doctor@river.demo` | Doctor | Riverside: 2 patients, 2 encounters, 3 documents |
| `staff@cliniq.demo` | Receptionist | Can sign in; all clinical API operations return 403 |

Use **Northstar** for the complete instructor demonstration. Riverside demonstrates clinic isolation and a document without related records.

## What to demonstrate

1. Sign in → Clinical Records Explorer (home, search, category cards, recent document list).
2. **Start with a patient** → **Amina Rahman** → **Recurring headache** → **Consultation Notes**.
3. Open **Headache consultation note** to preview its content.
4. Follow a **Related documents** link. Use clickable breadcrumbs to return to the encounter.
5. Open **All Documents**, search `headache`, filter by category, sort, and page through results.
6. Search `noexistingsampleword` for no results; select **Other Clinical Documents** for an empty category.
7. Browse **Zara Malik** for no encounters and **Hassan Ali → Scheduled review** for no documents.
8. Sign out, switch clinic, and verify that Northstar document URLs are inaccessible.

## Verification commands

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe -m ruff check .
..\.venv\Scripts\python.exe -m ruff format --check .
cd ..\frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npx.cmd playwright install chromium --no-shell
npm.cmd run test:e2e
```

Browser tests require the API on port 8000. Playwright starts Vite automatically if port 5173 is free. API tests use temporary databases and never modify the demo database. Browser tests only read records and create/revoke demo sessions.

On the implementation machine, the completed Chromium download was moved to `D:\cliniq-ir-test-cache` after the C: drive filled. To reuse it without another download, run `$env:PLAYWRIGHT_BROWSERS_PATH = 'D:\cliniq-ir-test-cache'` before `npm.cmd run test:e2e`. This path is only a test cache; the application does not depend on it.

## Data and security scope

- `backend/data/demo.json` is the checked-in, fictional source dataset. `backend/data/cliniq.sqlite3` is created once at first startup and ignored by version control.
- Server-side sessions use HttpOnly, SameSite=Strict cookies; passwords use PBKDF2-HMAC-SHA256. Every clinical endpoint requires a doctor and derives the clinic from the authenticated session.
- Composite foreign keys preserve clinic/patient/encounter relationships. FTS queries and filters are parameterized. Search syntax is constructed from normalized, quoted words; user-supplied operators cannot execute.
- No uploaded files or public clinical document URLs exist. Clinical API responses have `Cache-Control: no-store`; launch commands disable request access logs.
- This is a local classroom demo with known credentials. Production deployment, real medical data, MFA, account administration, audit trails, login throttling, HTTPS hosting, and compliance certification are outside this assignment.
- For a later HTTPS deployment, configure `CLINIQ_SECURE_COOKIE=1` and an exact comma-separated `CLINIQ_ALLOWED_ORIGINS`. For a different SQLite path, set `CLINIQ_DB_PATH`. Do not deploy the seeded demo accounts as production accounts.
- The interface uses optional Google Fonts, with local sans-serif fallbacks. The app itself works without external services after dependencies are installed.

See **[docs/information-retrieval-implementation.md](docs/information-retrieval-implementation.md)** for the academic explanation, architecture, exact file mapping, API contract, and executed test evidence.
