// Fotos y categorías de cada marca: se llenan con loadData() desde
// Supabase (subidas por el admin desde el panel). Estructura por brand_id:
// { general: [ {id,image_url}, ... ], categories: [ {id,name_es,name_en,images:[...]} ] }
let BRAND_MEDIA_CACHE = {};

function brandMedia(brand) {
  return BRAND_MEDIA_CACHE[brand.id] || { general: [], categories: [] };
}

// Todas las fotos de una marca en un solo arreglo (para la portada y el zoom)
function brandAllImages(brand) {
  const media = brandMedia(brand);
  const catImgs = media.categories.flatMap(c => c.images);
  return [...media.general, ...catImgs];
}

// Datos por defecto: el sitio arranca con esto y los reemplaza si Supabase responde
const DEFAULT_LOCATIONS = [
  { name: "Centro", address: "Amado Nervo #311-1, Col. Centro. Muy cerca de Milano.", hours_weekday: "10:00 am – 5:30 pm", hours_sunday: "10:00 am – 4:00 pm", closed_day: "Miércoles cerrado", maps_url: "https://maps.app.goo.gl/A9ncqzs5Heiyu2kn6", accent_color: "#C6435B", lat: 31.7373677, lng: -106.4848073 },
  { name: "Las Torres", address: "Av. de las Torres #1931. Lote Bravo. Plaza Arce, Local E11.", hours_weekday: "10:00 am – 6:00 pm", hours_sunday: "10:30 am – 4:00 pm", closed_day: null, maps_url: "https://www.google.com/maps/search/?api=1&query=31.6277,-106.3941", accent_color: "#C97B4A", lat: 31.6277, lng: -106.3941 },
  { name: "Parajes del Sur", address: "Paseos del Sur #675-9, Fracc. Parajes del Sur. Por donde está Cobre 29.", hours_weekday: "10:00 am – 6:00 pm", hours_sunday: "10:30 am – 4:00 pm", closed_day: null, maps_url: "https://maps.app.goo.gl/XU9Qj6No9bBJE7ne8", accent_color: "#7B5EA7", lat: 31.5929, lng: -106.3782 },
  { name: "Oriente", address: "Avenida Santiago Troncoso #2315, cerca de Smart Parajes de Oriente.", hours_weekday: "10:00 am – 6:00 pm", hours_sunday: "10:30 am – 4:00 pm", closed_day: null, maps_url: "https://maps.app.goo.gl/iHksqnCwqDPaYSU97", accent_color: "#C0577B", lat: 31.6087, lng: -106.3537 },
];

const DEFAULT_BRANDS = [
  { slug: "italia-de-luxe", name: "Italia de Luxe", facebook_album_url: "https://www.facebook.com/media/set/?set=a.918454560766032&type=3" },
  { slug: "beauty-creations", name: "Beauty Creations", facebook_album_url: null },
  { slug: "pink-up", name: "Pink Up", facebook_album_url: null },
  { slug: "amor-us", name: "Amor Us", facebook_album_url: null },
  { slug: "by-apple", name: "By Apple", facebook_album_url: null },
  { slug: "bisss", name: "Bissú", facebook_album_url: null },
  { slug: "amandas", name: "Ananda", facebook_album_url: null },
  { slug: "nekane", name: "Nekane", facebook_album_url: null },
];

// Sin datos por defecto: si no hay publicaciones en Supabase, se muestra el mensaje vacío
const DEFAULT_POSTS = [];

let LOCATIONS_CACHE = DEFAULT_LOCATIONS;
let BRANDS_CACHE = DEFAULT_BRANDS;
let POSTS_CACHE = DEFAULT_POSTS;
let CUSTOM_SECTIONS_CACHE = [];

function buildBrandMediaCache(images, categories) {
  const cache = {};
  categories.forEach(cat => {
    if (!cache[cat.brand_id]) cache[cat.brand_id] = { general: [], categories: [] };
    cache[cat.brand_id].categories.push({ ...cat, images: [] });
  });
  images.forEach(img => {
    if (!cache[img.brand_id]) cache[img.brand_id] = { general: [], categories: [] };
    if (img.category_id) {
      const cat = cache[img.brand_id].categories.find(c => c.id === img.category_id);
      if (cat) cat.images.push(img);
      else cache[img.brand_id].general.push(img); // categoría borrada: cae en general
    } else {
      cache[img.brand_id].general.push(img);
    }
  });
  return cache;
}

async function loadData() {
  try {
    const { data: content, error: contentErr } = await supabaseClient
      .from("site_content")
      .select("*");
    if (!contentErr && content) {
      content.forEach(row => {
        if (row.content_es) translations.es[row.section_key] = row.content_es;
        if (row.content_en) translations.en[row.section_key] = row.content_en;
      });
      if (window.currentLang) applyLanguage(window.currentLang);
    }

    const { data: locations, error: locErr } = await supabaseClient
      .from("locations")
      .select("*")
      .order("sort_order");
    if (!locErr && locations && locations.length) LOCATIONS_CACHE = locations;

    const { data: brands, error: brandErr } = await supabaseClient
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (!brandErr && brands && brands.length) BRANDS_CACHE = brands;

    const { data: brandImagesData } = await supabaseClient
      .from("brand_images")
      .select("*")
      .order("sort_order");
    const { data: brandCategoriesData } = await supabaseClient
      .from("brand_categories")
      .select("*")
      .order("sort_order");
    BRAND_MEDIA_CACHE = buildBrandMediaCache(brandImagesData || [], brandCategoriesData || []);

    const { data: posts, error: postErr } = await supabaseClient
      .from("posts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (!postErr) POSTS_CACHE = posts || [];

    const { data: customSectionsData } = await supabaseClient
      .from("custom_sections")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    const { data: customSectionImagesData } = await supabaseClient
      .from("custom_section_images")
      .select("*")
      .order("sort_order");
    CUSTOM_SECTIONS_CACHE = (customSectionsData || []).map(sec => ({
      ...sec,
      images: (customSectionImagesData || []).filter(img => img.section_id === sec.id),
    }));

    window.renderDynamicSections();
    initMap();
  } catch (e) {
    console.warn("No se pudo conectar a Supabase, usando datos por defecto.", e);
  }
}

window.renderDynamicSections = function () {
  renderLocations();
  renderBrands();
  renderNovedades();
  renderCustomSections();
};

function renderLocations() {
  const grid = document.getElementById("locGrid");
  if (!grid) return;
  const t = translations[window.currentLang || "es"];
  grid.innerHTML = LOCATIONS_CACHE.map(loc => `
    <article class="loc-card" style="--loc-accent:${loc.accent_color || "#C6435B"}">
      <div class="loc-card-top">
        <span class="loc-pin" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 22s7-7.58 7-13A7 7 0 0 0 5 9c0 5.42 7 13 7 13z" fill="currentColor"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>
        </span>
        <h3>${loc.name}</h3>
      </div>
      <p class="loc-addr">${loc.address}</p>
      <div class="loc-hours">
        <p><strong>Lun – Sáb</strong> ${loc.hours_weekday || ""}</p>
        <p><strong>Domingo</strong> ${loc.hours_sunday || ""}</p>
        ${loc.closed_day ? `<p class="loc-closed">${loc.closed_day}</p>` : ""}
      </div>
      <a class="loc-map" href="${loc.maps_url}" target="_blank" rel="noopener">${t.loc_como_llegar}</a>
    </article>
  `).join("");
}

function renderBrands() {
  const grid = document.getElementById("brandGrid");
  if (!grid) return;
  const t = translations[window.currentLang || "es"];
  grid.innerHTML = BRANDS_CACHE.map(brand => {
    const imgs = brandAllImages(brand);
    const cover = imgs[0] ? imgs[0].image_url : "";
    return `
    <article class="brand-card" data-slug="${brand.slug}">
      <div class="brand-cover" style="background-image:url('${cover}')"></div>
      <div class="brand-body">
        <h3>${brand.name}</h3>
        <button class="brand-btn" data-open-gallery="${brand.slug}">${t.marcas_ver}</button>
      </div>
    </article>
  `;
  }).join("");

  grid.querySelectorAll("[data-open-gallery]").forEach(btn => {
    btn.addEventListener("click", () => openGallery(btn.dataset.openGallery));
  });
}

// "Recién llegado": franja con las últimas publicaciones que sube el admin
function timeAgoLabel(dateStr, t) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 0) return t.novedades_hoy;
  if (days === 1) return t.novedades_ayer;
  return t.novedades_dias.replace("{n}", days);
}

function renderNovedades() {
  const wrap = document.getElementById("novedadesScroll");
  if (!wrap) return;
  const t = translations[window.currentLang || "es"];
  const lang = window.currentLang || "es";

  if (!POSTS_CACHE.length) {
    wrap.innerHTML = `<p class="novedades-empty">${t.novedades_vacio}</p>`;
    return;
  }

  wrap.innerHTML = POSTS_CACHE.filter(post => post.fb_url).map((post, index) => {
    const note = (lang === "en" ? post.note_en : post.note_es) || post.note_es || post.note_en || "";
    const showBadge = index < 3; // las 3 más recientes se marcan como "Nuevo"
    return `
    <article class="novedades-card">
      ${showBadge ? `<span class="novedades-badge">${t.novedades_nuevo}</span>` : ""}
      <div class="novedades-embed">
        <div class="fb-post" data-href="${post.fb_url}" data-width="500" data-show-text="true"></div>
      </div>
      <div class="novedades-body">
        ${note ? `<p class="novedades-caption">${note}</p>` : ""}
        <p class="novedades-time">${timeAgoLabel(post.created_at, t)}</p>
        <a class="novedades-link" href="${post.fb_url}" target="_blank" rel="noopener">${t.novedades_ver}</a>
      </div>
    </article>
  `;
  }).join("");

  // Le pedimos al SDK de Facebook que "dibuje" los posts embebidos recién insertados
  if (window.FB && window.FB.XFBML) {
    window.FB.XFBML.parse(wrap);
  } else {
    // El SDK todavía no cargaba; en cuanto esté listo, dibuja los que ya insertamos
    window.fbAsyncInit = (function (prevInit) {
      return function () {
        FB.init({ xfbml: false, version: "v19.0" });
        FB.XFBML.parse(wrap);
        if (prevInit) prevInit();
      };
    })(window.fbAsyncInit);
  }
}

// Secciones nuevas creadas desde el panel ("Secciones nuevas")
function renderCustomSections() {
  const wrap = document.getElementById("customSectionsContainer");
  if (!wrap) return;
  const lang = window.currentLang || "es";

  if (!CUSTOM_SECTIONS_CACHE.length) {
    wrap.innerHTML = "";
    return;
  }

  wrap.innerHTML = CUSTOM_SECTIONS_CACHE.map(sec => {
    const title = (lang === "en" && sec.title_en) ? sec.title_en : sec.title_es;
    const subtitle = (lang === "en" && sec.subtitle_en) ? sec.subtitle_en : sec.subtitle_es;
    const text = (lang === "en" && sec.text_en) ? sec.text_en : sec.text_es;
    const hasImgs = (sec.images || []).length > 0;
    return `
      <section class="section custom-section" data-custom-section="${sec.id}">
        <div class="section-inner">
          ${subtitle ? `<p class="eyebrow">${subtitle}</p>` : ""}
          ${title ? `<h2 class="section-title">${title}</h2>` : ""}
          ${text ? `<p class="lead lead--center">${text}</p>` : ""}
          ${hasImgs ? `<div class="custom-section-grid" data-custom-grid="${sec.id}"></div>` : ""}
        </div>
      </section>
    `;
  }).join("");

  CUSTOM_SECTIONS_CACHE.forEach(sec => {
    const grid = wrap.querySelector(`[data-custom-grid="${sec.id}"]`);
    if (!grid) return;
    const urls = (sec.images || []).map(img => img.image_url);
    grid.innerHTML = urls.map(url => `<img src="${url}" loading="lazy" alt="${sec.title_es || ""}">`).join("");
    Array.from(grid.querySelectorAll("img")).forEach((imgEl, index) => {
      imgEl.addEventListener("click", () => openZoom(urls, index, sec.title_es || ""));
    });
  });
}

// Mapa real con las 4 sucursales (Leaflet + OpenStreetMap)
let LEAFLET_MAP = null;
function initMap() {
  const container = document.getElementById("locMap");
  if (!container || typeof L === "undefined") return;

  const points = LOCATIONS_CACHE.filter(l => l.lat && l.lng);
  if (!points.length) return;

  if (LEAFLET_MAP) {
    LEAFLET_MAP.remove();
    container.innerHTML = "";
  }

  LEAFLET_MAP = L.map(container, { scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(LEAFLET_MAP);

  const markers = [];
  points.forEach(loc => {
    const icon = L.divIcon({
      className: "map-pin",
      html: `<span style="background:${loc.accent_color || "#C4677A"}"></span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
    });
    const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(LEAFLET_MAP);
    marker.bindPopup(`<strong>${loc.name}</strong><br>${loc.address}`);
    markers.push(marker);
  });

  const group = L.featureGroup(markers);
  LEAFLET_MAP.fitBounds(group.getBounds().pad(0.25));
}

// Galería / lightbox
function openGallery(slug) {
  const brand = BRANDS_CACHE.find(b => b.slug === slug);
  const modal = document.getElementById("galleryModal");
  const track = document.getElementById("galleryTrack");
  const title = document.getElementById("galleryTitle");
  const fbLink = document.getElementById("galleryFbLink");
  const brandName = brand ? brand.name : slug;

  title.textContent = brandName;

  const media = brand ? brandMedia(brand) : { general: [], categories: [] };
  const allUrls = brandAllImages(brand || {}).map(img => img.image_url);

  let html = "";
  if (media.general.length) {
    html += media.general.map(img => `<img src="${img.image_url}" loading="lazy" alt="${brandName}">`).join("");
  }
  media.categories.forEach(cat => {
    if (!cat.images.length) return;
    const lang = window.currentLang || "es";
    const catName = (lang === "en" && cat.name_en) ? cat.name_en : cat.name_es;
    html += `<div class="gallery-cat-title">${catName}</div>`;
    html += cat.images.map(img => `<img src="${img.image_url}" loading="lazy" alt="${brandName} — ${catName}">`).join("");
  });
  if (!allUrls.length) {
    html = `<p class="loading-hint">Todavía no hay fotos de esta marca.</p>`;
  }
  track.innerHTML = html;

  const trackImgs = Array.from(track.querySelectorAll("img"));
  trackImgs.forEach((img, index) => {
    const zoomIndex = allUrls.indexOf(img.getAttribute("src"));
    img.addEventListener("click", () => openZoom(allUrls, zoomIndex >= 0 ? zoomIndex : index, brandName));
  });

  if (brand && brand.facebook_album_url) {
    fbLink.href = brand.facebook_album_url;
    fbLink.style.display = "inline-flex";
  } else {
    fbLink.style.display = "none";
  }

  modal.classList.add("gallery-modal--open");
  document.body.style.overflow = "hidden";
}

function closeGallery() {
  document.getElementById("galleryModal").classList.remove("gallery-modal--open");
  document.body.style.overflow = "";
}

// Zoom de imagen
let ZOOM_IMAGES = [];
let ZOOM_INDEX = 0;
let ZOOM_ALT = "";

function openZoom(imgsList, index, altText) {
  ZOOM_IMAGES = imgsList;
  ZOOM_INDEX = index;
  ZOOM_ALT = altText || "";

  const zoomModal = document.getElementById("zoomModal");
  updateZoomImage();
  zoomModal.classList.add("zoom-modal--open");
}

function updateZoomImage() {
  const zoomImg = document.getElementById("zoomImg");
  zoomImg.src = ZOOM_IMAGES[ZOOM_INDEX];
  zoomImg.alt = ZOOM_ALT;
}

function zoomNext() {
  if (!ZOOM_IMAGES.length) return;
  ZOOM_INDEX = (ZOOM_INDEX + 1) % ZOOM_IMAGES.length;
  updateZoomImage();
}

function zoomPrev() {
  if (!ZOOM_IMAGES.length) return;
  ZOOM_INDEX = (ZOOM_INDEX - 1 + ZOOM_IMAGES.length) % ZOOM_IMAGES.length;
  updateZoomImage();
}

function closeZoom() {
  document.getElementById("zoomModal").classList.remove("zoom-modal--open");
  document.getElementById("zoomImg").src = "";
  ZOOM_IMAGES = [];
}

// Nav móvil, scroll-to-top, inicialización
document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
  window.renderDynamicSections();
  initMap();
  loadData();

  const burger = document.getElementById("navBurger");
  const mobileNav = document.getElementById("navMobile");
  burger.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("nav-mobile--open");
    burger.setAttribute("aria-expanded", open);
  });
  mobileNav.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => mobileNav.classList.remove("nav-mobile--open"))
  );

  document.getElementById("galleryClose").addEventListener("click", closeGallery);
  document.getElementById("galleryModal").addEventListener("click", (e) => {
    if (e.target.id === "galleryModal") closeGallery();
  });

  document.getElementById("zoomClose").addEventListener("click", closeZoom);
  document.getElementById("zoomNext").addEventListener("click", zoomNext);
  document.getElementById("zoomPrev").addEventListener("click", zoomPrev);
  document.getElementById("zoomModal").addEventListener("click", (e) => {
    if (e.target.id === "zoomModal") closeZoom();
  });
  document.addEventListener("keydown", (e) => {
    const zoomOpen = document.getElementById("zoomModal").classList.contains("zoom-modal--open");
    if (!zoomOpen) return;
    if (e.key === "Escape") closeZoom();
    if (e.key === "ArrowRight") zoomNext();
    if (e.key === "ArrowLeft") zoomPrev();
  });

  const toTop = document.getElementById("toTop");
  window.addEventListener("scroll", () => {
    toTop.classList.toggle("to-top--visible", window.scrollY > 500);
  });
  toTop.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

// Animaciones: partículas del hero, parallax y reveal al hacer scroll
document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function forceRevealAll() {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in-view"));
  }
  const safetyTimer = setTimeout(forceRevealAll, 2500);

  function initHeroParticles() {
    const canvas = document.getElementById("heroParticles");
    const hero = document.querySelector(".hero");
    if (!canvas || !hero || reduceMotion) return;

    const ctx = canvas.getContext("2d");
    let particles = [];
    let width, height, dpr;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = hero.offsetWidth;
      height = hero.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticle() {
      return {
        x: Math.random() * width,
        y: height + Math.random() * 60,
        r: 1 + Math.random() * 2.4,
        speed: 0.25 + Math.random() * 0.55,
        drift: (Math.random() - 0.5) * 0.4,
        alpha: 0.15 + Math.random() * 0.45,
        twinkle: Math.random() * Math.PI * 2,
      };
    }

    resize();
    let count = width < 700 ? 26 : 46;
    for (let i = 0; i < count; i++) particles.push(makeParticle());

    const goldTones = ["232,162,107", "217,168,108", "245,199,154", "255,255,255"];

    function tick() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speed;
        p.x += p.drift;
        p.twinkle += 0.02;
        if (p.y < -10) {
          particles[i] = makeParticle();
          particles[i].y = height + 10;
          continue;
        }
        const flicker = (Math.sin(p.twinkle) + 1) / 2;
        const tone = goldTones[i % goldTones.length];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + tone + "," + (p.alpha * (0.5 + flicker * 0.5)).toFixed(3) + ")";
        ctx.shadowColor = "rgba(" + tone + ",0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        particles = [];
        const c = width < 700 ? 26 : 46;
        for (let i = 0; i < c; i++) particles.push(makeParticle());
      }, 200);
    });

    requestAnimationFrame(tick);
  }

  function initHeroParallax() {
    const hero = document.querySelector(".hero");
    const bgImg = document.querySelector(".hero-bg-img");
    if (!hero || !bgImg || reduceMotion) return;
    if (window.matchMedia("(max-width: 900px)").matches) return;

    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const offset = window.scrollY;
        const shift = Math.min(offset * 0.18, 60);
        bgImg.style.transform = "translateY(" + shift + "px) scale(1.08)";
        ticking = false;
      });
    }, { passive: true });
  }

  function initScrollReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      forceRevealAll();
      clearTimeout(safetyTimer);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    items.forEach((el) => observer.observe(el));
    clearTimeout(safetyTimer);
    setTimeout(forceRevealAll, 2500);
  }

  try {
    initHeroParticles();
    initHeroParallax();
    initScrollReveal();
  } catch (e) {
    console.warn("Animaciones: algo falló, mostrando todo el texto de todos modos.", e);
    forceRevealAll();
  }
});