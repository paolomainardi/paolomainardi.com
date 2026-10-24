#!/usr/bin/env python3
"""Check a post's prose against the rules in .claude/skills/write-post/voice.md.

Fails on dashes used as punctuation (em dash, en dash, a spaced hyphen) and on
marketing words. Code blocks, inline code, shortcodes, front matter, URLs and
link targets are skipped, so commands and paths never trip it.

Usage: python3 scripts/check-post-style.py <post index.md>...
"""
import re
import sys

MARKETING = [
    "blazing", "seamless", "seamlessly", "powerful", "cutting-edge",
    "best-in-class", "revolutionary", "next level", "next-level", "effortless",
    "effortlessly", "robust", "game-changer", "game changer", "supercharge",
    "leverage", "unlock", "delve", "elevate", "in today's", "let's dive",
    "in conclusion",
]
DASH = re.compile(r"[—–]|\s-\s")


def prose_lines(text):
    """Yield (number, line) for lines of prose, with code and markup removed."""
    lines = text.split("\n")
    in_front = lines and lines[0].strip() in ("+++", "---")
    fence = None
    for n, line in enumerate(lines, 1):
        stripped = line.strip()
        if in_front:
            if n > 1 and stripped in ("+++", "---"):
                in_front = False
            continue
        if fence:
            if stripped.startswith(fence):
                fence = None
            continue
        m = re.match(r"(```+|~~~+)", stripped)
        if m:
            fence = m.group(1)
            continue
        clean = re.sub(r"`[^`]*`", "", line)
        clean = re.sub(r"\{\{[<%].*?[>%]\}\}", "", clean)
        clean = re.sub(r"\]\([^)]*\)", "]", clean)
        clean = re.sub(r"https?://\S+", "", clean)
        clean = re.sub(r"^\s*[-*+] ", "", clean)
        clean = re.sub(r"^\s*\|?[\s:|-]+\|?\s*$", "", clean)
        yield n, clean


def main():
    problems = 0
    for path in sys.argv[1:]:
        with open(path, encoding="utf-8") as f:
            text = f.read()
        for n, line in prose_lines(text):
            if DASH.search(line):
                print(f"{path}:{n}: dash used as punctuation: {line.strip()[:90]}")
                problems += 1
            low = line.lower()
            for word in MARKETING:
                if re.search(r"(?<![a-z])" + re.escape(word) + r"(?![a-z])", low):
                    print(f"{path}:{n}: marketing word '{word}': {line.strip()[:90]}")
                    problems += 1
    print(f"style check: {problems} problems")
    sys.exit(1 if problems else 0)


main()
