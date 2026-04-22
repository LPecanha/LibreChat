import { Router } from 'express';
import { requireAdminJwt } from '../../middleware/auth';
import { tenantFromHeader } from '../../middleware/tenant';
import usageRouter from './usage';
import revenueRouter from './revenue';
import organizationsRouter from './organizations';
import creditsRouter from './credits';
import subscriptionsRouter from './subscriptions';
import agentsRouter from './agents';
import usersRouter from './users';
import plansRouter from './plans';
import tenantsRouter from './tenants';
import loginRouter from './login';

const router = Router();

router.use('/login', loginRouter);
router.use('/tenants', tenantsRouter);

router.use(tenantFromHeader);
router.use(requireAdminJwt);

router.use('/usage', usageRouter);
router.use('/revenue', revenueRouter);
router.use('/organizations', organizationsRouter);
router.use('/credits', creditsRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/agents', agentsRouter);
router.use('/users', usersRouter);
router.use('/plans', plansRouter);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'admin-ext', timestamp: new Date().toISOString() });
});

export default router;
