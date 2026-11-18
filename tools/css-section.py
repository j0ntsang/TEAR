#!/usr/bin/env python3
"""Print a TEAR stylesheet section header, 100 columns wide.

  python3 tools/css-section.py <indent> <number> "<TITLE>" "<description, wrapped for you>"
  python3 tools/css-section.py <indent> <number.sub> "<Sub title>"          (a one-line sub-section rule)

<indent> is the number of spaces the surrounding rules are indented by (0 in most files, 2 inside
nested blocks). Paste the output above the section's first rule (above that rule's own comment).
"""
import sys

W = 100


def wrap(text, width):
    words, lines, line = text.split(), [], ""
    for w in words:
        if line and len(line) + 1 + len(w) > width:
            lines.append(line)
            line = w
        else:
            line = f"{line} {w}".strip()
    return lines + ([line] if line else [])


indent = " " * int(sys.argv[1])
number, title = sys.argv[2], sys.argv[3]
k = len(indent)
if "." in number:
    head = f"{indent}/* ── §{number} {title} "
    print(head + "─" * (W - len(head) - 3) + " */")
else:
    desc = sys.argv[4] if len(sys.argv) > 4 else ""
    print(f"{indent}/* " + "═" * (W - k - 3))
    print(f"{indent}   §{number} ▸ {title.upper()}")
    for line in wrap(desc, W - k - 3):
        print(f"{indent}   {line}")
    print(f"{indent}   " + "═" * (W - k - 6) + " */")
