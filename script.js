/* 911 Archive — vanilla JS, no build step required.
   Edit cars.json to manage inventory. All asset paths are relative to this repository. */
(() => {
  "use strict";
  const DATA_URL = "./cars.json";
  const root = document.body;
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
  const formatPrice = car => {
    if (car.price_display) return car.price_display;
    if (typeof car.price === "number") return new Intl.NumberFormat("en-US", { style: "currency", currency: car.currency || "EUR", maximumFractionDigits: 0 }).format(car.price);
    return "Price on request";
  };
  const formatMileage = car => car.mileage_display || (car.mileage_km != null ? `${Number(car.mileage_km).toLocaleString("en-US")} km` : "Not specified");
  const formatDescription = value => Array.isArray(value) ? value.filter(Boolean).map(escapeHTML).join("<br><br>") : escapeHTML(value || "");
  const carHref = car => `./index.html?car=${encodeURIComponent(car.id)}`;
  const imagePath = path => path ? `./${String(path).replace(/^\.?\//, "")}` : "";
  const safeArray = value => Array.isArray(value) ? value : [];

  // ---- Image strategy: every photo exists as 4 WebP files -------------------
  //   <prefix>-<NN>-0300.webp  300x200   grid thumbnails (small screens / 1x)
  //   <prefix>-<NN>-0600.webp  600x400   cards + grid thumbnails (2x screens)
  //   <prefix>-<NN>-1200.webp  1200x800  lightbox on phones / tablets
  //   <prefix>-<NN>-1920.webp  1920x1280 lightbox on large screens
  // The browser picks the right file from srcset/sizes; width/height reserve space.
  const IMG_W = 1200, IMG_H = 800; // aspect ratio only (3:2); keeps layout from shifting
  const sizeLabel = size => String(size).padStart(4, "0");
  const variant = (stem, size) => `${stem}-${sizeLabel(size)}.webp`;
  const srcsetOf = (stem, sizes) => sizes.map(size => `${imagePath(variant(stem, size))} ${size}w`).join(", ");
  const CARD_SIZES = [300, 600, 1200];
  const THUMB_SIZES = [300, 600, 1200];
  const LIGHTBOX_SIZES = [1200, 1920];
  const CARD_SIZES_ATTR = "(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw";
  const THUMB_SIZES_ATTR = "(max-width: 700px) 50vw, (min-width: 1450px) 460px, 33vw";
  const LIGHTBOX_SIZES_ATTR = "100vw";

  // Gallery convention: Prefix-Main-0600.webp (cover), Prefix-01-0300.webp ... Prefix-01-1920.webp, Prefix-02-..., ...
  // Listing cards use the main image; the detail view discovers only photos that exist.
  function resolveCarImages(entry) {
    const folder = String(entry.folder || "").replace(/^\/+|\/+$/g, "");
    const prefix = String(entry.prefix || folder).replace(/^\/+|\/+$/g, "");
    if (!folder || !prefix) return [];
    const stem = `assets/${folder}/${prefix}-Main`;
    return [{ src: variant(stem, 600), stem, alt: entry.imageAlt || entry.title || "Porsche 911" }];
  }

  // Cheap existence check: only ever requests the 15 KB thumbnail, never a full-size file.
  const probeThumb = stem => new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = variant(stem, 300);
  });

  async function discoverCarGallery(car) {
    const folder = String(car.folder || "").replace(/^\/+|\/+$/g, "");
    const prefix = String(car.prefix || folder).replace(/^\/+|\/+$/g, "");
    if (!folder || !prefix) return [];
    const dir = `assets/${folder}/${prefix}`;
    const altBase = car.imageAlt || car.title || "Porsche 911";
    const label = n => String(n).padStart(2, "0");
    const items = [];

    // Photos: probe 50 tiny thumbnails IN PARALLEL (one round trip, not one per photo) and keep the first unbroken run.
    // Add or delete photos in the folder and the gallery updates itself; nothing to edit in cars.json.
    const hits = await Promise.all(Array.from({ length: 50 }, (_, i) => probeThumb(`${dir}-${label(i + 1)}`)));
    const photoCount = hits.indexOf(false) === -1 ? hits.length : hits.indexOf(false);
    for (let number = 1; number <= photoCount; number++) {
      const stem = `${dir}-${label(number)}`;
      items.push({ type: "photo", src: variant(stem, 600), stem, alt: `${altBase} — photo ${label(number)}` });
    }

    // Videos: check up to 5 filenames in parallel; missing ones are simply skipped.
    const videoChecks = await Promise.all(Array.from({ length: 5 }, async (_, index) => {
      const number = index + 1;
      const src = `assets/${folder}/${prefix}-video-${label(number)}.mp4`;
      try {
        let response = await fetch(src, { method: "HEAD" });
        if (response.status === 405 || response.status === 501) response = await fetch(src, { headers: { Range: "bytes=0-0" } });
        if (response.ok || response.status === 206) return { number, item: { type: "video", src, stem: src, alt: `${altBase} — video ${label(number)}` } };
      } catch (_) { /* a missing video must not block the others */ }
      return null;
    }));
    for (const result of videoChecks.filter(Boolean).sort((x, y) => x.number - y.number)) items.push(result.item);
    return items;
  }


  async function loadCars() {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`Could not load cars.json (${response.status})`);
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error("cars.json must contain an array of cars.");
      return entries.map((entry, index) => {
        const title = String(entry.title || `Porsche 911 ${index + 1}`);
        const seriesMatch = title.match(/\b(930|964|993|996|997|991|992)\b/);
        const photos = resolveCarImages(entry);
        const price = String(entry.price || "").trim();
        const mileage = String(entry.mileage || "").trim();
        const description = Array.isArray(entry.description)
          ? entry.description.filter(part => String(part).trim()).join("\n\n")
          : String(entry.description || "");
        return {
          ...entry,
          id: String(entry.folder || entry.prefix || `car-${index + 1}`),
          series: seriesMatch ? seriesMatch[1] : "911",
          year: entry.year || (title.match(/\b(?:19|20)\d{2}\b/) || [])[0] || "",
          currency: "EUR",
          price_display: price || "Price on request",
          mileage_display: mileage || "Mileage not specified",
          engine: [entry.displacement, entry.power].filter(Boolean).join(" "),
          cover: photos[0]?.src || "",
          cover_alt: entry.imageAlt || `${title} exterior`,
          gallery: photos,
          description,
          status: "Available for enquiry",
          previous_owners: [],
          maintenance: []
        };
      });
    } catch (error) {
      console.error("Unable to load car inventory:", error);
      const grid = $("#car-grid");
      if (grid) grid.innerHTML = `<div class="load-error"><strong>Collection unavailable.</strong><p>${escapeHTML(error.message || "Unable to load cars.json.")} Check that cars.json is in the repository root and that the site is opened through GitHub Pages or a local web server.</p></div>`;
      return [];
    }
  }

  // If a WebP is missing, hide its tile / show the "911" placeholder instead of a broken-image icon.
  function attachImageFallbacks(parent = document) {
    $$("img[data-fallback]", parent).forEach(img => {
      if (img.dataset.fallbackBound === "true") return;
      img.dataset.fallbackBound = "true";
      const settle = () => {
        const button = img.closest(".gallery-photo");
        if (button) {
          button.hidden = true;
          const gallery = button.closest(".gallery-grid");
          if (gallery && !gallery.querySelector(".gallery-photo:not([hidden])")) {
            const empty = gallery.parentElement.querySelector(".gallery-empty");
            if (empty) empty.hidden = false;
          }
        } else {
          img.hidden = true;
          const fallback = img.nextElementSibling;
          if (fallback && fallback.classList.contains("car-image-fallback")) fallback.hidden = false;
        }
      };
      img.addEventListener("error", settle, { once: true });
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) settle();
    });
  }

  function renderCard(car) {
    const coverStem = car.gallery && car.gallery[0] ? car.gallery[0].stem : "";
    const img = coverStem ? imagePath(variant(coverStem, 600)) : "";
    const title = car.title || `Porsche 911 ${car.series || ""}`;
    const year = car.year || "Year not specified";
    const alt = car.cover_alt || `${title} exterior`;
    return `<article class="car-card">
      <a class="car-card-link" href="${escapeHTML(carHref(car))}" aria-label="View ${escapeHTML(title)}">
        <div class="car-image-wrap">
          ${img ? `<img class="car-image" data-fallback src="${escapeHTML(img)}" srcset="${escapeHTML(srcsetOf(coverStem, CARD_SIZES))}" sizes="${CARD_SIZES_ATTR}" width="${IMG_W}" height="${IMG_H}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async"><div class="car-image-fallback" hidden>911</div>` : `<div class="car-image-fallback">911</div>`}
          <span class="card-arrow" aria-hidden="true">↗</span>
        </div>
        <div class="car-card-meta">
          <div class="card-overline"><span>${escapeHTML(year)}</span><span class="generation">${escapeHTML(car.series || "911")}</span></div>
          <h3>${escapeHTML(title)}</h3>
          <div class="card-specs"><span>${escapeHTML(formatMileage(car))}</span><span class="dot"></span><span>${escapeHTML(car.transmission || "Not specified")}</span></div>
          <div class="card-price-row"><span class="card-price">${escapeHTML(formatPrice(car))}</span><span class="card-detail-link">View car ↗</span></div>
        </div>
      </a>
    </article>`;
  }

  function initListing(cars) {
    const grid = $("#car-grid");
    if (!grid) return;
    let activeSeries = "all";
    let query = "";
    const chips = $$(".filter-chip");
    const render = () => {
      const filtered = cars.filter(car => {
        const matchesSeries = activeSeries === "all" || String(car.series) === activeSeries;
        const haystack = [car.title, car.series, car.year, car.color, car.description, car.stock_number].filter(Boolean).join(" ").toLowerCase();
        return matchesSeries && haystack.includes(query.toLowerCase());
      });
      grid.innerHTML = filtered.map(renderCard).join("");
      attachImageFallbacks(grid);
      $("#results-count").textContent = `${filtered.length} ${filtered.length === 1 ? "car" : "cars"} shown`;
      $("#all-count").textContent = cars.length;
      $("#empty-state").hidden = filtered.length !== 0;
      grid.hidden = filtered.length === 0;
    };
    chips.forEach(chip => chip.addEventListener("click", () => {
      activeSeries = chip.dataset.series;
      chips.forEach(item => item.classList.toggle("active", item === chip));
      render();
    }));
    $("#search-input")?.addEventListener("input", event => { query = event.target.value.trim(); render(); });
    $("#reset-filters")?.addEventListener("click", () => {
      activeSeries = "all"; query = ""; $("#search-input").value = "";
      chips.forEach(item => item.classList.toggle("active", item.dataset.series === "all"));
      render();
    });
    render();
  }

  function detailTemplate(car) {
    const gallery = safeArray(car.gallery);
    const title = car.title || `Porsche 911 ${car.series || ""}`;
    const facts = [
      ["Model year", car.year || "Not specified"], ["Generation", car.series || "911"],
      ["Mileage", formatMileage(car)], ["Displacement", car.displacement || "Not specified"],
      ["Power", car.power || "Not specified"], ["Transmission", car.transmission || "Not specified"]
    ];
    const usableGallery = gallery.length ? gallery : safeArray(car.gallery);
    const galleryMarkup = usableGallery.length ? `
      <div class="gallery-grid" aria-label="Photographs of ${escapeHTML(title)}">
        ${usableGallery.map((photo, i) => `<button class="gallery-photo${photo.type === "video" ? " gallery-video" : ""}" type="button" data-index="${i}" data-type="${photo.type || "photo"}" data-stem="${photo.type === "video" ? "" : escapeHTML(photo.stem)}" aria-label="Open ${photo.type === "video" ? "video" : "photo"} ${i + 1}">
          ${photo.type === "video"
            ? `<video muted playsinline preload="none" data-lazy-video aria-label="${escapeHTML(photo.alt || `${title} video ${i + 1}`)}" style="display:block;width:100%;height:100%;object-fit:cover;pointer-events:none"><source src="${escapeHTML(imagePath(photo.src))}" type="video/mp4"></video><span class="gallery-photo-zoom" aria-hidden="true">▶</span>`
            : `<img data-fallback src="${escapeHTML(imagePath(variant(photo.stem, 600)))}" srcset="${escapeHTML(srcsetOf(photo.stem, THUMB_SIZES))}" sizes="${THUMB_SIZES_ATTR}" width="${IMG_W}" height="${IMG_H}" alt="${escapeHTML(photo.alt || `${title} photo ${i + 1}`)}" ${i < 3 ? `loading="eager"${i === 0 ? ' fetchpriority="high"' : ""}` : 'loading="lazy"'} decoding="async"><span class="gallery-photo-zoom" aria-hidden="true">↗</span>`}
        </button>`).join("")}
      </div>
      <div class="gallery-empty" hidden>No photographs found. Check the car's image filenames and folder.</div>
      <div class="gallery-lightbox" id="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Photo gallery" hidden>
        <button class="lightbox-close" type="button" aria-label="Close gallery">×</button>
        <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous photo">‹</button>
        <figure class="lightbox-figure"><img id="lightbox-image" src="" alt="" decoding="async"><video id="lightbox-video" controls playsinline preload="metadata" hidden style="max-width:100%;max-height:calc(100vh - 130px);width:auto;height:auto;background:#000"><source id="lightbox-video-source" type="video/mp4"></video></figure>
        <button class="lightbox-nav lightbox-next" type="button" aria-label="Next photo">›</button>
        <div class="lightbox-counter" id="lightbox-counter"></div>
      </div>` : `<div class="gallery-empty">Add photos to this car's folder in assets/</div>`;
    const maintenance = safeArray(car.maintenance);
    const owners = safeArray(car.previous_owners);
    const history = car.history || "No separate history details supplied.";
    return `<div class="detail-page">
      <div class="detail-topbar"><a class="wordmark" href="./index.html"><span class="wordmark-mark">911</span><span class="wordmark-copy">ARCHIVE<span>CURATED PORSCHE</span></span></a><a class="back-link" href="./index.html"><span>←</span> Back to collection</a></div>
      <main class="detail-container">
        <p class="detail-kicker">${escapeHTML(car.year || "")} &nbsp; / &nbsp; Porsche 911 ${escapeHTML(car.series || "")}</p>
        <div class="detail-title-row"><h1>${escapeHTML(title)}<span>.</span></h1><div class="detail-price">${escapeHTML(formatPrice(car))}<small>${escapeHTML(car.status || "Available for enquiry")}</small></div></div>
        ${galleryMarkup}
        <section class="detail-overview"><div><p class="eyebrow dark-eyebrow">The car</p><h2>A closer look.</h2><div class="detail-description">${formatDescription(car.description || "A full description for this example will be added shortly.")}</div></div>
          <div class="detail-facts">${facts.map(([label,value])=>`<div class="fact"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join("")}</div>
        </section>
        <section class="detail-section"><p class="eyebrow dark-eyebrow">The story</p><h2>History & provenance</h2><div class="history-grid">
          <div class="history-block"><h3>Vehicle history</h3><p>${escapeHTML(history)}</p>${car.vin ? `<p><strong>VIN / chassis:</strong> ${escapeHTML(car.vin)}</p>` : ""}${car.service_book ? `<p><strong>Documentation:</strong> ${escapeHTML(car.service_book)}</p>` : ""}</div>
          <div class="history-block"><h3>Previous ownership</h3>${owners.length ? `<ul>${owners.map(owner=>`<li>${escapeHTML(typeof owner === "string" ? owner : [owner.period,owner.detail].filter(Boolean).join(" — "))}</li>`).join("")}</ul>` : "<p>No previous-owner details supplied.</p>"}</div>
        </div></section>
        <section class="detail-section"><p class="eyebrow dark-eyebrow">Care & maintenance</p><h2>Work performed.</h2><p class="section-lead">Maintenance entries should be supported by invoices or service records where available.</p>
          ${maintenance.length ? `<div class="history-grid">${maintenance.map(item=>`<div class="history-block"><h3>${escapeHTML(item.date || "Service record")}</h3><p>${escapeHTML(item.description || item)}</p>${item.provider ? `<p><strong>Provider:</strong> ${escapeHTML(item.provider)}</p>` : ""}</div>`).join("")}</div>` : `<p class="detail-description">No maintenance records supplied.</p>`}
        </section>
        <section class="detail-cta"><div><h2>Interested in this 911?</h2><p>Request the full vehicle file, additional photographs or a delivery quote.</p></div><a class="button button-dark" href="mailto:${encodeURIComponent(car.contact_email || "hello@example.com")}?subject=${encodeURIComponent("Enquiry: " + title)}">Enquire about this car ↗</a></section>
      </main>
      <footer class="site-footer"><a class="wordmark footer-wordmark" href="./index.html"><span class="wordmark-mark">911</span><span class="wordmark-copy">ARCHIVE<span>CURATED PORSCHE</span></span></a><div class="footer-bottom"><span>© ${new Date().getFullYear()} 911 Archive</span><span>Independent collection. Not affiliated with Porsche AG.</span><a href="mailto:hello@example.com">Contact ↗</a></div></footer>
    </div>`;
  }

  async function initDetail(cars, id) {
    const car = cars.find(item => String(item.id) === id);
    if (!car) {
      root.innerHTML = `<div class="detail-not-found"><p class="eyebrow dark-eyebrow">404 / Car not found</p><h1>This 911 isn't in the collection.</h1><p>It may have been removed or the link may be incorrect.</p><a class="button button-dark" href="./index.html">Return to collection</a></div>`;
      return;
    }
    car.gallery = await discoverCarGallery(car);
    root.innerHTML = detailTemplate(car);
    attachImageFallbacks(root);
    // Videos: fetch metadata (first frame) only when a tile is about to scroll into view.
    const videos = $$("video[data-lazy-video]", root);
    if (videos.length) {
      const wake = video => { video.preload = "metadata"; video.load(); };
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => entries.forEach(entry => {
          if (entry.isIntersecting) { wake(entry.target); observer.unobserve(entry.target); }
        }), { rootMargin: "300px" });
        videos.forEach(video => observer.observe(video));
      } else videos.forEach(wake);
    }
    const lightbox = $("#gallery-lightbox");
    const lightboxImage = $("#lightbox-image");
    const lightboxVideo = $("#lightbox-video");
    const lightboxVideoSource = $("#lightbox-video-source");
    const lightboxCounter = $("#lightbox-counter");
    let activePhoto = 0;
    const visiblePhotos = () => $$(".gallery-photo", root).filter(button => {
      if (button.hidden) return false;
      if (button.dataset.type === "video") return true;
      // Lazy-loaded tiles are not "complete" yet; only tiles whose file failed are hidden by the fallback handler.
      const image = button.querySelector("img");
      return !!image && !image.hidden;
    });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let slideToken = 0;
    const setLightboxImage = (stem, alt) => {
      lightboxImage.sizes = LIGHTBOX_SIZES_ATTR;
      lightboxImage.srcset = srcsetOf(stem, LIGHTBOX_SIZES); // browser picks 1200 or 1920 for this screen
      lightboxImage.src = imagePath(variant(stem, 1200));
      lightboxImage.alt = alt;
    };
    // direction: +1 = next (slides in from the right), -1 = previous (from the left), 0 = no animation.
    const showPhoto = (index, direction = 0) => {
      const photos = visiblePhotos();
      if (!photos.length) return;
      activePhoto = (index + photos.length) % photos.length;
      const button = photos[activePhoto];
      const isVideo = button.dataset.type === "video";
      const image = button.querySelector("img");
      const token = ++slideToken;
      const wasShowingImage = !lightboxImage.hidden;
      lightboxVideo.pause();
      lightboxVideo.hidden = !isVideo;
      lightboxImage.hidden = isVideo;
      if (isVideo) {
        lightboxImage.getAnimations().forEach(animation => animation.cancel());
        const videoSource = button.querySelector("video source");
        lightboxVideoSource.src = videoSource ? videoSource.src : (button.querySelector("video").currentSrc || button.querySelector("video").src);
        lightboxVideo.load();
        lightboxVideo.currentTime = 0;
        lightboxVideo.play().catch(() => {});
      } else {
        lightboxVideoSource.removeAttribute("src");
        lightboxVideo.load();
        const stem = button.dataset.stem;
        if (direction && wasShowingImage && !reduceMotion.matches && lightboxImage.animate) {
          // 1) slide the current photo out while 2) the next one downloads and decodes, then 3) slide it in.
          lightboxImage.hidden = false;
          const slideOut = lightboxImage.animate(
            [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-direction * 30}%)`, opacity: 0 }],
            { duration: 160, easing: "ease-in", fill: "forwards" });
          const incoming = new Image();
          incoming.sizes = LIGHTBOX_SIZES_ATTR;
          incoming.srcset = srcsetOf(stem, LIGHTBOX_SIZES);
          incoming.src = imagePath(variant(stem, 1200));
          Promise.all([slideOut.finished.catch(() => {}), incoming.decode().catch(() => {})]).then(() => {
            if (token !== slideToken) return; // a newer swipe took over
            lightboxImage.getAnimations().forEach(animation => animation.cancel());
            setLightboxImage(stem, image.alt);
            lightboxImage.animate(
              [{ transform: `translateX(${direction * 30}%)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }],
              { duration: 220, easing: "ease-out" });
          });
        } else {
          lightboxImage.getAnimations().forEach(animation => animation.cancel());
          setLightboxImage(stem, image.alt);
        }
        // Warm the cache with the NEXT photo only, so browsing feels instant without downloading the whole set.
        const next = photos[(activePhoto + 1) % photos.length];
        if (next && next.dataset.stem && next !== button) {
          const warm = new Image();
          warm.sizes = LIGHTBOX_SIZES_ATTR;
          warm.srcset = srcsetOf(next.dataset.stem, LIGHTBOX_SIZES);
          warm.src = imagePath(variant(next.dataset.stem, 1200));
        }
      }
      lightboxCounter.textContent = `${activePhoto + 1} / ${photos.length}`;
      $(".lightbox-prev", lightbox).disabled = photos.length < 2;
      $(".lightbox-next", lightbox).disabled = photos.length < 2;
    };
    const closeLightbox = () => { lightboxVideo.pause(); lightboxVideoSource.removeAttribute("src"); lightboxVideo.load(); lightbox.hidden = true; document.body.classList.remove("lightbox-open"); };
    $$(".gallery-photo", root).forEach(button => button.addEventListener("click", () => {
      const photos = visiblePhotos();
      const clicked = photos.indexOf(button);
      if (clicked < 0) return;
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
      showPhoto(clicked);
      $(".lightbox-close", lightbox).focus();
    }));
    $(".lightbox-close", lightbox)?.addEventListener("click", closeLightbox);
    $(".lightbox-prev", lightbox)?.addEventListener("click", () => showPhoto(activePhoto - 1, -1));
    $(".lightbox-next", lightbox)?.addEventListener("click", () => showPhoto(activePhoto + 1, 1));
    lightbox?.addEventListener("click", event => { if (event.target === lightbox) closeLightbox(); });
    // Swipe left/right on touch screens to move between photos.
    let touchStart = null;
    lightbox?.addEventListener("touchstart", event => {
      // Leave the video's own controls (scrubbing, volume) alone.
      if (event.touches.length !== 1 || event.target.closest("video")) { touchStart = null; return; }
      touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }, { passive: true });
    lightbox?.addEventListener("touchend", event => {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // too short, or mostly vertical
      showPhoto(activePhoto + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    }, { passive: true });
    document.addEventListener("keydown", event => {
      if (!lightbox || lightbox.hidden) return;
      if (event.key === "Escape") closeLightbox();
      else if (event.key === "ArrowLeft") showPhoto(activePhoto - 1, -1);
      else if (event.key === "ArrowRight") showPhoto(activePhoto + 1, 1);
    });
  }

  async function boot() {
    const params = new URLSearchParams(window.location.search);
    const carId = params.get("car");
    const cars = await loadCars();
    if (carId) {
      document.title = `${cars.find(car => String(car.id) === carId)?.title || "Porsche 911"} — 911 Archive`;
      initDetail(cars, carId);
    } else {
      $("#year") && ($("#year").textContent = new Date().getFullYear());
      initListing(cars);
      const toggle = $(".menu-toggle");
      toggle?.addEventListener("click", () => {
        const nav = $(".header-nav");
        const isOpen = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      });
    }
  }
  boot();
})();