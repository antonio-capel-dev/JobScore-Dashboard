ALTER TABLE offers
    ADD COLUMN estado_candidatura text
    CHECK (estado_candidatura IN ('enviada', 'respuesta', 'entrevista', 'oferta'));