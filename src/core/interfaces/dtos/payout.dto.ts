/**
 * Payout (Retrait) DTOs
 * Data Transfer Objects for supplier payout configuration
 */

export interface ConfigurePayoutMethodDTO {
  payoutProviderId: string;
  accountInfo: {
    phoneNumber?: string;
    accountId?: string;
    accountName?: string;
    [key: string]: any;
  };
}

export interface PayoutMethodResponseDTO {
  id: string;
  payoutProvider: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
  } | null;
  payoutAccountInfo: {
    phoneNumber?: string;
    accountId?: string;
    accountName?: string;
    [key: string]: any;
  } | null;
  payoutAccountVerified: boolean;
  updatedAt: Date;
}

export interface VerifyPayoutAccountDTO {
  verificationCode?: string;
  phoneNumber?: string;
}

export interface PayoutAccountInfoDTO {
  phoneNumber?: string;
  accountId?: string;
  accountName?: string;
  [key: string]: any;
}
