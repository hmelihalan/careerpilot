import io

import fitz
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_pdf_bytes(page_texts: list[str]) -> bytes:
    """Build a minimal, real PDF in memory using PyMuPDF."""

    document = fitz.open()
    try:
        for text in page_texts:
            page = document.new_page()
            if text:
                page.insert_text((72, 72), text)
        return document.tobytes()
    finally:
        document.close()


def test_health_check() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_parse_resume_returns_expected_schema() -> None:
    pdf_bytes = make_pdf_bytes(["Jane Doe\nSoftware Engineer\njane@example.com"])

    response = client.post(
        "/parse-resume",
        files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 200
    body = response.json()

    assert body["filename"] == "resume.pdf"
    assert body["page_count"] == 1
    assert "Jane Doe" in body["raw_text"]
    assert "Jane Doe" in body["cleaned_text"]
    assert body["character_count"] == len(body["cleaned_text"])
    assert body["word_count"] == len(body["cleaned_text"].split())
    assert isinstance(body["warnings"], list)
    assert body["metadata"]["file_size_bytes"] == len(pdf_bytes)
    assert body["metadata"]["empty_page_count"] == 0
    assert body["metadata"]["extraction_duration_ms"] >= 0


def test_parse_resume_flags_ocr_warning_for_near_empty_pdf() -> None:
    pdf_bytes = make_pdf_bytes(["", "", ""])

    response = client.post(
        "/parse-resume",
        files={"file": ("scanned.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 200
    body = response.json()
    warning_codes = [warning["code"] for warning in body["warnings"]]

    assert "OCR_MAY_BE_REQUIRED" in warning_codes
    assert "EMPTY_PAGES_DETECTED" in warning_codes


def test_parse_resume_rejects_corrupted_pdf() -> None:
    corrupted_bytes = b"%PDF-1.4\n" + b"not a real cross reference table" * 10

    response = client.post(
        "/parse-resume",
        files={"file": ("resume.pdf", corrupted_bytes, "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "CORRUPTED_PDF"


def test_parse_resume_rejects_encrypted_pdf() -> None:
    document = fitz.open()
    page = document.new_page()
    page.insert_text((72, 72), "Confidential resume contents")

    buffer = io.BytesIO()
    document.save(
        buffer,
        encryption=fitz.PDF_ENCRYPT_AES_256,
        owner_pw="owner-secret",
        user_pw="user-secret",
    )
    document.close()

    response = client.post(
        "/parse-resume",
        files={"file": ("resume.pdf", buffer.getvalue(), "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ENCRYPTED_PDF"
