import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

import { APP_CONSTANTS } from '@/utils/constants';
import { formatValidationErrors } from '@/utils/validators';

/**
 * Validation middleware factory
 * Creates a middleware that validates request data against a Zod schema
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(APP_CONSTANTS.HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
          success: false,
          message: 'Erreur de validation',
          code: APP_CONSTANTS.ERROR_CODES.VALIDATION_ERROR,
          errors: formatValidationErrors(error),
        });
      } else {
        next(error);
      }
    }
  };
};

export default validate;
