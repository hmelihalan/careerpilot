"""Typed request/response models for the resume parser service."""

from typing import Literal

from pydantic import BaseModel, Field


class ParseWarning(BaseModel):
    code: str
    message: str
    severity: Literal["info", "warning", "error"]


class ParseMetadata(BaseModel):
    file_size_bytes: int
    empty_page_count: int
    extraction_duration_ms: int


class ParseResumeResponse(BaseModel):
    filename: str
    raw_text: str
    cleaned_text: str
    page_count: int
    character_count: int
    word_count: int
    warnings: list[ParseWarning] = Field(default_factory=list)
    metadata: ParseMetadata


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail
