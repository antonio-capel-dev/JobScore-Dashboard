import { Router } from "express";
import { 
    updateOfferStatus, 
    getOffers, 
    importOffers, 
    triggerPipeline,
    purgeLowScoreOffers 
} from "../controllers/offers.controller";

const router = Router();

router.post('/pipeline/run', triggerPipeline);
router.delete('/offers/purge', purgeLowScoreOffers);
router.post('/offers/import/:fuente', importOffers);
router.get('/offers', getOffers);
router.patch('/offers/:id/status', updateOfferStatus);

export default router;
