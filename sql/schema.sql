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

-- Lectura pública
create policy "public_read_content" on site_content for select using (true);
create policy "public_read_brands" on brands for select using (true);
create policy "public_read_locations" on locations for select using (true);

-- Escritura solo para usuarios autenticados (el admin)
create policy "admin_write_content" on site_content for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admin_write_brands" on brands for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admin_write_locations" on locations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Datos iniciales: las 4 sucursales que ya tenemos confirmadas
-- ============================================================

insert into locations (name, address, hours_weekday, hours_sunday, closed_day, maps_url, accent_color, lat, lng, sort_order) values
('Centro', 'Amado Nervo #311-1, Col. Centro. Muy cerca de Milano.', '10:00 am – 5:30 pm', '10:00 am – 4:00 pm', 'Miércoles cerrado', 'https://www.google.com/maps/search/?api=1&query=31.7379,-106.4796', '#C6435B', 31.7379, -106.4796, 1),
('Las Torres', 'Av. de las Torres #1931. Lote Bravo. Plaza Arce, Local E11.', '10:00 am – 6:00 pm', '10:30 am – 4:00 pm', null, 'https://www.google.com/maps/search/?api=1&query=31.6277,-106.3941', '#C97B4A', 31.6277, -106.3941, 2),
('Parajes del Sur', 'Paseos del Sur #675-9, Fracc. Parajes del Sur. Por donde está Cobre 29.', '10:00 am – 6:00 pm', '10:30 am – 4:00 pm', null, 'https://www.google.com/maps/search/?api=1&query=31.5929,-106.3782', '#7B5EA7', 31.5929, -106.3782, 3),
('Oriente', 'Avenida Santiago Troncoso #2315, cerca de Smart Parajes de Oriente.', '10:00 am – 6:00 pm', '10:30 am – 4:00 pm', null, 'https://www.google.com/maps/search/?api=1&query=31.6087,-106.3537', '#C0577B', 31.6087, -106.3537, 4);

-- ============================================================
-- Datos iniciales: las marcas (con el link que ya tenemos de Italia de Luxe)
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
('diamond-beauty', 'Diamond Beauty', null, 10);
