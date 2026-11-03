-- 20261102_package_price_labels.sql
--
-- Textos editables del encabezado de precio de la página del paquete.
-- Pedido del dueño (02/11/2026): en las promos 2x1 de Brasil "Precio por
-- persona / en base doble" confunde al agente. NULL = texto de siempre.

alter table public.travel_packages
  add column if not exists price_label text,
  add column if not exists price_sublabel text;

comment on column public.travel_packages.price_label is
  'Texto arriba del precio. NULL = "Precio por persona". Ej: "Promoción 2x1".';
comment on column public.travel_packages.price_sublabel is
  'Texto abajo del precio. NULL = "en base doble". Ej: "Válido para dos personas".';

-- Rollback:
-- alter table public.travel_packages drop column if exists price_label, drop column if exists price_sublabel;
