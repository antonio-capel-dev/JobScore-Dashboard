-- Migración 0004: Añadir columna de notas personales a las ofertas
ALTER TABLE offers ADD COLUMN IF NOT EXISTS notas TEXT DEFAULT NULL;
