"""Batch-fetch product photos (and fill missing prices) for inventory items.

Input lines: <item-id> <product-page-url> [photo-only]
Run: python3 gear-study/upgrade_items.py < list.txt
"""
import contextlib
import glob
import io
import json
import os
import re
import sys
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_product as fp  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def load_all():
    pages = {}
    for path in glob.glob(os.path.join(HERE, "data", "page*.json")):
        pages[path] = json.load(open(path))
    return pages


def main():
    pages = load_all()
    index = {it["id"]: (path, it) for path, items in pages.items() for it in items}
    dirty = set()
    for line in sys.stdin:
        parts = line.split()
        if len(parts) < 2 or parts[0].startswith("#"):
            continue
        item_id, url = parts[0], parts[1]
        photo_only = len(parts) > 2
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                fp.main(item_id, url)
        except (Exception, SystemExit) as e:
            print(f"{item_id}: FAILED {str(e)[:80]}")
            continue
        msg = out.getvalue().strip()
        print(msg)
        m = re.search(r"price on page: ([\d.]+)", msg)
        path, it = index[item_id]
        if m and not photo_only and it.get("price") is None and float(m.group(1)) > 0:
            it["price"] = float(m.group(1))
            it["price_src"] = url
            notes = re.sub(r"\s*PRICE NOT CONFIRMED[^.]*\.?", "", it.get("notes", "")).strip()
            it["notes"] = (notes + f" Price from {urlparse(url).netloc} product page.").strip()
            dirty.add(path)
    for path in dirty:
        json.dump(pages[path], open(path, "w"), indent=1, ensure_ascii=False)
    print(f"updated prices in {len(dirty)} page file(s)")


if __name__ == "__main__":
    main()
