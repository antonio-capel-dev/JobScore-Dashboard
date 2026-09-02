import fs from "node:fs";
import { Request, Response } from "express";
import { 
    actualizarEstadoCandidatura, 
    existeOfertaPorUrl, 
    guardarOferta, 
    obtenerOfertas 
} from "../db/offers.repository";
import { parseOffersCsv } from "../services/csvImport.service";
import { scoreOffer, ScoringResult } from "../services/scoring.service";
import { sendOfferNotification } from "../services/telegram.service";

const rutasCsv: Record<string, string> = {
    adzuna: '../scraper/output/ofertas_2026-07-01.csv',
    tecnoempleo: '../scraper/data/empleos_tech_ia_web.csv',  
};

export async function importOffers(req: Request, res: Response) {
    const fuente = req.params.fuente as string;
    const ruta = rutasCsv[fuente];

    if (!ruta) {
        return res.status(400).json({ error: "Fuente no válida. Usa 'adzuna' o 'tecnoempleo'" });
    }

    if (!fs.existsSync(ruta)) {
        return res.status(404).json({ error: `Archivo CSV no encontrado en la ruta: ${ruta}` });
    }

    // Permitir ?limit=N en la petición para pruebas, o procesar todo el CSV por defecto
    const parsedLimit = req.query.limit ? Number(req.query.limit) : NaN;
    const limitParam = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    const ofertasCsv = parseOffersCsv(ruta);
    const ofertasAProcesar = limitParam ? ofertasCsv.slice(0, limitParam) : ofertasCsv;

    const resultados: ScoringResult[] = [];
    let omitidas = 0;

    for (const offer of ofertasAProcesar) {
        try {
            // Comprobación de idempotencia: si ya existe en BD, no volvemos a llamar a la IA
            const yaExiste = await existeOfertaPorUrl(offer.url_oferta);
            if (yaExiste) {
                omitidas++;
                continue;
            }

            const ofertaScored = await scoreOffer(offer);
            resultados.push(ofertaScored);
            await guardarOferta(offer, ofertaScored);

            if (ofertaScored.veredicto === 'Si' || ofertaScored.veredicto === 'Quizas') {
                await sendOfferNotification(offer, ofertaScored);
            }

            // Pausa de 1.5s entre llamadas para respetar el rate limit de OpenRouter
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.error("Error procesando oferta:", error);
        }
    }

    res.json({
        total: ofertasAProcesar.length,
        puntuadas: resultados.length,
        omitidas,
        resultados
    });
}

export async function getOffers(req: Request, res: Response) {
    const data = await obtenerOfertas();
    res.json(data);
}

export async function updateOfferStatus(req: Request, res: Response) {
    const id = Number(req.params.id);
    const estado = req.body.estado_candidatura;
    await actualizarEstadoCandidatura(id, estado);
    res.json({ mensaje: 'Estado actualizado' });
}
