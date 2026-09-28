"""Inline the game scripts and styles into dist/index.html and copy the gear data."""
import pathlib, shutil

here = pathlib.Path(__file__).parent
page = (here / "index.html").read_text()
for mark, src in [("/*GIGS*/", "gigs.js"), ("/*QUOTES*/", "quotes.js"),
                  ("/*ARCADECSS*/", "arcade.css"), ("/*ARCADE*/", "arcade.js")]:
    assert page.count(mark) == 1, mark
    page = page.replace(mark, (here / src).read_text())
(here / "dist").mkdir(exist_ok=True)
(here / "dist" / "index.html").write_text(page)
shutil.copy(here / "gear.json", here / "dist" / "gear.json")
print("built dist/index.html")
