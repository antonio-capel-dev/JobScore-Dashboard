ALTER TABLE offers 
    ADD COLUMN score numeric,
    ADD COLUMN tecnologias_coincidentes text[],
    ADD COLUMN brecha_principal text,
    ADD COLUMN recomendacion text;
