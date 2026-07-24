import { Request, Response } from "express";
import { parseOffersCsv } from "../services/csvImport.service";

const rutasCsv: Record<string, string> = {
      adzuna: '../scraper/output/ofertas_2026-07-01.csv',
      tecnoempleo: '../scraper/data/empleos_tech_ia_web.csv',  
    };

export function importOffers (req: Request, res: Response) {

    const fuente = req.params.fuente as string;
    
    const ruta = rutasCsv[fuente];

    const offers = parseOffersCsv(ruta);
        res.json({ total: offers.length });
};