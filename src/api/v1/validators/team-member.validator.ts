import { z } from 'zod';

export const inviteTeamMemberSchema = z.object({
  body: z
    .object({
      storeId: z.string().uuid().optional(),
      email: z.string().email().optional(),
      phoneNumber: z.string().optional(),
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      role: z.enum([
        'MANAGER',
        'CASHIER',
        'STOCK_MANAGER',
        'DELIVERY',
        'SUPPORT',
        'ADMIN',
      ]),
      permissions: z.array(z.string()).optional(),
    })
    .refine((data) => data.email || data.phoneNumber, {
      message: 'Email ou téléphone requis',
    }),
});

export const updateTeamMemberSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    role: z
      .enum([
        'MANAGER',
        'CASHIER',
        'STOCK_MANAGER',
        'DELIVERY',
        'SUPPORT',
        'ADMIN',
      ])
      .optional(),
    storeId: z.string().uuid().optional(),
    permissions: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const memberIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const teamMembersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(20),
    role: z
      .enum([
        'MANAGER',
        'CASHIER',
        'STOCK_MANAGER',
        'DELIVERY',
        'SUPPORT',
        'ADMIN',
      ])
      .optional(),
    isActive: z.coerce.boolean().optional(),
    storeId: z.string().uuid().optional(),
  }),
});

export const acceptInvitationSchema = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});

export type InviteTeamMemberInput = z.infer<
  typeof inviteTeamMemberSchema
>['body'];
export type UpdateTeamMemberInput = z.infer<
  typeof updateTeamMemberSchema
>['body'];
