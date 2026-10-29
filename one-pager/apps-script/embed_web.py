"""Embed web.html into Code.gs as the WEB_PAGE constant, so the whole tool is one paste.

Run after editing web.html:  python3 one-pager/apps-script/embed_web.py
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
code_path = HERE / "Code.gs"
code = code_path.read_text()
page = json.dumps((HERE / "web.html").read_text(), ensure_ascii=False)
line = f"const WEB_PAGE = {page};\n"
if re.search(r"^const WEB_PAGE = .*$", code, flags=re.M):
    code = re.sub(r"^const WEB_PAGE = .*\n", lambda _: line, code, flags=re.M)
else:
    code = code.replace("// ---------------------------------------------------------------- button images",
                        "// ---------------------------------------------------------------- web page (from web.html)\n"
                        + line + "\n// ---------------------------------------------------------------- button images")
code_path.write_text(code)
print("embedded", len(page), "chars")
