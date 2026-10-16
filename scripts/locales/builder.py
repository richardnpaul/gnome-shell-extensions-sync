"""
PO file builder helper
"""
import os
import re
import subprocess

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PO_DIR = os.path.join(BASE_DIR, "po")
POT_PATH = os.path.join(PO_DIR, "extensions-sync@richardnpaul.github.com.pot")

def load_pot_blocks():
    with open(POT_PATH, "r", encoding="utf-8") as f:
        pot_text = f.read()

    entries = re.split(r'\n\n(?=#:)', pot_text)[1:]
    blocks = []
    for b in entries:
        lines = b.strip().split("\n")
        comments = []
        msgid = ""
        in_msgid = False
        for l in lines:
            if l.startswith("#"):
                comments.append(l)
            elif l.startswith("msgid "):
                msgid = l[6:].strip().strip('"')
                in_msgid = True
            elif in_msgid and l.startswith('"'):
                msgid += l.strip().strip('"')
            elif l.startswith("msgstr"):
                in_msgid = False
        blocks.append((comments, msgid))
    return blocks

POT_BLOCKS = load_pot_blocks()

def build_po(lang_code, lang_name, translations):
    out_lines = [
        f"# Translation of Extensions Sync into {lang_name} ({lang_code})",
        "# Copyright (C) 2026 Richard Paul",
        "# This file is distributed under the same license as the Extensions Sync package.",
        "#",
        'msgid ""',
        'msgstr ""',
        '"Project-Id-Version: Extensions Sync 1\\n"',
        '"Report-Msgid-Bugs-To: https://github.com/richardnpaul/gnome-shell-extensions-sync/issues\\n"',
        '"POT-Creation-Date: 2026-10-12 12:20+0100\\n"',
        '"PO-Revision-Date: 2026-10-12 12:40+0100\\n"',
        f'"Last-Translator: Extensions Sync Translators <translators@extensions-sync.org>\\n"',
        f'"Language-Team: {lang_name} Translators\\n"',
        f'"Language: {lang_code}\\n"',
        '"MIME-Version: 1.0\\n"',
        '"Content-Type: text/plain; charset=UTF-8\\n"',
        '"Content-Transfer-Encoding: 8bit\\n"',
        ""
    ]

    for comments, msgid in POT_BLOCKS:
        for c in comments:
            out_lines.append(c)

        # Escape msgid
        escaped_msgid = msgid.replace('"', '\\"')
        out_lines.append(f'msgid "{escaped_msgid}"')

        # Lookup translation
        val = translations.get(msgid, msgid)
        # Ensure %s placeholder matches
        if "%s" in msgid and "%s" not in val:
            val = val + " (%s)"

        escaped_val = val.replace('"', '\\"')
        out_lines.append(f'msgstr "{escaped_val}"')
        out_lines.append("")

    po_path = os.path.join(PO_DIR, f"{lang_code}.po")
    with open(po_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines))

    # Verify compilation
    res = subprocess.run(["msgfmt", "-c", "-v", po_path], capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"msgfmt error for {lang_code}: {res.stderr}")
    return po_path
