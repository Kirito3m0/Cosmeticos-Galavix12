const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const toast = document.getElementById("toast");

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("dash-toast--show");
  setTimeout(() => toast.classList.remove("dash-toast--show"), 2200);
}

// ---------------- AUTH ----------------
async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showDashboard();
  } else {
    loginScreen.style.display = "flex";
    dashboard.style.display = "none";
  }
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = "Correo o contraseña incorrectos.";
    return;
  }
  showDashboard();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  location.reload();
});

function showDashboard() {
  loginScreen.style.display = "none";
  dashboard.style.display = "block";
  loadLocations();
  loadBrands();
  loadPosts();
  loadTextos();
}

// ---------------- TABS ----------------
document.querySelectorAll(".dash-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".dash-tab").forEach(t => t.classList.remove("dash-tab--active"));
    document.querySelectorAll(".dash-panel").forEach(p => p.classList.remove("dash-panel--active"));
    tab.classList.add("dash-tab--active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("dash-panel--active");
  });
});

// ---------------- SUCURSALES ----------------
async function loadLocations() {
  const { data } = await supabaseClient.from("locations").select("*").order("sort_order");
  const list = document.getElementById("locList");
  list.innerHTML = (data || []).map(loc => `
    <div class="dash-item" data-id="${loc.id}">
      <h3>${loc.name}</h3>
      <div class="dash-field"><label>Dirección</label><input data-field="address" value="${escapeAttr(loc.address || "")}"></div>
      <div class="dash-field"><label>Horario Lun–Sáb</label><input data-field="hours_weekday" value="${escapeAttr(loc.hours_weekday || "")}"></div>
      <div class="dash-field"><label>Horario Domingo</label><input data-field="hours_sunday" value="${escapeAttr(loc.hours_sunday || "")}"></div>
      <div class="dash-field"><label>Día cerrado (opcional)</label><input data-field="closed_day" value="${escapeAttr(loc.closed_day || "")}"></div>
      <div class="dash-field"><label>Link de Google Maps</label><input data-field="maps_url" value="${escapeAttr(loc.maps_url || "")}"></div>
      <div class="dash-post-actions">
        <button class="dash-save" data-save-location="${loc.id}">Guardar cambios</button>
        <button type="button" class="dash-delete" data-delete-location="${loc.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || `<p class="dash-hint">Todavía no has agregado ninguna sucursal.</p>`;

  list.querySelectorAll("[data-save-location]").forEach(btn => {
    btn.addEventListener("click", () => saveLocation(btn.dataset.saveLocation, btn.closest(".dash-item")));
  });
  list.querySelectorAll("[data-delete-location]").forEach(btn => {
    btn.addEventListener("click", () => deleteLocation(btn.dataset.deleteLocation));
  });
}

async function saveLocation(id, itemEl) {
  const fields = {};
  itemEl.querySelectorAll("[data-field]").forEach(inp => fields[inp.dataset.field] = inp.value);
  const { error } = await supabaseClient.from("locations").update(fields).eq("id", id);
  showToast(error ? "Error al guardar" : "Sucursal actualizada ✓");
}

async function deleteLocation(id) {
  if (!confirm("¿Eliminar esta sucursal? Ya no va a aparecer en la página.")) return;
  const { error } = await supabaseClient.from("locations").delete().eq("id", id);
  showToast(error ? "Error al eliminar" : "Sucursal eliminada ✓");
  loadLocations();
}

const newLocationForm = document.getElementById("newLocationForm");
newLocationForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("newLocSubmit");
  const name = document.getElementById("newLocName").value.trim();
  const address = document.getElementById("newLocAddress").value.trim();
  if (!name || !address) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Agregando…";
  try {
    const { error } = await supabaseClient.from("locations").insert({
      name,
      address,
      hours_weekday: document.getElementById("newLocHoursWeekday").value,
      hours_sunday: document.getElementById("newLocHoursSunday").value,
      closed_day: document.getElementById("newLocClosedDay").value || null,
      maps_url: document.getElementById("newLocMapsUrl").value,
      sort_order: 999,
    });
    if (error) throw error;
    showToast("Sucursal agregada ✓");
    newLocationForm.reset();
    loadLocations();
  } catch (err) {
    console.error(err);
    showToast("Error al agregar la sucursal");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Agregar sucursal";
  }
});

// ---------------- MARCAS ----------------
async function loadBrands() {
  const { data } = await supabaseClient.from("brands").select("*").order("sort_order");
  const list = document.getElementById("brandList");
  list.innerHTML = (data || []).map(brand => `
    <div class="dash-item" data-id="${brand.id}">
      <h3>${brand.name}</h3>
      <div class="dash-field"><label>Nombre</label><input data-field="name" value="${escapeAttr(brand.name || "")}"></div>
      <div class="dash-field"><label>Enlace del álbum de Facebook</label><input data-field="facebook_album_url" value="${escapeAttr(brand.facebook_album_url || "")}"></div>
      <div class="dash-post-actions">
        <button class="dash-save" data-save-brand="${brand.id}">Guardar cambios</button>
        <button type="button" class="dash-delete" data-delete-brand="${brand.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || `<p class="dash-hint">Todavía no has agregado ninguna marca.</p>`;

  list.querySelectorAll("[data-save-brand]").forEach(btn => {
    btn.addEventListener("click", () => saveBrand(btn.dataset.saveBrand, btn.closest(".dash-item")));
  });
  list.querySelectorAll("[data-delete-brand]").forEach(btn => {
    btn.addEventListener("click", () => deleteBrand(btn.dataset.deleteBrand));
  });
}

async function saveBrand(id, itemEl) {
  const fields = {};
  itemEl.querySelectorAll("[data-field]").forEach(inp => fields[inp.dataset.field] = inp.value);
  const { error } = await supabaseClient.from("brands").update(fields).eq("id", id);
  showToast(error ? "Error al guardar" : "Marca actualizada ✓");
}

async function deleteBrand(id) {
  if (!confirm("¿Eliminar esta marca? Ya no va a aparecer en la página.")) return;
  const { error } = await supabaseClient.from("brands").delete().eq("id", id);
  showToast(error ? "Error al eliminar" : "Marca eliminada ✓");
  loadBrands();
}

function slugify(str) {
  return str.toString().trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const newBrandForm = document.getElementById("newBrandForm");
newBrandForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("newBrandSubmit");
  const name = document.getElementById("newBrandName").value.trim();
  if (!name) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Agregando…";
  try {
    const { error } = await supabaseClient.from("brands").insert({
      slug: slugify(name) + "-" + Date.now().toString(36),
      name,
      facebook_album_url: document.getElementById("newBrandFbUrl").value || null,
      sort_order: 999,
    });
    if (error) throw error;
    showToast("Marca agregada ✓");
    newBrandForm.reset();
    loadBrands();
  } catch (err) {
    console.error(err);
    showToast("Error al agregar la marca");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Agregar marca";
  }
});

// ---------------- RECIÉN LLEGADO (posts) ----------------
async function loadPosts() {
  const { data } = await supabaseClient.from("posts").select("*").order("created_at", { ascending: false });
  const list = document.getElementById("postList");
  list.innerHTML = (data || []).map(post => `
    <div class="dash-item" data-id="${post.id}">
      <div class="dash-post-preview"><div class="fb-post" data-href="${escapeAttr(post.fb_url || "")}" data-width="320" data-show-text="true"></div></div>
      <div class="dash-field"><label>Link de la publicación de Facebook</label><input data-field="fb_url" value="${escapeAttr(post.fb_url || "")}"></div>
      <div class="dash-field"><label>Nota (español)</label><input data-field="note_es" value="${escapeAttr(post.note_es || "")}"></div>
      <div class="dash-field"><label>Nota (inglés)</label><input data-field="note_en" value="${escapeAttr(post.note_en || "")}"></div>
      <label class="dash-checkbox"><input type="checkbox" data-field="is_active" ${post.is_active ? "checked" : ""}> Visible en la página</label>
      <div class="dash-post-actions">
        <button class="dash-save" data-save-post="${post.id}">Guardar cambios</button>
        <button type="button" class="dash-delete" data-delete-post="${post.id}">Eliminar</button>
      </div>
    </div>
  `).join("") || `<p class="dash-hint">Todavía no has agregado ninguna publicación.</p>`;

  list.querySelectorAll("[data-save-post]").forEach(btn => {
    btn.addEventListener("click", () => savePost(btn.dataset.savePost, btn.closest(".dash-item")));
  });
  list.querySelectorAll("[data-delete-post]").forEach(btn => {
    btn.addEventListener("click", () => deletePost(btn.dataset.deletePost));
  });

  if (window.FB && window.FB.XFBML) FB.XFBML.parse(list);
}

async function savePost(id, itemEl) {
  const fields = {};
  itemEl.querySelectorAll("[data-field]").forEach(inp => {
    fields[inp.dataset.field] = inp.type === "checkbox" ? inp.checked : inp.value;
  });
  const { error } = await supabaseClient.from("posts").update(fields).eq("id", id);
  showToast(error ? "Error al guardar" : "Publicación actualizada ✓");
  if (!error) loadPosts();
}

async function deletePost(id) {
  if (!confirm("¿Eliminar esta publicación de \"Recién llegado\"?")) return;
  const { error } = await supabaseClient.from("posts").delete().eq("id", id);
  showToast(error ? "Error al eliminar" : "Publicación eliminada ✓");
  loadPosts();
}

const newPostForm = document.getElementById("newPostForm");
newPostForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById("newPostSubmit");
  const fbUrl = document.getElementById("newPostFbUrl").value.trim();
  if (!fbUrl) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Publicando…";

  try {
    const { error: insertError } = await supabaseClient.from("posts").insert({
      fb_url: fbUrl,
      note_es: document.getElementById("newPostNoteEs").value,
      note_en: document.getElementById("newPostNoteEn").value,
    });
    if (insertError) throw insertError;

    showToast("Publicación agregada ✓");
    newPostForm.reset();
    loadPosts();
  } catch (err) {
    console.error(err);
    showToast("Error al guardar la publicación");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Publicar";
  }
});

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

// ---------------- TEXTOS DE LA PÁGINA (site_content) ----------------
// Mismas claves que ya usa i18n.js (data-i18n). Cada una tiene un texto
// por defecto en español e inglés; si el admin nunca la edita, la página
// sigue mostrando el texto original que ya trae el sitio.
const TEXT_FIELDS = [
  { group: "Portada (Hero)", key: "hero_eyebrow", label: "Texto pequeño arriba del título" },
  { group: "Portada (Hero)", key: "hero_title_1", label: "Título — primera parte" },
  { group: "Portada (Hero)", key: "hero_title_2", label: "Título — segunda parte (cursiva)" },
  { group: "Portada (Hero)", key: "hero_sub", label: "Subtítulo", multiline: true },

  { group: "Nosotros", key: "nosotros_eyebrow", label: "Texto pequeño de la sección" },
  { group: "Nosotros", key: "nosotros_title_1", label: "Título — primera parte" },
  { group: "Nosotros", key: "nosotros_title_2", label: "Título — segunda parte (cursiva)" },
  { group: "Nosotros", key: "nosotros_q1_title", label: "Pregunta 1 — título" },
  { group: "Nosotros", key: "nosotros_q1_text", label: "Pregunta 1 — respuesta", multiline: true },
  { group: "Nosotros", key: "nosotros_q2_title", label: "Pregunta 2 — título" },
  { group: "Nosotros", key: "nosotros_q2_text", label: "Pregunta 2 — respuesta", multiline: true },
  { group: "Nosotros", key: "nosotros_q3_title", label: "Pregunta 3 — título" },
  { group: "Nosotros", key: "nosotros_q3_text", label: "Pregunta 3 — respuesta", multiline: true },
  { group: "Nosotros", key: "nosotros_tagline_2", label: "Frase final de la sección" },

  { group: "Precios", key: "precios_eyebrow", label: "Texto pequeño de la sección" },
  { group: "Precios", key: "precios_title_1", label: "Título — primera parte" },
  { group: "Precios", key: "precios_title_2", label: "Título — segunda parte (cursiva)" },
  { group: "Precios", key: "precio_mayoreo_title", label: "Precio Mayoreo — título" },
  { group: "Precios", key: "precio_mayoreo_desc", label: "Precio Mayoreo — descripción", multiline: true },
  { group: "Precios", key: "precio_super_title", label: "Precio Súper Mayoreo — título" },
  { group: "Precios", key: "precio_super_desc", label: "Precio Súper Mayoreo — descripción", multiline: true },

  { group: "Sucursales", key: "sucursales_eyebrow", label: "Texto pequeño de la sección" },
  { group: "Sucursales", key: "sucursales_title_1", label: "Título — primera parte" },
  { group: "Sucursales", key: "sucursales_title_2", label: "Título — segunda parte (cursiva)" },

  { group: "Recién llegado", key: "novedades_eyebrow", label: "Texto pequeño de la sección" },
  { group: "Recién llegado", key: "novedades_title_1", label: "Título — primera parte" },
  { group: "Recién llegado", key: "novedades_title_2", label: "Título — segunda parte (cursiva)" },
  { group: "Recién llegado", key: "novedades_lead", label: "Texto debajo del título", multiline: true },

  { group: "Marcas", key: "marcas_eyebrow", label: "Texto pequeño de la sección" },
  { group: "Marcas", key: "marcas_title_1", label: "Título — primera parte" },
  { group: "Marcas", key: "marcas_title_2", label: "Título — segunda parte (cursiva)" },
  { group: "Marcas", key: "marcas_lead", label: "Texto debajo del título", multiline: true },

  { group: "Contacto", key: "contacto_eyebrow", label: "Texto pequeño de la sección" },
  { group: "Contacto", key: "contacto_title_1", label: "Título — primera parte" },
  { group: "Contacto", key: "contacto_title_2", label: "Título — segunda parte (cursiva)" },
  { group: "Contacto", key: "contacto_lead", label: "Texto debajo del título", multiline: true },

  { group: "Pie de página", key: "footer_text", label: "Texto del pie de página" },
];

async function loadTextos() {
  const { data } = await supabaseClient.from("site_content").select("*");
  const byKey = {};
  (data || []).forEach(row => byKey[row.section_key] = row);

  const list = document.getElementById("textosList");
  let html = "";
  let currentGroup = null;
  TEXT_FIELDS.forEach(field => {
    if (field.group !== currentGroup) {
      if (currentGroup !== null) html += `</div>`;
      html += `<h3 class="dash-group-title">${field.group}</h3><div class="dash-item">`;
      currentGroup = field.group;
    }
    const row = byKey[field.key];
    const fallback = (translations.es[field.key] || "");
    const fallbackEn = (translations.en[field.key] || "");
    const valEs = row ? (row.content_es ?? fallback) : fallback;
    const valEn = row ? (row.content_en ?? fallbackEn) : fallbackEn;

    if (field.multiline) {
      html += `
        <div class="dash-field">
          <label>${field.label} (español)</label>
          <textarea data-text-key="${field.key}" data-lang="es">${escapeAttr(valEs)}</textarea>
        </div>
        <div class="dash-field">
          <label>${field.label} (inglés)</label>
          <textarea data-text-key="${field.key}" data-lang="en">${escapeAttr(valEn)}</textarea>
        </div>
      `;
    } else {
      html += `
        <div class="dash-field">
          <label>${field.label} (español)</label>
          <input data-text-key="${field.key}" data-lang="es" value="${escapeAttr(valEs)}">
        </div>
        <div class="dash-field">
          <label>${field.label} (inglés)</label>
          <input data-text-key="${field.key}" data-lang="en" value="${escapeAttr(valEn)}">
        </div>
      `;
    }
  });
  if (currentGroup !== null) html += `</div>`;
  list.innerHTML = html;
}

document.getElementById("saveTextosBtn").addEventListener("click", async () => {
  const btn = document.getElementById("saveTextosBtn");
  btn.disabled = true;
  btn.textContent = "Guardando…";

  const byKey = {};
  document.querySelectorAll("#textosList [data-text-key]").forEach(el => {
    const key = el.dataset.textKey, lang = el.dataset.lang;
    byKey[key] = byKey[key] || { section_key: key };
    byKey[key][lang === "es" ? "content_es" : "content_en"] = el.value;
  });

  try {
    const rows = Object.values(byKey);
    const { error } = await supabaseClient.from("site_content").upsert(rows, { onConflict: "section_key" });
    if (error) throw error;
    showToast("Textos guardados ✓");
  } catch (err) {
    console.error(err);
    showToast("Error al guardar los textos");
  } finally {
    btn.disabled = false;
    btn.textContent = "Guardar todos los textos";
  }
});

checkSession();
