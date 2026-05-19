import {
  PrismaClient,
  UserRole,
  UserStatus,
  SubscriptionTier,
  SupplierType,
  ProductCategory,
  ProductStatus,
  DealCategory,
  DealStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

import { seedPaymentProviders } from './seed-payment-providers';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ==================== 1. SUBSCRIPTION PLANS ====================
  console.log('📦 Creating subscription plans...');

  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { tier: SubscriptionTier.BASIC },
    update: {},
    create: {
      name: 'Basic',
      tier: SubscriptionTier.BASIC,
      description:
        'Plan gratuit pour demarrer. Ideal pour les petits commercants.',
      monthlyPrice: 0,
      yearlyPrice: 0,
      maxStores: 1,
      maxProducts: 10,
      maxDeals: 0,
      canCreateDeals: false,
      priorityListing: false,
      analyticsAccess: false,
      commissionRate: 0.15, // 15% commission
      trialDays: 0,
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
      description:
        'Pour les commercants en croissance. Plus de visibilite et fonctionnalites.',
      monthlyPrice: 15000, // 15,000 XOF/month
      yearlyPrice: 150000, // 150,000 XOF/year (2 months free)
      maxStores: 3,
      maxProducts: 50,
      maxDeals: 5,
      canCreateDeals: true,
      priorityListing: true,
      analyticsAccess: true,
      commissionRate: 0.1, // 10% commission
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
      description:
        'Pour les grandes enseignes. Fonctionnalites illimitees et support prioritaire.',
      monthlyPrice: 35000, // 35,000 XOF/month
      yearlyPrice: 350000, // 350,000 XOF/year (2 months free)
      maxStores: 999, // Unlimited
      maxProducts: 999, // Unlimited
      maxDeals: 999, // Unlimited
      canCreateDeals: true,
      priorityListing: true,
      analyticsAccess: true,
      commissionRate: 0.05, // 5% commission
      trialDays: 30,
      isActive: true,
      isPublic: true,
    },
  });

  console.log('  ✅ Created 3 subscription plans');

  // ==================== 2. SUPER ADMIN USER ====================
  console.log('👤 Creating super admin user...');

  const adminPasswordHash = await bcrypt.hash('Admin@YapaGachis2024!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@yapasgachis.com' },
    update: {},
    create: {
      email: 'admin@yapasgachis.com',
      phoneNumber: '+2250700000000',
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: adminPasswordHash,
      emailVerified: true,
      phoneVerified: true,
      kycVerified: true,
      city: 'Abidjan',
      commune: 'Cocody',
      language: 'fr',
    },
  });

  // Create notification preferences for admin
  await prisma.notificationPreference.upsert({
    where: { userId: superAdmin.id },
    update: {},
    create: {
      userId: superAdmin.id,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: true,
      orderUpdates: true,
      paymentAlerts: true,
      promotions: false,
      productAlerts: true,
      systemAnnouncements: true,
    },
  });

  console.log('  ✅ Created super admin: admin@yapasgachis.com');

  // ==================== 3. DEMO CLIENT USER ====================
  console.log('👤 Creating demo client user...');

  const clientPasswordHash = await bcrypt.hash('Client@Demo2024!', 12);

  const demoClient = await prisma.user.upsert({
    where: { email: 'client@demo.yapasgachis.com' },
    update: {},
    create: {
      email: 'client@demo.yapasgachis.com',
      phoneNumber: '+2250701000001',
      firstName: 'Jean',
      lastName: 'Kouassi',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      passwordHash: clientPasswordHash,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Marcory',
      neighborhood: 'Zone 4',
      latitude: 5.3028,
      longitude: -3.9772,
      language: 'fr',
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: demoClient.id },
    update: {},
    create: {
      userId: demoClient.id,
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      orderUpdates: true,
      paymentAlerts: true,
      promotions: true,
      productAlerts: true,
      systemAnnouncements: true,
    },
  });

  console.log('  ✅ Created demo client: client@demo.yapasgachis.com');

  // ==================== 4. DEMO SUPPLIER (RESTAURANT) ====================
  console.log('🏪 Creating demo restaurant supplier...');

  const supplierPasswordHash = await bcrypt.hash('Supplier@Demo2024!', 12);

  const restaurantUser = await prisma.user.upsert({
    where: { email: 'restaurant@demo.yapasgachis.com' },
    update: {},
    create: {
      email: 'restaurant@demo.yapasgachis.com',
      phoneNumber: '+2250702000001',
      firstName: 'Marie',
      lastName: 'Bamba',
      role: UserRole.SUPPLIER_FOOD,
      status: UserStatus.ACTIVE,
      passwordHash: supplierPasswordHash,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Cocody',
      language: 'fr',
    },
  });

  const restaurantSupplier = await prisma.supplierProfile.upsert({
    where: { userId: restaurantUser.id },
    update: {},
    create: {
      userId: restaurantUser.id,
      businessName: 'Chez Tantine Marie',
      supplierType: SupplierType.RESTAURANT,
      description:
        'Restaurant ivoirien traditionnel. Specialites: Attieke, Garba, Kedjenou.',
      logo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
      address: '123 Rue des Jardins, Cocody Angre',
      latitude: 5.37,
      longitude: -3.98,
      operatingHours: {
        monday: { open: '08:00', close: '22:00' },
        tuesday: { open: '08:00', close: '22:00' },
        wednesday: { open: '08:00', close: '22:00' },
        thursday: { open: '08:00', close: '22:00' },
        friday: { open: '08:00', close: '23:00' },
        saturday: { open: '10:00', close: '23:00' },
        sunday: { open: '10:00', close: '20:00' },
      },
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryRadius: 10,
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionPlanId: proPlan.id,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      subscriptionActive: true,
      acceptCashPayment: true,
      commissionRate: 0.1,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  // Create a store for the restaurant
  const restaurantStore = await prisma.supplierStore.create({
    data: {
      supplierId: restaurantSupplier.id,
      name: 'Chez Tantine Marie - Cocody',
      description: 'Notre magasin principal a Cocody Angre',
      address: '123 Rue des Jardins, Cocody Angre',
      city: 'Abidjan',
      commune: 'Cocody',
      neighborhood: 'Angre',
      latitude: 5.37,
      longitude: -3.98,
      phoneNumber: '+2250702000001',
      operatingHours: {
        monday: { open: '08:00', close: '22:00' },
        tuesday: { open: '08:00', close: '22:00' },
        wednesday: { open: '08:00', close: '22:00' },
        thursday: { open: '08:00', close: '22:00' },
        friday: { open: '08:00', close: '23:00' },
        saturday: { open: '10:00', close: '23:00' },
        sunday: { open: '10:00', close: '20:00' },
      },
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryRadius: 10,
      acceptCashPayment: true,
      isActive: true,
    },
  });

  console.log('  ✅ Created demo restaurant: Chez Tantine Marie');

  // ==================== 5. DEMO PRODUCTS ====================
  console.log('🍽️ Creating demo products...');

  const products = [
    {
      supplierId: restaurantSupplier.id,
      storeId: restaurantStore.id,
      title: 'Panier Surprise Dejeuner',
      description:
        'Un panier surprise avec les restes du dejeuner. Peut contenir: riz, attieke, poulet, poisson, legumes sautees.',
      category: ProductCategory.PREPARED_MEALS_INDIVIDUAL,
      images: [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800',
      ],
      originalPrice: 3500,
      discountedPrice: 1500,
      quantity: 10,
      quantityAvailable: 8,
      unit: 'portion',
      expiryDate: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
      isSurpriseBasket: true,
      status: ProductStatus.ACTIVE,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 6 * 60 * 60 * 1000),
      pickupSlots: ['12:00-14:00', '18:00-20:00'],
      deliveryAvailable: true,
    },
    {
      supplierId: restaurantSupplier.id,
      storeId: restaurantStore.id,
      title: 'Attieke Poisson Braise',
      description:
        'Attieke frais avec poisson braise, tomates, oignons et piment. Portion genereuse!',
      category: ProductCategory.PREPARED_MEALS_INDIVIDUAL,
      images: [
        'https://images.unsplash.com/photo-1580959375944-26d6fc0fa6d0?w=800',
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800',
        'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=800',
      ],
      originalPrice: 2500,
      discountedPrice: 1200,
      quantity: 15,
      quantityAvailable: 12,
      unit: 'portion',
      expiryDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
      isSurpriseBasket: false,
      status: ProductStatus.ACTIVE,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 8 * 60 * 60 * 1000),
      pickupSlots: ['11:00-14:00', '17:00-21:00'],
      deliveryAvailable: true,
    },
    {
      supplierId: restaurantSupplier.id,
      storeId: restaurantStore.id,
      title: 'Garba Special',
      description:
        'Garba avec thon frais, attiéké, oignons, tomates, piment et huile.',
      category: ProductCategory.PREPARED_MEALS_INDIVIDUAL,
      images: [
        'https://images.unsplash.com/photo-1485962398705-ef6a13c41e8f?w=800',
        'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800',
      ],
      originalPrice: 1500,
      discountedPrice: 800,
      quantity: 20,
      quantityAvailable: 15,
      unit: 'portion',
      expiryDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
      isSurpriseBasket: false,
      status: ProductStatus.ACTIVE,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 4 * 60 * 60 * 1000),
      pickupSlots: ['10:00-12:00', '16:00-18:00'],
      deliveryAvailable: false,
    },
  ];

  for (const productData of products) {
    await prisma.product.create({
      data: productData,
    });
  }

  console.log(`  ✅ Created ${products.length} demo products`);

  // ==================== 6. DEMO HOTEL SUPPLIER (FOR DEALS) ====================
  console.log('🏨 Creating demo hotel supplier...');

  const hotelUser = await prisma.user.upsert({
    where: { email: 'hotel@demo.yapasgachis.com' },
    update: {},
    create: {
      email: 'hotel@demo.yapasgachis.com',
      phoneNumber: '+2250703000001',
      firstName: 'Amadou',
      lastName: 'Diallo',
      role: UserRole.SUPPLIER_DEALS,
      status: UserStatus.ACTIVE,
      passwordHash: supplierPasswordHash,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Plateau',
      language: 'fr',
    },
  });

  const hotelSupplier = await prisma.supplierProfile.upsert({
    where: { userId: hotelUser.id },
    update: {},
    create: {
      userId: hotelUser.id,
      businessName: 'Hotel Palm Beach',
      supplierType: SupplierType.HOTEL,
      description:
        'Hotel 4 etoiles avec piscine, spa et restaurant. Vue sur la lagune.',
      logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
      address: '45 Boulevard de la Republique, Plateau',
      latitude: 5.32,
      longitude: -4.02,
      operatingHours: {
        monday: { open: '00:00', close: '23:59' },
        tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' },
        saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' },
      },
      deliveryEnabled: false,
      pickupEnabled: true,
      subscriptionTier: SubscriptionTier.PREMIUM,
      subscriptionPlanId: premiumPlan.id,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      subscriptionActive: true,
      acceptCashPayment: true,
      commissionRate: 0.05,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  console.log('  ✅ Created demo hotel: Hotel Palm Beach');

  // ==================== 7. DEMO DEALS ====================
  console.log('🎫 Creating demo deals...');

  const deals = [
    {
      supplierId: hotelSupplier.id,
      title: 'Acces Piscine - Journee Complete',
      description:
        'Profitez de notre magnifique piscine avec vue sur la lagune. Inclut: serviette, casier, acces vestiaires.',
      category: DealCategory.POOL_ACCESS,
      images: [
        'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800',
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      ],
      originalPrice: 15000,
      dealPrice: 5000,
      discountPercent: 66.67,
      includes: ['Serviette', 'Casier', 'Acces vestiaires', 'Chaise longue'],
      excludes: ['Repas', 'Boissons', 'Cours de natation'],
      terms: 'Valable uniquement en semaine. Non remboursable.',
      status: DealStatus.ACTIVE,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      availableSlots: [
        { day: 'monday', slots: ['09:00-12:00', '14:00-18:00'] },
        { day: 'tuesday', slots: ['09:00-12:00', '14:00-18:00'] },
        { day: 'wednesday', slots: ['09:00-12:00', '14:00-18:00'] },
        { day: 'thursday', slots: ['09:00-12:00', '14:00-18:00'] },
        { day: 'friday', slots: ['09:00-12:00', '14:00-18:00'] },
      ],
      totalQuantity: 100,
      quantityAvailable: 100,
      maxPerUser: 5,
      isOffPeakOnly: true,
      offPeakDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      offPeakHours: { start: '09:00', end: '18:00' },
      requiresBooking: true,
      bookingLeadTime: 2, // 2 hours in advance
      cancellationHours: 24,
      contactPhone: '+2250703000001',
      contactEmail: 'reservations@palmbeach.ci',
    },
    {
      supplierId: hotelSupplier.id,
      title: 'Spa Detente - Massage 1h',
      description:
        "Massage relaxant d'une heure dans notre spa de luxe. Choix entre massage suedois, thai ou aux pierres chaudes.",
      category: DealCategory.SPA_WELLNESS,
      images: [
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
        'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800',
      ],
      originalPrice: 35000,
      dealPrice: 18000,
      discountPercent: 48.57,
      includes: ['Massage 1h', 'Acces sauna', 'Tisane offerte', 'Peignoir'],
      excludes: ['Soins supplementaires', 'Produits de beaute'],
      terms: 'Sur reservation uniquement. Annulation gratuite 48h avant.',
      status: DealStatus.ACTIVE,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      availableSlots: [
        { day: 'monday', slots: ['10:00-11:00', '14:00-15:00', '16:00-17:00'] },
        {
          day: 'tuesday',
          slots: ['10:00-11:00', '14:00-15:00', '16:00-17:00'],
        },
        {
          day: 'wednesday',
          slots: ['10:00-11:00', '14:00-15:00', '16:00-17:00'],
        },
        {
          day: 'thursday',
          slots: ['10:00-11:00', '14:00-15:00', '16:00-17:00'],
        },
        { day: 'friday', slots: ['10:00-11:00', '14:00-15:00', '16:00-17:00'] },
        { day: 'saturday', slots: ['10:00-11:00', '14:00-15:00'] },
      ],
      totalQuantity: 50,
      quantityAvailable: 50,
      maxPerUser: 3,
      isOffPeakOnly: false,
      requiresBooking: true,
      bookingLeadTime: 24, // 24 hours in advance
      cancellationHours: 48,
      contactPhone: '+2250703000001',
      contactEmail: 'spa@palmbeach.ci',
    },
  ];

  for (const dealData of deals) {
    await prisma.deal.create({
      data: dealData,
    });
  }

  console.log(`  ✅ Created ${deals.length} demo deals`);

  // ==================== 8. DEMO ASSOCIATION ====================
  console.log('🤝 Creating demo association...');

  const associationUser = await prisma.user.upsert({
    where: { email: 'association@demo.yapasgachis.com' },
    update: {},
    create: {
      email: 'association@demo.yapasgachis.com',
      phoneNumber: '+2250704000001',
      firstName: 'Fatou',
      lastName: 'Traore',
      role: UserRole.ASSOCIATION,
      status: UserStatus.ACTIVE,
      passwordHash: supplierPasswordHash,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Abobo',
      language: 'fr',
    },
  });

  await prisma.associationProfile.upsert({
    where: { userId: associationUser.id },
    update: {},
    create: {
      userId: associationUser.id,
      name: 'Espoir Solidaire',
      description:
        "Association d'aide aux familles demunies. Distribution de repas et denrees alimentaires.",
      registrationNumber: 'ASSO-CI-2020-12345',
      address: "78 Rue de l'Esperance, Abobo",
      latitude: 5.42,
      longitude: -4.01,
      serviceArea: ['Abobo', 'Adjame', 'Attécoubé', 'Yopougon'],
      acceptedFoodTypes: ['prepared', 'dry', 'fresh'],
      collectionSchedule: {
        monday: '09:00-12:00',
        wednesday: '09:00-12:00',
        friday: '09:00-12:00',
      },
      verified: true,
    },
  });

  console.log('  ✅ Created demo association: Espoir Solidaire');

  // ==================== 9. PROMO CODES ====================
  console.log('🎁 Creating promo codes...');

  await prisma.promoCode.create({
    data: {
      code: 'BIENVENUE2024',
      description:
        "Code de bienvenue - 50% sur le premier mois d'abonnement Pro",
      type: 'PERCENTAGE',
      value: 50,
      applicablePlanId: proPlan.id,
      maxUses: 1000,
      currentUses: 0,
      maxUsesPerUser: 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      createdByAdminId: superAdmin.id,
    },
  });

  await prisma.promoCode.create({
    data: {
      code: 'PREMIUM3MOIS',
      description: "3 mois gratuits sur l'abonnement Premium annuel",
      type: 'FREE_MONTHS',
      value: 3,
      applicablePlanId: premiumPlan.id,
      maxUses: 100,
      currentUses: 0,
      maxUsesPerUser: 1,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      createdByAdminId: superAdmin.id,
    },
  });

  console.log('  ✅ Created 2 promo codes');

  // ==================== 10. PAYMENT PROVIDERS ====================
  await seedPaymentProviders();

  // ==================== SUMMARY ====================
  console.log('\n========================================');
  console.log('🎉 Database seeding completed!\n');
  console.log('📊 Summary:');
  console.log('  - 3 Subscription Plans (Basic, Pro, Premium)');
  console.log('  - 1 Super Admin');
  console.log('  - 1 Demo Client');
  console.log('  - 2 Demo Suppliers (Restaurant + Hotel)');
  console.log('  - 3 Demo Products');
  console.log('  - 2 Demo Deals');
  console.log('  - 1 Demo Association');
  console.log('  - 2 Promo Codes');
  console.log('  - 4 Payment Providers (Wave active)');
  console.log('\n📝 Demo Credentials:');
  console.log('  Admin:    admin@yapasgachis.com / Admin@YapaGachis2024!');
  console.log('  Client:   client@demo.yapasgachis.com / Client@Demo2024!');
  console.log(
    '  Supplier: restaurant@demo.yapasgachis.com / Supplier@Demo2024!'
  );
  console.log('  Hotel:    hotel@demo.yapasgachis.com / Supplier@Demo2024!');
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
