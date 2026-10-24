#!/usr/bin/env python3
"""Fail unless a pull request only adds or edits link entries.

Used by the PR check on branches named links/*, which the daily links routine
opens and which merge on their own once checks pass. Takes the base ref to
diff against. A change is accepted only when every changed file is a link
entry, src/content/links/<slug>.md, whose front matter has a title, an https
link and a date, uses no keys beyond those plus tags and via, and whose text
holds no HTML and no Hugo shortcode.
"""
import re
import subprocess
import sys

ENTRY = re.compile(r"^src/content/links/[a-z0-9][a-z0-9-]*\.md$")
KEYS = {"title", "link", "date", "tags", "via"}


def fail(msg):
    print(f"links check: {msg}")
    sys.exit(1)


def check_entry(path):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if "<" in text or "{{" in text:
        fail(f"{path}: HTML or a shortcode is not allowed in a link entry")
    parts = text.split("---\n")
    if len(parts) < 3 or parts[0] != "":
        fail(f"{path}: front matter must open the file between --- lines")
    meta = {}
    for line in parts[1].splitlines():
        m = re.match(r"^([a-z]+):\s*(.*)$", line)
        if not m:
            fail(f"{path}: unexpected front matter line: {line!r}")
        meta[m.group(1)] = m.group(2).strip().strip('"')
    if set(meta) - KEYS:
        fail(f"{path}: unexpected keys {sorted(set(meta) - KEYS)}")
    for key in ("title", "link", "date"):
        if not meta.get(key):
            fail(f"{path}: {key} is required")
    if not meta["link"].startswith("https://"):
        fail(f"{path}: link must start with https://")


def main():
    base = sys.argv[1]
    out = subprocess.run(
        ["git", "diff", "--name-status", "--no-renames", f"{base}...HEAD"],
        check=True, capture_output=True, text=True,
    ).stdout.splitlines()
    if not out:
        fail("the pull request changes nothing")
    for line in out:
        status, path = line.split("\t", 1)
        if status not in ("A", "M") or not ENTRY.match(path):
            fail(f"{status} {path}: only link entries may change")
        check_entry(path)
    print(f"links check: {len(out)} link entries, all valid")


main()
