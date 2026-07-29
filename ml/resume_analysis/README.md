# Ollama resume review merge

`ml.resume_analysis.apply_ollama_reviews` applies independently valid review
operations to the existing train, validation, and test splits. It never combines
or re-splits documents.

## Discovered source schema

The files currently under `ml/data/` are UTF-8 JSON arrays, not JSONL. The
loader supports both JSON arrays and one-object-per-line JSONL.

Each split record is a Label Studio-style task:

```json
{
  "data": {
    "filename": "resume.pdf",
    "raw_text": "...",
    "text": "...",
    "document_id": "sha256-like stable ID",
    "review_status": "manual_review",
    "review_reasons": [],
    "warnings": [],
    "corrections": [],
    "ollama_review": {
      "model": "qwen3:4b",
      "review_complete": false,
      "validated_changes_applied": 0,
      "source": "local_private_checkpoint"
    }
  },
  "predictions": [
    {
      "model_version": "...",
      "score": 0.9,
      "result": []
    }
  ]
}
```

A span in `predictions[0].result` has:

```json
{
  "id": "s00001",
  "from_name": "label",
  "to_name": "text",
  "type": "labels",
  "value": {
    "start": 0,
    "end": 5,
    "text": "Alice",
    "labels": ["PERSON_NAME"]
  },
  "score": 0.9,
  "meta": {"confidence": 0.9, "source": "layout_rule"}
}
```

A relation has `type="relation"`, `id`, `from_id`, `to_id`, `direction`, a
single-item `labels` array, optional `score`, and `meta`.

The observed source does not contain a separate checked-in label schema. The
merger therefore derives the allowed span labels and relation types from the
union of all three input splits and reports those allowed values. Existing
nested/overlapping spans are permitted; exact duplicate spans are not.

## Required review patch schema

A review is an object keyed by top-level `document_id`. `source_index` is audit
metadata only and is never used for matching.

```json
{
  "document_id": "document ID from a split",
  "source_index": 123,
  "model": "qwen3:4b",
  "review_complete": false,
  "delete_span_ids": ["s00001"],
  "add_spans": [
    {
      "id": "temporary-review-id",
      "label": "SKILL",
      "start": 18,
      "end": 21,
      "exact_text": "SQL",
      "confidence": 0.95
    }
  ],
  "delete_relation_ids": ["r00001"],
  "add_relations": [
    {
      "relation_type": "BELONGS_TO",
      "source_id": "temporary-review-id",
      "target_id": "s00002",
      "confidence": 0.8
    }
  ],
  "validation_errors": [],
  "unresolved_reason_codes": []
}
```

The four operation arrays are optional and default to empty. Additions accept
the existing Label Studio aliases `labels`, `from_id`, and `to_id` where they
are unambiguous. A Label Studio task containing `data` and `predictions` is not
a patch and fails with a schema error rather than being treated as a no-op.

## Merge and validation policy

Operations run in deterministic order:

1. Span deletions.
2. Span additions.
3. Relation deletions.
4. Relation additions.

An invalid operation is rejected without discarding independent valid
operations from the same review. `review_complete` is recorded but never used
as an acceptance gate.

Span additions require:

- A label observed in the source schema.
- Integer (not Boolean) `start` and `end` offsets.
- `0 <= start < end <= len(data.text)`.
- Non-empty `exact_text` equal to `data.text[start:end]` byte-for-character.
- No existing or previously accepted span with the same label and offsets.
- Missing confidence, or a finite numeric confidence in `[0, 1]`.

No whitespace normalization, fuzzy search, or offset relocation is performed.
Missing offsets are rejected. The pipeline therefore never guesses where an
unresolved span belongs.

Relation additions require an observed relation type, live source and target
span endpoints after all span mutations, distinct endpoints, no duplicate
relation, and an optional confidence in `[0, 1]`. A temporary ID on an accepted
span addition may be referenced by a relation addition in the same review; it
is mapped to the generated stable ID.

Deleting a span also removes existing relations that would otherwise dangle.
These deterministic cleanups are included in per-document status records and
aggregate cleanup counts. Unknown delete IDs and missing relation endpoints are
operation-level rejections.

Stable span and relation IDs are SHA-256-derived from the document ID and
semantic annotation key. Re-running the same inputs is deterministic, and
reapplying a patch to reviewed output cannot duplicate an annotation.

Every base and final task receives full-document validation for:

- Required document ID and text.
- Exactly one prediction result array.
- Unique span and relation IDs.
- Allowed labels and relation types.
- In-bounds offsets and exact text slices.
- Non-empty and non-duplicate spans.
- Existing relation endpoints.
- Non-self and non-duplicate relations.
- Confidence values in `[0, 1]` when present.
- Supported annotation result types.

Reviewed output retains invalid base documents for traceability. Clean output
contains only final documents with no validation errors. Base-invalid and
final-invalid counts are reported separately.

Accepted additions are not marked as human gold. Provenance is stored under
`meta`:

```json
{
  "source": "ollama_review",
  "provenance": "ollama_review",
  "requires_review": true,
  "review_model": "qwen3:4b",
  "review_document_id": "...",
  "review_confidence": 0.95
}
```

## Split integrity

The merger indexes tasks by `data.document_id` and matches only against the
review's top-level `document_id`. It fails on duplicate IDs within a split or
across splits. Output membership and order must equal each input split, and the
training ID set is checked against validation and test IDs.

Normalized resume text is used only for leakage detection:

```text
casefold(" ".join(text.split()))
```

Cross-split normalized-text duplicates are reported with a SHA-256 digest and
the affected split/document IDs. They are never silently deleted. Non-strict
mode produces outputs but marks split integrity as failed; strict mode stops.

## CLI

Explicit paths are recommended:

```bash
python -m ml.resume_analysis.apply_ollama_reviews \
  --train ml/data/train.json \
  --validation ml/data/validation.json \
  --test ml/data/test.json \
  --reviews ml/data/ollama_successful_reviews_1421.jsonl \
  --output-dir ml/data/processed/reviewed
```

PowerShell:

```powershell
python -m ml.resume_analysis.apply_ollama_reviews `
  --train ml/data/train.json `
  --validation ml/data/validation.json `
  --test ml/data/test.json `
  --reviews ml/data/ollama_successful_reviews_1421.jsonl `
  --output-dir ml/data/processed/reviewed
```

If paths are omitted, the CLI searches JSON/JSONL files beneath directories
named `data`. Discovery requires one unambiguous candidate for each input.
`train`, `validation`/`valid`/`val`/`dev`, and `test` use exact stems. The review
candidate must contain `ollama` and `review` or `validated` in its stem.

### Dry run

```powershell
python -m ml.resume_analysis.apply_ollama_reviews `
  --train ml/data/train.json `
  --validation ml/data/validation.json `
  --test ml/data/test.json `
  --reviews ml/data/ollama_successful_reviews_1421.jsonl `
  --output-dir ml/data/processed/reviewed-dry-run `
  --dry-run
```

Dry-run parses and validates all inputs, simulates every operation, and writes
only `review_merge_report.json`. It does not write reviewed, clean, rejection,
or status JSONL files.

### Strict mode

`--strict` additionally fails if a review has no matching split document or if
normalized text is duplicated across splits. Invalid JSON, missing required
fields, duplicate document IDs, ambiguous discovery, and malformed structural
fields always fail, regardless of strict mode. Individual bad review operations
remain operation-level rejections.

## Outputs

A non-dry run writes atomically:

```text
reviewed/
├── train_reviewed.jsonl
├── validation_reviewed.jsonl
├── test_reviewed.jsonl
├── train_clean.jsonl
├── validation_clean.jsonl
├── test_clean.jsonl
├── rejected_review_operations.jsonl
├── document_review_status.jsonl
└── review_merge_report.json
```

JSON object keys and aggregate map keys are sorted. Document order follows the
original split order; operation audit order follows review and operation order.
The report contains input SHA-256 hashes so raw-file immutability can be checked
after the merge.

## Known limitations and current input state

- There is no active resume annotation/audit implementation on the current Git
  branch. Historical code provided deterministic JSONL/atomic-write patterns,
  but no Label Studio or review-patch schema to import directly.
- Allowed labels and relation types are inferred from the three inputs. A valid
  schema value absent from every split needs a future explicit schema file
  before it can be accepted.
- Overlaps are allowed because the observed data contains nested section and
  entity spans and no stricter overlap policy exists in the repository.
- Exact offsets are required. Ambiguous or unresolved text is never searched or
  repaired.
- JSON arrays must be loaded as arrays; JSONL is read record by record.
- The current `ml/data/resume_tasks_ollama_validated_1421.json` is exactly the
  concatenation of the current train, validation, and test arrays. It contains
  post-validation Label Studio tasks and none of the four patch operation
  fields. It is not the required raw review patch input and is intentionally
  rejected by this pipeline.
