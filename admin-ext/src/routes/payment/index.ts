import { Router } from 'express';
import express from 'express';
import stripeRouter from './stripe';
import pagarmeRouter from './pagarme';
import { CREDIT_PLANS } from './plans';

const router = Router();

router.use('/stripe/webhook', express.raw({ type: 'application/json' }));

router.use('/pagarme/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => {
  (req as typeof req & { rawBody?: Buffer }).rawBody = req.body as Buffer;
  next();
});

router.use('/stripe', stripeRouter);
router.use('/pagarme', pagarmeRouter);

router.get('/plans', (_req, res) => res.json(CREDIT_PLANS));

export default router;
