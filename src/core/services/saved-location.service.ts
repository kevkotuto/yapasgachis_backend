import { SavedLocation } from '@prisma/client';

import savedLocationRepository, {
  SavedLocationRepository,
} from '@/core/repositories/saved-location.repository';
import logger from '@/infrastructure/monitoring/logger';
import { AppError } from '@/middleware/error-handler.middleware';

/**
 * SavedLocation Service
 * Business logic for saved location management
 */
export class SavedLocationService {
  constructor(private savedLocationRepo: SavedLocationRepository) {}

  /**
   * Create a new saved location
   */
  async createSavedLocation(
    userId: string,
    data: {
      label: string;
      address: string;
      city?: string;
      commune?: string;
      neighborhood?: string;
      latitude: number;
      longitude: number;
      instructions?: string;
      phoneNumber?: string;
      isDefault?: boolean;
    }
  ): Promise<SavedLocation> {
    try {
      // Validate coordinates
      if (data.latitude < -90 || data.latitude > 90) {
        throw new AppError(
          400,
          'La latitude doit être entre -90 et 90',
          'INVALID_LATITUDE'
        );
      }

      if (data.longitude < -180 || data.longitude > 180) {
        throw new AppError(
          400,
          'La longitude doit être entre -180 et 180',
          'INVALID_LONGITUDE'
        );
      }

      // If this is marked as default, we need to handle it specially
      if (data.isDefault) {
        // Create the location first without isDefault flag
        const location = await this.savedLocationRepo.create({
          user: { connect: { id: userId } },
          label: data.label,
          address: data.address,
          city: data.city,
          commune: data.commune,
          neighborhood: data.neighborhood,
          latitude: data.latitude,
          longitude: data.longitude,
          instructions: data.instructions,
          phoneNumber: data.phoneNumber,
          isDefault: false,
        });

        // Then set it as default using the transaction-safe method
        return this.setDefaultLocation(userId, location.id);
      }

      // Check if user has no saved locations - make this the default
      const existingCount = await this.savedLocationRepo.countByUserId(userId);
      const shouldBeDefault = existingCount === 0;

      const location = await this.savedLocationRepo.create({
        user: { connect: { id: userId } },
        label: data.label,
        address: data.address,
        city: data.city,
        commune: data.commune,
        neighborhood: data.neighborhood,
        latitude: data.latitude,
        longitude: data.longitude,
        instructions: data.instructions,
        phoneNumber: data.phoneNumber,
        isDefault: shouldBeDefault,
      });

      logger.info('Saved location created', {
        userId,
        locationId: location.id,
        label: location.label,
        isDefault: location.isDefault,
      });

      return location;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating saved location', {
        userId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        "Erreur lors de la création de l'adresse enregistrée"
      );
    }
  }

  /**
   * Get saved location by ID
   */
  async getSavedLocation(
    userId: string,
    locationId: string
  ): Promise<SavedLocation> {
    const location = await this.savedLocationRepo.findByIdAndUserId(
      locationId,
      userId
    );

    if (!location) {
      throw new AppError(
        404,
        'Adresse enregistrée non trouvée',
        'LOCATION_NOT_FOUND'
      );
    }

    return location;
  }

  /**
   * Get all saved locations for a user
   */
  async getUserSavedLocations(userId: string): Promise<SavedLocation[]> {
    return this.savedLocationRepo.findByUserId(userId);
  }

  /**
   * Get default location for a user
   */
  async getDefaultLocation(userId: string): Promise<SavedLocation | null> {
    return this.savedLocationRepo.findDefaultByUserId(userId);
  }

  /**
   * Update a saved location
   */
  async updateSavedLocation(
    userId: string,
    locationId: string,
    data: {
      label?: string;
      address?: string;
      city?: string;
      commune?: string;
      neighborhood?: string;
      latitude?: number;
      longitude?: number;
      instructions?: string;
      phoneNumber?: string;
    }
  ): Promise<SavedLocation> {
    try {
      // Verify ownership
      const location = await this.savedLocationRepo.findByIdAndUserId(
        locationId,
        userId
      );

      if (!location) {
        throw new AppError(
          404,
          'Adresse enregistrée non trouvée',
          'LOCATION_NOT_FOUND'
        );
      }

      // Validate coordinates if provided
      if (data.latitude !== undefined) {
        if (data.latitude < -90 || data.latitude > 90) {
          throw new AppError(
            400,
            'La latitude doit être entre -90 et 90',
            'INVALID_LATITUDE'
          );
        }
      }

      if (data.longitude !== undefined) {
        if (data.longitude < -180 || data.longitude > 180) {
          throw new AppError(
            400,
            'La longitude doit être entre -180 et 180',
            'INVALID_LONGITUDE'
          );
        }
      }

      const updatedLocation = await this.savedLocationRepo.update(
        locationId,
        data
      );

      logger.info('Saved location updated', {
        userId,
        locationId,
      });

      return updatedLocation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating saved location', {
        userId,
        locationId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        "Erreur lors de la mise à jour de l'adresse enregistrée"
      );
    }
  }

  /**
   * Delete a saved location
   */
  async deleteSavedLocation(userId: string, locationId: string): Promise<void> {
    try {
      // Verify ownership
      const location = await this.savedLocationRepo.findByIdAndUserId(
        locationId,
        userId
      );

      if (!location) {
        throw new AppError(
          404,
          'Adresse enregistrée non trouvée',
          'LOCATION_NOT_FOUND'
        );
      }

      const wasDefault = location.isDefault;

      await this.savedLocationRepo.delete(locationId);

      // If we deleted the default location, set another one as default
      if (wasDefault) {
        const remainingLocations =
          await this.savedLocationRepo.findByUserId(userId);
        if (remainingLocations.length > 0) {
          await this.savedLocationRepo.setAsDefault(
            remainingLocations[0].id,
            userId
          );
          logger.info('Auto-set new default location after deletion', {
            userId,
            newDefaultId: remainingLocations[0].id,
          });
        }
      }

      logger.info('Saved location deleted', {
        userId,
        locationId,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting saved location', {
        userId,
        locationId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        "Erreur lors de la suppression de l'adresse enregistrée"
      );
    }
  }

  /**
   * Set a location as default
   */
  async setDefaultLocation(
    userId: string,
    locationId: string
  ): Promise<SavedLocation> {
    try {
      // Verify ownership
      const location = await this.savedLocationRepo.findByIdAndUserId(
        locationId,
        userId
      );

      if (!location) {
        throw new AppError(
          404,
          'Adresse enregistrée non trouvée',
          'LOCATION_NOT_FOUND'
        );
      }

      // Use the transaction-safe setAsDefault method
      const updatedLocation = await this.savedLocationRepo.setAsDefault(
        locationId,
        userId
      );

      logger.info('Default location set', {
        userId,
        locationId,
      });

      return updatedLocation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error setting default location', {
        userId,
        locationId,
        error: (error as Error).message,
      });
      throw new AppError(
        500,
        "Erreur lors de la définition de l'adresse par défaut"
      );
    }
  }
}

export default new SavedLocationService(savedLocationRepository);
