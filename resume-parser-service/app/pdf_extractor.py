"""Embedded-text extraction from PDF bytes using PyMuPDF.

This module never performs OCR and never writes the uploaded file to disk.
It only reads whatever text layer is already embedded in the PDF.
"""

import time
from dataclasses import dataclass, field

import fitz  # PyMuPDF

from app.exceptions import CorruptedPDFError, EncryptedPDFError

# Pages are joined with a blank line so downstream consumers can still see
# page boundaries without a special sentinel character.
PAGE_SEPARATOR = "\n\n"


@dataclass
class PDFExtractionResult:
    raw_text: str
    page_count: int
    empty_page_count: int
    extraction_duration_ms: int
    page_character_counts: list[int] = field(default_factory=list)


def extract_pdf_text(pdf_bytes: bytes) -> PDFExtractionResult:
    """Extract embedded text from PDF bytes, page by page.

    Raises:
        EncryptedPDFError: the PDF is password-protected.
        CorruptedPDFError: the PDF cannot be opened or read.
    """

    start = time.perf_counter()

    try:
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:  # PyMuPDF raises varied errors for bad input.
        raise CorruptedPDFError(
            "The uploaded file could not be read as a PDF."
        ) from exc

    try:
        if document.is_encrypted and not document.authenticate(""):
            raise EncryptedPDFError(
                "The PDF is password-protected and cannot be parsed."
            )

        if document.page_count == 0:
            raise CorruptedPDFError("The PDF does not contain any pages.")

        page_texts: list[str] = []
        page_character_counts: list[int] = []
        empty_page_count = 0

        for page in document:
            try:
                text = page.get_text("text") or ""
            except Exception as exc:
                raise CorruptedPDFError(
                    "The uploaded file could not be read as a PDF."
                ) from exc

            stripped_length = len(text.strip())
            page_texts.append(text)
            page_character_counts.append(stripped_length)

            if stripped_length == 0:
                empty_page_count += 1

        raw_text = PAGE_SEPARATOR.join(page_texts).strip()
        duration_ms = max(0, round((time.perf_counter() - start) * 1000))

        return PDFExtractionResult(
            raw_text=raw_text,
            page_count=document.page_count,
            empty_page_count=empty_page_count,
            extraction_duration_ms=duration_ms,
            page_character_counts=page_character_counts,
        )
    finally:
        document.close()
