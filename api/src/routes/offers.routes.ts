import { Router } from "express";
import { updateOfferStatus, getOffers, importOffers } from "../controllers/offers.controller";

const router = Router();
router.post('/offers/import/:fuente', importOffers);
router.get('/offers', getOffers);
router.patch('/offers/:id/status', updateOfferStatus);
export default router;
