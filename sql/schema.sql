-- ============================================================
-- Esquema de base de datos para el sitio de Galavix
-- Ejecutar esto completo en: Supabase → SQL Editor → New query
-- ============================================================

-- Tabla de contenido editable (textos de cada sección del sitio)
create table if not exists site_content (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,   -- ej: 'hero_title', 'nosotros_texto'
  content_es text,
  content_en text,
  updated_at timestamptz default now()
);

-- Tabla de marcas (nombre + enlace al álbum de Facebook)
create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,          -- ej: 'italia-de-luxe'
  name text not null,                 -- ej: 'Italia de Luxe'
  facebook_album_url text,
  sort_order int default 0,
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- Tabla de sucursales
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  hours_weekday text,
  hours_sunday text,
  closed_day text,
  maps_url text,
  accent_color text default '#C6435B',
  lat double precision,
  lng double precision,
  sort_order int default 0,
  updated_at timestamptz default now()
);

-- Tabla de "Recién llegado" (el admin solo pega el link de la publicación
-- de Facebook y el sitio la muestra embebida — sin subir fotos).
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  fb_url text,                       -- link a la publicación de Facebook
  note_es text,                      -- nota opcional en español (además de lo que ya dice el post)
  note_en text,
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Migración segura: si la tabla "posts" ya existía con el esquema viejo
-- (foto subida a Storage), la ajustamos al nuevo esquema sin perder la tabla.
alter table posts add column if not exists fb_url text;
alter table posts add column if not exists note_es text;
alter table posts add column if not exists note_en text;
alter table posts drop column if exists image_url;
alter table posts drop column if exists caption_es;
alter table posts drop column if exists caption_en;
alter table posts drop column if exists link_url;

-- ============================================================
-- Migración segura: le agregamos la regla de "nombre único" a
-- locations por si la tabla ya existía de antes sin ella. Así
-- el "on conflict (name)" de más abajo funciona correctamente.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'locations_name_key'
  ) then
    alter table locations add constraint locations_name_key unique (name);
  end if;
end $$;

-- ============================================================
-- Seguridad (Row Level Security)
-- Regla: cualquiera puede LEER (para que el sitio público funcione),
-- pero solo un usuario autenticado (admin) puede escribir/editar.
-- Como el registro público está desactivado, el único que puede
-- autenticarse es quien tú crees manualmente en Authentication.
-- ============================================================

alter table site_content enable row level security;
alter table brands enable row level security;
alter table locations enable row level security;
alter table posts enable row level security;

-- ============================================================
-- Permisos base (grants): cuando las tablas se crean por SQL
-- directo (no desde el editor visual de Supabase), los roles
-- "anon" (visitantes) y "authenticated" (admin logueado) no
-- reciben automáticamente permiso de leer/escribir. Sin esto,
-- toda petición truena con error 403 aunque las políticas de
-- RLS de abajo estén bien puestas.
-- ============================================================

grant usage on schema public to anon, authenticated;
grant select on site_content, brands, locations, posts to anon, authenticated;
grant insert, update, delete on site_content, brands, locations, posts to authenticated;

-- Lectura pública
-- (se usa "drop policy if exists" antes de cada "create" para que este
-- script se pueda correr las veces que sea necesario sin marcar error
-- de "la política ya existe")
drop policy if exists "public_read_content" on site_content;
create policy "public_read_content" on site_content for select using (true);

drop policy if exists "public_read_brands" on brands;
create policy "public_read_brands" on brands for select using (true);

drop policy if exists "public_read_locations" on locations;
create policy "public_read_locations" on locations for select using (true);

drop policy if exists "public_read_posts" on posts;
create policy "public_read_posts" on posts for select using (true);

-- Escritura solo para usuarios autenticados (el admin)
drop policy if exists "admin_write_content" on site_content;
create policy "admin_write_content" on site_content for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "admin_write_brands" on brands;
create policy "admin_write_brands" on brands for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "admin_write_locations" on locations;
create policy "admin_write_locations" on locations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "admin_write_posts" on posts;
create policy "admin_write_posts" on posts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Datos iniciales: las 4 sucursales que ya tenemos confirmadas
-- (on conflict (name): si ya existen, no las duplica ni las pisa)
-- ============================================================

insert into locations (name, address, hours_weekday, hours_sunday, closed_day, maps_url, accent_color, lat, lng, sort_order) values
('Centro', 'Amado Nervo #311-1, Col. Centro. Muy cerca de Milano.', '10:00 am – 5:30 pm', '10:00 am – 4:00 pm', 'Miércoles cerrado', 'https://www.google.com/maps/search/?api=1&query=31.7379,-106.4796', '#C6435B', 31.7379, -106.4796, 1),
('Las Torres', 'Av. de las Torres #1931. Lote Bravo. Plaza Arce, Local E11.', '10:00 am – 6:00 pm', '10:30 am – 4:00 pm', null, 'https://www.google.com/maps/search/?api=1&query=31.6277,-106.3941', '#C97B4A', 31.6277, -106.3941, 2),
('Parajes del Sur', 'Paseos del Sur #675-9, Fracc. Parajes del Sur. Por donde está Cobre 29.', '10:00 am – 6:00 pm', '10:30 am – 4:00 pm', null, 'https://www.google.com/maps/search/?api=1&query=31.5929,-106.3782', '#7B5EA7', 31.5929, -106.3782, 3),
('Oriente', 'Avenida Santiago Troncoso #2315, cerca de Smart Parajes de Oriente.', '10:00 am – 6:00 pm', '10:30 am – 4:00 pm', null, 'https://www.google.com/maps/search/?api=1&query=31.6087,-106.3537', '#C0577B', 31.6087, -106.3537, 4)
on conflict (name) do nothing;

-- ============================================================
-- Datos iniciales: las marcas (con el link que ya tenemos de Italia de Luxe)
-- (on conflict (slug): si ya existen, no las duplica ni las pisa)
-- ============================================================

insert into brands (slug, name, facebook_album_url, sort_order) values
('italia-de-luxe', 'Italia de Luxe', 'https://www.facebook.com/media/set/?set=a.918454560766032&type=3', 1),
('beauty-creations', 'Beauty Creations', null, 2),
('pink-up', 'Pink Up', null, 3),
('amor-us', 'Amor Us', null, 4),
('by-apple', 'By Apple', null, 5),
('bisss', 'Bisss', null, 6),
('amandas', 'Amanda''s', null, 7),
('nekane', 'Nekane', null, 8),
('kj-beauty', 'KJ Beauty', null, 9),
('diamond-beauty', 'Diamond Beauty', null, 10)
on conflict (slug) do nothing;

-- ============================================================
-- La tabla "posts" (Recién llegado) empieza vacía a propósito:
-- el encargado pega el link de cada publicación de Facebook desde
-- el panel según va recibiendo mercancía nueva. El sitio muestra
-- un mensaje amable mientras no haya ninguna.
-- ============================================================
