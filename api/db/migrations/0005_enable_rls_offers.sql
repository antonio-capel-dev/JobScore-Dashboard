-- Migración 0005: activar Row Level Security en offers
--
-- Sin políticas a propósito. Con RLS activo y ninguna política, las claves públicas
-- de Supabase (anon y usuarios autenticados) no pueden leer ni escribir la tabla
-- directamente desde fuera.
--
-- La API usa la service_role key, que no está sujeta a RLS, y el frontend nunca
-- consulta la tabla: todo pasa por la API, que decide qué ve cada uno y quién escribe.
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
