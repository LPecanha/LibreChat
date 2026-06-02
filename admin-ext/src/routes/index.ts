import { Router } from 'express';
import adminRouter from './admin';
import paymentRouter from './payment';
import userRouter from './user';

/**
 * [EXT] Phase J.19 Navvia: single-tenant — não há mais `tenantFromOrigin`
 * middleware injetando contexto por origem. Tudo roda na conexão única.
 */
const router = Router();

router.use('/admin', adminRouter);
router.use('/payment', paymentRouter);
router.use('/user', userRouter);

export default router;
