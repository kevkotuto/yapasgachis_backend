/**
 * Stock Movement DTOs
 * Data Transfer Objects for stock movement tracking
 */

export interface CreateStockMovementDTO {
  productId: string;
  type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'LOSS' | 'RETURN' | 'TRANSFER';
  quantity: number; // Positif pour entrée, négatif pour sortie
  orderId?: string;
  storeId?: string;
  reason?: string;
  notes?: string;
}

export interface StockMovementResponseDTO {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
  };
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  orderId?: string;
  storeId?: string;
  reason?: string;
  notes?: string;
  createdAt: Date;
}

export interface StockMovementListQueryDTO {
  productId?: string;
  supplierId?: string;
  storeId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
