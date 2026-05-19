import { Request, Response } from 'express';
import { ProductCategory, DealCategory } from '@prisma/client';

/**
 * Catégories de produits (8) — refonte mai 2026
 */
const PRODUCT_CATEGORIES = [
  {
    value: 'BAKERY_PASTRY',
    label: '🥐 Boulangeries - Pâtisseries',
    description: 'Pains, viennoiseries, gâteaux et desserts',
    icon: '🥐',
  },
  {
    value: 'GROCERY_BASKET',
    label: '🛒 Paniers supermarchés / Épicerie',
    description:
      "Paniers supermarché, fruits & légumes, produits d'épicerie et produits laitiers",
    icon: '🛒',
  },
  {
    value: 'INTERNATIONAL_CUISINE',
    label: '🍕 Cuisine Internationale',
    description: 'Tacos, pizza, sushis, etc.',
    icon: '🍕',
  },
  {
    value: 'LOCAL_TRADITIONAL',
    label: '🍲 Plats locaux et traditionnels',
    description: 'Placali, alloco, riz gras, attiéké, etc.',
    icon: '🍲',
  },
  {
    value: 'RESTAURANT',
    label: '🍽️ Restaurants',
    description: 'Plats du jour, plats chauds de restaurants',
    icon: '🍽️',
  },
  {
    value: 'PREPARED_MEALS_INDIVIDUAL',
    label: '🍱 Plats préparés (Particuliers)',
    description: 'Repas préparés par des particuliers',
    icon: '🍱',
  },
  {
    value: 'MEAT_FISH',
    label: '🥩 Viandes & Poissons',
    description: 'Produits carnés et poissonnerie',
    icon: '🥩',
  },
  {
    value: 'OTHER',
    label: '📦 Autres',
    description: 'Autres produits',
    icon: '📦',
  },
];

/**
 * Mapping des catégories de bons plans avec leurs labels en français
 */
const DEAL_CATEGORIES = [
  {
    value: 'CLOTHING_ACCESSORIES',
    label: '👔 Vêtements & accessoires',
    description: 'Mode, chaussures, sacs, bijoux',
    icon: '👔',
  },
  {
    value: 'HOME_FAMILY',
    label: '🏠 Maison & Famille',
    description: 'Articles pour la maison et la famille',
    icon: '🏠',
  },
  {
    value: 'FLOWERS',
    label: '🌺 Fleurs',
    description: 'Bouquets et compositions florales',
    icon: '🌺',
  },
  {
    value: 'HOTELS_RESIDENCES',
    label: '🏨 Hôtels et résidences',
    description: 'Hébergements et séjours',
    icon: '🏨',
  },
  {
    value: 'COSMETICS',
    label: '💄 Cosmétiques',
    description: 'Produits de beauté et soins',
    icon: '💄',
  },
  {
    value: 'FURNITURE',
    label: '🛋️ Meubles',
    description: 'Mobilier et décoration',
    icon: '🛋️',
  },
  {
    value: 'DIY_HARDWARE',
    label: '🔨 Bricolages',
    description: 'Outils et matériaux de bricolage',
    icon: '🔨',
  },
  // Catégories existantes
  {
    value: 'HOTEL_ROOM',
    label: "🛏️ Chambres d'hôtel",
    description: 'Réservations de chambres',
    icon: '🛏️',
  },
  {
    value: 'SPA_WELLNESS',
    label: '💆 Spa & Bien-être',
    description: 'Massages, soins, détente',
    icon: '💆',
  },
  {
    value: 'POOL_ACCESS',
    label: '🏊 Accès Piscine',
    description: 'Journées piscine et baignade',
    icon: '🏊',
  },
  {
    value: 'GYM_FITNESS',
    label: '🏋️ Gym & Fitness',
    description: 'Salles de sport et cours',
    icon: '🏋️',
  },
  {
    value: 'RESTAURANT_SPECIAL',
    label: '🍽️ Restaurants - Offres spéciales',
    description: 'Menus et promotions restaurants',
    icon: '🍽️',
  },
  {
    value: 'LEISURE_ACTIVITY',
    label: '🎭 Activités de loisirs',
    description: 'Divertissements et sorties',
    icon: '🎭',
  },
  {
    value: 'BEAUTY_SERVICE',
    label: '💅 Services beauté',
    description: 'Coiffure, esthétique, manucure',
    icon: '💅',
  },
  {
    value: 'TRANSPORT',
    label: '🚗 Transport',
    description: 'Services de transport',
    icon: '🚗',
  },
  {
    value: 'EVENT_TICKET',
    label: "🎫 Billets d'événements",
    description: 'Concerts, spectacles, événements',
    icon: '🎫',
  },
  {
    value: 'OTHER',
    label: '🎁 Autre',
    description: 'Autres bons plans',
    icon: '🎁',
  },
];

class CategoryController {
  /**
   * GET /api/v1/categories/products
   * Liste toutes les catégories de produits disponibles
   */
  getProductCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: {
          categories: PRODUCT_CATEGORIES,
          total: PRODUCT_CATEGORIES.length,
        },
      });
    } catch (error) {
      console.error('Error fetching product categories:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des catégories de produits',
      });
    }
  };

  /**
   * GET /api/v1/categories/deals
   * Liste toutes les catégories de bons plans disponibles
   */
  getDealCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: {
          categories: DEAL_CATEGORIES,
          total: DEAL_CATEGORIES.length,
        },
      });
    } catch (error) {
      console.error('Error fetching deal categories:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des catégories de bons plans',
      });
    }
  };

  /**
   * GET /api/v1/categories/filters/products
   * Liste tous les filtres disponibles pour les produits
   */
  getProductFilters = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        categories: PRODUCT_CATEGORIES.map((cat) => ({
          value: cat.value,
          label: cat.label,
        })),
        priceRanges: [
          { value: '0-1000', label: 'Moins de 1 000 FCFA', min: 0, max: 1000 },
          {
            value: '1000-2500',
            label: '1 000 - 2 500 FCFA',
            min: 1000,
            max: 2500,
          },
          {
            value: '2500-5000',
            label: '2 500 - 5 000 FCFA',
            min: 2500,
            max: 5000,
          },
          {
            value: '5000-10000',
            label: '5 000 - 10 000 FCFA',
            min: 5000,
            max: 10000,
          },
          {
            value: '10000+',
            label: 'Plus de 10 000 FCFA',
            min: 10000,
            max: null,
          },
        ],
        discountRanges: [
          { value: '30-50', label: '30% - 50%', min: 30, max: 50 },
          { value: '50-70', label: '50% - 70%', min: 50, max: 70 },
          { value: '70+', label: 'Plus de 70%', min: 70, max: 100 },
        ],
        communes: [
          'Cocody',
          'Plateau',
          'Marcory',
          'Yopougon',
          'Abobo',
          'Adjamé',
          'Koumassi',
          'Port-Bouët',
          'Attécoubé',
          'Treichville',
        ],
        // Filtres de localisation GPS
        location: {
          description:
            'Filtrer par localisation GPS (latitude, longitude, rayon)',
          parameters: {
            latitude: {
              type: 'number',
              description: 'Latitude de votre position (-90 à 90)',
              example: 5.36,
            },
            longitude: {
              type: 'number',
              description: 'Longitude de votre position (-180 à 180)',
              example: -4.0083,
            },
            radius: {
              type: 'number',
              description: 'Rayon de recherche en km (1-100)',
              example: 10,
              min: 1,
              max: 100,
            },
            nearbyFirst: {
              type: 'boolean',
              description: 'Prioriser les résultats proches',
              default: false,
            },
            nearbyRadius: {
              type: 'number',
              description: 'Rayon pour "à proximité" en km (1-50)',
              example: 5,
              min: 1,
              max: 50,
            },
          },
        },
        deliveryMethods: [
          { value: 'pickup', label: 'Retrait sur place' },
          { value: 'delivery', label: 'Livraison' },
          { value: 'both', label: 'Les deux' },
        ],
        sortOptions: [
          { value: 'recent', label: 'Plus récents' },
          { value: 'price_asc', label: 'Prix croissant' },
          { value: 'price_desc', label: 'Prix décroissant' },
          { value: 'discount_desc', label: 'Réduction décroissante' },
          {
            value: 'distance',
            label: 'Distance (nécessite latitude/longitude)',
          },
          { value: 'expiry', label: 'Expire bientôt' },
          { value: 'popular', label: 'Populaires' },
        ],
      };

      res.json({
        success: true,
        data: filters,
      });
    } catch (error) {
      console.error('Error fetching product filters:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des filtres',
      });
    }
  };

  /**
   * GET /api/v1/categories/filters/deals
   * Liste tous les filtres disponibles pour les bons plans
   */
  getDealFilters = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = {
        categories: DEAL_CATEGORIES.map((cat) => ({
          value: cat.value,
          label: cat.label,
        })),
        priceRanges: [
          { value: '0-5000', label: 'Moins de 5 000 FCFA', min: 0, max: 5000 },
          {
            value: '5000-10000',
            label: '5 000 - 10 000 FCFA',
            min: 5000,
            max: 10000,
          },
          {
            value: '10000-25000',
            label: '10 000 - 25 000 FCFA',
            min: 10000,
            max: 25000,
          },
          {
            value: '25000-50000',
            label: '25 000 - 50 000 FCFA',
            min: 25000,
            max: 50000,
          },
          {
            value: '50000+',
            label: 'Plus de 50 000 FCFA',
            min: 50000,
            max: null,
          },
        ],
        discountRanges: [
          { value: '0-25', label: "Jusqu'à 25%", min: 0, max: 25 },
          { value: '25-50', label: '25% - 50%', min: 25, max: 50 },
          { value: '50-75', label: '50% - 75%', min: 50, max: 75 },
          { value: '75+', label: 'Plus de 75%', min: 75, max: 100 },
        ],
        communes: [
          'Cocody',
          'Plateau',
          'Marcory',
          'Yopougon',
          'Abobo',
          'Adjamé',
          'Koumassi',
          'Port-Bouët',
          'Attécoubé',
          'Treichville',
        ],
        // Filtres de localisation GPS
        location: {
          description:
            'Filtrer par localisation GPS (latitude, longitude, rayon)',
          parameters: {
            latitude: {
              type: 'number',
              description: 'Latitude de votre position (-90 à 90)',
              example: 5.36,
            },
            longitude: {
              type: 'number',
              description: 'Longitude de votre position (-180 à 180)',
              example: -4.0083,
            },
            radius: {
              type: 'number',
              description: 'Rayon de recherche en km (1-100)',
              example: 10,
              min: 1,
              max: 100,
            },
          },
        },
        sortOptions: [
          { value: 'recent', label: 'Plus récents' },
          { value: 'price_asc', label: 'Prix croissant' },
          { value: 'price_desc', label: 'Prix décroissant' },
          { value: 'discount_desc', label: 'Réduction décroissante' },
          { value: 'ending_soon', label: 'Se termine bientôt' },
          { value: 'popular', label: 'Populaires' },
        ],
      };

      res.json({
        success: true,
        data: filters,
      });
    } catch (error) {
      console.error('Error fetching deal filters:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération des filtres',
      });
    }
  };
}

export default new CategoryController();
