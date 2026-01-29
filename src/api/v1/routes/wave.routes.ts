import { Router, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';

import waveController from '@/api/v1/controllers/wave.controller';
import {
  initiateWavePaymentSchema,
  getWavePaymentStatusSchema,
  waveWebhookSchema,
} from '@/api/v1/validators/wave.validator';
import {
  authenticate,
  optionalAuthenticate,
} from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

// Middleware to preserve raw body for webhook signature verification
const rawBodyMiddleware = bodyParser.json({
  verify: (req: any, _res: Response, buf: Buffer) => {
    req.rawBody = buf.toString('utf8');
  },
});

/**
 * Wave Payment Routes
 * Base path: /api/v1/payments/wave
 */

/**
 * Initiate Wave payment
 * POST /initiate
 * Requires: Authentication (optional for donations)
 */
router.post(
  '/initiate',
  optionalAuthenticate,
  validate(initiateWavePaymentSchema),
  waveController.initiatePayment
);

/**
 * Get Wave payment status
 * GET /:checkoutId/status
 * Public route
 */
router.get(
  '/:checkoutId/status',
  validate(getWavePaymentStatusSchema),
  waveController.getPaymentStatus
);

/**
 * Wave webhook endpoint
 * POST /webhook
 * Public route (signature verified in controller)
 * IMPORTANT: Uses raw body for signature verification
 */
router.post(
  '/webhook',
  rawBodyMiddleware,
  validate(waveWebhookSchema),
  waveController.handleWebhook
);

export default router;
