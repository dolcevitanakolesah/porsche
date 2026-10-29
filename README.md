# 911 Archive — photo naming

This is a static website for GitHub Pages. No build step is required.

## Photo naming convention

For each car, the `folder` and `prefix` in `cars.json` must be identical. Example:

```json
{
  "folder": "Venice",
  "prefix": "Venice",
  "imageAlt": "Porsche 911 in Venice",
  "title": "Porsche 911 — Venice",
  "description": ["First paragraph.", "Second paragraph."]
}
```

Put photographs in `assets/Venice/`:

- `Venice-Main.jpg` — used as the collection-card thumbnail only.
- `Venice-01.jpg`, `Venice-02.jpg`, `Venice-03.jpg` … — shown in the individual car's gallery.

Use a two-digit sequence (`01` through `99`), with no gaps in the numbering. The gallery checks the numbered files until the first missing number. File names and capitalization must match exactly. JPG extension is lowercase.

The five-field `cars.json` format remains simple: `folder`, `prefix`, `imageAlt`, `title`, and `description`.

## Publish on GitHub Pages

Upload the contents of this folder to your repository and enable GitHub Pages for the branch/folder you use. Open the site through GitHub Pages (or a local web server), not by double-clicking `index.html`, because the page fetches `cars.json`.
