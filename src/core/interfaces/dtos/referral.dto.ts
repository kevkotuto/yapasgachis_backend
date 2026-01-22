/**
 * DTOs for Referral/Parrainage System
 */

export enum ReferralStatus {
  PENDING = 'PENDING', // Code envoyé mais pas encore utilisé
  COMPLETED = 'COMPLETED', // Filleul a créé compte et fait 1er achat
  REWARDED = 'REWARDED', // Récompense donnée
  EXPIRED = 'EXPIRED',
}

export interface CreateReferralCodeDTO {
  userId: string;
  customCode?: string; // Optionnel: code personnalisé (sinon auto-généré)
  expiresAt?: Date;
}

export interface ReferralCodeResponseDTO {
  id: string;
  userId: string;
  code: string; // "JOHN2024", "YAPAS-ABC123"
  shareLink: string; // "https://yapasgachis.com/invite/JOHN2024"
  timesUsed: number;
  maxUses?: number;
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

export interface UseReferralCodeDTO {
  code: string;
  newUserId: string; // L'utilisateur qui s'inscrit
}

export interface ReferralRewardDTO {
  referrerId: string; // Celui qui a parrain�
  referredUserId: string; // Le filleul
  rewardType: 'POINTS' | 'DISCOUNT' | 'CASH';
  amount: number;
  currency?: string;
}

export interface ReferralStatsDTO {
  userId: string;
  totalReferrals: number; // Nombre de personnes parrainées
  pendingReferrals: number;
  completedReferrals: number;
  totalRewardsEarned: number; // Points ou montant gagné
  referralCodes: ReferralCodeResponseDTO[];
}

export interface ReferralHistoryDTO {
  id: string;
  referralCode: string;
  referredUser: {
    id: string;
    firstName: string;
    avatar?: string;
  };
  status: ReferralStatus;
  rewardEarned?: number;
  completedAt?: Date;
  createdAt: Date;
}
