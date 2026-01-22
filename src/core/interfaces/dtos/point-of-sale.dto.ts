/**
 * DTOs for Points of Sale (POS) - Multiple Locations for Suppliers
 */

export enum POSType {
  MAIN = 'MAIN', // Magasin principal
  BRANCH = 'BRANCH', // Succursale
  KIOSK = 'KIOSK', // Kiosque
  WAREHOUSE = 'WAREHOUSE', // Entrepôt
  PICKUP_POINT = 'PICKUP_POINT', // Point de retrait uniquement
}

export interface CreatePOSDTO {
  supplierId: string;
  name: string; // "YapaGachis - Marcory", "Boutique Koumassi"
  type: POSType;

  // Location
  address: string;
  city: string;
  commune: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;

  // Contact
  phoneNumber?: string;
  email?: string;

  // Operations
  isActive: boolean;
  acceptsOrders: boolean; // Peut recevoir des commandes
  acceptsPickup: boolean; // Peut faire du retrait sur place
  acceptsDelivery: boolean; // Peut livrer

  // Details
  description?: string;
  images?: string[];
  amenities?: string[]; // ["Parking", "Wifi", "Climatisé"]
}

export interface UpdatePOSDTO {
  name?: string;
  type?: POSType;
  address?: string;
  city?: string;
  commune?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  email?: string;
  isActive?: boolean;
  acceptsOrders?: boolean;
  acceptsPickup?: boolean;
  acceptsDelivery?: boolean;
  description?: string;
  images?: string[];
  amenities?: string[];
}

export interface POSResponseDTO {
  id: string;
  supplierId: string;
  name: string;
  type: POSType;
  address: string;
  city: string;
  commune: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  phoneNumber?: string;
  email?: string;
  isActive: boolean;
  acceptsOrders: boolean;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  description?: string;
  images?: string[];
  amenities?: string[];
  distance?: number; // Calculé si recherche avec géolocalisation
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchPOSDTO {
  latitude?: number;
  longitude?: number;
  radius?: number; // km
  city?: string;
  commune?: string;
  type?: POSType;
  acceptsOrders?: boolean;
  acceptsPickup?: boolean;
  acceptsDelivery?: boolean;
}
