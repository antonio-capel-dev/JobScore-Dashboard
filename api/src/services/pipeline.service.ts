import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { ParsedOffer, parseOffersCsv, parseOffersCsvFromText } from "./csvImport.service";
import { scoreOffer, ScoringResult, LimiteProveedorError } from "./scoring.service";
import { sendOfferNotification } from "./telegram.service";
import { existeOfertaPorUrl, guardarOferta, obtenerPuestosRecientes } from "../db/offers.repository";
import { RegistroDePuestos, aplicarTopeSinDescripcion } from "./normalizacion.service";

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
    // Ofertas nuevas que no se puntuaron en esta ejecución (cupo diario); se intentan en la siguiente
    pendientes?: number;
}

const PALABRAS_PRIORITARIAS = /\b(python|data|datos|ia|ai|ml|llm|llms|rag|genai|machine learning|analyst|analista|bi|etl|automatizaci[oó]n|automation)\b/gi;

/**
 * Cuánto se parece una oferta al objetivo (IA, datos, Python). Las coincidencias en el título valen el doble.
 * Sirve para gastar primero el cupo diario del modelo en las ofertas con más pinta de encajar.
 */
export function prioridadOferta(offer: ParsedOffer): number {
    const contar = (texto: string) => new Set((texto.match(PALABRAS_PRIORITARIAS) ?? []).map(p => p.toLowerCase())).size;
    return contar(offer.titulo_puesto ?? '') * 2 + contar((offer.stack_tecnologico ?? []).join(' '));
}

function leerEntero(nombre: string, porDefecto: number): number {
    const valor = Number(process.env[nombre]);
    return process.env[nombre] !== undefined && process.env[nombre] !== '' && Number.isFinite(valor) && valor >= 0
        ? valor
        : porDefecto;
}

const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


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
    // Los modelos gratuitos tienen cupo diario: se limita cuántas ofertas se puntúan por ejecución
    const maxLlamadas = leerEntero('SCORING_MAX_POR_EJECUCION', 40);
    // 20 peticiones por minuto como máximo: una cada 3 s, con margen
    const esperaMs = leerEntero('SCORING_DELAY_MS', 3500);

    // 1. Fuera las que ya están en la base de datos (también las descartadas) y las URL repetidas dentro
    //    del mismo CSV, sin gastar llamadas al modelo: la segunda copia fallaría contra la restricción UNIQUE
    //    También la misma oferta publicada en otro portal con otra URL (mismo puesto y empresa)
    const nuevas: ParsedOffer[] = [];
    const urlsVistas = new Set<string>();
    const puestosVistos = new RegistroDePuestos();
    for (const puesto of await obtenerPuestosRecientes()) {
        puestosVistos.anadir(puesto.titulo_puesto, puesto.empresa);
    }
    let duplicadasEntrePortales = 0;
    for (const offer of ofertas) {
        if (urlsVistas.has(offer.url_oferta)) {
            omitidas++;
            continue;
        }
        urlsVistas.add(offer.url_oferta);

        if (await existeOfertaPorUrl(offer.url_oferta)) {
            omitidas++;
            continue;
        }

        if (puestosVistos.contiene(offer.titulo_puesto, offer.empresa)) {
            omitidas++;
            duplicadasEntrePortales++;
            continue;
        }
        puestosVistos.anadir(offer.titulo_puesto, offer.empresa);
        nuevas.push(offer);
    }

    // 2. Primero las que más se parecen al objetivo; el resto se queda para la siguiente ejecución
    const ordenadas = [...nuevas].sort((a, b) => prioridadOferta(b) - prioridadOferta(a));
    const aPuntuar = ordenadas.slice(0, maxLlamadas);
    let pendientes = ordenadas.length - aPuntuar.length;

    for (let i = 0; i < aPuntuar.length; i++) {
        const offer = aPuntuar[i];
        try {
            // Sin descripción la nota no puede pasar de 74: el modelo solo ha visto el título
            const ofertaScored = aplicarTopeSinDescripcion(offer, await scoreOffer(offer));
            resultados.push(ofertaScored);

            // Se guarda también la descartada para no volver a puntuarla mañana; la vista solo muestra score >= 45
            await guardarOferta(offer, ofertaScored);

            if (ofertaScored.score >= 45 && ofertaScored.veredicto !== 'No') {
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
        } catch (error) {
            if (error instanceof LimiteProveedorError) {
                pendientes += aPuntuar.length - i;
                console.warn(`[Pipeline] Límite de OpenRouter alcanzado (${error.status}). Quedan ${pendientes} ofertas para la siguiente ejecución.`);
                break;
            }
            fallidas++;
            console.log(`[Pipeline] Error procesando oferta:`, error);
        }

        if (i < aPuntuar.length - 1) {
            await esperar(esperaMs);
        }
    }

    return {
        total: ofertas.length,
        puntuadas: resultados.length,
        omitidas,
        resultados,
        saved: guardadas,
        duplicates: duplicadasEntrePortales,
        discardedByScore: descartadasPorScore,
        errors: fallidas,
        pendientes
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
