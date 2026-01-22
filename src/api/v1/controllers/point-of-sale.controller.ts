import { Request, Response } from 'express';

import pointOfSaleService from '@/core/services/point-of-sale.service';
import logger from '@/infrastructure/monitoring/logger';
import { asyncHandler } from '@/utils/helpers';

export class PointOfSaleController {
  createPOS = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const pos = await pointOfSaleService.createPOS(supplierId, req.body);

    logger.info('POS created via API', { supplierId, posId: pos.id });

    res.status(201).json({
      success: true,
      message: 'Point de vente créé avec succès',
      data: { pos },
    });
  });

  getPOS = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const pos = await pointOfSaleService.getPOS(id);

    res.json({ success: true, data: { pos } });
  });

  getSupplierPOS = asyncHandler(async (req: Request, res: Response) => {
    const { supplierId } = req.params;
    const { activeOnly } = req.query;

    const pos = await pointOfSaleService.getSupplierPOS(
      supplierId,
      activeOnly === 'true'
    );

    res.json({ success: true, data: { pos } });
  });

  getMyPOS = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const { activeOnly } = req.query;

    const pos = await pointOfSaleService.getSupplierPOS(
      supplierId,
      activeOnly === 'true'
    );

    res.json({ success: true, data: { pos } });
  });

  searchPOS = asyncHandler(async (req: Request, res: Response) => {
    const result = await pointOfSaleService.searchPOS(req.query);
    res.json({ success: true, data: result });
  });

  updatePOS = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const { id } = req.params;

    const pos = await pointOfSaleService.updatePOS(supplierId, id, req.body);

    logger.info('POS updated via API', { supplierId, posId: id });

    res.json({
      success: true,
      message: 'Point de vente mis à jour',
      data: { pos },
    });
  });

  deletePOS = asyncHandler(async (req: Request, res: Response) => {
    const supplierId = req.user.id;
    const { id } = req.params;

    await pointOfSaleService.deletePOS(supplierId, id);

    logger.info('POS deleted via API', { supplierId, posId: id });

    res.json({ success: true, message: 'Point de vente supprimé' });
  });

  findNearest = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, radius } = req.query;

    const pos = await pointOfSaleService.findNearestPOS(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      radius ? parseFloat(radius as string) : 10
    );

    res.json({ success: true, data: { pos } });
  });
}

export default new PointOfSaleController();
