# claude.website

My personal site. Static, hand-written, no build step.

```
index.html      the whole page
styles.css      design tokens, light + dark themes, layout
main.js         theme toggle, rotating line, current year
assets/         favicon
```

## Preview

Open `index.html` directly, or serve it:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Notes

- No framework, no dependencies, no tracking, no cookies.
- Colors are CSS custom properties on `:root`, redefined for dark mode via
  `prefers-color-scheme` and overridable with `data-theme="light" | "dark"`.
  The toggle cycles auto, light, dark and remembers the choice in
  `localStorage` (wrapped in try/catch, so private windows degrade to auto).
- Layout holds a single 900px text column. Full-bleed bands get it from
  symmetric padding, normal bands from `max-width`, so their text edges line up.
- Motion respects `prefers-reduced-motion`: the typing line renders statically
  and the cursor stops blinking.
- Deployable as-is to GitHub Pages or any static host; the repository root is
  the document root.
