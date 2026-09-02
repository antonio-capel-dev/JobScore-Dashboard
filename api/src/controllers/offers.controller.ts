import { Request, Response } from "express";
import { 
    actualizarEstadoCandidatura, 
    obtenerOfertas 
} from "../db/offers.repository";
import { procesarFuente, ejecutarPipelineCompleto } from "../services/pipeline.service";

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

export async function triggerPipeline(req: Request, res: Response) {
    try {
        const resultado = await ejecutarPipelineCompleto();
        res.json({ mensaje: "Pipeline completado", resultado });
    } catch (error: any) {
        console.error("Error ejecutando pipeline:", error);
        res.status(500).json({ error: error.message });
    }
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
