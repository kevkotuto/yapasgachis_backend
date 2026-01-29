/**
 * DTOs for User Rewards & Points System
 */

export enum RewardTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export enum PointTransactionType {
  EARNED = 'EARNED',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  ADJUSTED = 'ADJUSTED',
}

export enum PointSource {
  PURCHASE = 'PURCHASE', // Points pour achat
  REFERRAL = 'REFERRAL', // Points de parrainage
  DONATION = 'DONATION', // Points pour don
  REVIEW = 'REVIEW', // Points pour avis
  SIGNUP_BONUS = 'SIGNUP_BONUS',
  DAILY_LOGIN = 'DAILY_LOGIN',
  ACHIEVEMENT = 'ACHIEVEMENT',
}

export interface UserRewardsDTO {
  userId: string;
  totalPoints: number;
  availablePoints: number; // Points non expirés
  lifetimePoints: number; // Total cumulé
  currentTier: RewardTier;
  nextTier?: RewardTier;
  pointsToNextTier?: number;
  tierProgress: number; // 0-100
}

export interface PointTransactionDTO {
  userId: string;
  amount: number;
  type: PointTransactionType;
  source: PointSource;
  description: string;
  reference?: string; // ID de l'order, donation, review, etc.
  expiresAt?: Date;
}

export interface PointTransactionResponseDTO {
  id: string;
  userId: string;
  amount: number;
  type: PointTransactionType;
  source: PointSource;
  description: string;
  reference?: string;
  balance: number; // Solde après transaction
  expiresAt?: Date;
  createdAt: Date;
}

export interface RedeemPointsDTO {
  userId: string;
  points: number;
  rewardType: 'DISCOUNT' | 'VOUCHER' | 'GIFT';
  orderId?: string;
}

export interface TierBenefitsDTO {
  tier: RewardTier;
  minPoints: number;
  benefits: string[];
  discountPercentage: number;
  freeDeliveryThreshold?: number;
  prioritySupport: boolean;
}
