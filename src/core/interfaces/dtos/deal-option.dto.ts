/**
 * DTOs for Deal Options/Variants (Rooms, Sizes, etc.)
 */

export interface CreateDealOptionDTO {
  dealId: string;
  title: string; // "Studio pour 2 personnes", "Chambre deluxe"
  description?: string;
  price: number; // Prix de cette option spécifique
  capacity?: string; // "2 pers max"
  size?: string; // "28 m2"
  floor?: string; // "Etage supérieur"
  features?: string[]; // ["WiFi gratuit", "Climatisation"]
  imageUrl?: string;
  stock?: number; // Nombre disponible pour cette option
  sortOrder?: number;
}

export interface UpdateDealOptionDTO {
  title?: string;
  description?: string;
  price?: number;
  capacity?: string;
  size?: string;
  floor?: string;
  features?: string[];
  imageUrl?: string;
  stock?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface DealOptionResponseDTO {
  id: string;
  dealId: string;
  title: string;
  description?: string;
  price: number;
  capacity?: string;
  size?: string;
  floor?: string;
  features?: string[];
  imageUrl?: string;
  stock?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookDealWithOptionDTO {
  dealId: string;
  optionId?: string; // Optionnel: si le deal a des options/variants
  bookingDate: Date;
  bookingSlot?: string;
  quantity: number;
  paymentMethod: string;
}
