const SUPABASE_URL = "https://sbovdjhvjrizepoapqpv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_woL-_xnLtCWOIh2bDndWnA_C7kcU-61";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ---------------- Publicaciones de Facebook ----------------
// Convierte CUALQUIER cosa que pegue el admin (link corto de "Compartir",
// link de una foto suelta, el código completo de "Insertar", el link del
// plugin ya armado, o el link normal de la publicación) en la URL lista
// para meter directo en un <iframe src="...">. Ya no depende del SDK de
// Facebook (FB.XFBML) ni de que el admin decodifique nada a mano: el
// navegador manda la URL tal cual al servidor de Facebook y este la
// entiende sin problema, esté codificada o no.
// Devuelve "" si lo que pegaron no trae suficiente info (ej. el link
// genérico del plugin sin ninguna publicación adentro).
function facebookEmbedSrc(raw) {
  if (!raw) return "";
  let input = raw.trim();

  // Pegaron el código <iframe ...> completo de "Insertar": nos quedamos
  // con el src de adentro.
  const iframeMatch = input.match(/src=["']([^"']+)["']/i);
  if (iframeMatch) input = iframeMatch[1];

  // Pegaron solo el pedazo codificado, sin el link del plugin alrededor
  // (ej. "https%3A%2F%2Fwww.facebook.com%2F..."): lo decodificamos primero
  // para no envolverlo codificado dos veces.
  if (/^https?%3A/i.test(input)) {
    input = decodeURIComponent(input);
  }

  // Ya es un link del plugin (plugins/post.php?href=...): tiene que traer
  // el href de la publicación adentro, si no, no sirve de nada.
  if (/facebook\.com\/plugins\//i.test(input)) {
    try {
      const parsed = new URL(input);
      const href = parsed.searchParams.get("href");
      if (!href) return ""; // link genérico sin publicación adentro: inválido
      parsed.searchParams.set("show_text", "true");
      if (!parsed.searchParams.get("width")) parsed.searchParams.set("width", "500");
      return parsed.toString();
    } catch {
      return "";
    }
  }

  // Cualquier otro link (el normal de la publicación, uno de "Compartir",
  // de una foto suelta, etc.): lo envolvemos nosotros en el plugin.
  return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(input)}&show_text=true&width=500`;
}

// Para el botón "Ver en Facebook": intenta sacar el link real de la
// publicación desde adentro del link del plugin, para no mandar al
// visitante a la URL del plugin.
function facebookViewLink(raw) {
  if (!raw) return "#";
  const embed = facebookEmbedSrc(raw);
  try {
    const inner = new URL(embed).searchParams.get("href");
    return inner || raw.trim();
  } catch {
    return raw.trim();
  }
}
