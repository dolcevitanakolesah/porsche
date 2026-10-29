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

  // Gallery convention: Prefix-Main.jpg, Prefix-01.jpg, Prefix-02.jpg, ...
  // Listing cards use the main image; the detail view discovers only photos that exist.
  function resolveCarImages(entry) {
    const folder = String(entry.folder || "").replace(/^\/+|\/+$/g, "");
    const prefix = String(entry.prefix || folder).replace(/^\/+|\/+$/g, "");
    if (!folder || !prefix) return [];
    const stem = `assets/${folder}/${prefix}-Main`;
    return [{ src: `${stem}.jpg`, stem, alt: entry.imageAlt || entry.title || "Porsche 911" }];
  }

  function probeImage(stem, alt) {
    // Probe supported extensions concurrently instead of waiting for each 404 in turn.
    // This matters on GitHub Pages, where the gallery may contain many numbered photos.
    const extensions = ["jpg", "jpeg", "webp", "JPG", "JPEG", "WEBP"];
    return new Promise(resolve => {
      let remaining = extensions.length;
      let settled = false;
      for (const extension of extensions) {
        const src = `${stem}.${extension}`;
        const image = new Image();
        image.onload = () => {
          if (settled) return;
          settled = true;
          resolve({ src, stem, alt });
        };
        image.onerror = () => {
          remaining -= 1;
          if (!remaining && !settled) {
            settled = true;
            resolve(null);
          }
        };
        image.src = src;
      }
    });
  }

  async function discoverCarGallery(car) {
    const folder = String(car.folder || "").replace(/^\/+|\/+$/g, "");
    const prefix = String(car.prefix || folder).replace(/^\/+|\/+$/g, "");
    if (!folder || !prefix) return [];
    const dir = `assets/${folder}/${prefix}`;
    const altBase = car.imageAlt || car.title || "Porsche 911";
    const items = [];
    // -Main is reserved for the collection-card thumbnail. The detail gallery
    // contains numbered photos first, followed by PREFIX-video-01.mp4, etc.
    for (let number = 1; number <= 30; number++) {
      const label = String(number).padStart(2, "0");
      const photo = await probeImage(`${dir}-${label}`, `${altBase} — photo ${label}`);
      if (!photo) break;
      items.push({ ...photo, type: "photo" });
    }
    // Probe videos only after photos so they are appended at the end. HEAD avoids
    // downloading the video just to discover whether the file exists.
    for (let number = 1; number <= 20; number++) {
      const label = String(number).padStart(2, "0");
      const src = `assets/${folder}/${prefix}-video-${label}.mp4`;
      let exists = false;
      try {
        const response = await fetch(src, { method: "HEAD" });
        exists = response.ok;
      } catch (_) { exists = false; }
      if (!exists) break;
      items.push({ type: "video", src, stem: src, alt: `${altBase} — video ${label}` });
    }
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
          maintenance: [],
          videos: []
        };
      });
    } catch (error) {
      console.error("Unable to load car inventory:", error);
      const grid = $("#car-grid");
      if (grid) grid.innerHTML = `<div class="load-error"><strong>Collection unavailable.</strong><p>${escapeHTML(error.message || "Unable to load cars.json.")} Check that cars.json is in the repository root and that the site is opened through GitHub Pages or a local web server.</p></div>`;
      return [];
    }
  }

  function attachImageFallbacks(parent = document) {
    $$('img[data-image-stem]', parent).forEach(img => {
      if (img.dataset.fallbackBound === "true") return;
      img.dataset.fallbackBound = "true";
      const stem = img.dataset.imageStem;
      const extensions = ["jpg", "jpeg", "webp", "JPG", "JPEG", "WEBP"];
      let index = 1;
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
      img.addEventListener("error", function retry() {
        if (index >= extensions.length) { settle(); return; }
        img.src = `${stem}.${extensions[index++]}`;
      });
    });
  }

  function renderCard(car) {
    const img = imagePath(car.cover || safeArray(car.gallery)[0]?.src);
    const title = car.title || `Porsche 911 ${car.series || ""}`;
    const year = car.year || "Year not specified";
    const alt = car.cover_alt || `${title} exterior`;
    return `<article class="car-card">
      <a class="car-card-link" href="${escapeHTML(carHref(car))}" aria-label="View ${escapeHTML(title)}">
        <div class="car-image-wrap">
          ${img ? `<img class="car-image" data-image-stem="${escapeHTML(img.replace(/\.(?:jpg|jpeg|webp)$/i, ""))}" src="${escapeHTML(img)}" alt="${escapeHTML(alt)}" loading="lazy"><div class="car-image-fallback" hidden>911</div>` : `<div class="car-image-fallback">911</div>`}
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
        ${usableGallery.map((photo, i) => `<button class="gallery-photo${photo.type === "video" ? " gallery-video" : ""}" type="button" data-index="${i}" data-type="${photo.type || "photo"}" aria-label="Open ${photo.type === "video" ? "video" : "photo"} ${i + 1}">
          ${photo.type === "video"
            ? `<video src="${escapeHTML(imagePath(photo.src))}" muted playsinline preload="metadata" aria-label="${escapeHTML(photo.alt || `${title} video ${i + 1}`)}" style="display:block;width:100%;height:100%;object-fit:cover;pointer-events:none"></video><span class="gallery-photo-zoom" aria-hidden="true">▶</span>`
            : `<img src="${escapeHTML(imagePath(photo.src))}" alt="${escapeHTML(photo.alt || `${title} photo ${i + 1}`)}" loading="${i === 0 ? "eager" : "lazy"}"><span class="gallery-photo-zoom" aria-hidden="true">↗</span>`}
        </button>`).join("")}
      </div>
      <div class="gallery-empty" hidden>No photographs found. Check the car's image filenames and folder.</div>
      <div class="gallery-lightbox" id="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Photo gallery" hidden>
        <button class="lightbox-close" type="button" aria-label="Close gallery">×</button>
        <button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous photo">‹</button>
        <figure class="lightbox-figure"><img id="lightbox-image" src="" alt=""><video id="lightbox-video" controls playsinline preload="metadata" hidden style="max-width:100%;max-height:calc(100vh - 130px);width:auto;height:auto;background:#000"></video><figcaption id="lightbox-caption"></figcaption></figure>
        <button class="lightbox-nav lightbox-next" type="button" aria-label="Next photo">›</button>
        <div class="lightbox-counter" id="lightbox-counter"></div>
      </div>` : `<div class="gallery-empty">Add photos to this car's folder in assets/</div>`;
    const maintenance = safeArray(car.maintenance);
    const owners = safeArray(car.previous_owners);
    const history = car.history || "No separate history details supplied.";
    const videos = safeArray(car.videos);
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
    const lightbox = $("#gallery-lightbox");
    const lightboxImage = $("#lightbox-image");
    const lightboxVideo = $("#lightbox-video");
    const lightboxCaption = $("#lightbox-caption");
    const lightboxCounter = $("#lightbox-counter");
    let activePhoto = 0;
    const visiblePhotos = () => $$(".gallery-photo", root).filter(button => {
      if (button.hidden) return false;
      if (button.dataset.type === "video") return true;
      const image = button.querySelector("img");
      return image && !image.hidden && image.complete && image.naturalWidth > 0;
    });
    const showPhoto = index => {
      const photos = visiblePhotos();
      if (!photos.length) return;
      activePhoto = (index + photos.length) % photos.length;
      const button = photos[activePhoto];
      const isVideo = button.dataset.type === "video";
      const image = button.querySelector("img");
      lightboxVideo.pause();
      lightboxVideo.hidden = !isVideo;
      lightboxImage.hidden = isVideo;
      if (isVideo) {
        lightboxVideo.src = button.querySelector("video").currentSrc || button.querySelector("video").src;
        lightboxVideo.currentTime = 0;
        lightboxVideo.play().catch(() => {});
        lightboxCaption.textContent = button.querySelector("video").getAttribute("aria-label") || `Video ${activePhoto + 1}`;
      } else {
        lightboxVideo.removeAttribute("src");
        lightboxVideo.load();
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt;
        lightboxCaption.textContent = image.alt;
      }
      lightboxCounter.textContent = `${activePhoto + 1} / ${photos.length}`;
      $(".lightbox-prev", lightbox).disabled = photos.length < 2;
      $(".lightbox-next", lightbox).disabled = photos.length < 2;
    };
    const closeLightbox = () => { lightboxVideo.pause(); lightboxVideo.removeAttribute("src"); lightboxVideo.load(); lightbox.hidden = true; document.body.classList.remove("lightbox-open"); };
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
    $(".lightbox-prev", lightbox)?.addEventListener("click", () => showPhoto(activePhoto - 1));
    $(".lightbox-next", lightbox)?.addEventListener("click", () => showPhoto(activePhoto + 1));
    lightbox?.addEventListener("click", event => { if (event.target === lightbox) closeLightbox(); });
    document.addEventListener("keydown", event => {
      if (!lightbox || lightbox.hidden) return;
      if (event.key === "Escape") closeLightbox();
      else if (event.key === "ArrowLeft") showPhoto(activePhoto - 1);
      else if (event.key === "ArrowRight") showPhoto(activePhoto + 1);
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