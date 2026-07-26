// Configuración de conexión a Supabase
// La "publishable key" es segura de exponer aquí — está diseñada para usarse
// desde el navegador. NUNCA pongas aquí la "secret key".

const SUPABASE_URL = "https://sbovdjhvjrizepoapqpv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_woL-_xnLtCWOIh2bDndWnA_C7kcU-61";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
