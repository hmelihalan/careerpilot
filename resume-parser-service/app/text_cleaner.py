"""Conservative text cleaning for extracted resume text.

This module intentionally does very little: it normalizes whitespace and
line endings without tokenizing, lowercasing, or removing any content.
Contact details, punctuation, and technology names (C++, C#, .NET,
Node.js, React.js, etc.) are preserved because nothing here touches
non-whitespace characters.
"""

import re

_CR_LF_PATTERN = re.compile(r"\r\n?")
_NULL_BYTE_PATTERN = re.compile(r"\x00")
_NBSP_PATTERN = re.compile(r"[\u00a0\u202f]")
_INTERIOR_WHITESPACE_PATTERN = re.compile(r"[ \t]{2,}")
_EXCESSIVE_BLANK_LINES_PATTERN = re.compile(r"\n{3,}")


def clean_text(raw_text: str) -> str:
    """Conservatively clean extracted PDF text.

    Steps:
      1. Normalize CRLF/CR line endings to LF.
      2. Strip null bytes.
      3. Normalize non-breaking spaces to regular spaces.
      4. Collapse runs of 2+ spaces/tabs within a line to a single space.
      5. Trim trailing whitespace on each line.
      6. Collapse 3+ consecutive blank lines down to at most 2.
    """

    if not raw_text:
        return ""

    text = _CR_LF_PATTERN.sub("\n", raw_text)
    text = _NULL_BYTE_PATTERN.sub("", text)
    text = _NBSP_PATTERN.sub(" ", text)

    lines = [
        _INTERIOR_WHITESPACE_PATTERN.sub(" ", line).rstrip()
        for line in text.split("\n")
    ]
    text = "\n".join(lines)
    text = _EXCESSIVE_BLANK_LINES_PATTERN.sub("\n\n", text)

    return text.strip()
