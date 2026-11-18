#!/usr/bin/env python3
"""Banner every TEAR stylesheet: block-letter title, gate, purpose, and a table of contents built
from the file's own section headers.

  python3 tools/css-banners.py .            rewrite every banner (run from the repo root)
  python3 tools/css-banners.py . --check    exit 1 if any banner is stale

Section headers (written by hand, inside the files) look like:

/* ════════════ … ════════════
   §2 ▸ SEARCH
   One or more lines of description.
   ════════════ … ════════════ */

and sub-sections:

/* ── §2.1 Type picker ───────── … */
"""
import json
import re
import subprocess
import sys
from pathlib import Path

W = 100  # every banner and rule line is exactly this wide

FONT = {
    "A": [" ███ ", "█   █", "█████", "█   █", "█   █"],
    "B": ["████ ", "█   █", "████ ", "█   █", "████ "],
    "C": [" ████", "█    ", "█    ", "█    ", " ████"],
    "D": ["████ ", "█   █", "█   █", "█   █", "████ "],
    "E": ["█████", "█    ", "████ ", "█    ", "█████"],
    "F": ["█████", "█    ", "████ ", "█    ", "█    "],
    "G": [" ████", "█    ", "█  ██", "█   █", " ████"],
    "H": ["█   █", "█   █", "█████", "█   █", "█   █"],
    "I": ["███", " █ ", " █ ", " █ ", "███"],
    "J": ["  ███", "    █", "    █", "█   █", " ███ "],
    "K": ["█   █", "█  █ ", "███  ", "█  █ ", "█   █"],
    "L": ["█    ", "█    ", "█    ", "█    ", "█████"],
    "M": ["█   █", "██ ██", "█ █ █", "█   █", "█   █"],
    "N": ["█   █", "██  █", "█ █ █", "█  ██", "█   █"],
    "O": [" ███ ", "█   █", "█   █", "█   █", " ███ "],
    "P": ["████ ", "█   █", "████ ", "█    ", "█    "],
    "Q": [" ███ ", "█   █", "█ █ █", "█  █ ", " ██ █"],
    "R": ["████ ", "█   █", "████ ", "█  █ ", "█   █"],
    "S": [" ████", "█    ", " ███ ", "    █", "████ "],
    "T": ["█████", "  █  ", "  █  ", "  █  ", "  █  "],
    "U": ["█   █", "█   █", "█   █", "█   █", " ███ "],
    "V": ["█   █", "█   █", "█   █", " █ █ ", "  █  "],
    "W": ["█   █", "█   █", "█ █ █", "██ ██", "█   █"],
    "X": ["█   █", " █ █ ", "  █  ", " █ █ ", "█   █"],
    "Y": ["█   █", " █ █ ", "  █  ", "  █  ", "  █  "],
    "Z": ["█████", "   █ ", "  █  ", " █   ", "█████"],
    " ": ["  ", "  ", "  ", "  ", "  "],
}


def letters(text):
    """Block letters, five rows."""
    rows = ["" for _ in range(5)]
    for ch in text.upper():
        for i, part in enumerate(FONT[ch]):
            rows[i] += part + " "
    return [r.rstrip() for r in rows]


# The box's right edge is column 97, so the bottom line's closing " */" ends at exactly W (100).
INNER = W - 8  # rule length between the corners


def box_line(text=""):
    return "   │  " + text.ljust(INNER - 2) + "│"


def wrap(text, width):
    words, lines, line = text.split(), [], ""
    for w in words:
        if line and len(line) + 1 + len(w) > width:
            lines.append(line)
            line = w
        else:
            line = f"{line} {w}".strip()
    return lines + ([line] if line else [])


SECTION = re.compile(r"^\s*§(\d+) ▸ (.+?)\s*$|^\s*/\* ── §(\d+\.\d+) (.+?) ─", re.M)


def toc(css):
    """(number, title) for every section and sub-section, in file order; sub-sections indented."""
    return [(n, t) if n else ("  " + sn, st) for n, t, sn, st in SECTION.findall(css)]


BANNER_START = "/* ┌"
BANNER = re.compile(r"\A/\* ┌.*?┘ \*/\n+", re.S)


def banner(title, rows, contents):
    top = "/* ┌" + "─" * INNER + "┐"
    sep = "   ├" + "─" * INNER + "┤"
    bottom = "   └" + "─" * INNER + "┘ */"
    out = [top, box_line()]
    out += [box_line(" " + r) for r in letters(title)]
    out.append(sep)
    label = max(len(k) for k, _ in rows)
    for key, value in rows:
        chunks = wrap(value, INNER - 6 - label)
        out.append(box_line(f"{key.ljust(label)} : {chunks[0]}"))
        out += [box_line(" " * (label + 3) + c) for c in chunks[1:]]
    if contents:
        out.append(sep)
        for n, name in contents:
            entry = f"§{n.ljust(3)}{name}" if not n.startswith(" ") else f"  §{n.strip().ljust(5)}{name}"
            out.append(box_line(entry))
    out.append(bottom)
    return "\n".join(out)


def strip_banner(css):
    """Drop an existing banner (re-runs replace it)."""
    return BANNER.sub("", css, count=1)


def features(repo):
    """id → (label, description) from lib/model.js."""
    js = (repo / "lib/model.js").read_text()
    found = {}
    for m in re.finditer(r'\{ group: "[^"]+", id: "(\w+)",(?: on: true,)? label: "([^"]+)", description: "((?:[^"\\]|\\.)*)"', js):
        found[m.group(1)] = (m.group(2), json.loads('"' + m.group(3) + '"'))
    return found


# Titles short enough for the block letters; anything else uses the feature's label.
TITLES = {"header": "TOP BAR", "pageHeader": "PAGE HEADERS", "statusIcons": "STATUS ICONS",
          "accountLinks": "ACCOUNT LINKS", "sidebarOrder": "SIDEBAR ORDER", "attackLog": "ATTACK LOG",
          "awards": "AWARDS", "areas": "AREAS", "rings": "RINGS", "card": "CARD", "grid": "PAGE GRID",
          "widgets": "WIDGETS"}

OTHERS = {
    "content/assets.css": ("ASSETS", [("file", "content/assets.css"), ("loads", "always, first of TEAR's sheets"),
                                      ("holds", "TEAR's cascade layer order; Torn's image assets as --tear-asset-* variables")]),
    "content/dock.css": ("DOCK", [("file", "content/dock.css"), ("loads", "always, with or without TEAR enabled"),
                                  ("holds", "The dock's info and settings buttons, their size tokens, the room under the page")]),
}


def render(repo, path):
    rel = str(path.relative_to(repo))
    css = strip_banner(path.read_text())
    if rel in OTHERS:
        title, rows = OTHERS[rel]
    else:
        fid = path.stem
        label, desc = features(repo)[fid]
        title = TITLES.get(fid, label.upper())
        rows = [("feature", f"{label} ({fid})"), ("file", rel), ("gate", f"html.tear-enabled:where(.tear-f-{fid})"), ("styles", desc)]
    return banner(title, rows, toc(css)) + "\n\n" + css


def main():
    repo = Path(sys.argv[1]).resolve()
    check = "--check" in sys.argv
    paths = [repo / "content/assets.css", repo / "content/dock.css", *sorted((repo / "content/features").glob("*.css"))]
    stale = []
    for path in paths:
        new = render(repo, path)
        if new != path.read_text():
            stale.append(path)
            if not check:
                path.write_text(new)
    for p in stale:
        print(("stale: " if check else "wrote: ") + str(p.relative_to(repo)))
    sys.exit(1 if check and stale else 0)


if __name__ == "__main__":
    main()
