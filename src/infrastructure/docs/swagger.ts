import { Express } from 'express';
import swaggerJsdoc, { Options } from 'swagger-jsdoc';
import * as swaggerUi from 'swagger-ui-express';

import config from '@/config';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'YapaGachis API',
    version: '1.0.0',
    description: `
## API Backend pour YapaGachis - Marketplace anti-gaspillage pan-africain

### Description
YapaGachis est une plateforme de marketplace qui connecte les fournisseurs (restaurants, boulangeries, supermarchés) avec les consommateurs pour réduire le gaspillage alimentaire en Afrique.

### Fonctionnalités principales
- **Authentification** : JWT avec refresh tokens, OTP SMS
- **Fournisseurs** : Inscription, vérification, multi-magasins
- **Produits** : CRUD avec modération admin
- **Commandes** : Paiement Wave/Cash, pickup/delivery
- **Deals** : Bons plans avec réservations
- **Dons** : Alimentaires et financiers vers associations
- **Abonnements** : Plans et codes promo
- **Notifications** : Push (Expo), Email, WebSocket
- **Publicité** : Campagnes avec targeting

### Authentification
La plupart des endpoints nécessitent un token JWT Bearer.
\`\`\`
Authorization: Bearer <token>
\`\`\`
    `,
    contact: {
      name: 'YapaGachis Team',
      email: 'support@yapasgachis.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.app.port}/api/${config.app.apiVersion}`,
      description: 'Serveur de développement',
    },
    {
      url: `https://api.yapasgachis.com/api/${config.app.apiVersion}`,
      description: 'Serveur de production',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentification et gestion des utilisateurs',
    },
    { name: 'Suppliers', description: 'Gestion des fournisseurs' },
    { name: 'Products', description: 'Gestion des produits' },
    { name: 'Orders', description: 'Gestion des commandes' },
    { name: 'Deals', description: 'Bons plans et réservations' },
    { name: 'Stores', description: 'Multi-magasins' },
    { name: 'Subscriptions', description: 'Abonnements et codes promo' },
    { name: 'Associations', description: 'Gestion des associations' },
    { name: 'Donations', description: 'Dons alimentaires et financiers' },
    {
      name: 'Notifications',
      description: 'Notifications push, email, temps réel',
    },
    { name: 'Reviews', description: 'Avis et évaluations' },
    { name: 'Advertising', description: 'Campagnes publicitaires' },
    { name: 'Admin', description: 'Administration et analytics' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtenu via /auth/login ou /auth/register',
      },
    },
    schemas: {
      // Common schemas
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Une erreur est survenue' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', example: '+221771234567' },
          firstName: { type: 'string', example: 'Mamadou' },
          lastName: { type: 'string', example: 'Diallo' },
          role: {
            type: 'string',
            enum: ['USER', 'SUPPLIER', 'ASSOCIATION', 'ADVERTISER', 'ADMIN'],
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // Auth schemas
      LoginRequest: {
        type: 'object',
        required: ['phone', 'password'],
        properties: {
          phone: { type: 'string', example: '+221771234567' },
          password: { type: 'string', minLength: 8 },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['phone', 'password', 'firstName', 'lastName'],
        properties: {
          phone: { type: 'string', example: '+221771234567' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
      // Product schemas
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Panier Surprise' },
          description: { type: 'string' },
          originalPrice: { type: 'number', example: 5000 },
          discountedPrice: { type: 'number', example: 2500 },
          discountPercentage: { type: 'number', example: 50 },
          quantity: { type: 'integer', example: 10 },
          category: {
            type: 'string',
            enum: [
              'BAKERY',
              'RESTAURANT',
              'SUPERMARKET',
              'GROCERY',
              'FRUITS_VEGETABLES',
              'DAIRY',
              'MEAT_FISH',
              'OTHER',
            ],
          },
          status: {
            type: 'string',
            enum: [
              'DRAFT',
              'PENDING',
              'ACTIVE',
              'SOLD_OUT',
              'EXPIRED',
              'REJECTED',
            ],
          },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
          pickupStart: { type: 'string', format: 'date-time' },
          pickupEnd: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          supplier: { $ref: '#/components/schemas/SupplierSummary' },
        },
      },
      // Supplier schemas
      SupplierSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          businessName: { type: 'string', example: 'Pâtisserie Kayzer' },
          type: {
            type: 'string',
            enum: ['BAKERY', 'RESTAURANT', 'SUPERMARKET', 'GROCERY', 'OTHER'],
          },
          isVerified: { type: 'boolean' },
          rating: { type: 'number', example: 4.5 },
          logo: { type: 'string', format: 'uri' },
        },
      },
      // Order schemas
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          orderNumber: { type: 'string', example: 'ORD-2024-001234' },
          status: {
            type: 'string',
            enum: [
              'PENDING',
              'PAID',
              'PREPARING',
              'READY',
              'DELIVERING',
              'DELIVERED',
              'COMPLETED',
              'CANCELLED',
              'REFUNDED',
            ],
          },
          totalAmount: { type: 'number', example: 5000 },
          deliveryMethod: { type: 'string', enum: ['PICKUP', 'DELIVERY'] },
          paymentMethod: { type: 'string', enum: ['WAVE', 'CASH_ON_DELIVERY'] },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          productName: { type: 'string' },
          quantity: { type: 'integer' },
          unitPrice: { type: 'number' },
          totalPrice: { type: 'number' },
        },
      },
      // Deal schemas
      Deal: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Petit-déjeuner Gourmand' },
          description: { type: 'string' },
          category: {
            type: 'string',
            enum: [
              'FOOD',
              'WELLNESS',
              'ENTERTAINMENT',
              'TRAVEL',
              'SHOPPING',
              'SERVICES',
              'OTHER',
            ],
          },
          originalPrice: { type: 'number', example: 10000 },
          discountedPrice: { type: 'number', example: 5000 },
          discountPercentage: { type: 'number', example: 50 },
          quantityAvailable: { type: 'integer' },
          quantityRemaining: { type: 'integer' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'PAUSED'],
          },
        },
      },
      // Donation schemas
      Donation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['FOOD', 'FINANCIAL'] },
          status: {
            type: 'string',
            enum: [
              'PENDING',
              'SCHEDULED',
              'COLLECTED',
              'DISTRIBUTED',
              'COMPLETED',
              'CANCELLED',
            ],
          },
          amount: {
            type: 'number',
            description: 'Montant pour dons financiers',
          },
          quantity: {
            type: 'number',
            description: 'Quantité en kg pour dons alimentaires',
          },
          association: { $ref: '#/components/schemas/AssociationSummary' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AssociationSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Association Solidarité Dakar' },
          isVerified: { type: 'boolean' },
        },
      },
      // Notification schemas
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          data: { type: 'object' },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Non authentifié',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              message: 'Token invalide ou expiré',
            },
          },
        },
      },
      Forbidden: {
        description: 'Accès refusé',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              message: "Vous n'avez pas les permissions nécessaires",
            },
          },
        },
      },
      NotFound: {
        description: 'Ressource non trouvée',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              message: 'Ressource non trouvée',
            },
          },
        },
      },
      ValidationError: {
        description: 'Erreur de validation',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              message: 'Erreur de validation',
              errors: [{ field: 'email', message: 'Email invalide' }],
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options: Options = {
  swaggerDefinition,
  apis: ['./src/api/v1/routes/*.ts', './src/api/v1/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Swagger UI
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'YapaGachis API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'none',
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    })
  );
};

export { swaggerSpec };
