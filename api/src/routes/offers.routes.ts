import { Router } from "express";
import { importOffers } from "../controllers/offers.controller";

const router = Router();
router.post('/offers/import/:fuente', importOffers);
export default router;
