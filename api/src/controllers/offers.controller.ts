import { Request, Response } from "express";
import { 
    actualizarEstadoCandidatura, 
    obtenerOfertas,
    purgarOfertasDescartadas 
} from "../db/offers.repository";
import { procesarFuente, ejecutarPipelineCompleto, procesarTextoCsv } from "../services/pipeline.service";
import { parseOffersCsvFromText } from "../services/csvImport.service";

export async function importOffers(req: Request, res: Response) {
    const fuente = req.params.fuente as string;

    if (fuente !== 'adzuna' && fuente !== 'tecnoempleo') {
        return res.status(400).json({ error: "Fuente no válida. Usa 'adzuna' o 'tecnoempleo'" });
    }

    const parsedLimit = req.query.limit ? Number(req.query.limit) : NaN;
    const limitParam = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    try {
        const resultado = await procesarFuente(fuente, limitParam);
        res.json(resultado);
    } catch (error: any) {
        console.error(`Error importando ofertas de ${fuente}:`, error.message);
        res.status(500).json({ error: error.message });
    }
}

export async function uploadOffersCsv(req: Request, res: Response) {
    const { csvText } = req.body;
    if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
        return res.status(400).json({ error: "El contenido del archivo CSV es obligatorio" });
    }

    // Parsear y filtrar es instantáneo — lo hacemos antes de responder para dar el conteo real
    const ofertasFiltradas = parseOffersCsvFromText(csvText);

    // Responder inmediatamente al frontend (no bloquear la conexión HTTP)
    res.json({
        mensaje: `Recibidas ${ofertasFiltradas.length} ofertas válidas. Evaluando con IA en segundo plano...`,
        total: ofertasFiltradas.length
    });

    // Procesar en background (la conexión HTTP ya se cerró)
    procesarTextoCsv(csvText).then(resultado => {
        console.log(`[Upload] Finalizado: ${resultado.puntuadas} evaluadas, ${resultado.total - resultado.omitidas - resultado.puntuadas} descartadas por score bajo`);
    }).catch(err => {
        console.error('[Upload] Error en procesamiento background:', err);
    });
}

export async function triggerPipeline(req: Request, res: Response) {
    try {
        const resultado = await ejecutarPipelineCompleto();
        res.json({ mensaje: "Pipeline completado", resultado });
    } catch (error: any) {
        console.error("Error ejecutando pipeline:", error);
        res.status(500).json({ error: error.message });
    }
}

export async function purgeLowScoreOffers(req: Request, res: Response) {
    try {
        const eliminadas = await purgarOfertasDescartadas();
        res.json({ mensaje: `Se eliminaron ${eliminadas} ofertas descartadas de Supabase`, eliminadas });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export async function getOffers(req: Request, res: Response) {
    const data = await obtenerOfertas();
    res.json(data);
}

export async function updateOfferStatus(req: Request, res: Response) {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "ID de oferta no válido" });
    }

    const estado = req.body.estado_candidatura;
    const notas = req.body.notas;

    const estadosValidos = [undefined, null, '', 'enviada', 'respuesta', 'entrevista', 'oferta'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: "Estado no válido. Usa: enviada, respuesta, entrevista u oferta" });
    }

    const estadoFinal = estado === '' ? null : estado;
    await actualizarEstadoCandidatura(id, estadoFinal, notas);
    res.json({ mensaje: 'Oferta actualizada con éxito' });
}

