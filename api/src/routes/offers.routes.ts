import { Router } from "express";
import { getOffers, importOffers } from "../controllers/offers.controller";

const router = Router();
router.post('/offers/import/:fuente', importOffers);
router.get('/offers', getOffers);
export default router;
