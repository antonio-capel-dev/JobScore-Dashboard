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

function obtenerRutaCsv(fuente: string): string | null {
    if (fuente === 'tecnoempleo') {
        if (process.env.CSV_PATH_TECNOEMPLEO && fs.existsSync(process.env.CSV_PATH_TECNOEMPLEO)) {
            return process.env.CSV_PATH_TECNOEMPLEO;
        }
        const rutaOpenClaw = 'D:/OPENCLAW-DATOS-IMPORTANTES-GUARDADOS/empleos_tech_ia_web.csv';
        if (fs.existsSync(rutaOpenClaw)) {
            return rutaOpenClaw;
        }
        return '../scraper/data/empleos_tech_ia_web.csv';
    }

    if (fuente === 'adzuna') {
        if (process.env.CSV_PATH_ADZUNA && fs.existsSync(process.env.CSV_PATH_ADZUNA)) {
            return process.env.CSV_PATH_ADZUNA;
        }
        const rutaOpenClaw = 'D:/OPENCLAW-DATOS-IMPORTANTES-GUARDADOS/ofertas_adzuna.csv';
        if (fs.existsSync(rutaOpenClaw)) {
            return rutaOpenClaw;
        }
        // Buscar el CSV más reciente en scraper/output
        const dirOutput = '../scraper/output';
        if (fs.existsSync(dirOutput)) {
            const archivos = fs.readdirSync(dirOutput)
                .filter(f => f.startsWith('ofertas_') && f.endsWith('.csv'))
                .sort()
                .reverse();
            if (archivos.length > 0) {
                return `${dirOutput}/${archivos[0]}`;
            }
        }
        return '../scraper/output/ofertas_2026-07-01.csv';
    }

    return null;
}

export async function importOffers(req: Request, res: Response) {
    const fuente = req.params.fuente as string;
    const ruta = obtenerRutaCsv(fuente);

    if (!ruta) {
        return res.status(400).json({ error: "Fuente no válida. Usa 'adzuna' o 'tecnoempleo'" });
    }

    if (!fs.existsSync(ruta)) {
        return res.status(404).json({ error: `Archivo CSV no encontrado en la ruta: ${ruta}` });
    }

    // Permitir ?limit=N en la petición para pruebas, o procesar todo el CSV por defecto
    const parsedLimit = req.query.limit ? Number(req.query.limit) : NaN;
    const limitParam = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    console.log(`[Import] Procesando ${fuente} desde archivo: ${ruta}`);
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
