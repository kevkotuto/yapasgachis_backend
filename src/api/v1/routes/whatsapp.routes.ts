import { Router } from 'express';
import WhatsAppController from '@/api/v1/controllers/whatsapp.controller';
import { authMiddleware } from '@/middleware/auth.middleware';
import roleGuard from '@/middleware/role-guard.middleware';

const router = Router();

/**
 * WhatsApp Management Routes
 * All routes require SUPER_ADMIN or ADMIN role
 */

// Get WhatsApp connection status
router.get(
  '/status',
  authMiddleware,
  roleGuard(['SUPER_ADMIN', 'ADMIN']),
  WhatsAppController.getStatus
);

// Initialize WhatsApp and get QR code
router.post(
  '/initialize',
  authMiddleware,
  roleGuard(['SUPER_ADMIN']),
  WhatsAppController.initialize
);

// Check if WhatsApp is available
router.get(
  '/available',
  authMiddleware,
  roleGuard(['SUPER_ADMIN', 'ADMIN']),
  WhatsAppController.checkAvailability
);

// Disconnect WhatsApp instance
router.post(
  '/disconnect',
  authMiddleware,
  roleGuard(['SUPER_ADMIN']),
  WhatsAppController.disconnect
);

// Restart WhatsApp instance
router.post(
  '/restart',
  authMiddleware,
  roleGuard(['SUPER_ADMIN']),
  WhatsAppController.restart
);

// Check if phone number is on WhatsApp
router.post(
  '/check-number',
  authMiddleware,
  roleGuard(['SUPER_ADMIN', 'ADMIN']),
  WhatsAppController.checkNumber
);

// Send test message (admin only)
router.post(
  '/test-message',
  authMiddleware,
  roleGuard(['SUPER_ADMIN']),
  WhatsAppController.sendTestMessage
);

export default router;
