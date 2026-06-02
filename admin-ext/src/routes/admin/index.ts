import { Router } from 'express';
import { requireAdminJwt } from '../../middleware/auth';
import usageRouter from './usage';
import revenueRouter from './revenue';
import organizationsRouter from './organizations';
import creditsRouter from './credits';
import subscriptionsRouter from './subscriptions';
import agentsRouter from './agents';
import usersRouter from './users';
import plansRouter from './plans';
import loginRouter from './login';
import modelAccessRouter from './modelAccess';
import categoriesRouter from './categories';
import couponsRouter from './coupons';

/**
 * [EXT] Phase J.19 Navvia: rotas admin sem `tenantFromHeader`. O endpoint
 * /tenants foi removido — a admin-panel passou a usar a config fixa do
 * tenant ativo no client.
 */
const router = Router();

router.use('/login', loginRouter);

router.use(requireAdminJwt);

router.use('/usage', usageRouter);
router.use('/revenue', revenueRouter);
router.use('/organizations', organizationsRouter);
router.use('/credits', creditsRouter);
router.use('/subscriptions', subscriptionsRouter);
router.use('/agents', agentsRouter);
router.use('/users', usersRouter);
router.use('/plans', plansRouter);
router.use('/model-access', modelAccessRouter);
router.use('/categories', categoriesRouter);
router.use('/coupons', couponsRouter);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'admin-ext', timestamp: new Date().toISOString() });
});

export default router;
