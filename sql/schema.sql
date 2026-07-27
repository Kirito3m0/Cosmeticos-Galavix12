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

-- Categorías dentro de una marca (ej. "Sombras", "Labiales" dentro de
-- "Italia de Luxe"), cada una con su propio texto y sus propias fotos.
create table if not exists brand_categories (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name_es text not null,
  name_en text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Fotos de una marca, subidas desde el panel (Supabase Storage).
-- Si category_id es null, la foto va en la galería general de la marca.
-- Si tiene category_id, va dentro de esa categoría.
create table if not exists brand_images (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  category_id uuid references brand_categories(id) on delete set null,
  image_url text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Secciones nuevas y personalizadas para la página principal (además de
-- Nosotros, Precios, Sucursales, Recién llegado, Marcas y Contacto).
create table if not exists custom_sections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_es text,
  title_en text,
  subtitle_es text,
  subtitle_en text,
  text_es text,
  text_en text,
  sort_order int default 999,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Fotos de cada sección nueva
create table if not exists custom_section_images (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references custom_sections(id) on delete cascade,
  image_url text not null,
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
alter table brand_categories enable row level security;
alter table brand_images enable row level security;
alter table custom_sections enable row level security;
alter table custom_section_images enable row level security;

-- ============================================================
-- Permisos base (grants): cuando las tablas se crean por SQL
-- directo (no desde el editor visual de Supabase), los roles
-- "anon" (visitantes) y "authenticated" (admin logueado) no
-- reciben automáticamente permiso de leer/escribir. Sin esto,
-- toda petición truena con error 403 aunque las políticas de
-- RLS de abajo estén bien puestas.
-- ============================================================

grant usage on schema public to anon, authenticated;
grant select on site_content, brands, locations, posts, brand_categories, brand_images, custom_sections, custom_section_images to anon, authenticated;
grant insert, update, delete on site_content, brands, locations, posts, brand_categories, brand_images, custom_sections, custom_section_images to authenticated;

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

drop policy if exists "public_read_brand_categories" on brand_categories;
create policy "public_read_brand_categories" on brand_categories for select using (true);

drop policy if exists "public_read_brand_images" on brand_images;
create policy "public_read_brand_images" on brand_images for select using (true);

drop policy if exists "public_read_custom_sections" on custom_sections;
create policy "public_read_custom_sections" on custom_sections for select using (true);

drop policy if exists "public_read_custom_section_images" on custom_section_images;
create policy "public_read_custom_section_images" on custom_section_images for select using (true);

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

drop policy if exists "admin_write_brand_categories" on brand_categories;
create policy "admin_write_brand_categories" on brand_categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "admin_write_brand_images" on brand_images;
create policy "admin_write_brand_images" on brand_images for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "admin_write_custom_sections" on custom_sections;
create policy "admin_write_custom_sections" on custom_sections for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "admin_write_custom_section_images" on custom_section_images;
create policy "admin_write_custom_section_images" on custom_section_images for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Storage: bucket público para las fotos que se suban desde el panel
-- (fotos de marcas, categorías y secciones nuevas).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('galavix-media', 'galavix-media', true)
on conflict (id) do nothing;

drop policy if exists "public_read_galavix_media" on storage.objects;
create policy "public_read_galavix_media" on storage.objects for select
  using (bucket_id = 'galavix-media');

drop policy if exists "admin_write_galavix_media" on storage.objects;
create policy "admin_write_galavix_media" on storage.objects for all
  using (bucket_id = 'galavix-media' and auth.role() = 'authenticated')
  with check (bucket_id = 'galavix-media' and auth.role() = 'authenticated');

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
-- Migración: mete al catálogo de brand_images las fotos que ya
-- estaban subidas por GitHub (assets/marcas/...), para que sigan
-- apareciendo aunque ahora la página las lea desde la base de datos.
-- Se puede correr las veces que sea necesario sin duplicar (gracias
-- al 'unique (brand_id, image_url)' de abajo).
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'brand_images_brand_url_key'
  ) then
    alter table brand_images add constraint brand_images_brand_url_key unique (brand_id, image_url);
  end if;
end $$;

insert into brand_images (brand_id, image_url, sort_order)
select b.id, v.image_url, v.sort_order
from (values
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-01.jpg', 1),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-02.jpg', 2),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-03.jpg', 3),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-04.jpg', 4),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-05.jpg', 5),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-06.jpg', 6),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-07.jpg', 7),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-08.jpg', 8),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-09.jpg', 9),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-10.jpg', 10),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-11.jpg', 11),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-12.jpg', 12),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-13.jpg', 13),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-14.jpg', 14),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-15.jpg', 15),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-16.jpg', 16),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-17.jpg', 17),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-18.jpg', 18),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-19.jpg', 19),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-20.jpg', 20),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-21.jpg', 21),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-22.jpg', 22),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-23.jpg', 23),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-24.jpg', 24),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-25.jpg', 25),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-26.jpg', 26),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-27.jpg', 27),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-28.jpg', 28),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-29.jpg', 29),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-30.jpg', 30),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-31.jpg', 31),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-32.jpg', 32),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-33.jpg', 33),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-34.jpg', 34),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-35.jpg', 35),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-36.jpg', 36),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-37.jpg', 37),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-38.jpg', 38),
  ('italia-de-luxe', 'assets/marcas/italia-de-luxe/italia-de-luxe-39.jpg', 39),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-01.jpg', 1),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-02.jpg', 2),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-03.jpg', 3),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-04.jpg', 4),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-05.jpg', 5),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-06.jpg', 6),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-07.jpg', 7),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-08.jpg', 8),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-09.jpg', 9),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-10.jpg', 10),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-11.jpg', 11),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-12.jpg', 12),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-13.jpg', 13),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-14.jpg', 14),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-15.jpg', 15),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-16.jpg', 16),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-17.jpg', 17),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-18.jpg', 18),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-19.jpg', 19),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-20.jpg', 20),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-21.jpg', 21),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-22.jpg', 22),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-23.jpg', 23),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-24.jpg', 24),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-25.jpg', 25),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-26.jpg', 26),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-27.jpg', 27),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-28.jpg', 28),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-29.jpg', 29),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-30.jpg', 30),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-31.jpg', 31),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-32.jpg', 32),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-33.jpg', 33),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-34.jpg', 34),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-35.jpg', 35),
  ('beauty-creations', 'assets/marcas/beauty-creations/beauty-creations-36.jpg', 36),
  ('pink-up', 'assets/marcas/pink-up/pink-up-01.jpg', 1),
  ('pink-up', 'assets/marcas/pink-up/pink-up-02.jpg', 2),
  ('pink-up', 'assets/marcas/pink-up/pink-up-03.jpg', 3),
  ('pink-up', 'assets/marcas/pink-up/pink-up-04.jpg', 4),
  ('pink-up', 'assets/marcas/pink-up/pink-up-05.jpg', 5),
  ('pink-up', 'assets/marcas/pink-up/pink-up-06.jpg', 6),
  ('pink-up', 'assets/marcas/pink-up/pink-up-07.jpg', 7),
  ('pink-up', 'assets/marcas/pink-up/pink-up-08.jpg', 8),
  ('pink-up', 'assets/marcas/pink-up/pink-up-09.jpg', 9),
  ('pink-up', 'assets/marcas/pink-up/pink-up-10.jpg', 10),
  ('pink-up', 'assets/marcas/pink-up/pink-up-11.jpg', 11),
  ('pink-up', 'assets/marcas/pink-up/pink-up-12.jpg', 12),
  ('pink-up', 'assets/marcas/pink-up/pink-up-13.jpg', 13),
  ('pink-up', 'assets/marcas/pink-up/pink-up-14.jpg', 14),
  ('pink-up', 'assets/marcas/pink-up/pink-up-15.jpg', 15),
  ('pink-up', 'assets/marcas/pink-up/pink-up-16.jpg', 16),
  ('pink-up', 'assets/marcas/pink-up/pink-up-17.jpg', 17),
  ('pink-up', 'assets/marcas/pink-up/pink-up-18.jpg', 18),
  ('pink-up', 'assets/marcas/pink-up/pink-up-19.jpg', 19),
  ('pink-up', 'assets/marcas/pink-up/pink-up-20.jpg', 20),
  ('pink-up', 'assets/marcas/pink-up/pink-up-21.jpg', 21),
  ('pink-up', 'assets/marcas/pink-up/pink-up-22.jpg', 22),
  ('pink-up', 'assets/marcas/pink-up/pink-up-23.jpg', 23),
  ('pink-up', 'assets/marcas/pink-up/pink-up-24.jpg', 24),
  ('pink-up', 'assets/marcas/pink-up/pink-up-25.jpg', 25),
  ('pink-up', 'assets/marcas/pink-up/pink-up-26.jpg', 26),
  ('pink-up', 'assets/marcas/pink-up/pink-up-27.jpg', 27),
  ('pink-up', 'assets/marcas/pink-up/pink-up-28.jpg', 28),
  ('pink-up', 'assets/marcas/pink-up/pink-up-29.jpg', 29),
  ('pink-up', 'assets/marcas/pink-up/pink-up-30.jpg', 30),
  ('pink-up', 'assets/marcas/pink-up/pink-up-31.jpg', 31),
  ('pink-up', 'assets/marcas/pink-up/pink-up-32.jpg', 32),
  ('pink-up', 'assets/marcas/pink-up/pink-up-33.jpg', 33),
  ('pink-up', 'assets/marcas/pink-up/pink-up-34.jpg', 34),
  ('pink-up', 'assets/marcas/pink-up/pink-up-35.jpg', 35),
  ('pink-up', 'assets/marcas/pink-up/pink-up-36.jpg', 36),
  ('pink-up', 'assets/marcas/pink-up/pink-up-37.jpg', 37),
  ('pink-up', 'assets/marcas/pink-up/pink-up-38.jpg', 38),
  ('pink-up', 'assets/marcas/pink-up/pink-up-39.jpg', 39),
  ('pink-up', 'assets/marcas/pink-up/pink-up-40.jpg', 40),
  ('pink-up', 'assets/marcas/pink-up/pink-up-41.jpg', 41),
  ('pink-up', 'assets/marcas/pink-up/pink-up-42.jpg', 42),
  ('pink-up', 'assets/marcas/pink-up/pink-up-43.jpg', 43),
  ('pink-up', 'assets/marcas/pink-up/pink-up-44.jpg', 44),
  ('pink-up', 'assets/marcas/pink-up/pink-up-45.jpg', 45),
  ('pink-up', 'assets/marcas/pink-up/pink-up-46.jpg', 46),
  ('pink-up', 'assets/marcas/pink-up/pink-up-47.jpg', 47),
  ('pink-up', 'assets/marcas/pink-up/pink-up-48.jpg', 48),
  ('pink-up', 'assets/marcas/pink-up/pink-up-49.jpg', 49),
  ('amor-us', 'assets/marcas/amor-us/amor-us-01.jpg', 1),
  ('amor-us', 'assets/marcas/amor-us/amor-us-02.jpg', 2),
  ('amor-us', 'assets/marcas/amor-us/amor-us-03.jpg', 3),
  ('amor-us', 'assets/marcas/amor-us/amor-us-04.jpg', 4),
  ('amor-us', 'assets/marcas/amor-us/amor-us-05.jpg', 5),
  ('amor-us', 'assets/marcas/amor-us/amor-us-06.jpg', 6),
  ('amor-us', 'assets/marcas/amor-us/amor-us-07.jpg', 7),
  ('amor-us', 'assets/marcas/amor-us/amor-us-08.jpg', 8),
  ('amor-us', 'assets/marcas/amor-us/amor-us-09.jpg', 9),
  ('amor-us', 'assets/marcas/amor-us/amor-us-10.jpg', 10),
  ('amor-us', 'assets/marcas/amor-us/amor-us-11.jpg', 11),
  ('amor-us', 'assets/marcas/amor-us/amor-us-12.jpg', 12),
  ('amor-us', 'assets/marcas/amor-us/amor-us-13.jpg', 13),
  ('amor-us', 'assets/marcas/amor-us/amor-us-14.jpg', 14),
  ('amor-us', 'assets/marcas/amor-us/amor-us-15.jpg', 15),
  ('amor-us', 'assets/marcas/amor-us/amor-us-16.jpg', 16),
  ('amor-us', 'assets/marcas/amor-us/amor-us-17.jpg', 17),
  ('amor-us', 'assets/marcas/amor-us/amor-us-18.jpg', 18),
  ('amor-us', 'assets/marcas/amor-us/amor-us-19.jpg', 19),
  ('amor-us', 'assets/marcas/amor-us/amor-us-20.jpg', 20),
  ('amor-us', 'assets/marcas/amor-us/amor-us-21.jpg', 21),
  ('amor-us', 'assets/marcas/amor-us/amor-us-22.jpg', 22),
  ('amor-us', 'assets/marcas/amor-us/amor-us-23.jpg', 23),
  ('amor-us', 'assets/marcas/amor-us/amor-us-24.jpg', 24),
  ('amor-us', 'assets/marcas/amor-us/amor-us-25.jpg', 25),
  ('amor-us', 'assets/marcas/amor-us/amor-us-26.jpg', 26),
  ('amor-us', 'assets/marcas/amor-us/amor-us-27.jpg', 27),
  ('amor-us', 'assets/marcas/amor-us/amor-us-28.jpg', 28),
  ('amor-us', 'assets/marcas/amor-us/amor-us-29.jpg', 29),
  ('amor-us', 'assets/marcas/amor-us/amor-us-30.jpg', 30),
  ('amor-us', 'assets/marcas/amor-us/amor-us-31.jpg', 31),
  ('amor-us', 'assets/marcas/amor-us/amor-us-32.jpg', 32),
  ('amor-us', 'assets/marcas/amor-us/amor-us-33.jpg', 33),
  ('by-apple', 'assets/marcas/by-apple/by-apple-01.jpg', 1),
  ('by-apple', 'assets/marcas/by-apple/by-apple-02.jpg', 2),
  ('by-apple', 'assets/marcas/by-apple/by-apple-03.jpg', 3),
  ('by-apple', 'assets/marcas/by-apple/by-apple-04.jpg', 4),
  ('by-apple', 'assets/marcas/by-apple/by-apple-05.jpg', 5),
  ('by-apple', 'assets/marcas/by-apple/by-apple-06.jpg', 6),
  ('by-apple', 'assets/marcas/by-apple/by-apple-07.jpg', 7),
  ('by-apple', 'assets/marcas/by-apple/by-apple-08.jpg', 8),
  ('by-apple', 'assets/marcas/by-apple/by-apple-09.jpg', 9),
  ('by-apple', 'assets/marcas/by-apple/by-apple-10.jpg', 10),
  ('by-apple', 'assets/marcas/by-apple/by-apple-11.jpg', 11),
  ('by-apple', 'assets/marcas/by-apple/by-apple-12.jpg', 12),
  ('by-apple', 'assets/marcas/by-apple/by-apple-13.jpg', 13),
  ('by-apple', 'assets/marcas/by-apple/by-apple-14.jpg', 14),
  ('by-apple', 'assets/marcas/by-apple/by-apple-15.jpg', 15),
  ('by-apple', 'assets/marcas/by-apple/by-apple-16.jpg', 16),
  ('by-apple', 'assets/marcas/by-apple/by-apple-17.jpg', 17),
  ('by-apple', 'assets/marcas/by-apple/by-apple-18.jpg', 18),
  ('by-apple', 'assets/marcas/by-apple/by-apple-19.jpg', 19),
  ('by-apple', 'assets/marcas/by-apple/by-apple-20.jpg', 20),
  ('bisss', 'assets/marcas/bisss/bisss-01.jpg', 1),
  ('bisss', 'assets/marcas/bisss/bisss-02.jpg', 2),
  ('bisss', 'assets/marcas/bisss/bisss-03.jpg', 3),
  ('bisss', 'assets/marcas/bisss/bisss-04.jpg', 4),
  ('bisss', 'assets/marcas/bisss/bisss-05.jpg', 5),
  ('bisss', 'assets/marcas/bisss/bisss-06.jpg', 6),
  ('bisss', 'assets/marcas/bisss/bisss-07.jpg', 7),
  ('bisss', 'assets/marcas/bisss/bisss-08.jpg', 8),
  ('bisss', 'assets/marcas/bisss/bisss-09.jpg', 9),
  ('bisss', 'assets/marcas/bisss/bisss-10.jpg', 10),
  ('bisss', 'assets/marcas/bisss/bisss-11.jpg', 11),
  ('bisss', 'assets/marcas/bisss/bisss-12.jpg', 12),
  ('bisss', 'assets/marcas/bisss/bisss-13.jpg', 13),
  ('bisss', 'assets/marcas/bisss/bisss-14.jpg', 14),
  ('bisss', 'assets/marcas/bisss/bisss-15.jpg', 15),
  ('bisss', 'assets/marcas/bisss/bisss-16.jpg', 16),
  ('bisss', 'assets/marcas/bisss/bisss-17.jpg', 17),
  ('amandas', 'assets/marcas/amandas/amandas-01.jpg', 1),
  ('amandas', 'assets/marcas/amandas/amandas-02.jpg', 2),
  ('amandas', 'assets/marcas/amandas/amandas-03.jpg', 3),
  ('amandas', 'assets/marcas/amandas/amandas-04.jpg', 4),
  ('amandas', 'assets/marcas/amandas/amandas-05.jpg', 5),
  ('amandas', 'assets/marcas/amandas/amandas-06.jpg', 6),
  ('amandas', 'assets/marcas/amandas/amandas-07.jpg', 7),
  ('amandas', 'assets/marcas/amandas/amandas-08.jpg', 8),
  ('amandas', 'assets/marcas/amandas/amandas-09.jpg', 9),
  ('amandas', 'assets/marcas/amandas/amandas-10.jpg', 10),
  ('amandas', 'assets/marcas/amandas/amandas-11.jpg', 11),
  ('amandas', 'assets/marcas/amandas/amandas-12.jpg', 12),
  ('amandas', 'assets/marcas/amandas/amandas-13.jpg', 13),
  ('amandas', 'assets/marcas/amandas/amandas-14.jpg', 14),
  ('amandas', 'assets/marcas/amandas/amandas-15.jpg', 15),
  ('amandas', 'assets/marcas/amandas/amandas-16.jpg', 16),
  ('amandas', 'assets/marcas/amandas/amandas-17.jpg', 17),
  ('amandas', 'assets/marcas/amandas/amandas-18.jpg', 18),
  ('amandas', 'assets/marcas/amandas/amandas-19.jpg', 19),
  ('amandas', 'assets/marcas/amandas/amandas-20.jpg', 20),
  ('amandas', 'assets/marcas/amandas/amandas-21.jpg', 21),
  ('amandas', 'assets/marcas/amandas/amandas-22.jpg', 22),
  ('amandas', 'assets/marcas/amandas/amandas-23.jpg', 23),
  ('amandas', 'assets/marcas/amandas/amandas-24.jpg', 24),
  ('amandas', 'assets/marcas/amandas/amandas-25.jpg', 25),
  ('amandas', 'assets/marcas/amandas/amandas-26.jpg', 26),
  ('amandas', 'assets/marcas/amandas/amandas-27.jpg', 27),
  ('amandas', 'assets/marcas/amandas/amandas-28.jpg', 28),
  ('amandas', 'assets/marcas/amandas/amandas-29.jpg', 29),
  ('amandas', 'assets/marcas/amandas/amandas-30.jpg', 30),
  ('amandas', 'assets/marcas/amandas/amandas-31.jpg', 31),
  ('amandas', 'assets/marcas/amandas/amandas-32.jpg', 32),
  ('amandas', 'assets/marcas/amandas/amandas-33.jpg', 33),
  ('amandas', 'assets/marcas/amandas/amandas-34.jpg', 34),
  ('amandas', 'assets/marcas/amandas/amandas-35.jpg', 35),
  ('amandas', 'assets/marcas/amandas/amandas-36.jpg', 36),
  ('nekane', 'assets/marcas/nekane/nekane-01.jpg', 1),
  ('nekane', 'assets/marcas/nekane/nekane-02.jpg', 2),
  ('nekane', 'assets/marcas/nekane/nekane-03.jpg', 3),
  ('nekane', 'assets/marcas/nekane/nekane-04.jpg', 4),
  ('nekane', 'assets/marcas/nekane/nekane-05.jpg', 5),
  ('nekane', 'assets/marcas/nekane/nekane-06.jpg', 6),
  ('nekane', 'assets/marcas/nekane/nekane-07.jpg', 7),
  ('nekane', 'assets/marcas/nekane/nekane-08.jpg', 8),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-01.jpg', 1),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-02.jpg', 2),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-03.jpg', 3),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-04.jpg', 4),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-05.jpg', 5),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-06.jpg', 6),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-07.jpg', 7),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-08.jpg', 8),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-09.jpg', 9),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-10.jpg', 10),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-11.jpg', 11),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-12.jpg', 12),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-13.jpg', 13),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-14.jpg', 14),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-15.jpg', 15),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-16.jpg', 16),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-17.jpg', 17),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-18.jpg', 18),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-19.jpg', 19),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-20.jpg', 20),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-21.jpg', 21),
  ('kj-beauty', 'assets/marcas/kj-beauty/kj-beauty-22.jpg', 22),
  ('diamond-beauty', 'assets/marcas/diamond-beauty/diamond-beauty-01.jpg', 1),
  ('diamond-beauty', 'assets/marcas/diamond-beauty/diamond-beauty-02.jpg', 2),
  ('diamond-beauty', 'assets/marcas/diamond-beauty/diamond-beauty-03.jpg', 3),
  ('diamond-beauty', 'assets/marcas/diamond-beauty/diamond-beauty-04.jpg', 4),
  ('diamond-beauty', 'assets/marcas/diamond-beauty/diamond-beauty-05.jpg', 5),
  ('diamond-beauty', 'assets/marcas/diamond-beauty/diamond-beauty-06.jpg', 6),
  ('diamond-beauty', 'assets/marcas/diamond-beauty/diamond-beauty-07.jpg', 7),
  ('diamond-beauty', 'assets/marcas/diamond-beauty/diamond-beauty-08.jpg', 8)
) as v(slug, image_url, sort_order)
join brands b on b.slug = v.slug
on conflict (brand_id, image_url) do nothing;

-- ============================================================
-- La tabla "posts" (Recién llegado) empieza vacía a propósito:
-- el encargado pega el link de cada publicación de Facebook desde
-- el panel según va recibiendo mercancía nueva. El sitio muestra
-- un mensaje amable mientras no haya ninguna.
-- ============================================================
