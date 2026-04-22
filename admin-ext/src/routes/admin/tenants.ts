import { Router } from 'express';
import { getTenants } from '../../config/tenants';

const router = Router();

router.get('/', (_req, res) => {
  const tenants = getTenants().map((t) => ({ id: t.id, name: t.name }));
  res.json(tenants);
});

export default router;
