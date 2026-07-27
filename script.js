// ============================================================
// Conteo de imágenes locales por marca (ya organizadas en
// assets/marcas/<slug>/<slug>-01.jpg, -02.jpg, etc.)
// ============================================================
const BRAND_IMAGE_COUNTS = {
  "italia-de-luxe": 39,
  "beauty-creations": 36,
  "pink-up": 49,
  "amor-us": 33,
  "by-apple": 20,
  "bisss": 17,
  "amandas": 36,
  "nekane": 8,
  "kj-beauty": 22,
  "diamond-beauty": 8,
};

function brandImages(slug) {
  const count = BRAND_IMAGE_COUNTS[slug] || 0;
  const imgs = [];
  for (let i = 1; i <= count; i++) {
    const num = String(i).padStart(2, "0");
    imgs.push(`assets/marcas/${slug}/${slug}-${num}.jpg`);
  }
  return imgs;
}

// ============================================================
// Datos por defecto — el sitio SIEMPRE arranca con esto, para
// que sucursales y marcas se vean de inmediato aunque Supabase
// tarde, falle, o el sitio se abra sin conexión (file://).
// Si Supabase responde bien, estos datos se reemplazan al vuelo.
// ============================================================
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

let LOCATIONS_CACHE = DEFAULT_LOCATIONS;
let BRANDS_CACHE = DEFAULT_BRANDS;

async function loadData() {
  // Ya se renderizó con los valores por defecto al cargar la página.
  // Aquí solo intentamos mejorar con datos frescos de Supabase.
  try {
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

    window.renderDynamicSections();
    initMap();
  } catch (e) {
    console.warn("No se pudo conectar a Supabase, usando datos por defecto.", e);
  }
}

window.renderDynamicSections = function () {
  renderLocations();
  renderBrands();
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
    const imgs = brandImages(brand.slug);
    const cover = imgs[0] || "";
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

// ============================================================
// Mapa real con las 4 sucursales (Leaflet + OpenStreetMap)
// ============================================================
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

// ============================================================
// Galería / lightbox
// ============================================================
function openGallery(slug) {
  const brand = BRANDS_CACHE.find(b => b.slug === slug);
  const imgs = brandImages(slug);
  const modal = document.getElementById("galleryModal");
  const track = document.getElementById("galleryTrack");
  const title = document.getElementById("galleryTitle");
  const fbLink = document.getElementById("galleryFbLink");

  title.textContent = brand ? brand.name : slug;
  track.innerHTML = imgs.map(src => `<img src="${src}" loading="lazy" alt="${brand ? brand.name : slug}">`).join("");

  // Al picarle a una foto de la galería, se agranda (zoom)
  const trackImgs = Array.from(track.querySelectorAll("img"));
  trackImgs.forEach((img, index) => {
    img.addEventListener("click", () => openZoom(imgs, index, brand ? brand.name : slug));
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

// ============================================================
// Zoom de imagen (agrandar foto dentro de la galería)
// ============================================================
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

// ============================================================
// Nav móvil, scroll-to-top, inicialización
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
  window.renderDynamicSections(); // se ve de inmediato con los datos por defecto
  initMap();
  loadData(); // intenta mejorar con datos frescos de Supabase, sin bloquear nada

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

  // Controles del modal de zoom
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