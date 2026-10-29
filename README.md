# 911 Archive — Porsche 911 gallery

A responsive, static website for a curated Porsche 911 collection. Built with plain HTML, CSS, JavaScript and JSON; no build process or framework is required.

## Files

- `index.html` — collection landing page and detail-page shell
- `styles.css` — responsive styling
- `script.js` — loads `cars.json`, filters the collection and renders per-car galleries
- `cars.json` — vehicle inventory and content
- `assets/` — add your photographs and videos here

## Run locally

Because the page uses `fetch()` to read `cars.json`, don't open `index.html` directly as a `file://` URL. Run a local web server from this folder, for example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Add a car

1. Create a folder such as `assets/964-my-car/`.
2. Add a cover photo and gallery photos. Use descriptive, web-friendly filenames; compressed WebP/JPEG images are recommended.
3. Add or duplicate an object in `cars.json`. The `id` must be unique.
4. Set `cover` and each `gallery[].src` to paths relative to the repository root, e.g. `assets/964-my-car/front-3q.webp`.
5. Add maintenance entries, history, ownership information and video paths only when you have verified them.

A car detail page is opened with a URL such as `index.html?car=964-my-car`.

## Suggested folder layout

```text
.
├── index.html
├── styles.css
├── script.js
├── cars.json
└── assets/
    ├── hero.jpg
    ├── manifesto.jpg
    ├── 930-turbo-example/
    │   ├── exterior-front-3q.jpg
    │   ├── exterior-rear-3q.jpg
    │   ├── interior-dashboard.jpg
    │   ├── interior-seats.jpg
    │   └── walkaround.mp4
    ├── 964-carrera-example/
    ├── 993-carrera-example/
    ├── 996-gt3-example/
    ├── 997-carrera-example/
    ├── 991-targa-example/
    └── 992-carrera-example/
```

The sample JSON includes one example for each requested generation. The listed cars, prices, mileages and histories are illustrative placeholders, not real inventory. Replace them before publishing. The hero image paths are also placeholders; add your own licensed images as `assets/hero.jpg` and `assets/manifesto.jpg`.

## Publish on GitHub Pages

1. Create a GitHub repository and upload these files plus your `assets/` folder.
2. In repository **Settings → Pages**, choose **Deploy from a branch**, select your default branch and `/ (root)`.
3. Save and wait for the deployment URL.
4. Keep paths relative (`./styles.css`, `./cars.json`, `./assets/...`) so the site also works when published under a repository subpath.

## Before going live

- Replace `hello@example.com` in `index.html`, `cars.json` and `script.js` with your real contact email.
- Replace all sample vehicle content with verified information.
- Obtain permission or appropriate licences for every photograph and video.
- Do not publish VINs, previous-owner names or personal data unless you have a lawful basis and permission.
- This is a static gallery: enquiries open the visitor's email client. A server-side form, inventory management, or private document delivery would need a separate service.
- The design is not affiliated with Porsche AG. Do not imply official affiliation or use brand assets without permission.


## Current vehicle data

The collection data in `cars.json` is based on the supplied five-car file. Year, mileage, displacement, power and transmission are displayed from that data. Price remains “Price on request” only when no price has been provided. Empty optional history, ownership and maintenance sections are identified as not supplied rather than filled with sample claims. Add matching car photographs under `assets/<folder>/` to display images for these records.
