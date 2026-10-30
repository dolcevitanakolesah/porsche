# Image files to prepare (all WebP, 3:2)

Per car, in `assets/<folder>/`:

| File                          | Size       | Target |
|-------------------------------|------------|--------|
| `<prefix>-Main-0300/0600/1200/1920.webp` | cover | card uses 0300/0600/1200 |
| `<prefix>-01-0300.webp` ... `-1920.webp` | photo 01 | repeat for 02, 03, ... |
| `<prefix>-video-01.mp4`       | optional   | unchanged |

Site-wide, in `assets/`:
`hero-0600.webp, hero-1200.webp, hero-1920.webp` and `manifesto-0600.webp, manifesto-1200.webp, manifesto-1920.webp`
(replace `hero.jpg` / `manifesto.jpg`). Make the hero a strong, light image: it is the LCP element.

Example: `964-Creances-01-0300.webp` (300x200, ~15 KB), `-0600` (~40 KB), `-1200` (~75 KB), `-1920` (~150 KB).

# cars.json
No change needed. Add or delete photos (up to 50) and videos (up to 5) in the folder and the site finds them automatically.

# Caching
`_headers` works on Netlify / Cloudflare Pages; `.htaccess` on Apache. GitHub Pages cannot set headers:
put Cloudflare (free) in front of the domain and add a Cache Rule for `/assets/*` (Edge + Browser TTL 1 year).
Because images are cached for a year, give a replaced image a new filename.
