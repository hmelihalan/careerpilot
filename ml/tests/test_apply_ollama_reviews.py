from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from ml.resume_analysis.apply_ollama_reviews import (
    ReviewMergeError,
    document_id,
    find_cross_split_text_duplicates,
    load_json_records,
    merge_datasets,
    normalize_review_records,
    run_pipeline,
    validate_document,
)


def span(
    span_id: str,
    label: str,
    start: int,
    end: int,
    text: str,
    *,
    score: float = 0.9,
) -> dict[str, object]:
    return {
        "id": span_id,
        "from_name": "label",
        "to_name": "text",
        "type": "labels",
        "value": {"start": start, "end": end, "text": text, "labels": [label]},
        "score": score,
        "meta": {"confidence": score, "source": "fixture"},
    }


def relation(
    relation_id: str,
    relation_type: str,
    source_id: str,
    target_id: str,
) -> dict[str, object]:
    return {
        "id": relation_id,
        "from_name": "label",
        "to_name": "text",
        "type": "relation",
        "from_id": source_id,
        "to_id": target_id,
        "direction": "right",
        "labels": [relation_type],
        "score": 0.8,
        "meta": {"confidence": 0.8, "source": "fixture"},
    }


def task(
    document_id: str,
    *,
    text: str = "Alice Acme Python SQL 2020",
    results: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    if results is None:
        results = [
            span("s1", "PERSON_NAME", 0, 5, "Alice"),
            span("s2", "COMPANY", 6, 10, "Acme"),
            span("s3", "TECHNICAL_SKILL", 11, 17, "Python"),
            relation("r1", "BELONGS_TO", "s1", "s2"),
        ]
    return {
        "data": {
            "document_id": document_id,
            "filename": f"{document_id}.pdf",
            "raw_text": text,
            "text": text,
        },
        "predictions": [
            {"model_version": "fixture-v1", "score": 0.8, "result": results}
        ],
    }


def patch(document_id: str, **operations: object) -> dict[str, object]:
    record: dict[str, object] = {
        "document_id": document_id,
        "review_complete": False,
        "model": "qwen3:4b",
        "source_index": 999,
    }
    record.update(operations)
    return record


def wrapped_patch(document_id: str, **operations: object) -> dict[str, object]:
    nested_review: dict[str, object] = {
        "review_complete": True,
        "unresolved_reason_codes": [],
        "delete_span_ids": [],
        "add_spans": [],
        "delete_relation_ids": [],
        "add_relations": [],
    }
    nested_review.update(operations)
    return {
        "document_id": document_id,
        "model": "qwen3:4b",
        "source_index": 999,
        "validation_errors": [],
        "review": nested_review,
    }


def splits(*train_documents: dict[str, object]) -> dict[str, list[dict[str, object]]]:
    return {
        "train": [copy.deepcopy(document) for document in train_documents],
        "validation": [],
        "test": [],
    }


def results_for(document: dict[str, object]) -> list[dict[str, object]]:
    predictions = document["predictions"]
    assert isinstance(predictions, list)
    prediction = predictions[0]
    assert isinstance(prediction, dict)
    results = prediction["result"]
    assert isinstance(results, list)
    return results


def test_valid_span_addition_has_stable_non_gold_provenance() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [
            patch(
                "doc-1",
                add_spans=[
                    {
                        "id": "proposed-sql",
                        "label": "TECHNICAL_SKILL",
                        "start": 18,
                        "end": 21,
                        "exact_text": "SQL",
                        "confidence": 0.95,
                    }
                ],
            )
        ],
    )

    added = results_for(artifacts.reviewed["train"][0])[-1]
    assert str(added["id"]).startswith("ollama_span_")
    assert added["meta"] == {
        "confidence": 0.95,
        "provenance": "ollama_review",
        "requires_review": True,
        "review_confidence": 0.95,
        "review_document_id": "doc-1",
        "review_model": "qwen3:4b",
        "source": "ollama_review",
    }
    assert artifacts.report["applied_operation_counts"] == {"add_spans": 1}


def test_nested_ollama_review_envelope_is_normalized_and_applied() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [
            wrapped_patch(
                "doc-1",
                add_spans=[
                    {
                        "id": "proposed-sql",
                        "label": "TECHNICAL_SKILL",
                        "start": 18,
                        "end": 21,
                        "exact_text": "SQL",
                        "confidence": 0.95,
                    }
                ],
            )
        ],
    )

    added = results_for(artifacts.reviewed["train"][0])[-1]
    assert added["value"]["text"] == "SQL"
    requested = artifacts.report["requested_operation_counts"]
    assert requested["add_spans"] == 1
    assert sum(requested.values()) == 1
    assert artifacts.report["applied_operation_counts"] == {"add_spans": 1}
    assert artifacts.document_statuses[0]["review_complete"] is True


def test_conflicting_flat_and_nested_review_fields_are_rejected() -> None:
    review = wrapped_patch("doc-1", delete_span_ids=["s1"])
    review["delete_span_ids"] = ["s2"]

    with pytest.raises(ReviewMergeError, match="conflicting top-level and nested"):
        normalize_review_records([review])


def test_nested_review_must_be_an_object() -> None:
    review = patch("doc-1")
    review["review"] = []

    with pytest.raises(ReviewMergeError, match=r"reviews\[0\]\.review must be an object"):
        normalize_review_records([review])


def test_valid_span_deletion() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")), [patch("doc-1", delete_span_ids=["s3"])]
    )

    ids = {result["id"] for result in results_for(artifacts.reviewed["train"][0])}
    assert "s3" not in ids
    assert artifacts.report["deleted_span_counts_by_label"] == {"TECHNICAL_SKILL": 1}


def test_unknown_span_deletion_rejects_only_operation() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")), [patch("doc-1", delete_span_ids=["missing"])]
    )

    assert artifacts.reviewed["train"] == splits(task("doc-1"))["train"]
    assert artifacts.rejected_operations[0]["reason"] == "unknown_delete_span_id"
    assert artifacts.document_statuses[0]["status"] == "unchanged"


def test_valid_relation_addition() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [
            patch(
                "doc-1",
                add_relations=[
                    {
                        "relation_type": "BELONGS_TO",
                        "source_id": "s1",
                        "target_id": "s3",
                        "confidence": 0.7,
                    }
                ],
            )
        ],
    )

    relations = [
        result
        for result in results_for(artifacts.reviewed["train"][0])
        if result["type"] == "relation"
    ]
    assert len(relations) == 2
    assert str(relations[-1]["id"]).startswith("ollama_relation_")
    relation_meta = relations[-1]["meta"]
    assert isinstance(relation_meta, dict)
    assert relation_meta["provenance"] == "ollama_review"


def test_relation_with_missing_endpoint_is_rejected() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [
            patch(
                "doc-1",
                add_relations=[
                    {
                        "relation_type": "BELONGS_TO",
                        "source_id": "missing",
                        "target_id": "s3",
                    }
                ],
            )
        ],
    )

    assert artifacts.rejected_operations[0]["reason"] == "missing_source_endpoint"


def test_relation_deletion() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")), [patch("doc-1", delete_relation_ids=["r1"])]
    )

    ids = {result["id"] for result in results_for(artifacts.reviewed["train"][0])}
    assert "r1" not in ids
    assert artifacts.report["deleted_relation_counts_by_type"] == {"BELONGS_TO": 1}


def test_text_offset_mismatch_is_rejected() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [
            patch(
                "doc-1",
                add_spans=[
                    {
                        "label": "TECHNICAL_SKILL",
                        "start": 18,
                        "end": 21,
                        "exact_text": "Python",
                    }
                ],
            )
        ],
    )

    assert artifacts.rejected_operations[0]["reason"] == "text_mismatch"


def test_duplicate_span_addition_is_rejected() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [
            patch(
                "doc-1",
                add_spans=[
                    {
                        "label": "TECHNICAL_SKILL",
                        "start": 11,
                        "end": 17,
                        "exact_text": "Python",
                    }
                ],
            )
        ],
    )

    assert artifacts.rejected_operations[0]["reason"] == "duplicate_span"


def test_duplicate_relation_addition_is_rejected() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [
            patch(
                "doc-1",
                add_relations=[
                    {
                        "relation_type": "BELONGS_TO",
                        "source_id": "s1",
                        "target_id": "s2",
                    }
                ],
            )
        ],
    )

    assert artifacts.rejected_operations[0]["reason"] == "duplicate_relation"


def test_partial_acceptance_ignores_review_complete() -> None:
    review = patch(
        "doc-1",
        delete_span_ids=["missing"],
        add_spans=[
            {
                "label": "TECHNICAL_SKILL",
                "start": 18,
                "end": 21,
                "exact_text": "SQL",
            }
        ],
    )
    review["review_complete"] = False
    artifacts = merge_datasets(splits(task("doc-1")), [review])

    status = artifacts.document_statuses[0]
    assert status["status"] == "partially_applied"
    assert status["applied_operations"] == 1
    assert status["rejected_operations"] == 1


def test_deleted_span_cleans_dangling_relation() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")), [patch("doc-1", delete_span_ids=["s2"])]
    )

    ids = {result["id"] for result in results_for(artifacts.reviewed["train"][0])}
    assert {"s2", "r1"}.isdisjoint(ids)
    assert artifacts.document_statuses[0]["automatic_relation_cleanups"] == [
        {
            "deleted_span_id": "s2",
            "relation_id": "r1",
            "relation_type": "BELONGS_TO",
        }
    ]
    assert artifacts.report["automatic_relation_cleanup_counts_by_type"] == {
        "BELONGS_TO": 1
    }


def test_duplicate_document_ids_fail_before_merge() -> None:
    duplicate_splits = {
        "train": [task("duplicate")],
        "validation": [task("duplicate", text="Different")],
        "test": [],
    }
    with pytest.raises(ReviewMergeError, match="Duplicate document_id"):
        merge_datasets(duplicate_splits, [])


def test_cross_split_document_leakage_fails() -> None:
    duplicate_splits = {
        "train": [task("duplicate")],
        "validation": [],
        "test": [task("duplicate")],
    }
    with pytest.raises(ReviewMergeError, match="Duplicate document_id"):
        merge_datasets(duplicate_splits, [])


def test_cross_split_normalized_text_duplicates_are_reported_and_strict_fails() -> None:
    duplicate_splits = {
        "train": [task("train-id", text="Same\n Resume")],
        "validation": [task("validation-id", text=" same   resume ")],
        "test": [],
    }

    duplicates = find_cross_split_text_duplicates(duplicate_splits)
    assert len(duplicates) == 1
    artifacts = merge_datasets(duplicate_splits, [])
    assert artifacts.report["split_integrity"]["passed"] is False
    with pytest.raises(ReviewMergeError, match="normalized-text"):
        merge_datasets(duplicate_splits, [], strict=True)


def test_unknown_review_document_is_audited_and_strict_fails() -> None:
    review = patch("unknown", delete_span_ids=["s1"])
    artifacts = merge_datasets(splits(task("doc-1")), [review])

    assert artifacts.report["unmatched_review_count"] == 1
    assert artifacts.document_statuses[-1]["status"] == "review_unmatched"
    assert artifacts.rejected_operations[0]["reason"] == "unknown_document_id"
    with pytest.raises(ReviewMergeError, match="not present in any split"):
        merge_datasets(splits(task("doc-1")), [review], strict=True)


def test_reapplying_same_patch_is_logically_idempotent() -> None:
    review = patch(
        "doc-1",
        add_spans=[
            {
                "id": "new-sql",
                "label": "TECHNICAL_SKILL",
                "start": 18,
                "end": 21,
                "exact_text": "SQL",
            }
        ],
    )
    first = merge_datasets(splits(task("doc-1")), [review])
    second = merge_datasets(splits(copy.deepcopy(first.reviewed["train"][0])), [review])

    assert second.reviewed == first.reviewed
    ids = [result["id"] for result in results_for(second.reviewed["train"][0])]
    assert len(ids) == len(set(ids))


def write_array(path: Path, records: list[dict[str, object]]) -> None:
    path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")


def write_jsonl(path: Path, records: list[dict[str, object]]) -> None:
    path.write_text(
        "".join(
            json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n"
            for record in records
        ),
        encoding="utf-8",
    )


def pipeline_inputs(tmp_path: Path) -> tuple[Path, Path, Path, Path]:
    train = tmp_path / "train.json"
    validation = tmp_path / "validation.json"
    test = tmp_path / "test.json"
    reviews = tmp_path / "reviews.jsonl"
    write_array(train, [task("train-id")])
    write_array(validation, [task("validation-id", text="Val")])
    write_array(test, [task("test-id", text="Test")])
    write_jsonl(reviews, [])
    return train, validation, test, reviews


def test_output_ordering_is_byte_deterministic(tmp_path: Path) -> None:
    train, validation, test, reviews = pipeline_inputs(tmp_path)
    write_jsonl(
        reviews,
        [
            patch(
                "train-id",
                add_spans=[
                    {
                        "label": "TECHNICAL_SKILL",
                        "start": 18,
                        "end": 21,
                        "exact_text": "SQL",
                    }
                ],
            )
        ],
    )
    output_one = tmp_path / "out-one"
    output_two = tmp_path / "out-two"

    run_pipeline(
        train_path=train,
        validation_path=validation,
        test_path=test,
        reviews_path=reviews,
        output_dir=output_one,
    )
    run_pipeline(
        train_path=train,
        validation_path=validation,
        test_path=test,
        reviews_path=reviews,
        output_dir=output_two,
    )

    for filename in (
        "train_reviewed.jsonl",
        "validation_reviewed.jsonl",
        "test_reviewed.jsonl",
        "train_clean.jsonl",
        "validation_clean.jsonl",
        "test_clean.jsonl",
        "rejected_review_operations.jsonl",
        "document_review_status.jsonl",
        "review_merge_report.json",
    ):
        assert (output_one / filename).read_bytes() == (
            output_two / filename
        ).read_bytes()


def test_final_document_validation_failure_is_excluded_from_clean_output() -> None:
    invalid = task(
        "invalid",
        text="Alice",
        results=[span("bad", "PERSON_NAME", 0, 5, "Wrong")],
    )
    artifacts = merge_datasets(splits(invalid), [])

    assert artifacts.reviewed["train"] == [invalid]
    assert artifacts.clean["train"] == []
    assert artifacts.report["invalid_base_documents"] == 1
    assert artifacts.report["invalid_final_documents"] == 1
    assert artifacts.document_statuses[0]["status"] == "document_invalid"


def test_split_membership_is_preserved() -> None:
    original = {
        "train": [task("train-1")],
        "validation": [task("validation-1", text="Validation")],
        "test": [task("test-1", text="Testing")],
    }
    artifacts = merge_datasets(original, [])

    for split_name in ("train", "validation", "test"):
        original_ids = [document_id(item) for item in original[split_name]]
        reviewed_ids = [document_id(item) for item in artifacts.reviewed[split_name]]
        assert reviewed_ids == original_ids
    assert artifacts.report["split_integrity"]["membership_unchanged"] is True
    assert (
        artifacts.report["split_integrity"]["training_excludes_validation_and_test"]
        is True
    )


def test_dry_run_writes_only_report(tmp_path: Path) -> None:
    train, validation, test, reviews = pipeline_inputs(tmp_path)
    output = tmp_path / "dry-run"

    artifacts = run_pipeline(
        train_path=train,
        validation_path=validation,
        test_path=test,
        reviews_path=reviews,
        output_dir=output,
        dry_run=True,
    )

    assert artifacts.report["dry_run"] is True
    assert sorted(path.name for path in output.iterdir()) == [
        "review_merge_report.json"
    ]


def test_label_studio_task_is_rejected_as_patch_input(tmp_path: Path) -> None:
    train, validation, test, reviews = pipeline_inputs(tmp_path)
    write_array(reviews, [task("train-id")])

    with pytest.raises(ReviewMergeError, match="not a review patch"):
        run_pipeline(
            train_path=train,
            validation_path=validation,
            test_path=test,
            reviews_path=reviews,
            output_dir=tmp_path / "out",
            dry_run=True,
        )


def test_full_validator_rejects_dangling_relation() -> None:
    invalid = task(
        "invalid",
        results=[
            span("s1", "PERSON_NAME", 0, 5, "Alice"),
            relation("r1", "BELONGS_TO", "s1", "missing"),
        ],
    )
    errors = validate_document(
        invalid,
        allowed_labels={"PERSON_NAME"},
        allowed_relation_types={"BELONGS_TO"},
    )

    assert "missing_target_endpoint" in {error["code"] for error in errors}


def test_temporary_span_id_conflict_cannot_retarget_relation() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [
            patch(
                "doc-1",
                add_spans=[
                    {
                        "id": "s1",
                        "label": "TECHNICAL_SKILL",
                        "start": 18,
                        "end": 21,
                        "exact_text": "SQL",
                    }
                ],
                add_relations=[
                    {
                        "relation_type": "BELONGS_TO",
                        "source_id": "s1",
                        "target_id": "s3",
                    }
                ],
            )
        ],
    )

    assert [item["reason"] for item in artifacts.rejected_operations] == [
        "proposed_span_id_conflict",
        "ambiguous_source_endpoint",
    ]
    assert artifacts.reviewed["train"] == splits(task("doc-1"))["train"]


def test_duplicate_temporary_span_ids_reject_all_ambiguous_additions() -> None:
    addition = {
        "id": "new-skill",
        "label": "TECHNICAL_SKILL",
        "start": 18,
        "end": 21,
        "exact_text": "SQL",
    }
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [patch("doc-1", add_spans=[addition, copy.deepcopy(addition)])],
    )

    assert [item["reason"] for item in artifacts.rejected_operations] == [
        "duplicate_proposed_span_id",
        "duplicate_proposed_span_id",
    ]


def test_duplicate_base_span_id_makes_deletion_ambiguous() -> None:
    ambiguous = task(
        "doc-1",
        results=[
            span("duplicate", "PERSON_NAME", 0, 5, "Alice"),
            span("duplicate", "COMPANY", 6, 10, "Acme"),
        ],
    )
    artifacts = merge_datasets(
        splits(ambiguous), [patch("doc-1", delete_span_ids=["duplicate"])]
    )

    assert artifacts.rejected_operations[0]["reason"] == "ambiguous_delete_span_id"
    assert artifacts.reviewed["train"] == [ambiguous]
    assert artifacts.document_statuses[0]["status"] == "document_invalid"


def test_explicit_relation_delete_satisfied_by_span_cleanup() -> None:
    artifacts = merge_datasets(
        splits(task("doc-1")),
        [
            patch(
                "doc-1",
                delete_span_ids=["s2"],
                delete_relation_ids=["r1"],
            )
        ],
    )

    assert artifacts.rejected_operations == []
    assert artifacts.document_statuses[0]["status"] == "fully_applied"
    assert artifacts.report["applied_operation_counts"] == {
        "delete_relation_ids": 1,
        "delete_span_ids": 1,
    }


def test_validation_only_label_does_not_authorize_training_addition() -> None:
    source = {
        "train": [task("train-id")],
        "validation": [
            task(
                "validation-id",
                text="Eval",
                results=[span("eval", "EVAL_ONLY", 0, 4, "Eval")],
            )
        ],
        "test": [],
    }
    artifacts = merge_datasets(
        source,
        [
            patch(
                "train-id",
                add_spans=[
                    {
                        "label": "EVAL_ONLY",
                        "start": 18,
                        "end": 21,
                        "exact_text": "SQL",
                    }
                ],
            )
        ],
    )

    assert artifacts.rejected_operations[0]["reason"] == "unknown_label"
    assert "EVAL_ONLY" not in artifacts.report["allowed_labels"]


def test_nonstandard_json_numeric_constants_are_rejected(tmp_path: Path) -> None:
    invalid_json = tmp_path / "invalid.json"
    invalid_json.write_text('[{"document_id":"x","score":NaN}]', encoding="utf-8")

    with pytest.raises(ReviewMergeError, match="Non-standard JSON numeric"):
        load_json_records(invalid_json, kind="reviews")


def test_leakage_normalization_handles_unicode_and_empty_text() -> None:
    source = {
        "train": [
            task("accent-train", text="Café", results=[]),
            task("empty-train", text="", results=[]),
        ],
        "validation": [
            task("accent-validation", text="Cafe\u0301", results=[]),
            task("empty-validation", text="  \n", results=[]),
        ],
        "test": [],
    }

    duplicates = find_cross_split_text_duplicates(source)
    assert len(duplicates) == 2
    with pytest.raises(ReviewMergeError, match="normalized-text"):
        merge_datasets(source, [], strict=True)


def test_dry_run_rejects_directory_with_stale_dataset_outputs(tmp_path: Path) -> None:
    train, validation, test, reviews = pipeline_inputs(tmp_path)
    output = tmp_path / "stale-dry-run"
    output.mkdir()
    (output / "train_reviewed.jsonl").write_text("", encoding="utf-8")

    with pytest.raises(ReviewMergeError, match="separate directory"):
        run_pipeline(
            train_path=train,
            validation_path=validation,
            test_path=test,
            reviews_path=reviews,
            output_dir=output,
            dry_run=True,
        )


def test_unmatched_noop_review_counts_a_rejected_review() -> None:
    artifacts = merge_datasets(splits(task("doc-1")), [patch("unknown")])

    assert artifacts.report["rejected_operation_counts"] == {"review": 1}
    assert artifacts.document_statuses[-1]["rejected_operations"] == 1
    assert artifacts.document_statuses[-1]["rejection_reasons"] == {
        "unknown_document_id": 1
    }
