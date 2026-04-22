import { Router } from 'express';
import adminRouter from './admin';
import paymentRouter from './payment';
import userRouter from './user';
import { tenantFromOrigin } from '../middleware/tenant';

const router = Router();

router.use('/admin', adminRouter);
router.use('/payment', tenantFromOrigin, paymentRouter);
router.use('/user', tenantFromOrigin, userRouter);

export default router;
