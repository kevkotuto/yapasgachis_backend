import { UserRole } from '@prisma/client';
import { z } from 'zod';

import {
  phoneSchema,
  emailSchema,
  passwordSchema,
  nameSchema,
  otpSchema,
} from '@/utils/validators';

/**
 * Register validation schema
 */
export const registerSchema = z.object({
  body: z.object({
    phoneNumber: phoneSchema,
    email: emailSchema.optional(),
    firstName: nameSchema,
    lastName: nameSchema.optional(),
    password: passwordSchema,
    role: z.nativeEnum(UserRole).optional().default(UserRole.CLIENT),
    city: z.string().optional(),
    commune: z.string().optional(),
    neighborhood: z.string().optional(),
    language: z.enum(['fr', 'en', 'ar', 'es', 'bm']).optional().default('fr'),
  }),
});

/**
 * Login validation schema (phone + password - NO OTP)
 */
export const loginSchema = z.object({
  body: z.object({
    phoneNumber: phoneSchema,
    password: z.string().min(1, 'Le mot de passe est requis'),
  }),
});

/**
 * Login with email validation schema (email + password - OTP required)
 */
export const loginEmailSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Le mot de passe est requis'),
  }),
});

/**
 * Verify OTP validation schema (for phone)
 */
export const verifyOTPSchema = z.object({
  body: z.object({
    phoneNumber: phoneSchema,
    code: otpSchema,
    purpose: z.enum([
      'registration',
      'login',
      'password_reset',
      'phone_verification',
    ]),
  }),
});

/**
 * Verify email OTP validation schema
 */
export const verifyEmailOTPSchema = z.object({
  body: z.object({
    email: emailSchema,
    code: otpSchema,
    purpose: z.enum([
      'registration',
      'login',
      'password_reset',
      'email_verification',
    ]),
  }),
});

/**
 * Resend OTP validation schema (for phone)
 */
export const resendOTPSchema = z.object({
  body: z.object({
    phoneNumber: phoneSchema,
    purpose: z.enum([
      'registration',
      'login',
      'password_reset',
      'phone_verification',
    ]),
  }),
});

/**
 * Resend email OTP validation schema
 */
export const resendEmailOTPSchema = z.object({
  body: z.object({
    email: emailSchema,
    purpose: z.enum([
      'registration',
      'login',
      'password_reset',
      'email_verification',
    ]),
  }),
});

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    phoneNumber: phoneSchema,
  }),
});

/**
 * Reset password validation schema
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    phoneNumber: phoneSchema,
    code: otpSchema,
    newPassword: passwordSchema,
  }),
});

/**
 * Change password validation schema
 */
export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1, 'La confirmation est requise'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    }),
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Le refresh token est requis'),
  }),
});

/**
 * Google auth validation schema
 */
export const googleAuthSchema = z.object({
  body: z
    .object({
      idToken: z.string().optional(),
      accessToken: z.string().optional(),
      role: z.nativeEnum(UserRole).optional().default(UserRole.CLIENT),
      language: z.enum(['fr', 'en', 'ar', 'es', 'bm']).optional().default('fr'),
    })
    .refine((data) => data.idToken || data.accessToken, {
      message: 'Un token Google est requis (idToken ou accessToken)',
    }),
});

/**
 * Link Google account validation schema
 */
export const linkGoogleSchema = z.object({
  body: z
    .object({
      idToken: z.string().optional(),
      accessToken: z.string().optional(),
    })
    .refine((data) => data.idToken || data.accessToken, {
      message: 'Un token Google est requis (idToken ou accessToken)',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type LoginEmailInput = z.infer<typeof loginEmailSchema>['body'];
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>['body'];
export type VerifyEmailOTPInput = z.infer<typeof verifyEmailOTPSchema>['body'];
export type ResendOTPInput = z.infer<typeof resendOTPSchema>['body'];
export type ResendEmailOTPInput = z.infer<typeof resendEmailOTPSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>['body'];
export type LinkGoogleInput = z.infer<typeof linkGoogleSchema>['body'];
