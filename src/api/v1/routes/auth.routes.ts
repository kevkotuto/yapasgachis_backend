import { Router } from 'express';

import authController from '../controllers/auth.controller';
import {
  registerSchema,
  loginSchema,
  loginEmailSchema,
  verifyOTPSchema,
  verifyEmailOTPSchema,
  resendOTPSchema,
  resendEmailOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
  googleAuthSchema,
  linkGoogleSchema,
  appleAuthSchema,
} from '../validators/auth.validator';

import { authMiddleware } from '@/middleware/auth.middleware';
import { authLimiter } from '@/middleware/rate-limit.middleware';
import { validate } from '@/middleware/validation.middleware';

const router: Router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès, OTP envoyé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Code OTP envoyé par SMS' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId: { type: string, format: uuid }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Numéro de téléphone déjà utilisé
 */
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Connexion par téléphone (sans OTP)
 *     description: Connexion directe avec numéro de téléphone et mot de passe. Pas d'OTP requis.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Identifiants invalides
 *       403:
 *         description: Compte suspendu ou désactivé
 */
router.post('/login', authLimiter, validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/login/email:
 *   post:
 *     summary: Connexion par email (OTP requis - Étape 1)
 *     description: Vérifie les identifiants et envoie un OTP par email. Utilisez /verify-email-otp pour compléter la connexion.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: 'user@example.com' }
 *               password: { type: string, example: 'MonMotDePasse123!' }
 *     responses:
 *       200:
 *         description: OTP envoyé par email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Un code de vérification a été envoyé à votre adresse email' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     requiresOTP: { type: boolean, example: true }
 *       401:
 *         description: Identifiants invalides
 *       403:
 *         description: Compte suspendu ou désactivé
 */
router.post(
  '/login/email',
  authLimiter,
  validate(loginEmailSchema),
  authController.loginEmail
);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Vérifier le code OTP (téléphone)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, code, purpose]
 *             properties:
 *               phoneNumber: { type: string, example: '+221771234567' }
 *               code: { type: string, example: '123456' }
 *               purpose: { type: string, enum: [registration, login, password_reset, phone_verification] }
 *     responses:
 *       200:
 *         description: OTP vérifié avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Code OTP invalide ou expiré
 */
router.post(
  '/verify-otp',
  authLimiter,
  validate(verifyOTPSchema),
  authController.verifyOTP
);

/**
 * @swagger
 * /auth/verify-email-otp:
 *   post:
 *     summary: Vérifier le code OTP email (Étape 2)
 *     description: Complète la connexion par email après vérification de l'OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, purpose]
 *             properties:
 *               email: { type: string, format: email, example: 'user@example.com' }
 *               code: { type: string, example: '123456' }
 *               purpose: { type: string, enum: [login, registration, email_verification], example: 'login' }
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Code OTP invalide ou expiré
 */
router.post(
  '/verify-email-otp',
  authLimiter,
  validate(verifyEmailOTPSchema),
  authController.verifyEmailOTP
);

/**
 * @swagger
 * /auth/resend-otp:
 *   post:
 *     summary: Renvoyer le code OTP (téléphone)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, purpose]
 *             properties:
 *               phoneNumber: { type: string, example: '+221771234567' }
 *               purpose: { type: string, enum: [registration, login, password_reset, phone_verification] }
 *     responses:
 *       200:
 *         description: Nouveau code OTP envoyé
 *       429:
 *         description: Trop de tentatives
 */
router.post(
  '/resend-otp',
  authLimiter,
  validate(resendOTPSchema),
  authController.resendOTP
);

/**
 * @swagger
 * /auth/resend-email-otp:
 *   post:
 *     summary: Renvoyer le code OTP par email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, purpose]
 *             properties:
 *               email: { type: string, format: email, example: 'user@example.com' }
 *               purpose: { type: string, enum: [login, registration, email_verification] }
 *     responses:
 *       200:
 *         description: Nouveau code OTP envoyé par email
 *       429:
 *         description: Trop de tentatives
 */
router.post(
  '/resend-email-otp',
  authLimiter,
  validate(resendEmailOTPSchema),
  authController.resendEmailOTP
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Demander la réinitialisation du mot de passe
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string, example: '+221771234567' }
 *     responses:
 *       200:
 *         description: Code OTP de réinitialisation envoyé
 *       404:
 *         description: Utilisateur non trouvé
 */
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe avec OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code, newPassword]
 *             properties:
 *               phone: { type: string, example: '+221771234567' }
 *               code: { type: string, example: '123456' }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *       400:
 *         description: Code OTP invalide ou expiré
 */
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Changer le mot de passe (utilisateur connecté)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Mot de passe changé avec succès
 *       400:
 *         description: Mot de passe actuel incorrect
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Rafraîchir le token d'accès
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Nouveau token généré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string }
 *                     refreshToken: { type: string }
 *       401:
 *         description: Refresh token invalide ou expiré
 */
router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  authController.refreshToken
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Déconnexion utilisateur
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtenir les informations de l'utilisateur connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', authMiddleware, authController.me);

// ==================== GOOGLE OAUTH ROUTES ====================

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Connexion ou inscription avec Google
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string, description: 'Token ID Google' }
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Token Google invalide
 */
router.post(
  '/google',
  authLimiter,
  validate(googleAuthSchema),
  authController.googleAuth
);

/**
 * @swagger
 * /auth/google/link:
 *   post:
 *     summary: Lier un compte Google à un utilisateur existant
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string }
 *     responses:
 *       200:
 *         description: Compte Google lié avec succès
 *       400:
 *         description: Compte Google déjà utilisé
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/google/link',
  authMiddleware,
  validate(linkGoogleSchema),
  authController.linkGoogle
);

/**
 * @swagger
 * /auth/google/unlink:
 *   post:
 *     summary: Délier un compte Google
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compte Google délié
 *       400:
 *         description: Aucun compte Google lié
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/google/unlink', authMiddleware, authController.unlinkGoogle);

// ==================== APPLE SIGN-IN ROUTE ====================

/**
 * @swagger
 * /auth/apple:
 *   post:
 *     summary: Connexion ou inscription avec Apple (Sign in with Apple)
 *     description: |
 *       Vérifie le `identityToken` Apple (JWT RS256 signé par Apple), retrouve
 *       ou crée un compte par `apple_user_id` (= `sub` du JWT). Apple n'envoie
 *       `email`, `firstName`, `lastName` qu'au PREMIER sign-in.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identityToken, user]
 *             properties:
 *               identityToken: { type: string, description: 'JWT signé par Apple' }
 *               authorizationCode: { type: string, description: 'Code court (5 min) pour révocation server-to-server' }
 *               user: { type: string, description: 'Identifiant stable Apple (= sub du JWT)' }
 *               email: { type: string, nullable: true, description: 'Premier sign-in seulement' }
 *               firstName: { type: string, nullable: true }
 *               lastName: { type: string, nullable: true }
 *               role: { type: string, enum: [CLIENT, SUPPLIER_FOOD, ASSOCIATION] }
 *               language: { type: string, enum: [fr, en, ar, es, bm] }
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Token Apple invalide ou identifiant incohérent
 */
router.post(
  '/apple',
  authLimiter,
  validate(appleAuthSchema),
  authController.appleAuth
);

export default router;
