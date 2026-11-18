import { Router } from "express";
import { 
    updateOfferStatus, 
    getOffers, 
    importOffers, 
    triggerPipeline,
    purgeLowScoreOffers,
    uploadOffersCsv,
    getImport 
} from "../controllers/offers.controller";
import { requireOwner } from "../middleware/auth";

const router = Router();

// Lectura pública: cualquiera ve las ofertas; el controlador oculta fase y notas a quien no es el propietario
router.get('/offers', getOffers);

// Escritura y operaciones internas: solo el propietario (token de Supabase o API key de ingesta)
router.get('/offers/import-jobs/:jobId', requireOwner, getImport);
router.post('/pipeline/run', requireOwner, triggerPipeline);
router.post('/offers/upload', requireOwner, uploadOffersCsv);
router.delete('/offers/purge', requireOwner, purgeLowScoreOffers);
router.post('/offers/import/:fuente', requireOwner, importOffers);
router.patch('/offers/:id/status', requireOwner, updateOfferStatus);

export default router;
