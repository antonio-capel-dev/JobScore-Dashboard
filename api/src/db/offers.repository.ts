import { supabase } from "./supabaseClient";
import { ParsedOffer } from "../services/csvImport.service";
import { ScoringResult } from "../services/scoring.service";

export async function existeOfertaPorUrl(url: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('offers')
        .select('id')
        .eq('url_oferta', url)
        .maybeSingle();

    if (error) {
        console.log('Error comprobando existencia por URL:', error);
        return false;
    }

    return data !== null;
}

export async function actualizarEstadoCandidatura(id: number, estado?: string | null, notas?: string | null) {
    const payload: Record<string, any> = {};
    if (estado !== undefined) {
        payload.estado_candidatura = estado;
    }
    if (notas !== undefined) {
        payload.notas = notas;
    }

    const { error } = await supabase
        .from('offers')
        .update(payload)
        .eq('id', id);

    if (error) {
        console.log('Error actualizando estado/notas:', error);
    }
}

export async function guardarOferta(offer: ParsedOffer, scoring: ScoringResult) {
    const { error } = await supabase.from('offers').insert({
        fecha_scrape: offer.fecha_scrape,
        fuente: offer.fuente,
        fecha_publicacion: offer.fecha_publicacion,
        empresa: offer.empresa,
        titulo_puesto: offer.titulo_puesto,
        categoria: offer.categoria,
        encaja_perfil: scoring.veredicto || offer.encaja_perfil,
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

export async function obtenerOfertas() {
    const { data, error } = await supabase
        .from('offers')
        .select("*")
        .order('fecha_publicacion', { ascending: false, nullsFirst: false });

    if (error) {
        console.log('Error buscando ofertas:', error);
        return [];
    }

    return data;
}

// Purga de ofertas con bajo score (< 45) que no tengan candidatura activa
export async function purgarOfertasDescartadas(): Promise<number> {
    const { data, error } = await supabase
        .from('offers')
        .delete()
        .lt('score', 45)
        .is('estado_candidatura', null)
        .select('id');

    if (error) {
        console.error('Error purgando ofertas de bajo score:', error);
        return 0;
    }

    return data ? data.length : 0;
}
