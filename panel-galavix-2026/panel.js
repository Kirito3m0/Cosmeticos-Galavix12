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
      <button class="dash-save" data-save-location="${loc.id}">Guardar cambios</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-save-location]").forEach(btn => {
    btn.addEventListener("click", () => saveLocation(btn.dataset.saveLocation, btn.closest(".dash-item")));
  });
}

async function saveLocation(id, itemEl) {
  const fields = {};
  itemEl.querySelectorAll("[data-field]").forEach(inp => fields[inp.dataset.field] = inp.value);
  const { error } = await supabaseClient.from("locations").update(fields).eq("id", id);
  showToast(error ? "Error al guardar" : "Sucursal actualizada ✓");
}

// ---------------- MARCAS ----------------
async function loadBrands() {
  const { data } = await supabaseClient.from("brands").select("*").order("sort_order");
  const list = document.getElementById("brandList");
  list.innerHTML = (data || []).map(brand => `
    <div class="dash-item" data-id="${brand.id}">
      <h3>${brand.name}</h3>
      <div class="dash-field"><label>Nombre</label><input data-field="name" value="${escapeAttr(brand.name || "")}"></div>
      <div class="dash-field"><label>Enlace del álbum de Facebook</label><input data-field="facebook_album_url" value="${escapeAttr(brand.facebook_album_url || "")}"></div>
      <button class="dash-save" data-save-brand="${brand.id}">Guardar cambios</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-save-brand]").forEach(btn => {
    btn.addEventListener("click", () => saveBrand(btn.dataset.saveBrand, btn.closest(".dash-item")));
  });
}

async function saveBrand(id, itemEl) {
  const fields = {};
  itemEl.querySelectorAll("[data-field]").forEach(inp => fields[inp.dataset.field] = inp.value);
  const { error } = await supabaseClient.from("brands").update(fields).eq("id", id);
  showToast(error ? "Error al guardar" : "Marca actualizada ✓");
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

checkSession();
