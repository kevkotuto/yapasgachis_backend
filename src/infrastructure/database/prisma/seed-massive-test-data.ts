import {
  PrismaClient,
  UserRole,
  UserStatus,
  SupplierType,
  SubscriptionTier,
  ProductCategory,
  ProductStatus,
  DealCategory,
  DealStatus,
  DonationType,
  DonationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * SEED MASSIVE TEST DATA
 * Génère des données massives pour tester :
 * - 50+ magasins/fournisseurs dans Abidjan
 * - 5+ associations avec des dons disponibles
 * - 150+ produits variés
 * - Carte bien remplie avec données géographiques réalistes
 */

// Communes d'Abidjan avec coordonnées GPS
const ABIDJAN_COMMUNES = [
  {
    name: 'Cocody',
    neighborhoods: ['Angré', 'Riviera', 'Les Deux Plateaux', 'Vallon', 'Danga'],
    lat: 5.35,
    lng: -3.98,
  },
  {
    name: 'Plateau',
    neighborhoods: ['Centre-ville', 'Zone administrative'],
    lat: 5.32,
    lng: -4.02,
  },
  {
    name: 'Marcory',
    neighborhoods: ['Zone 4', 'Biétry', 'Anoumambo', 'Remblais'],
    lat: 5.3,
    lng: -3.98,
  },
  {
    name: 'Koumassi',
    neighborhoods: ['Remblais', 'Grand Campement', 'Sicogi'],
    lat: 5.29,
    lng: -3.96,
  },
  {
    name: 'Abobo',
    neighborhoods: ['Anonkoua', 'Avocatier', 'Baoulé', 'PK 18'],
    lat: 5.42,
    lng: -4.02,
  },
  {
    name: 'Adjamé',
    neighborhoods: ['Marché', 'Williamsville', 'Agban'],
    lat: 5.35,
    lng: -4.03,
  },
  {
    name: 'Yopougon',
    neighborhoods: ['Siporex', 'Niangon', 'Andokoi', 'Selmer'],
    lat: 5.34,
    lng: -4.08,
  },
  {
    name: 'Treichville',
    neighborhoods: ['Zone 3', 'Zone 4', 'Biafra'],
    lat: 5.28,
    lng: -4.01,
  },
  {
    name: 'Port-Bouët',
    neighborhoods: ['Vridi', 'Gonzagueville', 'Zone industrielle'],
    lat: 5.25,
    lng: -3.93,
  },
  {
    name: 'Attécoubé',
    neighborhoods: ['Agbéville', 'Santé', 'Locodjro'],
    lat: 5.35,
    lng: -4.05,
  },
];

// Noms de commerces réalistes pour la Côte d'Ivoire
const BUSINESS_NAMES = {
  RESTAURANT: [
    'Chez Tantine',
    'La Terrasse d\u0027Abidjan',
    'Le Maquis du Coin',
    'Chez Amina',
    'Restaurant Ivoire',
    'Le Grilladin',
    'Chez Tantie Rose',
    'Le Petit Parisien',
    'La Guinguette',
    'Chez Mama Africa',
    'Le Refuge Gourmand',
    'La Case Créole',
  ],
  BAKERY: [
    'Boulangerie Royale',
    'Le Pain Doré',
    'Pâtisserie Moderne',
    'La Baguette d\u0027Or',
    'Boulangerie Centrale',
    'Le Four à Pain',
    'Pâtisserie Saint-Michel',
  ],
  SUPERMARKET: [
    'Mini-Market Express',
    'Superette du Quartier',
    'Cash Center',
    'Proxi Shop',
    'Market Plus',
    'Super U Abidjan',
  ],
  HOTEL: [
    'Hôtel Étoile',
    'Résidence Le Palmier',
    'Hôtel du Lagon',
    'Le Bel Air',
    'Résidence Royale',
    'Azalaï Hôtel',
    'Palm Club Hotel',
  ],
  PASTRY_SHOP: [
    'Délices Sucrés',
    'Pâtisserie Fine',
    'La Gourmandise',
    'Sweet Corner',
  ],
  BEAUTY: [
    'Beauté Royale',
    'Institut de Beauté Sublime',
    'Salon Éclat',
    'Beauty Corner',
    'L\u0027Élégance Africaine',
  ],
  LEISURE: ['Fitness Club Premium', 'Spa Zen Abidjan', 'Centre de Loisirs'],
};

// Images Unsplash par type de commerce (URLs testées et fonctionnelles)
const BUSINESS_IMAGES = {
  RESTAURANT: {
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop',
    cover:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop',
  },
  BAKERY: {
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    cover:
      'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200&h=400&fit=crop',
  },
  SUPERMARKET: {
    logo: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400&h=400&fit=crop',
    cover:
      'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&h=400&fit=crop',
  },
  HOTEL: {
    logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=400&fit=crop',
    cover:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&h=400&fit=crop',
  },
  PASTRY_SHOP: {
    logo: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
    cover:
      'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=1200&h=400&fit=crop',
  },
  BEAUTY: {
    logo: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=400&fit=crop',
    cover:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&h=400&fit=crop',
  },
  LEISURE: {
    logo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
    cover:
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&h=400&fit=crop',
  },
};

// Produits par catégorie
const PRODUCTS_BY_CATEGORY = {
  [ProductCategory.PREPARED_MEALS_INDIVIDUAL]: [
    {
      title: 'Poulet Braisé + Attiéké',
      desc: 'Poulet braisé juteux accompagné d\u0027attiéké frais et d\u0027une sauce tomate-oignon relevée',
      price: 2500,
    },
    {
      title: 'Riz Gras au Poulet',
      desc: 'Riz gras parfumé avec morceaux de poulet, légumes et épices locales',
      price: 2000,
    },
    {
      title: 'Alloco Poisson',
      desc: 'Bananes plantains frites avec poisson frit et sauce pimentée',
      price: 1500,
    },
    {
      title: 'Garba Thon',
      desc: 'Attiéké avec thon, oignons, tomates et piment',
      price: 1200,
    },
    {
      title: 'Kedjenou de Poulet',
      desc: 'Poulet mijoté aux légumes dans une sauce traditionnelle',
      price: 3000,
    },
  ],
  [ProductCategory.GROCERY_BASKET]: [
    {
      title: 'Panier Fruits & Légumes',
      desc: 'Assortiment de fruits et légumes frais de saison',
      price: 2500,
    },
    {
      title: 'Panier Épicerie',
      desc: 'Produits d\u0027épicerie variés : riz, huile, conserves',
      price: 5000,
    },
    {
      title: 'Panier Anti-Gaspi Complet',
      desc: 'Mix de produits frais et secs proches de la date limite',
      price: 3500,
    },
  ],
  [ProductCategory.SNACKS_SALADS]: [
    {
      title: 'Salade César',
      desc: 'Salade verte, poulet grillé, croûtons et parmesan',
      price: 2000,
    },
    {
      title: 'Club Sandwich',
      desc: 'Pain de mie grillé, poulet, bacon, salade, tomate',
      price: 1800,
    },
    {
      title: 'Wrap Végétarien',
      desc: 'Tortilla avec légumes grillés, houmous et avocat',
      price: 1500,
    },
  ],
  [ProductCategory.LOCAL_TRADITIONAL]: [
    {
      title: 'Placali Sauce Graine',
      desc: 'Placali traditionnel avec sauce graine de palme',
      price: 2000,
    },
    {
      title: 'Foutou Banane + Sauce Djoumblé',
      desc: 'Foutou de banane avec sauce djoumblé aux aubergines',
      price: 2500,
    },
    {
      title: 'Attiéké Poisson Fumé',
      desc: 'Attiéké avec poisson fumé et sauce tomate',
      price: 1800,
    },
  ],
  [ProductCategory.RESTAURANT_HOT_MEALS]: [
    {
      title: 'Plat du Jour - Poulet Rôti',
      desc: 'Poulet rôti avec frites et salade',
      price: 3500,
    },
    {
      title: 'Grillades Mixtes',
      desc: 'Assortiment de viandes grillées avec accompagnement',
      price: 4000,
    },
  ],
  [ProductCategory.INTERNATIONAL_CUISINE]: [
    {
      title: 'Tacos XXL',
      desc: 'Tacos géant garni de viande, fromage et légumes',
      price: 2500,
    },
    {
      title: 'Pizza 4 Fromages',
      desc: 'Pizza artisanale avec 4 variétés de fromages',
      price: 3500,
    },
    {
      title: 'Sushi Mix',
      desc: 'Assortiment de 12 sushis et makis',
      price: 5000,
    },
    {
      title: 'Burger Maison',
      desc: 'Burger avec steak haché, cheddar, bacon et frites',
      price: 3000,
    },
  ],
  [ProductCategory.BAKERY]: [
    {
      title: 'Pain Baguette x3',
      desc: 'Lot de 3 baguettes fraîches du jour',
      price: 500,
    },
    {
      title: 'Pain Complet',
      desc: 'Pain complet aux céréales',
      price: 800,
    },
    {
      title: 'Pain au Chocolat x4',
      desc: 'Lot de 4 pains au chocolat',
      price: 1000,
    },
  ],
  [ProductCategory.PASTRY]: [
    {
      title: 'Assortiment Viennoiseries',
      desc: 'Croissants, pains au chocolat, chaussons aux pommes',
      price: 1500,
    },
    {
      title: 'Gâteau Part',
      desc: 'Part de gâteau au chocolat ou vanille',
      price: 800,
    },
  ],
  [ProductCategory.DAIRY_DELI]: [
    {
      title: 'Fromages Assortis',
      desc: 'Plateau de fromages variés',
      price: 3000,
    },
    {
      title: 'Charcuterie',
      desc: 'Assortiment de charcuterie fine',
      price: 2500,
    },
  ],
};

// Fonction pour générer une variation de coordonnées GPS
function randomCoord(base: number, range = 0.05): number {
  return base + (Math.random() - 0.5) * range;
}

// Fonction pour obtenir une heure future aléatoire
function getRandomFutureHours(minHours = 2, maxHours = 12): Date {
  const hours = Math.floor(Math.random() * (maxHours - minHours) + minHours);
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function main() {
  console.log('🌱 Starting MASSIVE test data seeding for Abidjan...\n');

  const password = await bcrypt.hash('Test1234!', 12);

  // ==================== CREATE SUBSCRIPTION PLANS ====================
  console.log('📦 Ensuring subscription plans exist...');

  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { tier: SubscriptionTier.BASIC },
    update: {},
    create: {
      name: 'Basic',
      tier: SubscriptionTier.BASIC,
      description: 'Plan gratuit pour démarrer',
      monthlyPrice: 0,
      maxStores: 1,
      maxProducts: 10,
      canCreateDeals: false,
      commissionRate: 0.15,
      isActive: true,
      isPublic: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { tier: SubscriptionTier.PRO },
    update: {},
    create: {
      name: 'Pro',
      tier: SubscriptionTier.PRO,
      description: 'Pour les commerçants en croissance',
      monthlyPrice: 15000,
      yearlyPrice: 150000,
      maxStores: 3,
      maxProducts: 50,
      maxDeals: 5,
      canCreateDeals: true,
      priorityListing: true,
      analyticsAccess: true,
      commissionRate: 0.1,
      trialDays: 14,
      isActive: true,
      isPublic: true,
    },
  });

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { tier: SubscriptionTier.PREMIUM },
    update: {},
    create: {
      name: 'Premium',
      tier: SubscriptionTier.PREMIUM,
      description: 'Pour les grandes enseignes',
      monthlyPrice: 35000,
      yearlyPrice: 350000,
      maxStores: 999,
      maxProducts: 999,
      maxDeals: 999,
      canCreateDeals: true,
      priorityListing: true,
      analyticsAccess: true,
      commissionRate: 0.05,
      trialDays: 30,
      isActive: true,
      isPublic: true,
    },
  });

  console.log('  ✅ Subscription plans ready\n');

  // ==================== CREATE CLIENTS ====================
  console.log('👥 Creating test clients...');

  const clients = [];
  const baseClientNumber = 50; // Start from 50 to avoid conflicts
  for (let i = 1; i <= 10; i++) {
    const clientNum = baseClientNumber + i;
    const client = await prisma.user.create({
      data: {
        phoneNumber: `+22507100000${clientNum.toString().padStart(2, '0')}`,
        email: `client${clientNum}@test.yapasgachis.com`,
        firstName: [
          'Jean',
          'Marie',
          'Kofi',
          'Awa',
          'Yao',
          'Aminata',
          'Kouassi',
          'Fatou',
          'Ibrahim',
          'Aïcha',
        ][i - 1],
        lastName: [
          'Kouassi',
          'Bamba',
          'Traoré',
          'Diallo',
          'Yao',
          'N\u0027Guessan',
          'Koné',
          'Ouattara',
          'Sanogo',
          'Diabaté',
        ][i - 1],
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        passwordHash: password,
        emailVerified: true,
        phoneVerified: true,
        city: 'Abidjan',
        commune: ABIDJAN_COMMUNES[i % ABIDJAN_COMMUNES.length].name,
        language: 'fr',
      },
    });
    clients.push(client);
  }

  console.log(`  ✅ Created ${clients.length} test clients\n`);

  // ==================== CREATE SUPPLIERS & STORES ====================
  console.log('🏪 Creating massive suppliers and stores...');

  const suppliers: any[] = [];
  const stores: any[] = [];
  let supplierCount = 100; // Start from 100 to avoid conflicts

  // Pour chaque type de fournisseur
  const supplierTypes = [
    { type: SupplierType.RESTAURANT, count: 20 },
    { type: SupplierType.BAKERY, count: 10 },
    { type: SupplierType.SUPERMARKET, count: 8 },
    { type: SupplierType.HOTEL, count: 7 },
    { type: SupplierType.PASTRY_SHOP, count: 7 },
    { type: SupplierType.BEAUTY, count: 5 },
    { type: SupplierType.LEISURE, count: 3 },
  ];

  for (const { type, count } of supplierTypes) {
    for (let i = 0; i < count; i++) {
      supplierCount++;
      const commune = ABIDJAN_COMMUNES[supplierCount % ABIDJAN_COMMUNES.length];
      const neighborhood =
        commune.neighborhoods[i % commune.neighborhoods.length];

      // Business name
      const businessNames = BUSINESS_NAMES[type] || [
        'Commerce ' + supplierCount,
      ];
      const businessName =
        businessNames[i % businessNames.length] +
        (i >= businessNames.length
          ? ` ${Math.floor(i / businessNames.length) + 1}`
          : '');

      // Create user
      const supplierUser = await prisma.user.create({
        data: {
          phoneNumber: `+22507200${supplierCount.toString().padStart(5, '0')}`,
          email: `supplier${supplierCount}@test.yapasgachis.com`,
          firstName: ['Marie', 'Amadou', 'Fanta', 'Kouadio', 'Adjoua'][
            supplierCount % 5
          ],
          lastName: ['Koné', 'Diallo', 'Traoré', 'Yao', 'Bamba'][
            supplierCount % 5
          ],
          role: UserRole.SUPPLIER_FOOD,
          status: UserStatus.ACTIVE,
          passwordHash: password,
          emailVerified: true,
          phoneVerified: true,
          city: 'Abidjan',
          commune: commune.name,
          language: 'fr',
        },
      });

      // Determine subscription tier
      const tiers = [
        SubscriptionTier.BASIC,
        SubscriptionTier.PRO,
        SubscriptionTier.PREMIUM,
      ];
      const tier = tiers[supplierCount % 3];
      const planMap = { BASIC: basicPlan, PRO: proPlan, PREMIUM: premiumPlan };

      // Get images for this supplier type
      const images = BUSINESS_IMAGES[type] || {
        logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(businessName)}&background=random`,
        cover:
          'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200&h=400&fit=crop',
      };

      // Create supplier profile
      const supplier = await prisma.supplierProfile.create({
        data: {
          userId: supplierUser.id,
          businessName,
          supplierType: type,
          description: `${businessName} - Situé à ${neighborhood}, ${commune.name}. Cuisine locale et internationale de qualité.`,
          logo: images.logo,
          coverImage: images.cover,
          address: `${neighborhood}, ${commune.name}, Abidjan`,
          latitude: randomCoord(commune.lat),
          longitude: randomCoord(commune.lng),
          operatingHours: {
            monday: { open: '08:00', close: '22:00' },
            tuesday: { open: '08:00', close: '22:00' },
            wednesday: { open: '08:00', close: '22:00' },
            thursday: { open: '08:00', close: '22:00' },
            friday: { open: '08:00', close: '23:00' },
            saturday: { open: '10:00', close: '23:00' },
            sunday: { open: '10:00', close: '20:00' },
          },
          deliveryEnabled: supplierCount % 3 !== 0,
          pickupEnabled: true,
          deliveryRadius: 5 + (supplierCount % 10),
          subscriptionTier: tier,
          subscriptionPlanId: planMap[tier].id,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          subscriptionActive: true,
          acceptCashPayment: true,
          commissionRate:
            tier === SubscriptionTier.PREMIUM
              ? 0.05
              : tier === SubscriptionTier.PRO
                ? 0.1
                : 0.15,
          isVerified: true,
          verifiedAt: new Date(),
          kycStatus: 'VERIFIED',
        },
      });

      suppliers.push(supplier);

      // Create 1-2 stores per supplier
      const storeCount = tier === SubscriptionTier.PREMIUM ? 2 : 1;
      for (let s = 0; s < storeCount; s++) {
        const storeNeighborhood =
          commune.neighborhoods[(i + s) % commune.neighborhoods.length];
        const store = await prisma.supplierStore.create({
          data: {
            supplierId: supplier.id,
            name: `${businessName}${storeCount > 1 ? ` - ${storeNeighborhood}` : ''}`,
            description: `Point de vente à ${storeNeighborhood}`,
            address: `${storeNeighborhood}, ${commune.name}, Abidjan`,
            city: 'Abidjan',
            commune: commune.name,
            neighborhood: storeNeighborhood,
            latitude: randomCoord(commune.lat, 0.02),
            longitude: randomCoord(commune.lng, 0.02),
            phoneNumber: `+22507200${supplierCount.toString().padStart(5, '0')}`,
            operatingHours: {
              monday: { open: '08:00', close: '22:00' },
              tuesday: { open: '08:00', close: '22:00' },
              wednesday: { open: '08:00', close: '22:00' },
              thursday: { open: '08:00', close: '22:00' },
              friday: { open: '08:00', close: '23:00' },
              saturday: { open: '10:00', close: '23:00' },
              sunday: { open: '10:00', close: '20:00' },
            },
            deliveryEnabled: supplier.deliveryEnabled,
            pickupEnabled: true,
            deliveryRadius: supplier.deliveryRadius,
            acceptCashPayment: true,
            isActive: true,
          },
        });
        stores.push(store);
      }
    }
  }

  console.log(
    `  ✅ Created ${suppliers.length} suppliers with ${stores.length} stores\n`
  );

  // ==================== CREATE PRODUCTS ====================
  console.log('🍽️ Creating massive products...');

  let productCount = 0;
  const productCategories = Object.keys(
    PRODUCTS_BY_CATEGORY
  ) as ProductCategory[];

  for (const store of stores) {
    // Each store gets 3-5 products
    const numProducts = 3 + (productCount % 3);

    for (let i = 0; i < numProducts; i++) {
      const category =
        productCategories[productCount % productCategories.length];
      const categoryProducts = PRODUCTS_BY_CATEGORY[category];
      const productTemplate =
        categoryProducts[productCount % categoryProducts.length];

      const originalPrice = productTemplate.price;
      const discountPercent = 30 + (productCount % 40); // 30-70% discount
      const discountedPrice = Math.round(
        originalPrice * (1 - discountPercent / 100)
      );

      // Images réelles pour chaque catégorie
      const productImages = [
        `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop`,
        `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop`,
        `https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop`,
      ];

      await prisma.product.create({
        data: {
          supplierId: store.supplierId,
          storeId: store.id,
          title: productTemplate.title,
          description: productTemplate.desc,
          category,
          images: productImages,
          originalPrice,
          discountedPrice,
          commission: discountedPrice * 0.1,
          quantity: 5 + (productCount % 15),
          quantityAvailable: 3 + (productCount % 12),
          unit: 'portion',
          expiryDate: getRandomFutureHours(2, 12),
          isSurpriseBasket: productCount % 5 === 0,
          status: ProductStatus.ACTIVE,
          availableFrom: new Date(),
          availableUntil: getRandomFutureHours(2, 12),
          pickupSlots: ['11:00-14:00', '17:00-21:00'],
          deliveryAvailable: store.deliveryEnabled && productCount % 2 === 0,
        },
      });

      productCount++;
    }
  }

  console.log(`  ✅ Created ${productCount} products\n`);

  // ==================== CREATE ASSOCIATIONS WITH DONATIONS ====================
  console.log('🤝 Creating associations with donations...');

  const associations = [
    {
      name: 'Caritas Côte d\u0027Ivoire',
      description:
        'Organisation catholique de solidarité et d\u0027action humanitaire',
      commune: 'Plateau',
      lat: 5.32,
      lng: -4.02,
    },
    {
      name: 'SOS Villages d\u0027Enfants',
      description: 'Foyer familial pour enfants orphelins et abandonnés',
      commune: 'Abobo',
      lat: 5.42,
      lng: -4.02,
    },
    {
      name: 'Croix-Rouge Ivoirienne',
      description: 'Organisation humanitaire d\u0027aide aux plus démunis',
      commune: 'Cocody',
      lat: 5.35,
      lng: -3.98,
    },
    {
      name: 'Banque Alimentaire Abidjan',
      description:
        'Distribution de denrées alimentaires aux familles nécessiteuses',
      commune: 'Yopougon',
      lat: 5.34,
      lng: -4.08,
    },
    {
      name: 'Espoir Solidaire',
      description: 'Lutte contre la pauvreté et l\u0027exclusion sociale',
      commune: 'Adjamé',
      lat: 5.35,
      lng: -4.03,
    },
  ];

  const createdAssociations = [];
  const baseAssoNumber = 20; // Start from 20 to avoid conflicts
  for (let idx = 0; idx < associations.length; idx++) {
    const assoc = associations[idx];
    const assoNum = baseAssoNumber + idx + 1;
    const assoUser = await prisma.user.create({
      data: {
        phoneNumber: `+22507300000${assoNum.toString().padStart(2, '0')}`,
        email: `association${assoNum}@test.yapasgachis.com`,
        firstName: ['Fatou', 'Awa', 'Aïcha', 'Aminata', 'Fanta'][idx],
        lastName: ['Traoré', 'Diallo', 'Koné', 'Bamba', 'Ouattara'][idx],
        role: UserRole.ASSOCIATION,
        status: UserStatus.ACTIVE,
        passwordHash: password,
        emailVerified: true,
        phoneVerified: true,
        city: 'Abidjan',
        commune: assoc.commune,
        language: 'fr',
      },
    });

    const association = await prisma.associationProfile.create({
      data: {
        userId: assoUser.id,
        name: assoc.name,
        description: assoc.description,
        registrationNumber: `CI-ASSO-${1000 + idx}`,
        address: `${assoc.commune}, Abidjan`,
        latitude: randomCoord(assoc.lat, 0.02),
        longitude: randomCoord(assoc.lng, 0.02),
        serviceArea: [assoc.commune, 'Abidjan'],
        acceptedFoodTypes: ['prepared', 'dry', 'fresh', 'bakery'],
        collectionSchedule: {
          monday: '08:00-17:00',
          tuesday: '08:00-17:00',
          wednesday: '08:00-17:00',
          thursday: '08:00-17:00',
          friday: '08:00-17:00',
        },
        verified: true,
      },
    });

    createdAssociations.push(association);

    // Create 2-4 donations for each association
    const numDonations = 2 + (idx % 3);
    for (let d = 0; d < numDonations; d++) {
      const donorClient = clients[d % clients.length];
      const randomStore = stores[Math.floor(Math.random() * stores.length)];

      // Get a random product from this store
      const storeProducts = await prisma.product.findMany({
        where: { storeId: randomStore.id },
        take: 1,
      });

      if (storeProducts.length > 0) {
        await prisma.donation.create({
          data: {
            donorId: donorClient.id,
            associationId: association.id,
            type: DonationType.FOOD,
            status: [
              DonationStatus.PENDING,
              DonationStatus.SCHEDULED,
              DonationStatus.COLLECTED,
            ][d % 3],
            productId: storeProducts[0].id,
            quantity: 5 + d * 2,
            unit: 'portion',
            pickupScheduled: new Date(
              Date.now() + (d + 1) * 24 * 60 * 60 * 1000
            ),
          },
        });
      }
    }
  }

  console.log(
    `  ✅ Created ${createdAssociations.length} associations with donations\n`
  );

  // ==================== CREATE DEALS ====================
  console.log('🎫 Creating deals with rooms and various categories...');

  // Get hotel stores for deals with rooms
  const hotelStores = stores.filter((s) => {
    const supplier = suppliers.find((sup) => sup.id === s.supplierId);
    return supplier?.supplierType === SupplierType.HOTEL;
  });

  // Create hotel deals with rooms
  for (let idx = 0; idx < hotelStores.length; idx++) {
    const hotelStore = hotelStores[idx];
    const originalPrice = 80000 + idx * 20000;
    const dealPrice = Math.round(originalPrice * 0.65);

    const hotelDeal = await prisma.deal.create({
      data: {
        supplierId: hotelStore.supplierId,
        storeId: hotelStore.id,
        title: `Séjour ${hotelStore.name}`,
        description: `Profitez d'un séjour confortable dans notre établissement situé à ${hotelStore.commune}. Chambres modernes avec toutes les commodités.`,
        category: DealCategory.HOTEL_ROOM,
        images: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop',
        ],
        originalPrice,
        dealPrice,
        discountPercent: Math.round(
          ((originalPrice - dealPrice) / originalPrice) * 100
        ),
        includes: [
          'WiFi gratuit',
          'Petit-déjeuner',
          'Parking',
          'Climatisation',
        ],
        excludes: ['Repas supplémentaires', 'Room service', 'Spa'],
        terms:
          'Valable pour 1 nuit. Annulation gratuite 48h avant. Non remboursable après.',
        status: DealStatus.ACTIVE,
        availableFrom: new Date(),
        availableUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        totalQuantity: 30,
        quantityAvailable: 20 + idx,
        maxPerUser: 3,
        requiresBooking: true,
        bookingLeadTime: 24,
        cancellationHours: 48,
        contactPhone: hotelStore.phoneNumber || '+2250700000000',
        contactEmail: `reservations@${hotelStore.name.toLowerCase().replace(/\s/g, '')}.ci`,
      },
    });

    // Create 2-3 rooms for this hotel deal
    const roomsData = [
      {
        title: 'Chambre Standard',
        description:
          'Chambre confortable avec lit double, salle de bain privée, TV écran plat et climatisation.',
        price: dealPrice,
        capacity: '2 personnes',
        size: '22 m²',
        floor: 'Tous étages',
        amenities: [
          'WiFi gratuit',
          'Climatisation',
          'TV écran plat',
          'Salle de bain privée',
          'Bureau',
        ],
        bedTypes: ['1 lit double'],
        images: [
          'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop',
        ],
        maxOccupancy: 2,
      },
      {
        title: 'Chambre Supérieure',
        description:
          'Chambre spacieuse avec vue, lit king size, coin salon, mini-bar et coffre-fort.',
        price: Math.round(dealPrice * 1.3),
        capacity: '2-3 personnes',
        size: '32 m²',
        floor: 'Étages supérieurs',
        amenities: [
          'WiFi gratuit',
          'Climatisation',
          'TV écran plat',
          'Mini-bar',
          'Coffre-fort',
          'Balcon',
        ],
        bedTypes: ['1 lit king size ou 2 lits simples'],
        images: [
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop',
        ],
        maxOccupancy: 3,
      },
      {
        title: 'Suite Familiale',
        description:
          'Suite spacieuse avec chambre séparée, salon, cuisine équipée. Parfait pour les familles.',
        price: Math.round(dealPrice * 1.8),
        capacity: '4 personnes',
        size: '50 m²',
        floor: 'Étage supérieur',
        amenities: [
          'WiFi gratuit',
          'Climatisation',
          '2 TV écran plat',
          'Cuisine équipée',
          'Machine à laver',
          'Balcon',
        ],
        bedTypes: ['1 lit king size', '1 canapé-lit'],
        images: [
          'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=600&fit=crop',
        ],
        maxOccupancy: 4,
      },
    ];

    for (const roomData of roomsData) {
      await prisma.dealRoom.create({
        data: {
          dealId: hotelDeal.id,
          ...roomData,
          isAvailable: true,
        },
      });
    }
  }

  console.log(`  ✅ Created ${hotelStores.length} hotel deals with rooms`);

  // Create other category deals (clothing, cosmetics, furniture, etc.)
  const otherDeals = [
    {
      title: 'Collection Vêtements Fin de Saison',
      description:
        'Grande démarque sur notre collection été. Robes, chemises, pantalons à prix réduits.',
      category: DealCategory.CLOTHING_ACCESSORIES,
      images: [
        'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=600&fit=crop',
      ],
      originalPrice: 25000,
      dealPrice: 12000,
      includes: [
        'Vêtements neufs',
        'Toutes tailles disponibles',
        'Retouches gratuites',
      ],
    },
    {
      title: 'Pack Cosmétiques Complet',
      description:
        'Kit complet de cosmétiques : crèmes, lotions, maquillage. Produits de qualité premium.',
      category: DealCategory.COSMETICS,
      images: [
        'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=600&fit=crop',
      ],
      originalPrice: 35000,
      dealPrice: 20000,
      includes: [
        'Crème hydratante',
        'Sérum visage',
        'Rouge à lèvres',
        'Mascara',
      ],
    },
    {
      title: 'Meubles Salon Moderne',
      description:
        'Ensemble salon : canapé 3 places, table basse, lampe design. Style contemporain.',
      category: DealCategory.FURNITURE,
      images: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&h=600&fit=crop',
      ],
      originalPrice: 450000,
      dealPrice: 320000,
      includes: [
        'Canapé 3 places',
        'Table basse',
        'Lampe',
        'Livraison incluse',
      ],
    },
    {
      title: 'Bouquet de Roses Premium',
      description:
        '24 roses rouges fraîches en bouquet élégant. Parfait pour toute occasion.',
      category: DealCategory.FLOWERS,
      images: [
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&h=600&fit=crop',
      ],
      originalPrice: 15000,
      dealPrice: 9000,
      includes: [
        '24 roses',
        'Emballage premium',
        'Carte message',
        'Livraison gratuite',
      ],
    },
    {
      title: 'Forfait Massage & Soins',
      description:
        'Massage relaxant 60min + soin du visage. Détente garantie dans notre spa.',
      category: DealCategory.SPA_WELLNESS,
      images: [
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=600&fit=crop',
      ],
      originalPrice: 40000,
      dealPrice: 25000,
      includes: ['Massage 60min', 'Soin visage', 'Accès hammam', 'Thé offert'],
    },
    {
      title: 'Abonnement Gym 3 Mois',
      description:
        'Accès illimité à notre salle de sport pendant 3 mois. Équipements modernes.',
      category: DealCategory.GYM_FITNESS,
      images: [
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop',
      ],
      originalPrice: 75000,
      dealPrice: 45000,
      includes: [
        'Accès illimité 3 mois',
        'Coach personnalisé',
        'Vestiaire',
        'Douche',
      ],
    },
    {
      title: 'Déjeuner Gastronomique',
      description:
        'Menu 3 plats dans notre restaurant. Entrée, plat, dessert + boisson.',
      category: DealCategory.RESTAURANT_SPECIAL,
      images: [
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
      ],
      originalPrice: 18000,
      dealPrice: 11000,
      includes: ['Entrée au choix', 'Plat principal', 'Dessert', 'Boisson'],
    },
    {
      title: 'Pack Bricolage Complet',
      description:
        'Kit complet d\u0027outils de bricolage. Tout pour vos travaux à la maison.',
      category: DealCategory.DIY_HARDWARE,
      images: [
        'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&h=600&fit=crop',
      ],
      originalPrice: 55000,
      dealPrice: 35000,
      includes: [
        'Perceuse électrique',
        'Marteau',
        'Tournevis set',
        'Niveau',
        'Mètre',
      ],
    },
  ];

  // Create these deals with random stores
  for (const dealData of otherDeals) {
    const randomStore = stores[Math.floor(Math.random() * stores.length)];

    await prisma.deal.create({
      data: {
        supplierId: randomStore.supplierId,
        storeId: randomStore.id,
        title: dealData.title,
        description: dealData.description,
        category: dealData.category,
        images: dealData.images,
        originalPrice: dealData.originalPrice,
        dealPrice: dealData.dealPrice,
        discountPercent: Math.round(
          ((dealData.originalPrice - dealData.dealPrice) /
            dealData.originalPrice) *
            100
        ),
        includes: dealData.includes,
        excludes: ['Vente finale', 'Non échangeable'],
        terms: 'Offre limitée. Sous réserve de disponibilité.',
        status: DealStatus.ACTIVE,
        availableFrom: new Date(),
        availableUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        totalQuantity: 50,
        quantityAvailable: 30 + Math.floor(Math.random() * 15),
        maxPerUser: 2,
        requiresBooking:
          dealData.category === DealCategory.SPA_WELLNESS ||
          dealData.category === DealCategory.RESTAURANT_SPECIAL,
        bookingLeadTime: 12,
        cancellationHours: 24,
        contactPhone: randomStore.phoneNumber || '+2250700000000',
      },
    });
  }

  console.log(`  ✅ Created ${otherDeals.length} deals in various categories`);
  console.log(`  ✅ Total deals: ${hotelStores.length + otherDeals.length}\n`);

  // ==================== SUMMARY ====================
  const totalDeals = hotelStores.length + otherDeals.length;
  const totalDealRooms = hotelStores.length * 3; // 3 rooms per hotel

  console.log('\n========================================');
  console.log('🎉 MASSIVE DATA SEEDING COMPLETED!\n');
  console.log('📊 Summary:');
  console.log(`  - ${clients.length} Clients`);
  console.log(`  - ${suppliers.length} Suppliers (with logos & covers)`);
  console.log(`  - ${stores.length} Stores (across all Abidjan)`);
  console.log(`  - ${productCount} Products (various categories)`);
  console.log(`  - ${createdAssociations.length} Associations`);
  console.log(`  - Multiple Donations available`);
  console.log(
    `  - ${totalDeals} Deals (${hotelStores.length} hotel deals + ${otherDeals.length} other categories)`
  );
  console.log(`  - ${totalDealRooms} Hotel Rooms (for deal bookings)`);
  console.log('\n📦 Deal Categories:');
  console.log('  - Hotel Rooms (with room management)');
  console.log('  - Clothing & Accessories');
  console.log('  - Cosmetics & Beauty');
  console.log('  - Furniture & Home');
  console.log('  - Flowers');
  console.log('  - Spa & Wellness');
  console.log('  - Gym & Fitness');
  console.log('  - Restaurant Specials');
  console.log('  - DIY & Hardware');
  console.log('\n📍 Geographic Coverage:');
  for (const commune of ABIDJAN_COMMUNES) {
    const communeStores = stores.filter((s) => s.commune === commune.name);
    console.log(`  - ${commune.name}: ${communeStores.length} stores`);
  }
  console.log('\n📝 Test Credentials:');
  console.log('  Client: +22507100000051 / Test1234!');
  console.log('  Supplier: +22507200000101 / Test1234!');
  console.log('  Association: +22507300000021 / Test1234!');
  console.log('\n💡 Features to Test:');
  console.log('  ✅ Map view with 60+ stores across Abidjan');
  console.log('  ✅ Product listings with various categories');
  console.log('  ✅ Hotel deals with room selection');
  console.log('  ✅ Various deal categories (clothing, beauty, etc.)');
  console.log('  ✅ Associations with active donations');
  console.log('  ✅ Supplier pages with logos and covers');
  console.log('========================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
