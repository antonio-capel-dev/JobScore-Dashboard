import { Request, Response } from "express";
import { actualizarEstadoCandidatura, guardarOferta, obtenerOfertas } from "../db/offers.repository";
import { parseOffersCsv } from "../services/csvImport.service";
import { scoreOffer, ScoringResult } from "../services/scoring.service";

const rutasCsv: Record<string, string> = {
      adzuna: '../scraper/output/ofertas_2026-07-01.csv',
      tecnoempleo: '../scraper/data/empleos_tech_ia_web.csv',  
    };

export async function importOffers (req: Request, res: Response) {

    const fuente = req.params.fuente as string;
    
    const ruta = rutasCsv[fuente];

    const offers = parseOffersCsv(ruta).slice(0,2);
        

    const resultados: ScoringResult[] = [];

    for (const offer of offers) {
        try {
            const oferta = await scoreOffer(offer);
            resultados.push(oferta);
            await guardarOferta(offer, oferta);
        } catch {
            console.log("Error");
        }
    }
    res.json({ total: offers.length, puntuadas: resultados.length, resultados });
}
export async function getOffers (req:Request, res:Response) {
    const data = await obtenerOfertas();
    res.json(data);
}

export async function updateOfferStatus(req: Request, res:Response) {
    const id = Number(req.params.id);
    const estado = req.body.estado_candidatura;
    await actualizarEstadoCandidatura(id, estado);
    res.json({mensaje: 'Estado actualizado'});
}