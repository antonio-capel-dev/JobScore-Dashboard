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

const router = Router();


router.get('/offers/import-jobs/:jobId', getImport);
router.post('/pipeline/run', triggerPipeline);
router.post('/offers/upload', uploadOffersCsv);
router.delete('/offers/purge', purgeLowScoreOffers);
router.post('/offers/import/:fuente', importOffers);
router.get('/offers', getOffers);
router.patch('/offers/:id/status', updateOfferStatus);

export default router;
