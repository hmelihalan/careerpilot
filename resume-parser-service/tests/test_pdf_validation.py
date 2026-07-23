from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app

client = TestClient(app)


def teardown_function() -> None:
    app.dependency_overrides.clear()


def test_missing_file_returns_422() -> None:
    response = client.post("/parse-resume")

    assert response.status_code == 422


def test_empty_upload_is_rejected() -> None:
    response = client.post(
        "/parse-resume",
        files={"file": ("resume.pdf", b"", "application/pdf")},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "EMPTY_FILE"


def test_non_pdf_extension_is_rejected() -> None:
    response = client.post(
        "/parse-resume",
        files={"file": ("resume.txt", b"hello world", "text/plain")},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_fake_pdf_with_pdf_extension_is_rejected() -> None:
    response = client.post(
        "/parse-resume",
        files={
            "file": ("resume.pdf", b"this is not really a pdf file", "application/pdf")
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_PDF"


def test_oversized_upload_is_rejected() -> None:
    def tiny_limit_settings() -> Settings:
        return Settings(max_upload_size_mb=0)

    app.dependency_overrides[get_settings] = tiny_limit_settings

    response = client.post(
        "/parse-resume",
        files={"file": ("resume.pdf", b"%PDF-1.4\n%mock content", "application/pdf")},
    )

    assert response.status_code == 413
    assert response.json()["error"]["code"] == "FILE_TOO_LARGE"
