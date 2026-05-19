import {
  PrismaClient,
  UserRole,
  ProductStatus,
  DealStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Complete seed data for frontend development
 * Includes users, products, deals with rooms, associations, and reviews
 */

async function seedCompleteData() {
  console.log('🌱 Starting complete data seeding...');

  // Hash password for all test users
  const password = await bcrypt.hash('Test1234!', 10);

  // ==================== CREATE TEST USERS ====================
  console.log('Creating test users...');

  const clientUser = await prisma.user.upsert({
    where: { phoneNumber: '+22507000000001' },
    update: {},
    create: {
      phoneNumber: '+22507000000001',
      email: 'client@test.com',
      passwordHash: password,
      firstName: 'Jean',
      lastName: 'Kouassi',
      role: UserRole.CLIENT,
      status: 'ACTIVE',
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Cocody',
    },
  });

  const supplierFoodUser = await prisma.user.upsert({
    where: { phoneNumber: '+22507000000002' },
    update: {},
    create: {
      phoneNumber: '+22507000000002',
      email: 'fournisseur@test.com',
      passwordHash: password,
      firstName: 'Marie',
      lastName: 'N\u0027Guessan',
      role: UserRole.SUPPLIER_FOOD,
      status: 'ACTIVE',
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Koumassi',
    },
  });

  const supplierDealsUser = await prisma.user.upsert({
    where: { phoneNumber: '+22507000000003' },
    update: {},
    create: {
      phoneNumber: '+22507000000003',
      email: 'hotel@test.com',
      passwordHash: password,
      firstName: 'Pierre',
      lastName: 'Yao',
      role: UserRole.SUPPLIER_DEALS,
      status: 'ACTIVE',
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Marcory',
    },
  });

  const associationUser = await prisma.user.upsert({
    where: { phoneNumber: '+22507000000004' },
    update: {},
    create: {
      phoneNumber: '+22507000000004',
      email: 'association@test.com',
      passwordHash: password,
      firstName: 'Awa',
      lastName: 'Traoré',
      role: UserRole.ASSOCIATION,
      status: 'ACTIVE',
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Plateau',
    },
  });

  console.log('✅ Test users created');

  // ==================== CREATE SUPPLIER PROFILES ====================
  console.log('Creating supplier profiles...');

  const otakkosSupplier = await prisma.supplierProfile.upsert({
    where: { userId: supplierFoodUser.id },
    update: {},
    create: {
      userId: supplierFoodUser.id,
      businessName: 'O\u0027takkos Koumassi',
      supplierType: 'RESTAURANT',
      description: 'Restaurant spécialisé en tacos et fast-food',
      address: 'Koumassi remblais, Abidjan',
      latitude: 5.293599,
      longitude: -3.956872,
      subscriptionTier: 'PRO',
      subscriptionActive: true,
      isVerified: true,
      kycStatus: 'VERIFIED',
      deliveryEnabled: true,
      pickupEnabled: true,
    },
  });

  // Create store for O'takkos
  const otakkosStore = await prisma.supplierStore.create({
    data: {
      supplier: { connect: { id: otakkosSupplier.id } },
      name: 'O\u0027takkos Koumassi',
      address: 'Koumassi remblais, Abidjan',
      city: 'Abidjan',
      commune: 'Koumassi',
      latitude: 5.293599,
      longitude: -3.956872,
      isActive: true,
      operatingHours: {},
    },
  });

  const hotelSupplier = await prisma.supplierProfile.upsert({
    where: { userId: supplierDealsUser.id },
    update: {},
    create: {
      userId: supplierDealsUser.id,
      businessName: 'Aparthotel Adagio Abidjan Marcory',
      supplierType: 'HOTEL',
      description: 'Aparthotel moderne au cœur de Marcory',
      address: 'Marcory Zone 4, Abidjan',
      latitude: 5.28263,
      longitude: -3.98931,
      subscriptionTier: 'PREMIUM',
      subscriptionActive: true,
      isVerified: true,
      kycStatus: 'VERIFIED',
    },
  });

  const hotelStore = await prisma.supplierStore.create({
    data: {
      supplier: { connect: { id: hotelSupplier.id } },
      name: 'Aparthotel Adagio',
      address: 'Marcory Zone 4, Abidjan',
      city: 'Abidjan',
      commune: 'Marcory',
      latitude: 5.28263,
      longitude: -3.98931,
      isActive: true,
      operatingHours: {},
    },
  });

  console.log('✅ Supplier profiles created');

  // ==================== CREATE PRODUCTS ====================
  console.log('Creating products...');

  const tacosProduct = await prisma.product.create({
    data: {
      supplierId: otakkosSupplier.id,
      storeId: otakkosStore.id,
      title: 'Pack Tacos XXL',
      description: 'Un tacos taille XXL, une boisson gazeuse et des couverts',
      category: 'PREPARED_MEALS_INDIVIDUAL',
      images: [
        'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      ],
      originalPrice: 3500,
      discountedPrice: 2500,
      commission: 250,
      quantity: 4,
      quantityAvailable: 4,
      unit: 'portion',
      expiryDate: new Date('2026-01-26T14:30:00Z'),
      isSurpriseBasket: false,
      status: ProductStatus.ACTIVE,
      pickupSlots: [
        {
          startTime: '12:00',
          endTime: '14:30',
        },
      ],
      deliveryAvailable: false,
    },
  });

  await prisma.product.create({
    data: {
      supplierId: otakkosSupplier.id,
      storeId: otakkosStore.id,
      title: 'Panier surprise Pain & Viennoiseries',
      description: 'Assortiment de pains et viennoiseries de la journée',
      category: 'BAKERY_PASTRY',
      images: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
      ],
      originalPrice: 2000,
      discountedPrice: 1000,
      commission: 100,
      quantity: 8,
      quantityAvailable: 8,
      unit: 'portion',
      expiryDate: new Date('2026-01-25T20:00:00Z'),
      isSurpriseBasket: true,
      status: ProductStatus.ACTIVE,
      pickupSlots: [
        {
          startTime: '18:00',
          endTime: '20:00',
        },
      ],
      deliveryAvailable: false,
    },
  });

  console.log('✅ Products created');

  // ==================== CREATE DEALS WITH ROOMS ====================
  console.log('Creating deals with rooms...');

  const hotelDeal = await prisma.deal.create({
    data: {
      supplierId: hotelSupplier.id,
      storeId: hotelStore.id,
      title: 'Aparthotel Adagio Abidjan Marcory',
      description:
        'Profitez d\u0027un séjour confortable dans notre aparthotel situé au cœur de Marcory. Idéal pour les courts et longs séjours avec cuisine équipée.',
      category: 'HOTEL_ROOM',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1000&auto=format&fit=crop',
      ],
      originalPrice: 200000,
      dealPrice: 125000,
      discountPercent: 37.5,
      currency: 'XOF',
      includes: [
        'WiFi gratuit',
        'Petit-déjeuner',
        'Parking',
        'Cuisine équipée',
      ],
      excludes: ['Repas', 'Boissons alcoolisées'],
      terms: 'Valable pour 1 nuit. Non remboursable.',
      status: DealStatus.ACTIVE,
      availableFrom: new Date('2026-01-01T00:00:00Z'),
      availableUntil: new Date('2026-03-31T23:59:59Z'),
      totalQuantity: 20,
      quantityAvailable: 16,
      maxPerUser: 3,
      requiresBooking: true,
      bookingLeadTime: 24,
      cancellationHours: 48,
      contactPhone: '+225 27 20 30 40 50',
      contactEmail: 'reservation@adagio-abidjan.com',
    },
  });

  // Create rooms for hotel deal
  await prisma.dealRoom.createMany({
    data: [
      {
        dealId: hotelDeal.id,
        title: 'Studio pour 2 personnes',
        description:
          'Séjournez dans un espace confortable avec un lit double, une cuisine équipée pour vos repas, une salle de bain moderne avec douche et WC. Parfait pour un couple ou un voyageur d\u0027affaires.',
        price: 125000,
        capacity: '2 pers max',
        size: '28 m2',
        floor: 'Etage supérieur',
        images: [
          'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=1000&auto=format&fit=crop',
        ],
        amenities: [
          'WiFi gratuit',
          'Eau chaude disponible',
          'Télévision à écran plat',
          'Climatisation',
          'Coffre-fort en chambre',
          'Cuisine équipée (micro-ondes, réfrigérateur)',
          'Linge de lit fourni',
        ],
        bedTypes: ['Lit double'],
        maxOccupancy: 2,
        isAvailable: true,
      },
      {
        dealId: hotelDeal.id,
        title: 'Appartement 1 chambre',
        description:
          'Appartement spacieux avec une chambre séparée, salon avec canapé-lit, cuisine complète et balcon. Idéal pour les familles ou séjours prolongés.',
        price: 155000,
        capacity: '2 pers max',
        size: '35 m2',
        floor: 'Etage supérieur',
        images: [
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?q=80&w=1000&auto=format&fit=crop',
        ],
        amenities: [
          'WiFi gratuit',
          'Cuisine équipée complète',
          'Télévision à écran plat',
          'Climatisation',
          'Balcon avec vue',
          'Machine à laver',
          'Parking gratuit',
        ],
        bedTypes: ['Lit double', 'Canapé-lit'],
        maxOccupancy: 4,
        isAvailable: true,
      },
    ],
  });

  await prisma.deal.create({
    data: {
      supplierId: hotelSupplier.id,
      storeId: hotelStore.id,
      title: 'Forfait Détente - Massage & Hammam',
      description:
        'Offrez-vous un moment de pure détente avec notre forfait incluant un massage relaxant de 60min et un accès au hammam.',
      category: 'SPA_WELLNESS',
      images: [
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&auto=format&fit=crop&q=80',
      ],
      originalPrice: 45000,
      dealPrice: 28000,
      discountPercent: 37.8,
      currency: 'XOF',
      includes: [
        'Massage relaxant 60min',
        'Accès hammam',
        'Serviette',
        'Thé à la menthe',
      ],
      status: DealStatus.ACTIVE,
      availableFrom: new Date('2026-01-01T00:00:00Z'),
      availableUntil: new Date('2026-02-28T23:59:59Z'),
      totalQuantity: 50,
      quantityAvailable: 27,
      maxPerUser: 2,
      requiresBooking: true,
      bookingLeadTime: 12,
      cancellationHours: 24,
      contactPhone: '+225 27 20 30 40 50',
    },
  });

  console.log('✅ Deals and rooms created');

  // ==================== CREATE ASSOCIATIONS ====================
  console.log('Creating associations...');

  await prisma.associationProfile.create({
    data: {
      user: { connect: { id: associationUser.id } },
      name: 'Caritas Côte d\u0027Ivoire',
      description:
        'Organisation catholique de solidarité, de développement et d\u0027action humanitaire. Nous luttons contre la pauvreté et l\u0027exclusion en Côte d\u0027Ivoire.',
      logo: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=400&auto=format&fit=crop',
      registrationNumber: 'CI-ASSO-001',
      address: 'Boulevard Carde, Plateau, Abidjan',
      latitude: 5.320357,
      longitude: -4.016107,
      serviceArea: ['Abidjan', 'Bouaké', 'Yamoussoukro'],
      acceptedFoodTypes: [
        'Fruits et légumes',
        'Pain et viennoiseries',
        'Plats cuisinés',
        'Produits non périssables',
      ],
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

  await prisma.associationProfile.create({
    data: {
      user: { connect: { id: clientUser.id } },
      name: 'SOS Villages d\u0027Enfants Côte d\u0027Ivoire',
      description:
        'Nous offrons un foyer familial aux enfants orphelins et abandonnés. Chaque enfant mérite de grandir dans une famille aimante.',
      logo: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=400&auto=format&fit=crop',
      registrationNumber: 'CI-ASSO-002',
      address: 'Abobo, Abidjan',
      latitude: 5.41852,
      longitude: -4.01985,
      serviceArea: ['Abidjan'],
      acceptedFoodTypes: [
        'Fruits et légumes',
        'Plats cuisinés',
        'Produits laitiers',
      ],
      collectionSchedule: {
        monday: '09:00-16:00',
        tuesday: '09:00-16:00',
        wednesday: '09:00-16:00',
        thursday: '09:00-16:00',
        friday: '09:00-16:00',
        saturday: '09:00-12:00',
      },
      verified: true,
    },
  });

  console.log('✅ Associations created');

  // ==================== CREATE REVIEWS ====================
  console.log('Creating reviews...');

  await prisma.review.createMany({
    data: [
      {
        userId: clientUser.id,
        productId: tacosProduct.id,
        rating: 5,
        comment:
          'Excellente qualité ! Le tacos était délicieux et la portion vraiment généreuse. Merci YaPasGachis de permettre de lutter contre le gaspillage tout en mangeant bien !',
        isVerified: true,
        helpful: 15,
      },
      {
        userId: clientUser.id,
        productId: tacosProduct.id,
        rating: 4,
        comment:
          'Très bon rapport qualité-prix. Récupéré à 13h, le produit était encore chaud. Juste la sauce un peu moins épicée que prévu mais ça reste top.',
        isVerified: true,
        helpful: 8,
      },
      {
        userId: clientUser.id,
        dealId: hotelDeal.id,
        rating: 4,
        comment:
          'Très bon séjour dans le studio. Propre, bien équipé, parfait pour 2 nuits. Seul bémol : le WiFi était un peu lent par moments.',
        isVerified: true,
        helpful: 6,
      },
      {
        userId: clientUser.id,
        dealId: hotelDeal.id,
        rating: 5,
        comment:
          'Excellent rapport qualité-prix grâce à YaPasGachis ! L\u0027appartement était spacieux et bien situé. Je recommande vivement.',
        isVerified: true,
        helpful: 10,
      },
    ],
  });

  console.log('✅ Reviews created');

  console.log('\n✅ Complete data seeding finished successfully!');
  console.log('\n📊 Summary:');
  console.log('- 4 test users created');
  console.log('- 2 supplier profiles with stores');
  console.log('- 2 products');
  console.log('- 2 deals (1 with rooms)');
  console.log('- 2 associations');
  console.log('- 4 reviews');
  console.log('\n🔑 Login credentials:');
  console.log('Client: +22507000000001 / Test1234!');
  console.log('Supplier Food: +22507000000002 / Test1234!');
  console.log('Supplier Deals: +22507000000003 / Test1234!');
  console.log('Association: +22507000000004 / Test1234!');
}

// Run seed
seedCompleteData()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
