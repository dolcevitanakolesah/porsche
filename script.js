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
  const formatMileage = car => car.mileage_display || (car.mileage_km != null ? `${Number(car.mileage_km).toLocaleString("en-US")} km` : "Mileage on request");
  const carHref = car => `./index.html?car=${encodeURIComponent(car.id)}`;
  const imagePath = path => path ? `./${String(path).replace(/^\.?\//, "")}` : "";
  const safeArray = value => Array.isArray(value) ? value : [];

  // GitHub Pages cannot list a directory, so probe supported extensions in order.
  // Keep the filename and capitalization convention intact; only the extension varies.
  async function resolveImagePath(path) {
    if (!path) return "";
    const clean = String(path).replace(/^\.?\//, "");
    const base = clean.replace(/\.(?:jpe?g|webp)$/i, "");
    for (const extension of ["jpg", "webp"]) {
      const candidate = `${base}.${extension}`;
      const exists = await new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = imagePath(candidate);
      });
      if (exists) return candidate;
    }
    return "";
  }

  async function loadCars() {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`Could not load cars.json (${response.status})`);
      const entries = await response.json();
      if (!Array.isArray(entries)) throw new Error("cars.json must contain an array of cars.");
      // Public data stays in the user's simple five-field format.
      // Adapt it internally for the existing gallery UI.
      return await Promise.all(entries.map(async (entry, index) => {
        const folder = String(entry.folder || "").replace(/^\/+|\/+$/g, "");
        const prefix = String(entry.prefix || folder).replace(/^\/+|\/+$/g, "");
        // Main image is used for the collection thumbnail; either JPG or WebP is accepted.
        const image = folder && prefix ? await resolveImagePath(`assets/${folder}/${prefix}-Main.jpg`) : "";
        const title = entry.title || `Porsche 911 ${index + 1}`;
        const seriesMatch = title.match(/\b(930|964|993|996|997|991|992)\b/);
        return {
          id: `car-${index + 1}`,
          series: seriesMatch ? seriesMatch[1] : "911",
          title,
          year: "",
          cover: image,
          cover_alt: entry.imageAlt || title,
          folder,
          prefix,
          gallery: image ? [{ src: image, alt: entry.imageAlt || title }] : [],
          description: Array.isArray(entry.description) ? entry.description.filter(line => String(line).trim()).join("\n\n") : String(entry.description || ""),
          status: "Collection",
          price_display: "",
          mileage_display: "",
          transmission: "",
          color: "",
          interior_color: "",
          engine: "",
          location: "",
          history: "",
          previous_owners: [],
          maintenance: [],
          videos: []
        };
      }));
    } catch (error) {
      console.error(error);
      const grid = $("#car-grid");
      if (grid) grid.innerHTML = `<div class="load-error"><strong>Collection unavailable.</strong><p>Check that cars.json is in the repository root and open this page through GitHub Pages or a local web server.</p></div>`;
      return [];
    }
  }

  function renderCard(car) {
    const img = imagePath(car.cover || safeArray(car.gallery)[0]?.src);
    const title = car.title || `Porsche 911 ${car.series || ""}`;
    const year = car.year || "Year on request";
    const alt = car.cover_alt || `${title} exterior`;
    return `<article class="car-card">
      <a class="car-card-link" href="${escapeHTML(carHref(car))}" aria-label="View ${escapeHTML(title)}">
        <div class="car-image-wrap">
          ${img ? `<img class="car-image" src="${escapeHTML(img)}" alt="${escapeHTML(alt)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="car-image-fallback" hidden>911</div>` : `<div class="car-image-fallback">911</div>`}
          <span class="card-status">${escapeHTML(car.status || "Available")}</span>
          <span class="card-arrow" aria-hidden="true">↗</span>
        </div>
        <div class="car-card-meta">
          <div class="card-overline"><span>${escapeHTML(year)}</span><span class="generation">${escapeHTML(car.series || "911")}</span></div>
          <h3>${escapeHTML(title)}</h3>
          <div class="card-specs"><span>${escapeHTML(car.series === "911" ? "Porsche 911" : `Generation ${car.series}`)}</span></div>
          <div class="card-price-row"><span class="card-price">911 Archive</span><span class="card-detail-link">View car ↗</span></div>
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

  async function discoverGalleryPhotos(car) {
    // GitHub Pages cannot list a directory, so check numbered files in order.
    // The -Main image is reserved for the collection thumbnail and is not in this gallery.
    const photos = [];
    const prefix = car.prefix || car.folder;
    for (let number = 1; number <= 99; number++) {
      const sequence = String(number).padStart(2, "0");
      const src = await resolveImagePath(`assets/${car.folder}/${prefix}-${sequence}.jpg`);
      if (!src) break;
      photos.push({ src, alt: `${car.title} — photo ${sequence}` });
    }
    return photos;
  }

  function detailTemplate(car) {
    const gallery = safeArray(car.gallery).filter(photo => !String(photo.src || "").endsWith("-Main.jpg"));
    const title = car.title || `Porsche 911 ${car.series || ""}`;
    const facts = [
      ["Model year", car.year || "On request"], ["Generation", car.series || "911"],
      ["Mileage", formatMileage(car)], ["Transmission", car.transmission || "On request"],
      ["Exterior", car.color || "On request"], ["Interior", car.interior_color || "On request"],
      ["Engine", car.engine || "On request"], ["Location", car.location || "On request"]
    ];
    const mainImage = gallery[0]?.src;
    const galleryMarkup = mainImage ? `
      <div class="gallery-layout">
        <div class="gallery-main"><img id="gallery-main-image" src="${escapeHTML(imagePath(mainImage))}" alt="${escapeHTML(gallery[0]?.alt || title)}"><span class="gallery-count" id="gallery-count">01 / ${String(Math.max(gallery.length,1)).padStart(2,"0")}</span></div>
        <div class="gallery-thumbs">${gallery.slice(0,4).map((photo,i)=>`<button class="gallery-thumb ${i===0?"active":""}" data-index="${i}" aria-label="Show photo ${i+1}"><img src="${escapeHTML(imagePath(photo.src))}" alt="${escapeHTML(photo.alt || `${title} photo ${i+1}`)}" loading="${i===0?"eager":"lazy"}"></button>`).join("")}</div>
      </div>` : `<div class="gallery-empty">Add numbered photos to <code>assets/${escapeHTML(car.folder)}/</code> using <code>${escapeHTML(car.prefix)}-01.jpg</code> or <code>${escapeHTML(car.prefix)}-01.webp</code>, and so on.</div>`;
    const maintenance = safeArray(car.maintenance);
    const owners = safeArray(car.previous_owners);
    const history = car.history || "Provenance and ownership history to be confirmed with the vehicle file.";
    const videos = safeArray(car.videos);
    return `<div class="detail-page">
      <div class="detail-topbar"><a class="wordmark" href="./index.html"><span class="wordmark-mark">911</span><span class="wordmark-copy">ARCHIVE<span>CURATED PORSCHE</span></span></a><a class="back-link" href="./index.html"><span>←</span> Back to collection</a></div>
      <main class="detail-container">
        <p class="detail-kicker">${escapeHTML(car.year || "")} &nbsp; / &nbsp; Porsche 911 ${escapeHTML(car.series || "")}</p>
        <div class="detail-title-row"><h1>${escapeHTML(title)}<span>.</span></h1><div class="detail-price">${escapeHTML(formatPrice(car))}<small>${escapeHTML(car.status || "Available for enquiry")}</small></div></div>
        ${galleryMarkup}
        <section class="detail-overview"><div><p class="eyebrow dark-eyebrow">The car</p><h2>A closer look.</h2><div class="detail-description">${escapeHTML(car.description || "A full description for this example will be added shortly.")}</div></div>
          <div class="detail-facts">${facts.map(([label,value])=>`<div class="fact"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`).join("")}</div>
        </section>
        <section class="detail-section"><p class="eyebrow dark-eyebrow">The story</p><h2>History & provenance</h2><div class="history-grid">
          <div class="history-block"><h3>Vehicle history</h3><p>${escapeHTML(history)}</p>${car.vin ? `<p><strong>VIN / chassis:</strong> ${escapeHTML(car.vin)}</p>` : ""}${car.service_book ? `<p><strong>Documentation:</strong> ${escapeHTML(car.service_book)}</p>` : ""}</div>
          <div class="history-block"><h3>Previous ownership</h3>${owners.length ? `<ul>${owners.map(owner=>`<li>${escapeHTML(typeof owner === "string" ? owner : [owner.period,owner.detail].filter(Boolean).join(" — "))}</li>`).join("")}</ul>` : "<p>Previous owner details available on request, subject to privacy and supporting documentation.</p>"}</div>
        </div></section>
        <section class="detail-section"><p class="eyebrow dark-eyebrow">Care & maintenance</p><h2>Work performed.</h2><p class="section-lead">Maintenance entries should be supported by invoices or service records where available.</p>
          ${maintenance.length ? `<div class="history-grid">${maintenance.map(item=>`<div class="history-block"><h3>${escapeHTML(item.date || "Service record")}</h3><p>${escapeHTML(item.description || item)}</p>${item.provider ? `<p><strong>Provider:</strong> ${escapeHTML(item.provider)}</p>` : ""}</div>`).join("")}</div>` : `<p class="detail-description">Maintenance records will be listed here. Please enquire for the available service file.</p>`}
        </section>
        ${videos.length ? `<section class="detail-section"><p class="eyebrow dark-eyebrow">Moving images</p><h2>In motion.</h2><div class="video-grid">${videos.map(video=>`<video controls preload="metadata" poster="${escapeHTML(imagePath(video.poster || ""))}"><source src="${escapeHTML(imagePath(video.src || video))}" type="${escapeHTML(video.type || "video/mp4")}">Your browser does not support video playback.</video>`).join("")}</div></section>` : ""}
        <section class="detail-cta"><div><h2>Interested in this 911?</h2><p>Request the full vehicle file, additional photographs or a delivery quote.</p></div><a class="button button-dark" href="mailto:${encodeURIComponent(car.contact_email || "hello@example.com")}?subject=${encodeURIComponent("Enquiry: " + title)}">Enquire about this car ↗</a></section>
      </main>
      <footer class="site-footer"><a class="wordmark footer-wordmark" href="./index.html"><span class="wordmark-mark">911</span><span class="wordmark-copy">ARCHIVE<span>CURATED PORSCHE</span></span></a><div class="footer-bottom"><span>© ${new Date().getFullYear()} 911 Archive</span><span>Independent collection. Not affiliated with Porsche AG.</span><a href="mailto:hello@example.com">Contact ↗</a></div></footer>
    </div>`;
  }

  function initDetail(cars, id) {
    const car = cars.find(item => String(item.id) === id);
    if (!car) {
      root.innerHTML = `<div class="detail-not-found"><p class="eyebrow dark-eyebrow">404 / Car not found</p><h1>This 911 isn't in the collection.</h1><p>It may have been removed or the link may be incorrect.</p><a class="button button-dark" href="./index.html">Return to collection</a></div>`;
      return;
    }
    discoverGalleryPhotos(car).then(photos => {
      car.gallery = photos;
      root.innerHTML = detailTemplate(car);
      bindGallery(car);
    });
  }

  function bindGallery(car) {
    const gallery = safeArray(car.gallery);
    $$(".gallery-thumb").forEach(button => button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const photo = gallery[index];
      if (!photo) return;
      $("#gallery-main-image").src = imagePath(photo.src);
      $("#gallery-main-image").alt = photo.alt || `${car.title} photo ${index+1}`;
      $("#gallery-count").textContent = `${String(index+1).padStart(2,"0")} / ${String(Math.max(gallery.length,1)).padStart(2,"0")}`;
      $$(".gallery-thumb").forEach(item => item.classList.toggle("active", item === button));
    }));
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