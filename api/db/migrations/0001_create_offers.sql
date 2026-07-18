-- Tabla offers: contrato normalizado de entrada, unifica el CSV de Adzuna (sin fuente/encaja_perfil)
-- y el de Tecnoempleo (fecha_publicacion en DD/MM/YYYY, con fuente/encaja_perfil).
-- La normalización de fechas y del array stack_tecnologico ocurre en la capa de import del API, no aquí.

create table offers (
  id bigint generated always as identity primary key,
  fecha_scrape date not null,
  fuente text,
  fecha_publicacion date not null,
  empresa text not null,
  titulo_puesto text not null,
  categoria text not null check (categoria in ('IA', 'WEB')),
  encaja_perfil text check (encaja_perfil in ('Si', 'Quizas', 'No')),
  ubicacion text,
  modalidad text,
  salario_min numeric,
  salario_max numeric,
  experiencia_requerida text,
  stack_tecnologico text[],
  nivel_ingles text,
  url_oferta text not null unique,
  created_at timestamptz not null default now()
);
