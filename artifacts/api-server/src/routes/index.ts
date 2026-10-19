import { Router, type IRouter } from "express";
import healthRouter from "./health";
import detectRouter from "./detect";
import incidentsRouter from "./incidents";
import contactsRouter from "./contacts";
import authRouter from "./auth";
import vendorsRouter from "./vendors";
import paymentsRouter from "./payments";
import auditRouter from "./audit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(vendorsRouter);
router.use(paymentsRouter);
router.use(auditRouter);
router.use(detectRouter);
router.use(incidentsRouter);
router.use(contactsRouter);

export default router;
