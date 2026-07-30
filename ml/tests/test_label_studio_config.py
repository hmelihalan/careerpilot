from __future__ import annotations

from pathlib import Path
from xml.etree import ElementTree

from ml.resume_analysis.build_core_dataset import load_core_schema


ROOT = Path(__file__).parents[1] / "resume_analysis"
CONFIG_PATH = ROOT / "label_studio" / "core_v1_config.xml"
SCHEMA_PATH = ROOT / "schemas" / "core_v1.json"


def test_label_studio_config_matches_core_schema() -> None:
    schema = load_core_schema(SCHEMA_PATH)
    root = ElementTree.parse(CONFIG_PATH).getroot()

    assert root.tag == "View"
    text = root.find("Text")
    assert text is not None
    assert text.attrib == {
        "name": "text",
        "value": "$text",
        "granularity": "word",
    }

    labels_control = root.find("Labels")
    assert labels_control is not None
    assert labels_control.attrib["name"] == "label"
    assert labels_control.attrib["toName"] == "text"
    configured_labels = {
        label.attrib["value"] for label in labels_control.findall("Label")
    }
    assert configured_labels == schema.labels
    assert len(labels_control.findall("Label")) == len(schema.labels)

    relations_control = root.find("Relations")
    assert relations_control is not None
    configured_relation_types = {
        relation.attrib["value"]
        for relation in relations_control.findall("Relation")
    }
    schema_relation_types = {
        relation_type
        for relation_type, _, _ in schema.relation_signatures
    }
    assert configured_relation_types == schema_relation_types
    assert len(relations_control.findall("Relation")) == len(
        schema_relation_types
    )


def test_import_predictions_match_label_studio_control_names() -> None:
    root = ElementTree.parse(CONFIG_PATH).getroot()
    labels_control = root.find("Labels")
    text = root.find("Text")

    assert labels_control is not None
    assert text is not None
    assert labels_control.attrib["name"] == "label"
    assert labels_control.attrib["toName"] == text.attrib["name"]
