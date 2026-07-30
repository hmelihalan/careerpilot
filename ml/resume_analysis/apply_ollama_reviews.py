"""Safely apply Ollama review patches to fixed resume dataset splits.

The source datasets use the Label Studio task/prediction shape discovered in this
repository. Review files are patches keyed by top-level ``document_id``; they
are deliberately not accepted as replacement task records.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import sys
import unicodedata
from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

JsonObject = dict[str, Any]
SplitDocuments = dict[str, list[JsonObject]]
SPLIT_NAMES = ("train", "validation", "test")
OPERATION_TYPES = (
    "delete_span_ids",
    "add_spans",
    "delete_relation_ids",
    "add_relations",
)
REVIEW_PAYLOAD_FIELDS = OPERATION_TYPES + (
    "review_complete",
    "unresolved_reason_codes",
)
OBSERVED_ALLOWED_LABELS = frozenset(
    {
        "ACCOUNTING_SKILL",
        "ACCOUNTING_SOFTWARE",
        "AFFILIATIONS",
        "AFFILIATION_NAME",
        "AWARDS",
        "AWARD_NAME",
        "CERTIFICATIONS",
        "CERTIFICATION_BLOCK",
        "CERTIFICATION_EXPIRY_DATE",
        "CERTIFICATION_ISSUE_DATE",
        "CERTIFICATION_ISSUER",
        "CERTIFICATION_NAME",
        "CLOUD_PLATFORM",
        "COMPANY",
        "CONTACT",
        "CONTACT_LOCATION",
        "COURSEWORK",
        "CREDENTIAL_URL",
        "DATABASE",
        "DATA_SCIENCE_SKILL",
        "DEGREE",
        "DESIGN_TOOL",
        "DEVOPS_TOOL",
        "EDUCATION",
        "EDUCATION_BLOCK",
        "EDUCATION_END_DATE",
        "EDUCATION_LOCATION",
        "EDUCATION_START_DATE",
        "EMAIL",
        "EMPLOYMENT_TYPE",
        "EXPERIENCE",
        "EXPERIENCE_BLOCK",
        "FIELD_OF_STUDY",
        "FINANCE_SKILL",
        "FRAMEWORK",
        "GITHUB_URL",
        "GPA",
        "HONOR",
        "INSTITUTION",
        "JOB_TITLE",
        "LANGUAGES",
        "LANGUAGE_PROFICIENCY",
        "LIBRARY",
        "LINKEDIN_URL",
        "MACHINE_LEARNING_SKILL",
        "OFFICE_SOFTWARE",
        "OTHER",
        "OTHER_URL",
        "PERSON_NAME",
        "PHONE",
        "PORTFOLIO_URL",
        "PROGRAMMING_LANGUAGE",
        "PROJECTS",
        "PROJECT_BLOCK",
        "PROJECT_DESCRIPTION",
        "PROJECT_END_DATE",
        "PROJECT_MANAGEMENT_TOOL",
        "PROJECT_NAME",
        "PROJECT_START_DATE",
        "PROJECT_TECHNOLOGY",
        "PUBLICATIONS",
        "PUBLICATION_TITLE",
        "REFERENCES",
        "REFERENCE_ENTRY",
        "SKILLS",
        "SOFT_SKILL",
        "SPOKEN_LANGUAGE",
        "SUMMARY",
        "SUMMARY_TEXT",
        "TECHNICAL_SKILL",
        "VOLUNTEERING",
        "WORK_ACHIEVEMENT",
        "WORK_DATE_RANGE",
        "WORK_DESCRIPTION",
        "WORK_END_DATE",
        "WORK_LOCATION",
        "WORK_START_DATE",
    }
)
OBSERVED_ALLOWED_RELATION_TYPES = frozenset(
    {
        "AWARDED_BY",
        "BELONGS_TO",
        "HAS_END_DATE",
        "HAS_FIELD",
        "HAS_LOCATION",
        "HAS_PROFICIENCY",
        "HAS_START_DATE",
        "ISSUED_BY",
        "USES",
    }
)
OUTPUT_FILENAMES = {
    "train_reviewed.jsonl",
    "validation_reviewed.jsonl",
    "test_reviewed.jsonl",
    "train_clean.jsonl",
    "validation_clean.jsonl",
    "test_clean.jsonl",
    "rejected_review_operations.jsonl",
    "document_review_status.jsonl",
    "review_merge_report.json",
}


class ReviewMergeError(ValueError):
    """Raised when structural input problems make a safe merge impossible."""


@dataclass(frozen=True)
class InputPaths:
    train: Path
    validation: Path
    test: Path
    reviews: Path


@dataclass
class MergeArtifacts:
    reviewed: SplitDocuments
    clean: SplitDocuments
    rejected_operations: list[JsonObject]
    document_statuses: list[JsonObject]
    report: JsonObject


@dataclass
class MergeCounters:
    requested: Counter[str] = field(default_factory=Counter)
    applied: Counter[str] = field(default_factory=Counter)
    rejected: Counter[str] = field(default_factory=Counter)
    rejection_reasons: Counter[str] = field(default_factory=Counter)
    added_spans_by_label: Counter[str] = field(default_factory=Counter)
    deleted_spans_by_label: Counter[str] = field(default_factory=Counter)
    added_relations_by_type: Counter[str] = field(default_factory=Counter)
    deleted_relations_by_type: Counter[str] = field(default_factory=Counter)
    cleanup_relations_by_type: Counter[str] = field(default_factory=Counter)
    cleanup_duplicate_spans_by_label: Counter[str] = field(default_factory=Counter)
    rewired_duplicate_span_relations_by_type: Counter[str] = field(
        default_factory=Counter
    )
    cleanup_duplicate_span_relations_by_type: Counter[str] = field(
        default_factory=Counter
    )


@dataclass
class ReviewOutcome:
    requested: Counter[str] = field(default_factory=Counter)
    applied: Counter[str] = field(default_factory=Counter)
    rejected: Counter[str] = field(default_factory=Counter)
    rejection_reasons: Counter[str] = field(default_factory=Counter)
    automatic_relation_cleanups: list[JsonObject] = field(default_factory=list)


def _stable_json(value: Any, *, pretty: bool = False) -> str:
    if pretty:
        return (
            json.dumps(
                value,
                allow_nan=False,
                ensure_ascii=False,
                indent=2,
                sort_keys=True,
            )
            + "\n"
        )
    return (
        json.dumps(
            value,
            allow_nan=False,
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        + "\n"
    )


def _counter_dict(counter: Mapping[str, int]) -> dict[str, int]:
    return {key: counter[key] for key in sorted(counter)}


def _as_nonempty_string(value: Any) -> str | None:
    return value if isinstance(value, str) and value.strip() else None


def _is_integer(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def normalize_resume_text(text: str) -> str:
    """Normalize text only for leakage detection, never for offset matching."""

    normalized = unicodedata.normalize("NFKC", text)
    return " ".join(normalized.split()).casefold()


def _reject_nonfinite_json_constant(value: str) -> None:
    raise ReviewMergeError(
        f"Non-standard JSON numeric constant is not allowed: {value}"
    )


def load_json_records(path: Path, *, kind: str) -> list[JsonObject]:
    """Load either a JSON array or JSONL file with actionable parse errors."""

    if not path.is_file():
        raise ReviewMergeError(f"{kind} input does not exist or is not a file: {path}")

    try:
        with path.open("r", encoding="utf-8-sig") as handle:
            first_character = ""
            while True:
                character = handle.read(1)
                if not character:
                    break
                if not character.isspace():
                    first_character = character
                    break
            handle.seek(0)

            if first_character == "[":
                parsed = json.load(
                    handle, parse_constant=_reject_nonfinite_json_constant
                )
                if not isinstance(parsed, list):
                    raise ReviewMergeError(f"{kind} JSON root must be an array: {path}")
                records = parsed
            else:
                records = []
                for line_number, line in enumerate(handle, start=1):
                    if not line.strip():
                        continue
                    try:
                        records.append(
                            json.loads(
                                line,
                                parse_constant=_reject_nonfinite_json_constant,
                            )
                        )
                    except json.JSONDecodeError as error:
                        raise ReviewMergeError(
                            f"Invalid JSON in {kind} file {path} at line "
                            f"{line_number}: {error.msg}"
                        ) from error
    except UnicodeDecodeError as error:
        raise ReviewMergeError(f"{kind} input is not valid UTF-8: {path}") from error
    except json.JSONDecodeError as error:
        raise ReviewMergeError(
            f"Invalid JSON in {kind} file {path} at line {error.lineno}, "
            f"column {error.colno}: {error.msg}"
        ) from error

    for index, record in enumerate(records):
        if not isinstance(record, dict):
            raise ReviewMergeError(
                f"{kind} record {index} in {path} must be a JSON object"
            )
    return records


def _candidate_files(repository_root: Path, output_dir: Path | None) -> list[Path]:
    candidates: list[Path] = []
    resolved_output = output_dir.resolve() if output_dir else None
    for path in repository_root.rglob("*"):
        if not path.is_file() or path.suffix.casefold() not in {".json", ".jsonl"}:
            continue
        if "data" not in {part.casefold() for part in path.parts}:
            continue
        if path.name in OUTPUT_FILENAMES:
            continue
        if resolved_output and resolved_output in path.resolve().parents:
            continue
        candidates.append(path)
    return sorted(candidates, key=lambda item: item.as_posix().casefold())


def _choose_discovered_file(kind: str, candidates: Sequence[Path]) -> Path:
    if kind == "train":
        matches = [path for path in candidates if path.stem.casefold() == "train"]
    elif kind == "validation":
        matches = [
            path
            for path in candidates
            if path.stem.casefold() in {"validation", "valid", "val", "dev"}
        ]
    elif kind == "test":
        matches = [path for path in candidates if path.stem.casefold() == "test"]
    else:
        matches = [
            path
            for path in candidates
            if "ollama" in path.stem.casefold()
            and (
                "review" in path.stem.casefold() or "validated" in path.stem.casefold()
            )
        ]

    if not matches:
        raise ReviewMergeError(
            f"Could not discover a {kind} input under a data directory. "
            f"Pass --{kind} explicitly."
        )
    if len(matches) > 1:
        rendered = ", ".join(str(path) for path in matches)
        raise ReviewMergeError(
            f"Multiple ambiguous {kind} inputs were found: {rendered}. "
            f"Pass --{kind} explicitly."
        )
    return matches[0]


def resolve_input_paths(
    *,
    repository_root: Path,
    output_dir: Path,
    train: Path | None,
    validation: Path | None,
    test: Path | None,
    reviews: Path | None,
) -> InputPaths:
    candidates = _candidate_files(repository_root, output_dir)
    return InputPaths(
        train=train or _choose_discovered_file("train", candidates),
        validation=validation or _choose_discovered_file("validation", candidates),
        test=test or _choose_discovered_file("test", candidates),
        reviews=reviews or _choose_discovered_file("reviews", candidates),
    )


def _task_data(document: Mapping[str, Any], location: str) -> Mapping[str, Any]:
    data = document.get("data")
    if not isinstance(data, dict):
        raise ReviewMergeError(f"{location} is missing required object field data")
    return data


def document_id(document: Mapping[str, Any], location: str = "document") -> str:
    data = _task_data(document, location)
    value = _as_nonempty_string(data.get("document_id"))
    if value is None:
        raise ReviewMergeError(
            f"{location} is missing required non-empty data.document_id"
        )
    return value


def document_text(document: Mapping[str, Any], location: str = "document") -> str:
    data = _task_data(document, location)
    value = data.get("text")
    if not isinstance(value, str):
        raise ReviewMergeError(f"{location} is missing required string data.text")
    return value


def _annotation_results(document: JsonObject, location: str) -> list[JsonObject]:
    predictions = document.get("predictions")
    if not isinstance(predictions, list) or len(predictions) != 1:
        raise ReviewMergeError(f"{location} must contain exactly one predictions entry")
    prediction = predictions[0]
    if not isinstance(prediction, dict):
        raise ReviewMergeError(f"{location}.predictions[0] must be an object")
    results = prediction.get("result")
    if not isinstance(results, list):
        raise ReviewMergeError(f"{location}.predictions[0].result must be an array")
    if any(not isinstance(result, dict) for result in results):
        raise ReviewMergeError(
            f"{location}.predictions[0].result entries must be objects"
        )
    return results


def _review_operations(
    review: Mapping[str, Any], location: str
) -> dict[str, list[Any]]:
    review_id = _as_nonempty_string(review.get("document_id"))
    if review_id is None:
        if isinstance(review.get("data"), dict) and "predictions" in review:
            raise ReviewMergeError(
                f"{location} is a Label Studio task, not a review patch: "
                "top-level document_id and operation arrays are required"
            )
        raise ReviewMergeError(
            f"{location} is missing required non-empty top-level document_id"
        )

    operations: dict[str, list[Any]] = {}
    for operation_type in OPERATION_TYPES:
        value = review.get(operation_type, [])
        if not isinstance(value, list):
            raise ReviewMergeError(
                f"{location}.{operation_type} must be an array when present"
            )
        operations[operation_type] = value
    return operations


def normalize_review_records(
    reviews: Sequence[JsonObject],
) -> list[JsonObject]:
    """Normalize flat patches and Ollama worker envelopes to one patch shape.

    Ollama worker output keeps patch operations and completion metadata in a
    nested ``review`` object while document/model audit metadata remains at the
    top level. The merger uses a flat canonical shape internally. Conflicting
    duplicate fields are rejected instead of choosing one representation.
    """

    normalized_reviews: list[JsonObject] = []
    for position, review in enumerate(reviews):
        location = f"reviews[{position}]"
        normalized = copy.deepcopy(review)
        if "review" not in review:
            normalized_reviews.append(normalized)
            continue

        nested_review = review["review"]
        if not isinstance(nested_review, Mapping):
            raise ReviewMergeError(f"{location}.review must be an object")

        for field_name in REVIEW_PAYLOAD_FIELDS:
            if field_name not in nested_review:
                continue
            if (
                field_name in review
                and review[field_name] != nested_review[field_name]
            ):
                raise ReviewMergeError(
                    f"{location} has conflicting top-level and nested "
                    f"review.{field_name} values"
                )
            normalized[field_name] = copy.deepcopy(nested_review[field_name])

        normalized_reviews.append(normalized)

    return normalized_reviews


def validate_input_structure(
    splits: Mapping[str, Sequence[JsonObject]], reviews: Sequence[JsonObject]
) -> tuple[dict[str, tuple[str, int]], list[JsonObject]]:
    locations_by_id: defaultdict[str, list[tuple[str, int]]] = defaultdict(list)
    index: dict[str, tuple[str, int]] = {}

    for split in SPLIT_NAMES:
        if split not in splits:
            raise ReviewMergeError(f"Required split is missing: {split}")
        for position, document in enumerate(splits[split]):
            location = f"{split}[{position}]"
            value = document_id(document, location)
            document_text(document, location)
            _annotation_results(document, location)
            locations_by_id[value].append((split, position))
            index[value] = (split, position)

    duplicates = [
        {
            "document_id": value,
            "locations": [
                {"split": split, "index": position} for split, position in locations
            ],
        }
        for value, locations in sorted(locations_by_id.items())
        if len(locations) > 1
    ]
    if duplicates:
        raise ReviewMergeError(
            "Duplicate document_id values were found within or across splits: "
            + ", ".join(item["document_id"] for item in duplicates[:10])
        )

    review_ids: set[str] = set()
    for position, review in enumerate(reviews):
        location = f"reviews[{position}]"
        _review_operations(review, location)
        review_id = str(review["document_id"])
        if review_id in review_ids:
            raise ReviewMergeError(f"Duplicate review document_id: {review_id}")
        review_ids.add(review_id)

    return index, duplicates


def find_cross_split_text_duplicates(
    splits: Mapping[str, Sequence[JsonObject]],
) -> list[JsonObject]:
    occurrences: defaultdict[str, list[JsonObject]] = defaultdict(list)
    for split in SPLIT_NAMES:
        for position, document in enumerate(splits[split]):
            text = document_text(document, f"{split}[{position}]")
            normalized = normalize_resume_text(text)
            occurrences[normalized].append(
                {
                    "split": split,
                    "document_id": document_id(document),
                    "index": position,
                }
            )

    duplicates: list[JsonObject] = []
    for normalized, items in occurrences.items():
        if len({item["split"] for item in items}) < 2:
            continue
        duplicates.append(
            {
                "normalized_text_sha256": hashlib.sha256(
                    normalized.encode("utf-8")
                ).hexdigest(),
                "documents": items,
            }
        )
    return sorted(duplicates, key=lambda item: item["normalized_text_sha256"])


def _span_label(result: Mapping[str, Any]) -> str | None:
    value = result.get("value")
    labels = value.get("labels") if isinstance(value, dict) else None
    if isinstance(labels, list) and len(labels) == 1:
        return _as_nonempty_string(labels[0])
    return None


def _relation_type(result: Mapping[str, Any]) -> str | None:
    labels = result.get("labels")
    if isinstance(labels, list) and len(labels) == 1:
        return _as_nonempty_string(labels[0])
    return None


def derive_allowed_schema(
    splits: Mapping[str, Sequence[JsonObject]],
) -> tuple[set[str], set[str]]:
    """Return the frozen schema discovered during repository inspection.

    The split argument is retained so callers have one schema-selection seam for
    a future versioned schema file; evaluation annotations never authorize new
    training labels at runtime.
    """

    del splits
    return set(OBSERVED_ALLOWED_LABELS), set(OBSERVED_ALLOWED_RELATION_TYPES)


def _confidence(payload: Mapping[str, Any]) -> tuple[float | None, str | None]:
    candidates = (
        payload.get("review_confidence"),
        payload.get("confidence"),
        payload.get("score"),
    )
    value = next((candidate for candidate in candidates if candidate is not None), None)
    if value is None and isinstance(payload.get("meta"), dict):
        value = payload["meta"].get("confidence")
    if value is None:
        return None, None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None, "invalid_confidence"
    normalized = float(value)
    if not 0.0 <= normalized <= 1.0:
        return None, "invalid_confidence"
    return normalized, None


def _operation_label(payload: Mapping[str, Any]) -> str | None:
    label = _as_nonempty_string(payload.get("label"))
    labels = payload.get("labels")
    if label:
        return label
    if isinstance(labels, list) and len(labels) == 1:
        return _as_nonempty_string(labels[0])
    return None


def _operation_relation_type(payload: Mapping[str, Any]) -> str | None:
    for key in ("relation_type", "label"):
        value = _as_nonempty_string(payload.get(key))
        if value:
            return value
    labels = payload.get("labels")
    if isinstance(labels, list) and len(labels) == 1:
        value = _as_nonempty_string(labels[0])
        if value:
            return value
    value = _as_nonempty_string(payload.get("type"))
    return value if value != "relation" else None


def _first_string(payload: Mapping[str, Any], keys: Iterable[str]) -> str | None:
    for key in keys:
        value = _as_nonempty_string(payload.get(key))
        if value:
            return value
    return None


def _stable_span_id(document_id_value: str, label: str, start: int, end: int) -> str:
    material = f"{document_id_value}\0{label}\0{start}\0{end}".encode()
    return "ollama_span_" + hashlib.sha256(material).hexdigest()[:24]


def _stable_relation_id(
    document_id_value: str, relation_type: str, source_id: str, target_id: str
) -> str:
    material = (
        f"{document_id_value}\0{relation_type}\0{source_id}\0{target_id}"
    ).encode()
    return "ollama_relation_" + hashlib.sha256(material).hexdigest()[:24]


def _review_model(review: Mapping[str, Any]) -> str:
    return (
        _as_nonempty_string(review.get("review_model"))
        or _as_nonempty_string(review.get("model"))
        or "unknown"
    )


def _provenance_meta(
    review: Mapping[str, Any], document_id_value: str, confidence: float | None
) -> JsonObject:
    meta: JsonObject = {
        "provenance": "ollama_review",
        "requires_review": True,
        "review_document_id": document_id_value,
        "review_model": _review_model(review),
        "source": "ollama_review",
    }
    if confidence is not None:
        meta["confidence"] = confidence
        meta["review_confidence"] = confidence
    return meta


def _reject(
    *,
    rejections: list[JsonObject],
    counters: MergeCounters,
    outcome: ReviewOutcome,
    split: str | None,
    review_id: str,
    operation_type: str,
    operation_index: int,
    payload: Any,
    reason: str,
) -> None:
    counters.rejected[operation_type] += 1
    counters.rejection_reasons[reason] += 1
    outcome.rejected[operation_type] += 1
    outcome.rejection_reasons[reason] += 1
    rejections.append(
        {
            "document_id": review_id,
            "operation_index": operation_index,
            "operation_type": operation_type,
            "payload": copy.deepcopy(payload),
            "reason": reason,
            "split": split,
        }
    )


def _accept(
    counters: MergeCounters,
    outcome: ReviewOutcome,
    operation_type: str,
) -> None:
    counters.applied[operation_type] += 1
    outcome.applied[operation_type] += 1


def _result_groups(
    results: Sequence[JsonObject],
) -> tuple[dict[str, list[JsonObject]], dict[str, list[JsonObject]]]:
    spans: defaultdict[str, list[JsonObject]] = defaultdict(list)
    relations: defaultdict[str, list[JsonObject]] = defaultdict(list)
    for result in results:
        result_id = result.get("id")
        if not isinstance(result_id, str):
            continue
        if result.get("type") == "labels":
            spans[result_id].append(result)
        elif result.get("type") == "relation":
            relations[result_id].append(result)
    return dict(spans), dict(relations)


def _apply_review(
    *,
    document: JsonObject,
    review: JsonObject,
    split: str,
    allowed_labels: set[str],
    allowed_relation_types: set[str],
    counters: MergeCounters,
    rejections: list[JsonObject],
) -> ReviewOutcome:
    review_id = str(review["document_id"])
    operations = _review_operations(review, f"review[{review_id}]")
    outcome = ReviewOutcome()
    for operation_type, payloads in operations.items():
        count = len(payloads)
        counters.requested[operation_type] += count
        outcome.requested[operation_type] += count

    text = document_text(document)
    results = _annotation_results(document, f"document[{review_id}]")
    initial_span_groups, _ = _result_groups(results)
    proposed_id_counts = Counter(
        proposed_id
        for payload in operations["add_spans"]
        if isinstance(payload, dict)
        if (proposed_id := _as_nonempty_string(payload.get("id")))
    )
    ambiguous_proposed_ids = {
        proposed_id
        for proposed_id, count in proposed_id_counts.items()
        if count > 1 or proposed_id in initial_span_groups
    }
    proposed_span_ids: dict[str, str] = {}
    automatically_cleaned_relations: defaultdict[str, list[str]] = defaultdict(list)

    for operation_index, payload in enumerate(operations["delete_span_ids"]):
        span_id = payload if isinstance(payload, str) else None
        spans, _ = _result_groups(results)
        matches = spans.get(span_id, []) if span_id is not None else []
        if not matches:
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="delete_span_ids",
                operation_index=operation_index,
                payload=payload,
                reason="unknown_delete_span_id",
            )
            continue
        if len(matches) > 1:
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="delete_span_ids",
                operation_index=operation_index,
                payload=payload,
                reason="ambiguous_delete_span_id",
            )
            continue

        deleted = matches[0]
        results.remove(deleted)
        _accept(counters, outcome, "delete_span_ids")
        label = _span_label(deleted)
        if label:
            counters.deleted_spans_by_label[label] += 1

        dangling = [
            relation
            for relation in list(results)
            if relation.get("type") == "relation"
            and (relation.get("from_id") == span_id or relation.get("to_id") == span_id)
        ]
        for relation in dangling:
            results.remove(relation)
            relation_type = _relation_type(relation) or "unknown"
            relation_id = _as_nonempty_string(relation.get("id"))
            if relation_id:
                automatically_cleaned_relations[relation_id].append(relation_type)
            counters.cleanup_relations_by_type[relation_type] += 1
            outcome.automatic_relation_cleanups.append(
                {
                    "deleted_span_id": span_id,
                    "relation_id": relation.get("id"),
                    "relation_type": relation_type,
                }
            )

    for operation_index, payload in enumerate(operations["add_spans"]):
        if not isinstance(payload, dict):
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="add_spans",
                operation_index=operation_index,
                payload=payload,
                reason="malformed_span_addition",
            )
            continue

        proposed_id = _as_nonempty_string(payload.get("id"))
        label = _operation_label(payload)
        if proposed_id and proposed_id_counts[proposed_id] > 1:
            reason = "duplicate_proposed_span_id"
        elif proposed_id and proposed_id in initial_span_groups:
            reason = "proposed_span_id_conflict"
        elif label is None or label not in allowed_labels:
            reason = "unknown_label"
        else:
            reason = ""
        start = payload.get("start")
        end = payload.get("end")
        exact_text = payload.get("exact_text", payload.get("text"))
        confidence, confidence_error = _confidence(payload)

        if not reason and (start is None or end is None):
            reason = "missing_offsets"
        elif not reason and (
            not isinstance(start, int)
            or isinstance(start, bool)
            or not isinstance(end, int)
            or isinstance(end, bool)
            or not (0 <= start < end <= len(text))
        ):
            reason = "invalid_offsets"
        elif not reason and (not isinstance(exact_text, str) or not exact_text.strip()):
            reason = "empty_exact_text"
        elif not reason and text[start:end] != exact_text:
            reason = "text_mismatch"
        elif not reason and confidence_error:
            reason = confidence_error

        spans, _ = _result_groups(results)
        duplicate = False
        if not reason:
            duplicate = any(
                _span_label(span) == label
                and isinstance(span.get("value"), dict)
                and span["value"].get("start") == start
                and span["value"].get("end") == end
                for matching_spans in spans.values()
                for span in matching_spans
            )
            if duplicate:
                reason = "duplicate_span"

        if reason:
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="add_spans",
                operation_index=operation_index,
                payload=payload,
                reason=reason,
            )
            continue

        assert label is not None and isinstance(start, int) and isinstance(end, int)
        assert isinstance(exact_text, str)
        generated_id = _stable_span_id(review_id, label, start, end)
        existing_ids = {str(result.get("id")) for result in results}
        if generated_id in existing_ids:
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="add_spans",
                operation_index=operation_index,
                payload=payload,
                reason="duplicate_span",
            )
            continue

        result: JsonObject = {
            "from_name": "label",
            "id": generated_id,
            "meta": _provenance_meta(review, review_id, confidence),
            "to_name": "text",
            "type": "labels",
            "value": {
                "end": end,
                "labels": [label],
                "start": start,
                "text": exact_text,
            },
        }
        if confidence is not None:
            result["score"] = confidence
        results.append(result)
        if proposed_id:
            proposed_span_ids[proposed_id] = generated_id
        _accept(counters, outcome, "add_spans")
        counters.added_spans_by_label[label] += 1

    for operation_index, payload in enumerate(operations["delete_relation_ids"]):
        relation_id = payload if isinstance(payload, str) else None
        _, relations = _result_groups(results)
        matches = relations.get(relation_id, []) if relation_id is not None else []
        cleaned_types = (
            automatically_cleaned_relations.get(relation_id, [])
            if relation_id is not None
            else []
        )
        if not matches and len(cleaned_types) == 1:
            _accept(counters, outcome, "delete_relation_ids")
            counters.deleted_relations_by_type[cleaned_types[0]] += 1
            continue
        if not matches and len(cleaned_types) > 1:
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="delete_relation_ids",
                operation_index=operation_index,
                payload=payload,
                reason="ambiguous_delete_relation_id",
            )
            continue
        if not matches:
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="delete_relation_ids",
                operation_index=operation_index,
                payload=payload,
                reason="unknown_delete_relation_id",
            )
            continue
        if len(matches) > 1:
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="delete_relation_ids",
                operation_index=operation_index,
                payload=payload,
                reason="ambiguous_delete_relation_id",
            )
            continue
        deleted = matches[0]
        results.remove(deleted)
        _accept(counters, outcome, "delete_relation_ids")
        relation_type = _relation_type(deleted)
        if relation_type:
            counters.deleted_relations_by_type[relation_type] += 1

    for operation_index, payload in enumerate(operations["add_relations"]):
        if not isinstance(payload, dict):
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="add_relations",
                operation_index=operation_index,
                payload=payload,
                reason="malformed_relation_addition",
            )
            continue

        relation_type = _operation_relation_type(payload)
        source_reference = _first_string(
            payload, ("source_id", "source_span_id", "from_id")
        )
        target_reference = _first_string(
            payload, ("target_id", "target_span_id", "to_id")
        )
        source_id = (
            proposed_span_ids.get(source_reference, source_reference)
            if source_reference
            else None
        )
        target_id = (
            proposed_span_ids.get(target_reference, target_reference)
            if target_reference
            else None
        )
        confidence, confidence_error = _confidence(payload)
        spans, relations = _result_groups(results)

        if relation_type is None or relation_type not in allowed_relation_types:
            reason = "unknown_relation_type"
        elif source_reference in ambiguous_proposed_ids:
            reason = "ambiguous_source_endpoint"
        elif target_reference in ambiguous_proposed_ids:
            reason = "ambiguous_target_endpoint"
        elif source_id is None or source_id not in spans:
            reason = "missing_source_endpoint"
        elif len(spans[source_id]) > 1:
            reason = "ambiguous_source_endpoint"
        elif target_id is None or target_id not in spans:
            reason = "missing_target_endpoint"
        elif len(spans[target_id]) > 1:
            reason = "ambiguous_target_endpoint"
        elif source_id == target_id:
            reason = "self_relation_not_allowed"
        elif confidence_error:
            reason = "invalid_relation_confidence"
        elif any(
            _relation_type(relation) == relation_type
            and relation.get("from_id") == source_id
            and relation.get("to_id") == target_id
            for matching_relations in relations.values()
            for relation in matching_relations
        ):
            reason = "duplicate_relation"
        else:
            reason = ""

        if reason:
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="add_relations",
                operation_index=operation_index,
                payload=payload,
                reason=reason,
            )
            continue

        assert relation_type and source_id and target_id
        generated_id = _stable_relation_id(
            review_id, relation_type, source_id, target_id
        )
        existing_ids = {str(result.get("id")) for result in results}
        if generated_id in existing_ids:
            _reject(
                rejections=rejections,
                counters=counters,
                outcome=outcome,
                split=split,
                review_id=review_id,
                operation_type="add_relations",
                operation_index=operation_index,
                payload=payload,
                reason="duplicate_relation",
            )
            continue

        result = {
            "direction": "right",
            "from_id": source_id,
            "from_name": "label",
            "id": generated_id,
            "labels": [relation_type],
            "meta": _provenance_meta(review, review_id, confidence),
            "to_id": target_id,
            "to_name": "text",
            "type": "relation",
        }
        if confidence is not None:
            result["score"] = confidence
        results.append(result)
        _accept(counters, outcome, "add_relations")
        counters.added_relations_by_type[relation_type] += 1

    return outcome


def _validation_error(code: str, location: str, message: str) -> JsonObject:
    return {"code": code, "location": location, "message": message}


def _deduplicate_exact_spans(
    document: JsonObject,
) -> tuple[list[JsonObject], list[JsonObject], list[JsonObject]]:
    """Remove safely identifiable exact duplicate spans and rewire relations."""

    results = _annotation_results(document, "document")
    result_id_counts = Counter(
        result_id
        for result in results
        if (result_id := _as_nonempty_string(result.get("id"))) is not None
    )
    canonical_by_key: dict[tuple[str, int, int], JsonObject] = {}
    removed_positions: set[int] = set()
    span_id_remap: dict[str, str] = {}
    cleanups: list[JsonObject] = []

    for position, result in enumerate(results):
        if result.get("type") != "labels":
            continue
        value = result.get("value")
        if not isinstance(value, dict):
            continue
        label = _span_label(result)
        start, end = value.get("start"), value.get("end")
        if label is None or not _is_integer(start) or not _is_integer(end):
            continue

        key = (label, start, end)
        canonical = canonical_by_key.get(key)
        if canonical is None:
            canonical_by_key[key] = result
            continue

        duplicate_id = _as_nonempty_string(result.get("id"))
        canonical_id = _as_nonempty_string(canonical.get("id"))
        if (
            duplicate_id is None
            or canonical_id is None
            or result_id_counts[duplicate_id] != 1
            or result_id_counts[canonical_id] != 1
        ):
            continue

        removed_positions.add(position)
        span_id_remap[duplicate_id] = canonical_id
        cleanups.append(
            {
                "end": end,
                "kept_span_id": canonical_id,
                "label": label,
                "removed_span_id": duplicate_id,
                "start": start,
            }
        )

    relation_rewires: list[JsonObject] = []
    relation_cleanups: list[JsonObject] = []
    for position, result in enumerate(results):
        if result.get("type") != "relation":
            continue
        relation_id = _as_nonempty_string(result.get("id"))
        relation_type = _relation_type(result)
        relation_was_rewired = False
        for endpoint in ("from_id", "to_id"):
            old_span_id = _as_nonempty_string(result.get(endpoint))
            if old_span_id is None or old_span_id not in span_id_remap:
                continue
            new_span_id = span_id_remap[old_span_id]
            result[endpoint] = new_span_id
            relation_was_rewired = True
            relation_rewires.append(
                {
                    "endpoint": endpoint,
                    "new_span_id": new_span_id,
                    "old_span_id": old_span_id,
                    "relation_id": relation_id,
                    "relation_type": relation_type,
                }
            )

        if (
            result.get("from_id") == result.get("to_id")
            and relation_was_rewired
        ):
            removed_positions.add(position)
            relation_cleanups.append(
                {
                    "reason": "self_relation_after_duplicate_span_rewire",
                    "relation_id": relation_id,
                    "relation_type": relation_type,
                }
            )

    if removed_positions:
        results[:] = [
            result
            for position, result in enumerate(results)
            if position not in removed_positions
        ]
    return cleanups, relation_rewires, relation_cleanups


def validate_document(
    document: JsonObject,
    *,
    allowed_labels: set[str],
    allowed_relation_types: set[str],
) -> list[JsonObject]:
    """Validate a complete Label Studio task after all annotation mutations."""

    errors: list[JsonObject] = []
    try:
        identifier = document_id(document)
    except ReviewMergeError as error:
        errors.append(
            _validation_error("invalid_document_id", "data.document_id", str(error))
        )
        identifier = ""
    try:
        text = document_text(document)
    except ReviewMergeError as error:
        errors.append(
            _validation_error("invalid_document_text", "data.text", str(error))
        )
        text = ""
    else:
        if not text.strip():
            errors.append(
                _validation_error(
                    "empty_document_text",
                    "data.text",
                    "Document text must not be empty or whitespace-only",
                )
            )
    try:
        results = _annotation_results(document, f"document[{identifier}]")
    except ReviewMergeError as error:
        errors.append(
            _validation_error("invalid_annotations", "predictions", str(error))
        )
        return errors

    span_ids: set[str] = set()
    relation_ids: set[str] = set()
    span_keys: set[tuple[str, int, int]] = set()
    relation_keys: set[tuple[str, str, str]] = set()
    relations: list[tuple[int, JsonObject]] = []

    for index, result in enumerate(results):
        location = f"predictions[0].result[{index}]"
        result_type = result.get("type")
        result_id = _as_nonempty_string(result.get("id"))
        if result_type == "labels":
            if result_id is None:
                errors.append(
                    _validation_error(
                        "invalid_span_id",
                        location + ".id",
                        "Span ID must be a non-empty string",
                    )
                )
            elif result_id in span_ids:
                errors.append(
                    _validation_error(
                        "duplicate_span_id",
                        location + ".id",
                        f"Duplicate span ID: {result_id}",
                    )
                )
            else:
                span_ids.add(result_id)

            value = result.get("value")
            if not isinstance(value, dict):
                errors.append(
                    _validation_error(
                        "invalid_span_value",
                        location + ".value",
                        "Span value must be an object",
                    )
                )
                continue
            start, end = value.get("start"), value.get("end")
            span_text = value.get("text")
            label = _span_label(result)
            if label is None or label not in allowed_labels:
                errors.append(
                    _validation_error(
                        "unknown_label",
                        location + ".value.labels",
                        f"Unknown or malformed label: {label}",
                    )
                )
            if (
                not isinstance(start, int)
                or isinstance(start, bool)
                or not isinstance(end, int)
                or isinstance(end, bool)
                or not (0 <= start < end <= len(text))
            ):
                errors.append(
                    _validation_error(
                        "invalid_offsets",
                        location + ".value",
                        f"Invalid offsets: {start}, {end}",
                    )
                )
                continue
            if not isinstance(span_text, str) or not span_text.strip():
                errors.append(
                    _validation_error(
                        "empty_span",
                        location + ".value.text",
                        "Span text must not be empty or whitespace-only",
                    )
                )
            elif text[start:end] != span_text:
                errors.append(
                    _validation_error(
                        "span_text_mismatch",
                        location + ".value.text",
                        "Span text does not match data.text at its offsets",
                    )
                )
            if label is not None:
                key = (label, start, end)
                if key in span_keys:
                    errors.append(
                        _validation_error(
                            "duplicate_span", location, f"Duplicate span: {key}"
                        )
                    )
                span_keys.add(key)
        elif result_type == "relation":
            if result_id is None:
                errors.append(
                    _validation_error(
                        "invalid_relation_id",
                        location + ".id",
                        "Relation ID must be a non-empty string",
                    )
                )
            elif result_id in relation_ids:
                errors.append(
                    _validation_error(
                        "duplicate_relation_id",
                        location + ".id",
                        f"Duplicate relation ID: {result_id}",
                    )
                )
            else:
                relation_ids.add(result_id)
            relations.append((index, result))
        else:
            errors.append(
                _validation_error(
                    "unknown_annotation_type",
                    location + ".type",
                    f"Unsupported result type: {result_type}",
                )
            )

        score = result.get("score")
        if score is not None and (
            isinstance(score, bool)
            or not isinstance(score, (int, float))
            or not 0.0 <= float(score) <= 1.0
        ):
            errors.append(
                _validation_error(
                    "invalid_confidence",
                    location + ".score",
                    f"Invalid confidence: {score}",
                )
            )

    for index, relation in relations:
        location = f"predictions[0].result[{index}]"
        relation_type = _relation_type(relation)
        source_id = _as_nonempty_string(relation.get("from_id"))
        target_id = _as_nonempty_string(relation.get("to_id"))
        if relation_type is None or relation_type not in allowed_relation_types:
            errors.append(
                _validation_error(
                    "unknown_relation_type",
                    location + ".labels",
                    f"Unknown or malformed relation type: {relation_type}",
                )
            )
        if source_id is None or source_id not in span_ids:
            errors.append(
                _validation_error(
                    "missing_source_endpoint",
                    location + ".from_id",
                    f"Missing source span: {source_id}",
                )
            )
        if target_id is None or target_id not in span_ids:
            errors.append(
                _validation_error(
                    "missing_target_endpoint",
                    location + ".to_id",
                    f"Missing target span: {target_id}",
                )
            )
        if source_id is not None and source_id == target_id:
            errors.append(
                _validation_error(
                    "self_relation_not_allowed",
                    location,
                    "Self-relations are not allowed by the observed schema",
                )
            )
        if relation_type and source_id and target_id:
            key = (relation_type, source_id, target_id)
            if key in relation_keys:
                errors.append(
                    _validation_error(
                        "duplicate_relation", location, f"Duplicate relation: {key}"
                    )
                )
            relation_keys.add(key)

    return errors


def _annotation_counts(documents: Sequence[JsonObject]) -> dict[str, int]:
    spans = 0
    relations = 0
    for position, document in enumerate(documents):
        for result in _annotation_results(document, f"document[{position}]"):
            spans += result.get("type") == "labels"
            relations += result.get("type") == "relation"
    return {"relations": relations, "spans": spans}


def _distributions(
    documents: Sequence[JsonObject],
) -> tuple[Counter[str], Counter[str]]:
    labels: Counter[str] = Counter()
    relations: Counter[str] = Counter()
    for position, document in enumerate(documents):
        for result in _annotation_results(document, f"document[{position}]"):
            if result.get("type") == "labels":
                label = _span_label(result)
                if label:
                    labels[label] += 1
            elif result.get("type") == "relation":
                relation_type = _relation_type(result)
                if relation_type:
                    relations[relation_type] += 1
    return labels, relations


def _sum_counter(counter: Mapping[str, int]) -> int:
    return sum(counter.values())


def merge_datasets(
    splits: SplitDocuments,
    reviews: list[JsonObject],
    *,
    strict: bool = False,
    input_paths: InputPaths | None = None,
) -> MergeArtifacts:
    reviews = normalize_review_records(reviews)
    index, duplicate_ids = validate_input_structure(splits, reviews)
    text_duplicates = find_cross_split_text_duplicates(splits)
    if strict and text_duplicates:
        raise ReviewMergeError(
            f"Strict mode rejected {len(text_duplicates)} cross-split normalized-text duplicate group(s)"
        )

    unmatched_ids = sorted(
        str(review["document_id"])
        for review in reviews
        if str(review["document_id"]) not in index
    )
    if strict and unmatched_ids:
        raise ReviewMergeError(
            "Strict mode rejected review document_id values not present in any split: "
            + ", ".join(unmatched_ids[:10])
        )

    allowed_labels, allowed_relation_types = derive_allowed_schema(splits)
    reviewed: SplitDocuments = {
        split: copy.deepcopy(splits[split]) for split in SPLIT_NAMES
    }
    reviews_by_id = {str(review["document_id"]): review for review in reviews}
    counters = MergeCounters()
    rejections: list[JsonObject] = []
    statuses: list[JsonObject] = []
    base_errors_by_id: dict[str, list[JsonObject]] = {}
    final_errors_by_id: dict[str, list[JsonObject]] = {}

    for split in SPLIT_NAMES:
        for position, original in enumerate(splits[split]):
            identifier = document_id(original)
            base_errors = validate_document(
                original,
                allowed_labels=allowed_labels,
                allowed_relation_types=allowed_relation_types,
            )
            base_errors_by_id[identifier] = base_errors
            review = reviews_by_id.get(identifier)
            outcome = ReviewOutcome()
            if review is not None:
                outcome = _apply_review(
                    document=reviewed[split][position],
                    review=review,
                    split=split,
                    allowed_labels=allowed_labels,
                    allowed_relation_types=allowed_relation_types,
                    counters=counters,
                    rejections=rejections,
                )
            (
                duplicate_span_cleanups,
                duplicate_span_relation_rewires,
                duplicate_span_relation_cleanups,
            ) = _deduplicate_exact_spans(reviewed[split][position])
            for cleanup in duplicate_span_cleanups:
                counters.cleanup_duplicate_spans_by_label[cleanup["label"]] += 1
            for rewire in duplicate_span_relation_rewires:
                relation_type = rewire["relation_type"]
                if relation_type is not None:
                    counters.rewired_duplicate_span_relations_by_type[
                        relation_type
                    ] += 1
            for cleanup in duplicate_span_relation_cleanups:
                relation_type = cleanup["relation_type"]
                if relation_type is not None:
                    counters.cleanup_duplicate_span_relations_by_type[
                        relation_type
                    ] += 1
            final_errors = validate_document(
                reviewed[split][position],
                allowed_labels=allowed_labels,
                allowed_relation_types=allowed_relation_types,
            )
            final_errors_by_id[identifier] = final_errors

            requested_count = _sum_counter(outcome.requested)
            applied_count = _sum_counter(outcome.applied)
            rejected_count = _sum_counter(outcome.rejected)
            if final_errors:
                status = "document_invalid"
            elif review is None or requested_count == 0 or applied_count == 0:
                status = (
                    "automatically_cleaned"
                    if duplicate_span_cleanups
                    else "unchanged"
                )
            elif rejected_count == 0 and applied_count == requested_count:
                status = "fully_applied"
            else:
                status = "partially_applied"

            statuses.append(
                {
                    "applied_operation_counts": _counter_dict(outcome.applied),
                    "applied_operations": applied_count,
                    "automatic_duplicate_span_cleanups": duplicate_span_cleanups,
                    "automatic_duplicate_span_relation_rewires": (
                        duplicate_span_relation_rewires
                    ),
                    "automatic_duplicate_span_relation_cleanups": (
                        duplicate_span_relation_cleanups
                    ),
                    "automatic_relation_cleanups": outcome.automatic_relation_cleanups,
                    "base_validation_errors": base_errors,
                    "document_id": identifier,
                    "final_validation_errors": final_errors,
                    "matched": review is not None,
                    "rejected_operation_counts": _counter_dict(outcome.rejected),
                    "rejected_operations": rejected_count,
                    "rejection_reasons": _counter_dict(outcome.rejection_reasons),
                    "requested_operation_counts": _counter_dict(outcome.requested),
                    "requested_operations": requested_count,
                    "review_complete": review.get("review_complete")
                    if review
                    else None,
                    "review_unresolved_reason_codes": review.get(
                        "unresolved_reason_codes", []
                    )
                    if review
                    else [],
                    "review_validation_errors": review.get("validation_errors", [])
                    if review
                    else [],
                    "source_index": review.get("source_index") if review else None,
                    "split": split,
                    "status": status,
                }
            )

    for review_position, review in enumerate(reviews):
        identifier = str(review["document_id"])
        if identifier in index:
            continue
        operations = _review_operations(review, f"reviews[{review_position}]")
        unmatched_outcome = ReviewOutcome()
        requested_count = 0
        for operation_type, payloads in operations.items():
            counters.requested[operation_type] += len(payloads)
            unmatched_outcome.requested[operation_type] += len(payloads)
            requested_count += len(payloads)
            for operation_index, payload in enumerate(payloads):
                _reject(
                    rejections=rejections,
                    counters=counters,
                    outcome=unmatched_outcome,
                    split=None,
                    review_id=identifier,
                    operation_type=operation_type,
                    operation_index=operation_index,
                    payload=payload,
                    reason="unknown_document_id",
                )
        if requested_count == 0:
            counters.rejected["review"] += 1
            unmatched_outcome.rejected["review"] += 1
            unmatched_outcome.rejection_reasons["unknown_document_id"] += 1
            rejections.append(
                {
                    "document_id": identifier,
                    "operation_index": 0,
                    "operation_type": "review",
                    "payload": copy.deepcopy(review),
                    "reason": "unknown_document_id",
                    "split": None,
                }
            )
            counters.rejection_reasons["unknown_document_id"] += 1
        statuses.append(
            {
                "applied_operation_counts": {},
                "applied_operations": 0,
                "automatic_duplicate_span_cleanups": [],
                "automatic_duplicate_span_relation_cleanups": [],
                "automatic_duplicate_span_relation_rewires": [],
                "automatic_relation_cleanups": [],
                "base_validation_errors": [],
                "document_id": identifier,
                "final_validation_errors": [],
                "matched": False,
                "rejected_operation_counts": _counter_dict(unmatched_outcome.rejected),
                "rejected_operations": _sum_counter(unmatched_outcome.rejected),
                "rejection_reasons": _counter_dict(unmatched_outcome.rejection_reasons),
                "requested_operation_counts": _counter_dict(
                    unmatched_outcome.requested
                ),
                "requested_operations": requested_count,
                "review_complete": review.get("review_complete"),
                "review_unresolved_reason_codes": review.get(
                    "unresolved_reason_codes", []
                ),
                "review_validation_errors": review.get("validation_errors", []),
                "source_index": review.get("source_index"),
                "split": None,
                "status": "review_unmatched",
            }
        )

    clean: SplitDocuments = {
        split: [
            document
            for document in reviewed[split]
            if not final_errors_by_id[document_id(document)]
        ]
        for split in SPLIT_NAMES
    }

    original_membership = {
        split: [document_id(document) for document in splits[split]]
        for split in SPLIT_NAMES
    }
    reviewed_membership = {
        split: [document_id(document) for document in reviewed[split]]
        for split in SPLIT_NAMES
    }
    membership_unchanged = original_membership == reviewed_membership
    train_ids = set(reviewed_membership["train"])
    validation_ids = set(reviewed_membership["validation"])
    test_ids = set(reviewed_membership["test"])
    training_excludes_eval = not train_ids.intersection(validation_ids | test_ids)

    status_counts = Counter(status["status"] for status in statuses)
    reviews_by_split = Counter(
        split for review_id, (split, _) in index.items() if review_id in reviews_by_id
    )
    before_counts = {split: _annotation_counts(splits[split]) for split in SPLIT_NAMES}
    after_counts = {split: _annotation_counts(reviewed[split]) for split in SPLIT_NAMES}
    label_distribution: dict[str, dict[str, int]] = {}
    relation_distribution: dict[str, dict[str, int]] = {}
    for split in SPLIT_NAMES:
        labels, relations = _distributions(reviewed[split])
        label_distribution[split] = _counter_dict(labels)
        relation_distribution[split] = _counter_dict(relations)

    input_hashes: dict[str, str] = {}
    if input_paths:
        for name in (*SPLIT_NAMES, "reviews"):
            path = getattr(input_paths, name)
            input_hashes[name] = hashlib.sha256(path.read_bytes()).hexdigest()

    report: JsonObject = {
        "allowed_labels": sorted(allowed_labels),
        "allowed_relation_types": sorted(allowed_relation_types),
        "annotation_counts": {
            split: {"after": after_counts[split], "before": before_counts[split]}
            for split in SPLIT_NAMES
        },
        "applied_operation_counts": _counter_dict(counters.applied),
        "automatic_duplicate_span_cleanup_counts_by_label": _counter_dict(
            counters.cleanup_duplicate_spans_by_label
        ),
        "automatic_duplicate_span_cleanups": _sum_counter(
            counters.cleanup_duplicate_spans_by_label
        ),
        "automatic_duplicate_span_relation_rewire_counts_by_type": _counter_dict(
            counters.rewired_duplicate_span_relations_by_type
        ),
        "automatic_duplicate_span_relation_cleanup_counts_by_type": _counter_dict(
            counters.cleanup_duplicate_span_relations_by_type
        ),
        "automatic_relation_cleanup_counts_by_type": _counter_dict(
            counters.cleanup_relations_by_type
        ),
        "cross_split_normalized_text_duplicates": text_duplicates,
        "deleted_relation_counts_by_type": _counter_dict(
            counters.deleted_relations_by_type
        ),
        "deleted_span_counts_by_label": _counter_dict(counters.deleted_spans_by_label),
        "document_status_counts": _counter_dict(status_counts),
        "documents_fully_applied": status_counts["fully_applied"],
        "documents_partially_applied": status_counts["partially_applied"],
        "documents_automatically_cleaned": status_counts[
            "automatically_cleaned"
        ],
        "documents_unchanged": status_counts["unchanged"],
        "duplicate_document_ids": duplicate_ids,
        "final_label_distribution_by_split": label_distribution,
        "final_relation_distribution_by_split": relation_distribution,
        "input_document_count_by_split": {
            split: len(splits[split]) for split in SPLIT_NAMES
        },
        "input_sha256": input_hashes,
        "invalid_base_documents": sum(
            bool(errors) for errors in base_errors_by_id.values()
        ),
        "invalid_base_documents_by_split": {
            split: sum(
                bool(base_errors_by_id[document_id(document)])
                for document in splits[split]
            )
            for split in SPLIT_NAMES
        },
        "invalid_final_documents": sum(
            bool(errors) for errors in final_errors_by_id.values()
        ),
        "invalid_final_documents_by_split": {
            split: len(reviewed[split]) - len(clean[split]) for split in SPLIT_NAMES
        },
        "matched_review_count": len(reviews) - len(unmatched_ids),
        "output_clean_document_count_by_split": {
            split: len(clean[split]) for split in SPLIT_NAMES
        },
        "output_document_count_by_split": {
            split: len(reviewed[split]) for split in SPLIT_NAMES
        },
        "rejected_operation_counts": _counter_dict(counters.rejected),
        "rejection_reason_distribution": _counter_dict(counters.rejection_reasons),
        "requested_operation_counts": _counter_dict(counters.requested),
        "review_count": len(reviews),
        "reviews_by_split": _counter_dict(reviews_by_split),
        "split_integrity": {
            "cross_split_document_ids_absent": training_excludes_eval,
            "cross_split_normalized_text_duplicates_absent": not text_duplicates,
            "membership_unchanged": membership_unchanged,
            "passed": membership_unchanged
            and training_excludes_eval
            and not text_duplicates,
            "training_excludes_validation_and_test": training_excludes_eval,
        },
        "unmatched_review_count": len(unmatched_ids),
        "unmatched_review_document_ids": unmatched_ids,
        "added_span_counts_by_label": _counter_dict(counters.added_spans_by_label),
        "added_relation_counts_by_type": _counter_dict(
            counters.added_relations_by_type
        ),
    }
    return MergeArtifacts(reviewed, clean, rejections, statuses, report)


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    try:
        temporary.write_text(content, encoding="utf-8", newline="\n")
        temporary.replace(path)
    finally:
        if temporary.exists():
            temporary.unlink()


def _write_jsonl(path: Path, records: Sequence[JsonObject]) -> None:
    _atomic_write(path, "".join(_stable_json(record) for record in records))


def write_outputs(
    artifacts: MergeArtifacts, output_dir: Path, *, dry_run: bool
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "review_merge_report.json"
    if dry_run:
        stale_outputs = sorted(
            name
            for name in OUTPUT_FILENAMES - {report_path.name}
            if (output_dir / name).exists()
        )
        if stale_outputs:
            raise ReviewMergeError(
                "Dry-run output directory contains dataset artifacts; use a "
                "separate directory: " + ", ".join(stale_outputs)
            )
        _atomic_write(report_path, _stable_json(artifacts.report, pretty=True))
        return

    report_path.unlink(missing_ok=True)
    for split in SPLIT_NAMES:
        _write_jsonl(output_dir / f"{split}_reviewed.jsonl", artifacts.reviewed[split])
        _write_jsonl(output_dir / f"{split}_clean.jsonl", artifacts.clean[split])
    _write_jsonl(
        output_dir / "rejected_review_operations.jsonl",
        artifacts.rejected_operations,
    )
    _write_jsonl(
        output_dir / "document_review_status.jsonl", artifacts.document_statuses
    )
    _atomic_write(report_path, _stable_json(artifacts.report, pretty=True))


def run_pipeline(
    *,
    train_path: Path,
    validation_path: Path,
    test_path: Path,
    reviews_path: Path,
    output_dir: Path,
    dry_run: bool = False,
    strict: bool = False,
) -> MergeArtifacts:
    input_paths = InputPaths(
        train=train_path,
        validation=validation_path,
        test=test_path,
        reviews=reviews_path,
    )
    output_paths = {output_dir.resolve() / name for name in OUTPUT_FILENAMES}
    for input_path in (
        train_path,
        validation_path,
        test_path,
        reviews_path,
    ):
        if input_path.resolve() in output_paths:
            raise ReviewMergeError(
                f"Output path would overwrite raw input: {input_path}"
            )

    splits: SplitDocuments = {
        "train": load_json_records(train_path, kind="train"),
        "validation": load_json_records(validation_path, kind="validation"),
        "test": load_json_records(test_path, kind="test"),
    }
    reviews = load_json_records(reviews_path, kind="reviews")
    artifacts = merge_datasets(
        splits,
        reviews,
        strict=strict,
        input_paths=input_paths,
    )
    artifacts.report["dry_run"] = dry_run
    artifacts.report["strict"] = strict
    write_outputs(artifacts, output_dir, dry_run=dry_run)
    return artifacts


def _path_argument(value: str) -> Path:
    return Path(value).expanduser()


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Apply independently valid Ollama review operations to fixed resume splits."
    )
    parser.add_argument("--train", type=_path_argument)
    parser.add_argument("--validation", type=_path_argument)
    parser.add_argument("--test", type=_path_argument)
    parser.add_argument("--reviews", type=_path_argument)
    parser.add_argument(
        "--output-dir",
        type=_path_argument,
        default=Path("data/processed/reviewed"),
    )
    parser.add_argument(
        "--repository-root",
        type=_path_argument,
        default=Path.cwd(),
        help="Root used only for optional input discovery.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate and write only review_merge_report.json.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Also fail on unmatched reviews and normalized-text leakage.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_argument_parser()
    arguments = parser.parse_args(argv)
    try:
        paths = resolve_input_paths(
            repository_root=arguments.repository_root,
            output_dir=arguments.output_dir,
            train=arguments.train,
            validation=arguments.validation,
            test=arguments.test,
            reviews=arguments.reviews,
        )
        artifacts = run_pipeline(
            train_path=paths.train,
            validation_path=paths.validation,
            test_path=paths.test,
            reviews_path=paths.reviews,
            output_dir=arguments.output_dir,
            dry_run=arguments.dry_run,
            strict=arguments.strict,
        )
    except ReviewMergeError as error:
        print(f"review merge failed: {error}", file=sys.stderr)
        return 2

    summary = {
        "dry_run": arguments.dry_run,
        "matched_reviews": artifacts.report["matched_review_count"],
        "output_dir": str(arguments.output_dir),
        "rejected_operations": sum(
            artifacts.report["rejected_operation_counts"].values()
        ),
        "reviews": artifacts.report["review_count"],
        "split_integrity_passed": artifacts.report["split_integrity"]["passed"],
        "unmatched_reviews": artifacts.report["unmatched_review_count"],
    }
    print(_stable_json(summary, pretty=True), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
