import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import hospitalsRouter from "./hospitals";
import subscriptionsRouter from "./subscriptions";
import departmentsRouter from "./departments";
import doctorsRouter from "./doctors";
import receptionistsRouter from "./receptionists";
import patientsRouter from "./patients";
import appointmentsRouter from "./appointments";
import invoicesRouter from "./invoices";
import prescriptionsRouter from "./prescriptions";
import reportsRouter from "./reports";
import supportRouter from "./support";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(hospitalsRouter);
router.use(subscriptionsRouter);
router.use(departmentsRouter);
router.use(doctorsRouter);
router.use(receptionistsRouter);
router.use(patientsRouter);
router.use(appointmentsRouter);
router.use(invoicesRouter);
router.use(prescriptionsRouter);
router.use(reportsRouter);
router.use(supportRouter);

export default router;
