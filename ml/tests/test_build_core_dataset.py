from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml.resume_analysis.apply_ollama_reviews import ReviewMergeError
from ml.resume_analysis.build_core_dataset import (
    CoreSchema,
    filter_document_to_core,
    load_core_schema,
)


def span(span_id: str, label: str, start: int, end: int, text: str) -> dict:
    return {
        "id": span_id,
        "from_name": "label",
        "to_name": "text",
        "type": "labels",
        "value": {"start": start, "end": end, "text": text, "labels": [label]},
    }


def relation(
    relation_id: str,
    relation_type: str,
    source_id: str,
    target_id: str,
) -> dict:
    return {
        "id": relation_id,
        "from_id": source_id,
        "to_id": target_id,
        "type": "relation",
        "direction": "right",
        "labels": [relation_type],
    }


def task(results: list[dict]) -> dict:
    return {
        "data": {"document_id": "doc-1", "text": "Alice Acme Python"},
        "predictions": [{"result": results}],
    }


def test_filter_keeps_only_allowed_spans_and_relation_signatures() -> None:
    schema = CoreSchema(
        version="test",
        labels=frozenset({"PERSON_NAME", "COMPANY"}),
        relation_signatures=frozenset(
            {("BELONGS_TO", "PERSON_NAME", "COMPANY")}
        ),
    )
    document = task(
        [
            span("s1", "PERSON_NAME", 0, 5, "Alice"),
            span("s2", "COMPANY", 6, 10, "Acme"),
            span("s3", "TECHNICAL_SKILL", 11, 17, "Python"),
            relation("r1", "BELONGS_TO", "s1", "s2"),
            relation("r2", "BELONGS_TO", "s1", "s3"),
        ]
    )

    filtered, excluded_labels, excluded_relations = filter_document_to_core(
        document, schema
    )
    results = filtered["predictions"][0]["result"]

    assert [result["id"] for result in results] == ["s1", "s2", "r1"]
    assert excluded_labels == {"TECHNICAL_SKILL": 1}
    assert excluded_relations == {"BELONGS_TO": 1}
    assert document["predictions"][0]["result"][-1]["id"] == "r2"


def test_checked_in_core_schema_has_25_well_formed_labels() -> None:
    schema_path = (
        Path(__file__).parents[1]
        / "resume_analysis"
        / "schemas"
        / "core_v1.json"
    )

    schema = load_core_schema(schema_path)

    assert schema.version == "core-v1"
    assert len(schema.labels) == 25
    assert len(schema.relation_signatures) == 7
    for _, source_label, target_label in schema.relation_signatures:
        assert source_label in schema.labels
        assert target_label in schema.labels


def test_schema_rejects_relation_labels_outside_label_set(tmp_path: Path) -> None:
    schema_path = tmp_path / "invalid.json"
    schema_path.write_text(
        json.dumps(
            {
                "version": "invalid",
                "labels": ["PERSON_NAME"],
                "relation_signatures": [
                    {
                        "relation_type": "BELONGS_TO",
                        "source_label": "PERSON_NAME",
                        "target_label": "COMPANY",
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(ReviewMergeError, match="outside schema.labels"):
        load_core_schema(schema_path)
