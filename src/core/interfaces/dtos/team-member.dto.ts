/**
 * DTOs for Team Member Management (Store Staff)
 */

export enum TeamRole {
  MANAGER = 'MANAGER', // Gérant
  CASHIER = 'CASHIER', // Caissier
  STOCK_MANAGER = 'STOCK_MANAGER', // Gestionnaire stock
  DELIVERY = 'DELIVERY', // Livreur
  SUPPORT = 'SUPPORT', // Support client
  ADMIN = 'ADMIN', // Admin du magasin
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export interface InviteTeamMemberDTO {
  supplierId: string;
  storeId?: string; // Optionnel: rattaché à un POS spécifique
  email?: string;
  phoneNumber?: string;
  role: TeamRole;
  firstName: string;
  lastName?: string;
  permissions?: string[]; // ["manage_products", "view_orders", "manage_stock"]
}

export interface UpdateTeamMemberDTO {
  role?: TeamRole;
  storeId?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface TeamMemberResponseDTO {
  id: string;
  supplierId: string;
  userId?: string; // Si l'invitation a été acceptée
  storeId?: string;
  storeName?: string;
  email?: string;
  phoneNumber?: string;
  firstName: string;
  lastName?: string;
  role: TeamRole;
  permissions: string[];
  isActive: boolean;
  invitationStatus: InvitationStatus;
  invitedAt: Date;
  acceptedAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcceptInvitationDTO {
  invitationToken: string;
  userId: string; // L'utilisateur qui accepte
}

export interface TeamStatsDTO {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  membersByRole: Record<TeamRole, number>;
}

export interface TeamActivityLogDTO {
  id: string;
  teamMemberId: string;
  action: string; // "created_product", "updated_order", "managed_stock"
  entityType: string; // "product", "order", "stock"
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}
