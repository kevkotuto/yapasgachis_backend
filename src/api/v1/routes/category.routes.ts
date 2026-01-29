import { Router } from 'express';
import categoryController from '@/api/v1/controllers/category.controller';

const router: Router = Router();

// ==================== PUBLIC ROUTES ====================

// Get product categories
router.get('/products', categoryController.getProductCategories);

// Get deal categories
router.get('/deals', categoryController.getDealCategories);

// Get product filters
router.get('/filters/products', categoryController.getProductFilters);

// Get deal filters
router.get('/filters/deals', categoryController.getDealFilters);

export default router;
