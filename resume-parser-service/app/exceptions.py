"""Typed exceptions for the resume parser service.

Every exception carries an HTTP status code and a machine-readable error
code so the FastAPI error handler can return sanitized JSON without ever
exposing a Python traceback to the client.
"""


class ResumeParserError(Exception):
    """Base class for all expected, user-facing parsing errors."""

    status_code: int = 400
    code: str = "PARSE_ERROR"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class EmptyFileError(ResumeParserError):
    status_code = 400
    code = "EMPTY_FILE"


class UnsupportedFileTypeError(ResumeParserError):
    status_code = 415
    code = "UNSUPPORTED_FILE_TYPE"


class FileTooLargeError(ResumeParserError):
    status_code = 413
    code = "FILE_TOO_LARGE"


class InvalidPDFError(ResumeParserError):
    status_code = 400
    code = "INVALID_PDF"


class EncryptedPDFError(ResumeParserError):
    status_code = 400
    code = "ENCRYPTED_PDF"


class CorruptedPDFError(ResumeParserError):
    status_code = 400
    code = "CORRUPTED_PDF"
