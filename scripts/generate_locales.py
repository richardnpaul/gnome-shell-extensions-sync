#!/usr/bin/env python3
"""
Generate comprehensive PO translation files for 140 worldwide languages
covering Europe (without Russian), the Americas, Africa, the Middle East,
Oceania, Central Asia, and Eastern Asia.
"""

import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

PO_DIR = os.path.join(BASE_DIR, "po")

# Ensure Russian is dropped
RU_PATH = os.path.join(PO_DIR, "ru.po")
if os.path.exists(RU_PATH):
    os.remove(RU_PATH)
    print("Removed Russian translation: po/ru.po")

from scripts.locales.europe import build_europe
from scripts.locales.americas import build_americas
from scripts.locales.middle_east import build_middle_east
from scripts.locales.africa import build_africa
from scripts.locales.asia import build_asia
from scripts.locales.oceania import build_oceania

def main():
    print("Building all regional language PO catalogs...")
    e = build_europe()
    print(f"Built {e} European languages.")
    a = build_americas()
    print(f"Built {a} Americas languages.")
    m = build_middle_east()
    print(f"Built {m} Middle Eastern languages.")
    af = build_africa()
    print(f"Built {af} African languages.")
    as_ = build_asia()
    print(f"Built {as_} Asian languages.")
    o = build_oceania()
    print(f"Built {o} Oceanic languages.")
    po_count = len([f for f in os.listdir(PO_DIR) if f.endswith(".po")])
    print(f"Total .po language files in po/: {po_count}")

if __name__ == "__main__":
    main()
