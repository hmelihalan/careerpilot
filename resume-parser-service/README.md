# CareerPilot Resume Parser Service

A minimal, standalone FastAPI service that extracts embedded text from
uploaded resume PDFs and returns it as JSON. It is designed to be called
from the CareerPilot Next.js backend as a separate microservice.

## What this service does

- Accepts a PDF upload over HTTP (`multipart/form-data`).
- Validates the upload (file presence, size, extension, PDF signature).
- Extracts embedded (already-selectable) text from the PDF using PyMuPDF.
- Conservatively cleans that text (whitespace/line-ending normalization only).
- Detects — but does not act on — signals that a PDF may need OCR.
- Returns raw text, cleaned text, and metadata as typed JSON.

## What this service intentionally does NOT do

This is a first, minimal slice. It deliberately does not:

- Detect resume sections (Experience, Education, Skills, etc.)
- Extract skills, job titles, companies, or dates
- Compare a resume against a job description
- Calculate a match score or an ATS score
- Perform OCR on image-based/scanned PDFs
- Use spaCy, NLTK, transformers, sentence-transformers, or any ML/NLP model
- Call any external API or LLM
- Persist uploaded files or resume content to a database or disk
- Require authentication
- Serve a frontend

These are all explicitly out of scope for this task and are expected to be
built as later, separate extensions.

## Project structure

```text
resume-parser-service/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI app, routes, validation, warnings
│   ├── models.py          # Pydantic request/response models
│   ├── config.py          # Environment-driven settings
│   ├── pdf_extractor.py   # PyMuPDF-based text extraction
│   ├── text_cleaner.py    # Conservative whitespace cleaning
│   └── exceptions.py      # Typed, sanitized error classes
├── tests/
│   ├── test_text_cleaner.py
│   ├── test_pdf_validation.py
│   └── test_parse_endpoint.py
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Setup (Windows PowerShell)

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload --port 8000
```

## Setup (macOS/Linux)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest
uvicorn app.main:app --reload --port 8000
```

## Environment variables

Copy `.env.example` to `.env` and adjust as needed. All variables have
sensible defaults if `.env` is absent.

| Variable | Default | Purpose |
|---|---|---|
| `MAX_UPLOAD_SIZE_MB` | `10` | Maximum accepted upload size in megabytes |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allowlist |
| `OCR_MIN_TOTAL_CHARACTERS` | `200` | Below this total character count, the PDF is flagged as possibly needing OCR |
| `OCR_MIN_CHARACTERS_PER_PAGE` | `40` | A page below this character count counts as "low text" for the OCR heuristic |
| `HIGH_PAGE_COUNT_WARNING_THRESHOLD` | `12` | PDFs with more pages than this are flagged as unusually long for a resume |

## Running tests

```bash
pytest
```

Tests are fully self-contained: PDF fixtures (including a real, an
encrypted, and a near-empty PDF) are generated in-memory with PyMuPDF at
test time. No external files, network access, or fixtures on disk are
required.

## API

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /parse-resume`

`multipart/form-data` with a single field named `file`, containing a PDF.

Example request:

```bash
curl -X POST "http://localhost:8000/parse-resume" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@resume.pdf;type=application/pdf"
```

Example response:

```json
{
  "filename": "resume.pdf",
  "raw_text": "Original extracted text...",
  "cleaned_text": "Cleaned extracted text...",
  "page_count": 2,
  "character_count": 4250,
  "word_count": 638,
  "warnings": [],
  "metadata": {
    "file_size_bytes": 182430,
    "empty_page_count": 0,
    "extraction_duration_ms": 47
  }
}
```

`character_count` and `word_count` are computed from `cleaned_text`.

### Error responses

Errors are returned as sanitized JSON — never a Python traceback:

```json
{ "error": { "code": "INVALID_PDF", "message": "The uploaded file is not a valid PDF." } }
```

| Status | Code | Meaning |
|---|---|---|
| 400 | `EMPTY_FILE` | The uploaded file was empty |
| 400 | `INVALID_PDF` | The file does not start with a valid PDF signature |
| 400 | `ENCRYPTED_PDF` | The PDF is password-protected |
| 400 | `CORRUPTED_PDF` | The PDF could not be opened or read |
| 413 | `FILE_TOO_LARGE` | The upload exceeded `MAX_UPLOAD_SIZE_MB` |
| 415 | `UNSUPPORTED_FILE_TYPE` | The file is not a `.pdf` |
| 422 | (FastAPI default) | The request itself is malformed (e.g. missing `file` field) |
| 500 | `INTERNAL_SERVER_ERROR` | An unexpected server error occurred |

## OCR warning behavior

This service never performs OCR. Instead, it inspects the extracted text
and flags PDFs that likely need OCR so a caller can decide what to do next
(e.g. route to a separate OCR pipeline).

- `OCR_MAY_BE_REQUIRED` (`warning`): total extracted text is below
  `OCR_MIN_TOTAL_CHARACTERS`, or more than half of the pages are below
  `OCR_MIN_CHARACTERS_PER_PAGE`. This typically means the PDF is
  image-based or scanned.
- `VERY_LOW_TEXT_CONTENT` (`info`): text was extracted, and it isn't low
  enough to suspect OCR is required, but it's still sparse relative to a
  typical resume.
- `EMPTY_PAGES_DETECTED` (`info`): one or more individual pages had no
  extractable text at all, even if other pages were fine.
- `UNUSUALLY_HIGH_PAGE_COUNT` (`info`): the PDF has more pages than
  `HIGH_PAGE_COUNT_WARNING_THRESHOLD`, which is unusual for a resume.

Thresholds are deliberately conservative so a normal, short, text-based
one-page resume never triggers `OCR_MAY_BE_REQUIRED`. Warnings never cause
the request to fail as long as some usable text was extracted.

## Privacy behavior

- The uploaded PDF is processed entirely in memory; it is never written to
  disk and never persisted to a database.
- No resume content, extracted text, or uploaded bytes are ever logged.
  Logs only include filename, file size, page count, duration, and warning
  codes.
- No resume content is sent to any external service, API, or LLM.
- Error messages returned to the client are sanitized and never include a
  stack trace or internal implementation detail.
- A configurable maximum upload size is enforced (`MAX_UPLOAD_SIZE_MB`).

## Future integration with CareerPilot

This service is meant to be called from the CareerPilot Next.js backend
(e.g. from a server action or API route) as soon as a user uploads a
resume: the backend would forward the PDF bytes to `POST /parse-resume`,
store `cleaned_text` (and relevant metadata) against the `Resume` record,
and set `parseStatus` accordingly (including using the `OCR_MAY_BE_REQUIRED`
warning to route to `OCR_REQUIRED`).

## Future extension point: resume–job matching

`cleaned_text` returned by this service is intended to be the input to a
later, separate resume–job matching component (skills extraction, semantic
similarity against a job description, match scoring, etc.). None of that
logic lives here by design — this service's only job is reliable,
conservative text extraction.
