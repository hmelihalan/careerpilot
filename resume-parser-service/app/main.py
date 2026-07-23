"""FastAPI application for the CareerPilot resume parser service."""

import logging

from fastapi import Depends, FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import Settings, get_settings
from app.exceptions import (
    EmptyFileError,
    FileTooLargeError,
    InvalidPDFError,
    ResumeParserError,
    UnsupportedFileTypeError,
)
from app.models import ParseMetadata, ParseResumeResponse, ParseWarning
from app.pdf_extractor import PDFExtractionResult, extract_pdf_text
from app.text_cleaner import clean_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("resume_parser")

PDF_SIGNATURE = b"%PDF-"

app = FastAPI(
    title="CareerPilot Resume Parser Service",
    description=(
        "Extracts embedded text from uploaded resume PDFs. "
        "Does not perform OCR, section detection, skill extraction, "
        "or job matching."
    ),
    version="0.1.0",
)

_settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ResumeParserError)
async def handle_resume_parser_error(
    request: Request, exc: ResumeParserError
) -> JSONResponse:
    logger.warning("Resume parsing rejected: code=%s", exc.code)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    # Logged server-side only. The client never sees the exception type,
    # message, or traceback.
    logger.exception("Unexpected error while handling request")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing the request.",
            }
        },
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def _has_pdf_signature(content: bytes) -> bool:
    return content.lstrip()[:5] == PDF_SIGNATURE


def _validate_upload(filename: str | None, content: bytes, settings: Settings) -> None:
    if not content:
        raise EmptyFileError("The uploaded file is empty.")

    if len(content) > settings.max_upload_size_bytes:
        raise FileTooLargeError(
            "The uploaded file exceeds the maximum allowed size of "
            f"{settings.max_upload_size_mb} MB."
        )

    if not filename or not filename.lower().endswith(".pdf"):
        raise UnsupportedFileTypeError("Only PDF files are supported.")

    if not _has_pdf_signature(content):
        raise InvalidPDFError("The uploaded file is not a valid PDF.")


def _build_warnings(
    extraction: PDFExtractionResult, settings: Settings
) -> list[ParseWarning]:
    warnings: list[ParseWarning] = []

    page_count = extraction.page_count
    total_characters = sum(extraction.page_character_counts)
    low_character_pages = sum(
        1
        for count in extraction.page_character_counts
        if count < settings.ocr_min_characters_per_page
    )
    most_pages_are_low_text = page_count > 0 and low_character_pages > page_count / 2

    if page_count > 0 and (
        total_characters < settings.ocr_min_total_characters
        or most_pages_are_low_text
    ):
        warnings.append(
            ParseWarning(
                code="OCR_MAY_BE_REQUIRED",
                message=(
                    "The PDF contains little or no extractable text and may "
                    "be image-based."
                ),
                severity="warning",
            )
        )
    elif total_characters < settings.ocr_min_total_characters * 3:
        warnings.append(
            ParseWarning(
                code="VERY_LOW_TEXT_CONTENT",
                message="The PDF contains an unusually small amount of extractable text.",
                severity="info",
            )
        )

    if extraction.empty_page_count > 0:
        warnings.append(
            ParseWarning(
                code="EMPTY_PAGES_DETECTED",
                message=(
                    f"{extraction.empty_page_count} page(s) contained no "
                    "extractable text."
                ),
                severity="info",
            )
        )

    if page_count > settings.high_page_count_warning_threshold:
        warnings.append(
            ParseWarning(
                code="UNUSUALLY_HIGH_PAGE_COUNT",
                message="The PDF has an unusually high page count for a resume.",
                severity="info",
            )
        )

    return warnings


@app.post("/parse-resume", response_model=ParseResumeResponse)
async def parse_resume(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> ParseResumeResponse:
    content = await file.read()

    logger.info(
        "Received resume upload: filename=%s size_bytes=%d",
        file.filename,
        len(content),
    )

    _validate_upload(file.filename, content, settings)

    extraction = extract_pdf_text(content)
    cleaned_text = clean_text(extraction.raw_text)
    warnings = _build_warnings(extraction, settings)

    logger.info(
        "Parsed resume upload: filename=%s pages=%d duration_ms=%d warnings=%s",
        file.filename,
        extraction.page_count,
        extraction.extraction_duration_ms,
        [warning.code for warning in warnings],
    )

    return ParseResumeResponse(
        filename=file.filename or "resume.pdf",
        raw_text=extraction.raw_text,
        cleaned_text=cleaned_text,
        page_count=extraction.page_count,
        character_count=len(cleaned_text),
        word_count=len(cleaned_text.split()),
        warnings=warnings,
        metadata=ParseMetadata(
            file_size_bytes=len(content),
            empty_page_count=extraction.empty_page_count,
            extraction_duration_ms=extraction.extraction_duration_ms,
        ),
    )
