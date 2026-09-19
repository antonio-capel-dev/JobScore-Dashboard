import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { ParsedOffer, parseOffersCsv, parseOffersCsvFromText } from "./csvImport.service";
import { scoreOffer, ScoringResult } from "./scoring.service";
import { sendOfferNotification } from "./telegram.service";
import { existeOfertaPorUrl, guardarOferta } from "../db/offers.repository";

const execAsync = promisify(exec);

export interface ProcessSourceResult {
    total: number;
    puntuadas: number;
    omitidas: number;
    resultados: ScoringResult[];
    duplicates?: number;
    scored?: number;
    discardedByScore?: number;
    errors?: number;
    saved?: number;
    results?: ScoringResult[];
}


export function obtenerRutaCsv(fuente: string): string | null {
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
        const dirOutput = '../scraper/output';
        if (fs.existsSync(dirOutput)) {
            const archivos = fs.readdirSync(dirOutput)
                .filter(f => f.startsWith('ofertas_') && f.endsWith('.csv'))
                .sort()
                .reverse();
            if (archivos.length > 0) {
                return path.join(dirOutput, archivos[0]);
            }
        }
        return '../scraper/output/ofertas_2026-07-01.csv';
    }

    return null;
}

export async function ejecutarScraperPython(): Promise<{ success: boolean; output: string }> {
    try {
        console.log("[Pipeline] Ejecutando scraper de Python para Adzuna...");
        const scraperPath = path.resolve(process.cwd(), '../scraper/src/pipeline.py');
        const cwd = path.resolve(process.cwd(), '../scraper');
        
        const { stdout, stderr } = await execAsync(`python "${scraperPath}"`, { cwd });
        console.log("[Pipeline] Scraper terminado:\n", stdout);
        if (stderr) console.warn("[Pipeline] Advertencias del scraper:", stderr);
        return { success: true, output: stdout };
    } catch (error: any) {
        console.error("[Pipeline] Error ejecutando scraper de Python:", error.message);
        return { success: false, output: error.message };
    }
}

export async function procesarOfertas(ofertas: ParsedOffer[]): Promise<ProcessSourceResult> {
    const resultados: ScoringResult[] = [];
    let omitidas = 0;
    let guardadas = 0;
    let descartadasPorScore = 0;
    let fallidas = 0;

    for (const offer of ofertas) {
        try {
            const yaExiste = await existeOfertaPorUrl(offer.url_oferta);
            if (yaExiste) {
                omitidas++;
                continue;
            }

            const ofertaScored = await scoreOffer(offer);
            resultados.push(ofertaScored);

            if (ofertaScored.score >= 45 && ofertaScored.veredicto !== 'No') {
                await guardarOferta(offer, ofertaScored);
                guardadas++;
                try {
                await sendOfferNotification(offer, ofertaScored);
                } catch (error) {
                    console.error('Oferta guardada, pero falló la notificación de Telegram', error)
                }
            } else {
                descartadasPorScore++;
                console.log(`[Pipeline] Oferta descartada por afinidad insuficiente (${ofertaScored.score} pts): ${offer.titulo_puesto}`);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            fallidas++;
            console.log(`[Pipeline] Error procesando oferta:`, error);
        }
    }

    return {
        total: ofertas.length,
        puntuadas: resultados.length,
        omitidas,
        resultados,
        saved: guardadas,
        discardedByScore: descartadasPorScore,
        errors: fallidas
    };
}

export async function procesarFuente(fuente: 'adzuna' | 'tecnoempleo', limit?: number): Promise<ProcessSourceResult> {
    const ruta = obtenerRutaCsv(fuente);
    if (!ruta || !fs.existsSync(ruta)) {
        throw new Error(`Archivo CSV no encontrado para ${fuente} en la ruta esperada: ${ruta}`);
    }

    console.log(`[Pipeline] Procesando ${fuente} desde archivo: ${ruta}`);
    const ofertasCsv = parseOffersCsv(ruta);
    const ofertasAProcesar = limit ? ofertasCsv.slice(0, limit) : ofertasCsv;
    return procesarOfertas(ofertasAProcesar);

}

export async function ejecutarPipelineCompleto() {
    console.log("[Pipeline] === Iniciando ciclo completo de ingesta diaria ===");
    
    // 1. Extraer ofertas frescas de Adzuna con Python
    await ejecutarScraperPython();

    // 2. Procesar Adzuna
    let resAdzuna: ProcessSourceResult | null = null;
    try {
        resAdzuna = await procesarFuente('adzuna');
    } catch (e: any) {
        console.error("[Pipeline] Error procesando Adzuna:", e.message);
    }

    // 3. Procesar Tecnoempleo (OpenClaw)
    let resTecnoempleo: ProcessSourceResult | null = null;
    try {
        resTecnoempleo = await procesarFuente('tecnoempleo');
    } catch (e: any) {
        console.error("[Pipeline] Error procesando Tecnoempleo:", e.message);
    }

    console.log("[Pipeline] === Ciclo de ingesta finalizado ===");
    return {
        adzuna: resAdzuna,
        tecnoempleo: resTecnoempleo,
        timestamp: new Date().toISOString()
    };
}

export async function procesarTextoCsv(contenidoCsv: string): Promise<ProcessSourceResult> {
    const ofertasAProcesar = parseOffersCsvFromText(contenidoCsv);
    console.log(`[Pipeline] Procesando ${ofertasAProcesar.length} ofertas recibidas por subida directa CSV`);

    return procesarOfertas(ofertasAProcesar);
}
