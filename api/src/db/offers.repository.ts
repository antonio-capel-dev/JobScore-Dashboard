import { supabase } from "./supabaseClient";

import { ParsedOffer } from "../services/csvImport.service";

import { ScoringResult } from "../services/scoring.service";

export async function guardarOferta(offer: ParsedOffer, scoring: ScoringResult) {
    const { error } = await supabase.from('offers').insert({
        fecha_scrape: offer.fecha_scrape,
        fuente : offer.fuente,
        fecha_publicacion: offer.fecha_publicacion,
        empresa: offer.empresa,
        titulo_puesto : offer.titulo_puesto,
        categoria: offer.categoria,
        encaja_perfil: offer.encaja_perfil,
        ubicacion: offer.ubicacion,
        modalidad: offer.modalidad,
        salario_min: offer.salario_min,
        salario_max: offer.salario_max,
        experiencia_requerida: offer.experiencia_requerida,
        stack_tecnologico: offer.stack_tecnologico,
        nivel_ingles: offer.nivel_ingles,
        url_oferta: offer.url_oferta,
        score: scoring.score,
        tecnologias_coincidentes: scoring.tecnologiasCoincidentes,
        brecha_principal: scoring.brechaPrincipal,
        recomendacion: scoring.recomendacion,
    });

    if (error) {
        console.log('Error guardando oferta:', error);
    }
}