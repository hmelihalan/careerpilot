# Core v1 gold-set review guide

## Import

1. Create a new Label Studio project.
2. Open **Settings → Labeling Interface → Code**.
3. Paste the contents of `core_v1_config.xml` and save.
4. Import `ml/data/processed/core-v1/test_core.json`.
5. Confirm that the first task displays colored pre-annotations before
   beginning the review.

The labeling interface must be saved before importing tasks so the prediction
fields `from_name="label"` and `to_name="text"` match the project controls.

## Review standard

For every test document:

1. Remove incorrect spans.
2. Correct span boundaries so they include the entity only.
3. Correct mislabeled spans.
4. Add missing core entities.
5. Review relation direction and type.
6. Submit the task only after the full document has been checked.

Preserve the text exactly. Do not correct OCR or spelling errors inside the
resume text, because annotation offsets refer to the existing text.

## Span guidance

- `PERSON_NAME`: Candidate's name, excluding nearby titles and contact details.
- `EMAIL`, `PHONE`, `CONTACT_LOCATION`: Candidate contact values only.
- `SUMMARY_TEXT`: Summary content without the section heading.
- `EXPERIENCE_BLOCK`: One complete employment entry used as the container for
  its work dates.
- `JOB_TITLE`, `COMPANY`, `WORK_LOCATION`: Values for one employment entry.
- `WORK_START_DATE`, `WORK_END_DATE`: Individual work dates. Use `Present` as
  an end date when it appears in the source.
- `WORK_DESCRIPTION`: Responsibility or activity statements.
- `WORK_ACHIEVEMENT`: Results, awards, quantified impact, or accomplishments
  tied to work.
- `EDUCATION_BLOCK`: One complete education entry used as the container for
  education fields.
- `INSTITUTION`, `DEGREE`, `FIELD_OF_STUDY`, `EDUCATION_LOCATION`: Education
  values only.
- `EDUCATION_START_DATE`, `EDUCATION_END_DATE`: Individual education dates.
- `PROGRAMMING_LANGUAGE`, `DATABASE`: Use only for explicit technologies.
- `SOFT_SKILL`: Non-technical interpersonal or organizational skills.
- `SPOKEN_LANGUAGE`: Human language such as English or Turkish.
- `LANGUAGE_PROFICIENCY`: Proficiency phrase tied to a spoken language.

Overlapping spans are allowed when a block contains its entity spans. Do not
create two spans with the same label and exact offsets.

## Allowed relations

Label Studio can display every relation type between any two selected spans,
so the annotator must enforce these endpoint rules:

| Relation | Source label | Target label |
|---|---|---|
| `AWARDED_BY` | `DEGREE` | `INSTITUTION` |
| `BELONGS_TO` | `JOB_TITLE` | `COMPANY` |
| `HAS_END_DATE` | `EXPERIENCE_BLOCK` | `WORK_END_DATE` |
| `HAS_FIELD` | `EDUCATION_BLOCK` | `FIELD_OF_STUDY` |
| `HAS_LOCATION` | `JOB_TITLE` | `WORK_LOCATION` |
| `HAS_PROFICIENCY` | `SPOKEN_LANGUAGE` | `LANGUAGE_PROFICIENCY` |
| `HAS_START_DATE` | `EXPERIENCE_BLOCK` | `WORK_START_DATE` |

The arrow must point from the source label to the target label. Remove any
relation that does not match one of these seven signatures.

## Export

After all 138 tasks are submitted, export the project as Label Studio JSON.
Keep the exported test set separate from train and validation; never add gold
test corrections to model training.
