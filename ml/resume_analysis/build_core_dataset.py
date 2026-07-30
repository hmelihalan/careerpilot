"""Build a focused resume dataset from validated reviewed split files."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from ml.resume_analysis.apply_ollama_reviews import (
    JsonObject,
    ReviewMergeError,
    _annotation_results,
    _atomic_write,
    _counter_dict,
    _relation_type,
    _span_label,
    _stable_json,
    document_id,
    load_json_records,
    validate_document,
)

SPLIT_NAMES = ("train", "validation", "test")


@dataclass(frozen=True)
class CoreSchema:
    version: str
    labels: frozenset[str]
    relation_signatures: frozenset[tuple[str, str, str]]


def _required_string(value: Any, location: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ReviewMergeError(f"{location} must be a non-empty string")
    return value


def load_core_schema(path: Path) -> CoreSchema:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ReviewMergeError(f"Could not load core schema {path}: {error}") from error
    if not isinstance(payload, dict):
        raise ReviewMergeError("Core schema root must be an object")

    version = _required_string(payload.get("version"), "schema.version")
    raw_labels = payload.get("labels")
    if not isinstance(raw_labels, list) or not raw_labels:
        raise ReviewMergeError("schema.labels must be a non-empty array")
    labels = [
        _required_string(label, f"schema.labels[{index}]")
        for index, label in enumerate(raw_labels)
    ]
    if len(labels) != len(set(labels)):
        raise ReviewMergeError("schema.labels contains duplicate values")

    raw_signatures = payload.get("relation_signatures")
    if not isinstance(raw_signatures, list):
        raise ReviewMergeError("schema.relation_signatures must be an array")
    signatures: list[tuple[str, str, str]] = []
    for index, signature in enumerate(raw_signatures):
        location = f"schema.relation_signatures[{index}]"
        if not isinstance(signature, Mapping):
            raise ReviewMergeError(f"{location} must be an object")
        relation_type = _required_string(
            signature.get("relation_type"), location + ".relation_type"
        )
        source_label = _required_string(
            signature.get("source_label"), location + ".source_label"
        )
        target_label = _required_string(
            signature.get("target_label"), location + ".target_label"
        )
        if source_label not in labels or target_label not in labels:
            raise ReviewMergeError(
                f"{location} references a label outside schema.labels"
            )
        signatures.append((relation_type, source_label, target_label))
    if len(signatures) != len(set(signatures)):
        raise ReviewMergeError("schema.relation_signatures contains duplicates")

    return CoreSchema(version, frozenset(labels), frozenset(signatures))


def filter_document_to_core(
    document: JsonObject,
    schema: CoreSchema,
) -> tuple[JsonObject, Counter[str], Counter[str]]:
    filtered = copy.deepcopy(document)
    results = _annotation_results(filtered, f"document[{document_id(filtered)}]")
    kept_span_labels_by_id: dict[str, str] = {}
    excluded_labels: Counter[str] = Counter()

    for result in results:
        if result.get("type") != "labels":
            continue
        label = _span_label(result)
        result_id = result.get("id")
        if label in schema.labels and isinstance(result_id, str):
            kept_span_labels_by_id[result_id] = label
        elif label:
            excluded_labels[label] += 1

    kept_results: list[JsonObject] = []
    excluded_relations: Counter[str] = Counter()
    for result in results:
        result_type = result.get("type")
        if result_type == "labels":
            if result.get("id") in kept_span_labels_by_id:
                kept_results.append(result)
            continue
        if result_type != "relation":
            continue

        relation_type = _relation_type(result)
        source_label = kept_span_labels_by_id.get(str(result.get("from_id")))
        target_label = kept_span_labels_by_id.get(str(result.get("to_id")))
        signature = (relation_type, source_label, target_label)
        if signature in schema.relation_signatures:
            kept_results.append(result)
        elif relation_type:
            excluded_relations[relation_type] += 1

    results[:] = kept_results
    return filtered, excluded_labels, excluded_relations


def _distributions(
    documents: Sequence[JsonObject],
) -> tuple[Counter[str], Counter[str]]:
    labels: Counter[str] = Counter()
    relations: Counter[str] = Counter()
    for document in documents:
        location = f"document[{document_id(document)}]"
        for result in _annotation_results(document, location):
            if result.get("type") == "labels":
                label = _span_label(result)
                if label:
                    labels[label] += 1
            elif result.get("type") == "relation":
                relation_type = _relation_type(result)
                if relation_type:
                    relations[relation_type] += 1
    return labels, relations


def build_core_dataset(
    *,
    split_paths: Mapping[str, Path],
    schema_path: Path,
    output_dir: Path,
) -> JsonObject:
    schema = load_core_schema(schema_path)
    filtered_splits: dict[str, list[JsonObject]] = {}
    excluded_labels: Counter[str] = Counter()
    excluded_relations: Counter[str] = Counter()

    for split in SPLIT_NAMES:
        path = split_paths.get(split)
        if path is None:
            raise ReviewMergeError(f"Missing core dataset input: {split}")
        documents = load_json_records(path, kind=split)
        filtered_documents: list[JsonObject] = []
        for document in documents:
            filtered, document_labels, document_relations = filter_document_to_core(
                document, schema
            )
            errors = validate_document(
                filtered,
                allowed_labels=set(schema.labels),
                allowed_relation_types={
                    signature[0] for signature in schema.relation_signatures
                },
            )
            if errors:
                raise ReviewMergeError(
                    f"Core filtering produced an invalid document "
                    f"{document_id(document)}: {errors[0]['code']}"
                )
            filtered_documents.append(filtered)
            excluded_labels.update(document_labels)
            excluded_relations.update(document_relations)
        filtered_splits[split] = filtered_documents

    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / "core_dataset_report.json"
    report_path.unlink(missing_ok=True)
    for split in SPLIT_NAMES:
        (output_dir / f"{split}_core.jsonl").unlink(missing_ok=True)
        content = _stable_json(filtered_splits[split], pretty=True)
        _atomic_write(output_dir / f"{split}_core.json", content)

    label_distribution: dict[str, dict[str, int]] = {}
    relation_distribution: dict[str, dict[str, int]] = {}
    for split in SPLIT_NAMES:
        labels, relations = _distributions(filtered_splits[split])
        label_distribution[split] = _counter_dict(labels)
        relation_distribution[split] = _counter_dict(relations)

    report: JsonObject = {
        "document_count_by_split": {
            split: len(filtered_splits[split]) for split in SPLIT_NAMES
        },
        "excluded_label_counts": _counter_dict(excluded_labels),
        "excluded_relation_counts": _counter_dict(excluded_relations),
        "input_sha256": {
            split: hashlib.sha256(split_paths[split].read_bytes()).hexdigest()
            for split in SPLIT_NAMES
        },
        "label_distribution_by_split": label_distribution,
        "relation_distribution_by_split": relation_distribution,
        "schema_sha256": hashlib.sha256(schema_path.read_bytes()).hexdigest(),
        "schema_version": schema.version,
    }
    _atomic_write(
        report_path,
        _stable_json(report, pretty=True),
    )
    return report


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Filter reviewed resume splits to a versioned core schema."
    )
    parser.add_argument("--train", type=Path, required=True)
    parser.add_argument("--validation", type=Path, required=True)
    parser.add_argument("--test", type=Path, required=True)
    parser.add_argument("--schema", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    arguments = build_argument_parser().parse_args(argv)
    try:
        report = build_core_dataset(
            split_paths={
                "train": arguments.train,
                "validation": arguments.validation,
                "test": arguments.test,
            },
            schema_path=arguments.schema,
            output_dir=arguments.output_dir,
        )
    except ReviewMergeError as error:
        print(f"core dataset build failed: {error}", file=sys.stderr)
        return 2

    print(
        _stable_json(
            {
                "documents": report["document_count_by_split"],
                "output_dir": str(arguments.output_dir),
                "schema_version": report["schema_version"],
            },
            pretty=True,
        ),
        end="",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
