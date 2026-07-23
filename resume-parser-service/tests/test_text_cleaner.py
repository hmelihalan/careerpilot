from app.text_cleaner import clean_text


def test_normalizes_windows_and_mac_line_endings() -> None:
    raw = "Line one\r\nLine two\rLine three\n"
    cleaned = clean_text(raw)

    assert "\r" not in cleaned
    assert cleaned.splitlines() == ["Line one", "Line two", "Line three"]


def test_removes_null_bytes() -> None:
    cleaned = clean_text("Jane\x00 Doe")

    assert "\x00" not in cleaned
    assert cleaned == "Jane Doe"


def test_normalizes_non_breaking_spaces() -> None:
    cleaned = clean_text("Jane\u00a0Doe")

    assert "\u00a0" not in cleaned
    assert cleaned == "Jane Doe"


def test_trims_trailing_whitespace_per_line() -> None:
    raw = "Summary line   \nSecond line\t\t\n"
    cleaned = clean_text(raw)

    for line in cleaned.splitlines():
        assert line == line.rstrip()


def test_collapses_repeated_spaces_and_tabs() -> None:
    raw = "Skills:    Python,\t\tSQL"
    cleaned = clean_text(raw)

    assert cleaned == "Skills: Python, SQL"


def test_collapses_excessive_blank_lines() -> None:
    raw = "Summary\n\n\n\n\nExperience"
    cleaned = clean_text(raw)

    assert cleaned == "Summary\n\nExperience"


def test_preserves_line_and_paragraph_boundaries() -> None:
    raw = "Summary\n\nBuilt reliable systems.\n\nExperience\nSenior Engineer"
    cleaned = clean_text(raw)

    assert cleaned == raw


def test_preserves_technology_names_and_punctuation() -> None:
    raw = "Skilled in C++, C#, .NET, Node.js, and React.js."
    cleaned = clean_text(raw)

    assert "C++" in cleaned
    assert "C#" in cleaned
    assert ".NET" in cleaned
    assert "Node.js" in cleaned
    assert "React.js" in cleaned


def test_preserves_contact_and_quantitative_details() -> None:
    raw = (
        "Email: jane.doe@example.com\n"
        "Phone: +1 (555) 123-4567\n"
        "Portfolio: https://janedoe.dev\n"
        "Reduced latency by 35% and saved $120,000 in Jan 2024."
    )
    cleaned = clean_text(raw)

    assert "jane.doe@example.com" in cleaned
    assert "+1 (555) 123-4567" in cleaned
    assert "https://janedoe.dev" in cleaned
    assert "35%" in cleaned
    assert "$120,000" in cleaned
    assert "Jan 2024" in cleaned


def test_does_not_lowercase_text() -> None:
    raw = "SENIOR SOFTWARE ENGINEER"

    assert clean_text(raw) == raw


def test_handles_empty_input() -> None:
    assert clean_text("") == ""
