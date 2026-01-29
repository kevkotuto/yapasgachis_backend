/**
 * SEED FRONTEND DATA
 *
 * Ce script crée dans la DB backend les mêmes données mockées que le frontend
 * avec les mêmes images Unsplash pour une intégration parfaite.
 */

import {
  PrismaClient,
  UserRole,
  UserStatus,
  SubscriptionTier,
  SupplierType,
  ProductCategory,
  ProductStatus,
  OrderStatus,
  DeliveryMethod,
  PaymentMethod,
  PaymentStatus,
  EscrowStatus,
  DealCategory,
  DealStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting frontend data seeding...\n');

  // ==================== 1. CRÉER LES UTILISATEURS ====================
  console.log('👤 Creating users...');

  const password = await bcrypt.hash('Demo@2024!', 12);

  // Client principal
  const clientUser = await prisma.user.upsert({
    where: { email: 'client@yapasgachis.com' },
    update: {},
    create: {
      email: 'client@yapasgachis.com',
      phoneNumber: '+2250700000001',
      firstName: 'Jean',
      lastName: 'Kouassi',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      passwordHash: password,
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

  // Autres clients pour les reviews
  const albertFlores = await prisma.user.upsert({
    where: { email: 'albert.flores@example.com' },
    update: {},
    create: {
      email: 'albert.flores@example.com',
      phoneNumber: '+2250700000002',
      firstName: 'Albert',
      lastName: 'Flores',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Cocody',
      language: 'fr',
    },
  });

  const sophieMartin = await prisma.user.upsert({
    where: { email: 'sophie.martin@example.com' },
    update: {},
    create: {
      email: 'sophie.martin@example.com',
      phoneNumber: '+2250700000003',
      firstName: 'Sophie',
      lastName: 'Martin',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Plateau',
      language: 'fr',
    },
  });

  const marieAkissi = await prisma.user.upsert({
    where: { email: 'marie.akissi@example.com' },
    update: {},
    create: {
      email: 'marie.akissi@example.com',
      phoneNumber: '+2250700000004',
      firstName: 'Marie',
      lastName: 'Akissi',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Adjamé',
      language: 'fr',
    },
  });

  console.log('  ✅ Created 4 users');

  // ==================== 2. CRÉER LES FOURNISSEURS ====================
  console.log('🏪 Creating suppliers...');

  // O'Takkos - Restaurant de Tacos
  const otakkosUser = await prisma.user.upsert({
    where: { email: 'otakkos@yapasgachis.com' },
    update: {},
    create: {
      email: 'otakkos@yapasgachis.com',
      phoneNumber: '+2250707000001',
      firstName: 'Ahmed',
      lastName: 'Diaby',
      role: UserRole.SUPPLIER_FOOD,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Koumassi',
      language: 'fr',
    },
  });

  const otakkosSupplier = await prisma.supplierProfile.create({
    data: {
      userId: otakkosUser.id,
      businessName: "O'Takkos",
      supplierType: SupplierType.RESTAURANT,
      description: 'Restaurant de Tacos et Fast Food',
      logo: 'https://images.unsplash.com/photo-1517433670267-30f41c6f3f6e?w=200',
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionActive: true,
      acceptCashPayment: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  const otakkosStore = await prisma.supplierStore.create({
    data: {
      supplierId: otakkosSupplier.id,
      name: "O'Takkos Cocody",
      description: 'Notre magasin principal à Cocody',
      images: [
        'https://images.unsplash.com/photo-1625937751876-4515cd8e7752?q=80&w=400',
      ],
      address: 'Rue des Jardins, Cocody',
      city: 'Abidjan',
      commune: 'Cocody',
      latitude: 5.37,
      longitude: -3.98,
      phoneNumber: '+225 07 00 00 00',
      operatingHours: {
        monday: { open: '12:00', close: '14:30' },
        tuesday: { open: '12:00', close: '14:30' },
        wednesday: { open: '12:00', close: '14:30' },
        thursday: { open: '12:00', close: '14:30' },
        friday: { open: '12:00', close: '14:30' },
        saturday: { open: '12:00', close: '14:30' },
        sunday: { open: '12:00', close: '14:30' },
      },
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryRadius: 10,
      acceptCashPayment: true,
      isActive: true,
    },
  });

  // La Parisienne - Boulangerie
  const laParisienneUser = await prisma.user.upsert({
    where: { email: 'laparisienne@yapasgachis.com' },
    update: {},
    create: {
      email: 'laparisienne@yapasgachis.com',
      phoneNumber: '+2250707000002',
      firstName: 'Marie',
      lastName: 'Kouadio',
      role: UserRole.SUPPLIER_FOOD,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Cocody',
      language: 'fr',
    },
  });

  const laParisienneSupplier = await prisma.supplierProfile.create({
    data: {
      userId: laParisienneUser.id,
      businessName: 'La Parisienne',
      supplierType: SupplierType.BAKERY,
      description: 'Boulangerie artisanale',
      logo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
      subscriptionTier: SubscriptionTier.BASIC,
      subscriptionActive: true,
      acceptCashPayment: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  const laParisienneStore = await prisma.supplierStore.create({
    data: {
      supplierId: laParisienneSupplier.id,
      name: 'La Parisienne Cocody',
      description: 'Boulangerie du quartier',
      images: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000',
      ],
      address: 'Cocody',
      city: 'Abidjan',
      commune: 'Cocody',
      latitude: 5.36,
      longitude: -3.99,
      operatingHours: {
        monday: { open: '16:00', close: '18:00' },
        tuesday: { open: '16:00', close: '18:00' },
        wednesday: { open: '16:00', close: '18:00' },
        thursday: { open: '16:00', close: '18:00' },
        friday: { open: '16:00', close: '18:00' },
        saturday: { open: '16:00', close: '18:00' },
        sunday: { open: '16:00', close: '18:00' },
      },
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryRadius: 5,
      acceptCashPayment: true,
      isActive: true,
    },
  });

  // Boulangerie du Plateau
  const plateauUser = await prisma.user.upsert({
    where: { email: 'plateau@yapasgachis.com' },
    update: {},
    create: {
      email: 'plateau@yapasgachis.com',
      phoneNumber: '+2250707000003',
      firstName: 'Kouadio',
      lastName: 'Yao',
      role: UserRole.SUPPLIER_FOOD,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Plateau',
      language: 'fr',
    },
  });

  const plateauSupplier = await prisma.supplierProfile.create({
    data: {
      userId: plateauUser.id,
      businessName: 'Boulangerie du Plateau',
      supplierType: SupplierType.BAKERY,
      description: 'Boulangerie traditionnelle',
      logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400',
      subscriptionTier: SubscriptionTier.BASIC,
      subscriptionActive: true,
      acceptCashPayment: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  const plateauStore = await prisma.supplierStore.create({
    data: {
      supplierId: plateauSupplier.id,
      name: 'Boulangerie du Plateau',
      description: 'Boulangerie au centre ville',
      images: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400',
      ],
      address: 'Avenue Chardy, Plateau',
      city: 'Abidjan',
      commune: 'Plateau',
      latitude: 5.32,
      longitude: -4.02,
      operatingHours: {
        monday: { open: '12:00', close: '13:00' },
        tuesday: { open: '12:00', close: '13:00' },
        wednesday: { open: '12:00', close: '13:00' },
        thursday: { open: '12:00', close: '13:00' },
        friday: { open: '12:00', close: '13:00' },
        saturday: { open: '12:00', close: '13:00' },
        sunday: { open: '12:00', close: '13:00' },
      },
      deliveryEnabled: false,
      pickupEnabled: true,
      acceptCashPayment: true,
      isActive: true,
    },
  });

  // Burger King Marcory
  const burgerKingUser = await prisma.user.upsert({
    where: { email: 'burgerking@yapasgachis.com' },
    update: {},
    create: {
      email: 'burgerking@yapasgachis.com',
      phoneNumber: '+2250707000004',
      firstName: 'Koffi',
      lastName: "N'Guessan",
      role: UserRole.SUPPLIER_FOOD,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Marcory',
      language: 'fr',
    },
  });

  const burgerKingSupplier = await prisma.supplierProfile.create({
    data: {
      userId: burgerKingUser.id,
      businessName: 'Burger King Marcory',
      supplierType: SupplierType.RESTAURANT,
      description: 'Fast Food - Burgers',
      logo: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=400',
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionActive: true,
      acceptCashPayment: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  const burgerKingStore = await prisma.supplierStore.create({
    data: {
      supplierId: burgerKingSupplier.id,
      name: 'Burger King Marcory',
      description: 'Restaurant de burgers',
      images: [
        'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=400',
      ],
      address: 'Marcory',
      city: 'Abidjan',
      commune: 'Marcory',
      latitude: 5.29,
      longitude: -3.97,
      operatingHours: {
        monday: { open: '11:00', close: '15:00' },
        tuesday: { open: '11:00', close: '15:00' },
        wednesday: { open: '11:00', close: '15:00' },
        thursday: { open: '11:00', close: '15:00' },
        friday: { open: '11:00', close: '15:00' },
        saturday: { open: '11:00', close: '15:00' },
        sunday: { open: '11:00', close: '15:00' },
      },
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryRadius: 8,
      acceptCashPayment: true,
      isActive: true,
    },
  });

  // Pizza Hut Riviera
  const pizzaHutUser = await prisma.user.upsert({
    where: { email: 'pizzahut@yapasgachis.com' },
    update: {},
    create: {
      email: 'pizzahut@yapasgachis.com',
      phoneNumber: '+2250707000005',
      firstName: 'Aya',
      lastName: 'Touré',
      role: UserRole.SUPPLIER_FOOD,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Riviera',
      language: 'fr',
    },
  });

  const pizzaHutSupplier = await prisma.supplierProfile.create({
    data: {
      userId: pizzaHutUser.id,
      businessName: 'Pizza Hut Riviera',
      supplierType: SupplierType.RESTAURANT,
      description: 'Pizzeria',
      logo: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=400',
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionActive: true,
      acceptCashPayment: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  const pizzaHutStore = await prisma.supplierStore.create({
    data: {
      supplierId: pizzaHutSupplier.id,
      name: 'Pizza Hut Riviera',
      description: 'Pizzeria',
      images: [
        'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=400',
      ],
      address: 'Riviera',
      city: 'Abidjan',
      commune: 'Riviera',
      latitude: 5.35,
      longitude: -3.96,
      operatingHours: {
        monday: { open: '11:00', close: '22:00' },
        tuesday: { open: '11:00', close: '22:00' },
        wednesday: { open: '11:00', close: '22:00' },
        thursday: { open: '11:00', close: '22:00' },
        friday: { open: '11:00', close: '23:00' },
        saturday: { open: '11:00', close: '23:00' },
        sunday: { open: '11:00', close: '22:00' },
      },
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryRadius: 12,
      acceptCashPayment: true,
      isActive: true,
    },
  });

  // Patisserie Abidjan
  const patisserieUser = await prisma.user.upsert({
    where: { email: 'patisserie@yapasgachis.com' },
    update: {},
    create: {
      email: 'patisserie@yapasgachis.com',
      phoneNumber: '+2250707000006',
      firstName: 'Aminata',
      lastName: 'Diallo',
      role: UserRole.SUPPLIER_FOOD,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Cocody',
      language: 'fr',
    },
  });

  const patisserieSupplier = await prisma.supplierProfile.create({
    data: {
      userId: patisserieUser.id,
      businessName: 'Patisserie Abidjan',
      supplierType: SupplierType.PASTRY_SHOP,
      description: 'Pâtisserie fine',
      logo: 'https://images.unsplash.com/photo-1517433670267-30f41c6f3f6e?w=400',
      subscriptionTier: SubscriptionTier.BASIC,
      subscriptionActive: true,
      acceptCashPayment: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  const patisserieStore = await prisma.supplierStore.create({
    data: {
      supplierId: patisserieSupplier.id,
      name: 'Patisserie Abidjan - Cocody',
      description: 'Pâtisserie artisanale',
      images: [
        'https://images.unsplash.com/photo-1517433670267-30f41c6f3f6e?w=400',
      ],
      address: 'Rue des Jardins, Cocody',
      city: 'Abidjan',
      commune: 'Cocody',
      latitude: 5.37,
      longitude: -3.98,
      operatingHours: {
        monday: { open: '08:00', close: '19:00' },
        tuesday: { open: '08:00', close: '19:00' },
        wednesday: { open: '08:00', close: '19:00' },
        thursday: { open: '08:00', close: '19:00' },
        friday: { open: '08:00', close: '20:00' },
        saturday: { open: '08:00', close: '20:00' },
        sunday: { open: '09:00', close: '18:00' },
      },
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryRadius: 6,
      acceptCashPayment: true,
      isActive: true,
    },
  });

  console.log('  ✅ Created 6 suppliers with stores');

  // ==================== 3. CRÉER LES PRODUITS ====================
  console.log('🍽️ Creating products...');

  // Pack Tacos XXL - O'Takkos
  const tacoProduct = await prisma.product.create({
    data: {
      supplierId: otakkosSupplier.id,
      storeId: otakkosStore.id,
      title: 'Pack Tacos XXL',
      description: 'Tacos XXL, boisson gazeuse, couverts',
      category: ProductCategory.FOOD_PREPARED,
      images: [
        'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
      ],
      originalPrice: 5000,
      discountedPrice: 3500,
      quantity: 4,
      quantityAvailable: 4,
      unit: 'portion',
      expiryDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2h
      isSurpriseBasket: false,
      status: ProductStatus.ACTIVE,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
      pickupSlots: ['12:00-14:30'],
      deliveryAvailable: true,
    },
  });

  // Panier Surprise - La Parisienne
  const panierProduct = await prisma.product.create({
    data: {
      supplierId: laParisienneSupplier.id,
      storeId: laParisienneStore.id,
      title: 'Panier Surprise',
      description: 'Assortiment de viennoiseries et pâtisseries',
      category: ProductCategory.BAKERY,
      images: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000',
      ],
      originalPrice: 1500,
      discountedPrice: 2000,
      quantity: 2,
      quantityAvailable: 2,
      unit: 'panier',
      expiryDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4h
      isSurpriseBasket: true,
      status: ProductStatus.ACTIVE,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 2 * 60 * 60 * 1000),
      pickupSlots: ['16:00-18:00'],
      deliveryAvailable: true,
    },
  });

  // Menu Burger
  const burgerProduct = await prisma.product.create({
    data: {
      supplierId: burgerKingSupplier.id,
      storeId: burgerKingStore.id,
      title: 'Menu Burger',
      description: 'Burger, frites, boisson',
      category: ProductCategory.FOOD_PREPARED,
      images: [
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000',
      ],
      originalPrice: 4000,
      discountedPrice: 2500,
      quantity: 12,
      quantityAvailable: 12,
      unit: 'menu',
      expiryDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
      isSurpriseBasket: false,
      status: ProductStatus.ACTIVE,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 4 * 60 * 60 * 1000),
      pickupSlots: ['11:00-15:00'],
      deliveryAvailable: true,
    },
  });

  // Panier Boulangerie (rupture de stock)
  const boulangProduct = await prisma.product.create({
    data: {
      supplierId: plateauSupplier.id,
      storeId: plateauStore.id,
      title: 'Panier Boulangerie',
      description: 'Pain, viennoiseries du jour',
      category: ProductCategory.BAKERY,
      images: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1000',
      ],
      originalPrice: 3000,
      discountedPrice: 1500,
      quantity: 0,
      quantityAvailable: 0,
      unit: 'panier',
      expiryDate: new Date(Date.now() + 10 * 60 * 60 * 1000),
      isSurpriseBasket: true,
      status: ProductStatus.SOLD_OUT,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 8 * 60 * 60 * 1000),
      pickupSlots: ['18:00-20:00'],
      deliveryAvailable: false,
    },
  });

  console.log('  ✅ Created 4 products');

  // ==================== 4. CRÉER LES REVIEWS ====================
  console.log('⭐ Creating reviews...');

  await prisma.review.createMany({
    data: [
      {
        userId: albertFlores.id,
        productId: tacoProduct.id,
        rating: 5,
        comment:
          'Excellent rapport qualité-prix ! Les tacos sont vraiment bons.',
        images: [],
        helpful: 3,
      },
      {
        userId: albertFlores.id,
        productId: tacoProduct.id,
        rating: 4,
        comment: 'Très bon, livraison rapide.',
        images: [],
        helpful: 1,
      },
    ],
  });

  console.log('  ✅ Created 2 reviews');

  // ==================== 5. CRÉER LES COMMANDES ====================
  console.log('📦 Creating orders...');

  // Commande #1023 - Prête
  const order1023 = await prisma.order.create({
    data: {
      orderNumber: '1023',
      clientId: clientUser.id,
      supplierId: otakkosSupplier.id,
      storeId: otakkosStore.id,
      status: OrderStatus.READY_FOR_PICKUP,
      deliveryMethod: DeliveryMethod.PICKUP,
      subtotal: 3500,
      deliveryFee: 0,
      commission: 350,
      wavePaymentFee: 35,
      waveTransferFee: 31.5,
      supplierAmount: 3118.5,
      total: 3500,
      pickupCode: '1023',
      pickupSlot: new Date(Date.now() + 2 * 60 * 60 * 1000), // Dans 2h
      paymentMethod: PaymentMethod.WAVE,
      paymentReference: 'WV-2026010812301023',
      paidAt: new Date(Date.now() - 30 * 60 * 1000), // Il y a 30 min
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1023.id,
        productId: panierProduct.id,
        quantity: 1,
        unitPrice: 2500,
        totalPrice: 2500,
      },
      {
        orderId: order1023.id,
        productId: tacoProduct.id,
        quantity: 1,
        unitPrice: 1000,
        totalPrice: 1000,
      },
    ],
  });

  // Commande #1022 - En préparation
  const order1022 = await prisma.order.create({
    data: {
      orderNumber: '1022',
      clientId: clientUser.id,
      supplierId: plateauSupplier.id,
      storeId: plateauStore.id,
      status: OrderStatus.PREPARING,
      deliveryMethod: DeliveryMethod.PICKUP,
      subtotal: 6000,
      deliveryFee: 0,
      commission: 600,
      wavePaymentFee: 60,
      waveTransferFee: 54,
      supplierAmount: 5346,
      total: 6000,
      pickupCode: '1022',
      pickupSlot: new Date(Date.now() + 1 * 60 * 60 * 1000),
      paymentMethod: PaymentMethod.WAVE,
      paymentReference: 'WV-2026010812001022',
      paidAt: new Date(Date.now() - 45 * 60 * 1000),
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1022.id,
      productId: boulangProduct.id,
      quantity: 2,
      unitPrice: 3000,
      totalPrice: 6000,
    },
  });

  // Commande #1021 - Livrée
  const order1021 = await prisma.order.create({
    data: {
      orderNumber: '1021',
      clientId: clientUser.id,
      supplierId: burgerKingSupplier.id,
      storeId: burgerKingStore.id,
      status: OrderStatus.DELIVERED,
      deliveryMethod: DeliveryMethod.DELIVERY,
      subtotal: 5000,
      deliveryFee: 1000,
      commission: 500,
      wavePaymentFee: 60,
      waveTransferFee: 45,
      supplierAmount: 5455,
      total: 6000,
      deliveryAddress: 'Marcory Zone 4',
      deliveryLatitude: 5.3028,
      deliveryLongitude: -3.9772,
      paymentMethod: PaymentMethod.WAVE,
      paymentReference: 'WV-2026010811001021',
      paidAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      deliveryConfirmedByClient: true,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1021.id,
      productId: burgerProduct.id,
      quantity: 1,
      unitPrice: 5000,
      totalPrice: 5000,
    },
  });

  // Commande #1020 - Livrée
  const order1020 = await prisma.order.create({
    data: {
      orderNumber: '1020',
      clientId: clientUser.id,
      supplierId: pizzaHutSupplier.id,
      storeId: pizzaHutStore.id,
      status: OrderStatus.DELIVERED,
      deliveryMethod: DeliveryMethod.DELIVERY,
      subtotal: 12000,
      deliveryFee: 1500,
      commission: 1200,
      wavePaymentFee: 135,
      waveTransferFee: 108,
      supplierAmount: 12192,
      total: 13500,
      deliveryAddress: 'Marcory Zone 4',
      deliveryLatitude: 5.3028,
      deliveryLongitude: -3.9772,
      paymentMethod: PaymentMethod.WAVE,
      paymentReference: 'WV-2026010809001020',
      paidAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
      deliveryConfirmedByClient: true,
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    },
  });

  // Commande #1019 - Annulée
  const order1019 = await prisma.order.create({
    data: {
      orderNumber: '1019',
      clientId: clientUser.id,
      supplierId: patisserieSupplier.id,
      storeId: patisserieStore.id,
      status: OrderStatus.CANCELLED,
      deliveryMethod: DeliveryMethod.PICKUP,
      subtotal: 4000,
      deliveryFee: 0,
      commission: 400,
      wavePaymentFee: 40,
      waveTransferFee: 36,
      supplierAmount: 3564,
      total: 4000,
      paymentMethod: PaymentMethod.WAVE,
      paymentReference: 'WV-2026010807001019',
      cancelledAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      cancelReason: 'Indisponible',
      createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
    },
  });

  console.log('  ✅ Created 5 orders with items');

  // ==================== 6. CRÉER LES HÔTELS (DEALS) ====================
  console.log('🏨 Creating hotel deals...');

  // Aparthotel Adagio
  const adagioUser = await prisma.user.upsert({
    where: { email: 'adagio@yapasgachis.com' },
    update: {},
    create: {
      email: 'adagio@yapasgachis.com',
      phoneNumber: '+2250708000001',
      firstName: 'Jean',
      lastName: 'Konan',
      role: UserRole.SUPPLIER_DEALS,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Plateau',
      language: 'fr',
    },
  });

  const adagioSupplier = await prisma.supplierProfile.create({
    data: {
      userId: adagioUser.id,
      businessName: 'Aparthotel Adagio',
      supplierType: SupplierType.HOTEL,
      description: 'Aparthotel avec appartements équipés',
      logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000',
      subscriptionTier: SubscriptionTier.PREMIUM,
      subscriptionActive: true,
      acceptCashPayment: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  const adagioStore = await prisma.supplierStore.create({
    data: {
      supplierId: adagioSupplier.id,
      name: 'Aparthotel Adagio Plateau',
      description: '3 appartements disponibles',
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000',
      ],
      address: 'Plateau',
      city: 'Abidjan',
      commune: 'Plateau',
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
      acceptCashPayment: true,
      isActive: true,
    },
  });

  await prisma.deal.create({
    data: {
      supplierId: adagioSupplier.id,
      storeId: adagioStore.id,
      title: 'Aparthotel Adagio - Appartement',
      description: '3 appartements disponibles du 14-15 nov 2025',
      category: DealCategory.HOTEL_ROOM,
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000',
      ],
      originalPrice: 150000,
      dealPrice: 125000,
      discountPercent: 16.67,
      status: DealStatus.ACTIVE,
      availableFrom: new Date('2025-11-14'),
      availableUntil: new Date('2025-11-15'),
      totalQuantity: 3,
      quantityAvailable: 3,
      maxPerUser: 1,
      requiresBooking: true,
      bookingLeadTime: 24,
      cancellationHours: 48,
    },
  });

  // Hyde Park
  const hydeParkUser = await prisma.user.upsert({
    where: { email: 'hydepark@yapasgachis.com' },
    update: {},
    create: {
      email: 'hydepark@yapasgachis.com',
      phoneNumber: '+2250708000002',
      firstName: 'Ama',
      lastName: 'Beugré',
      role: UserRole.SUPPLIER_DEALS,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Marcory',
      language: 'fr',
    },
  });

  const hydeParkSupplier = await prisma.supplierProfile.create({
    data: {
      userId: hydeParkUser.id,
      businessName: 'Hyde Park',
      supplierType: SupplierType.HOTEL,
      description: 'Hôtel & Restaurant',
      logo: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1000',
      subscriptionTier: SubscriptionTier.PREMIUM,
      subscriptionActive: true,
      acceptCashPayment: true,
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  const hydeParkStore = await prisma.supplierStore.create({
    data: {
      supplierId: hydeParkSupplier.id,
      name: 'Hyde Park Marcory',
      description: 'Hôtel avec restaurant',
      images: [
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1000',
      ],
      address: 'Marcory',
      city: 'Abidjan',
      commune: 'Marcory',
      latitude: 5.29,
      longitude: -3.97,
      operatingHours: {
        monday: { open: '12:00', close: '14:30' },
        tuesday: { open: '12:00', close: '14:30' },
        wednesday: { open: '12:00', close: '14:30' },
        thursday: { open: '12:00', close: '14:30' },
        friday: { open: '12:00', close: '14:30' },
        saturday: { open: '12:00', close: '14:30' },
        sunday: { open: '12:00', close: '14:30' },
      },
      deliveryEnabled: false,
      pickupEnabled: true,
      acceptCashPayment: true,
      isActive: true,
    },
  });

  await prisma.deal.create({
    data: {
      supplierId: hydeParkSupplier.id,
      storeId: hydeParkStore.id,
      title: 'Hyde Park - Promotion spéciale',
      description: 'Promotion disponible 12h-14h30',
      category: DealCategory.RESTAURANT_SPECIAL,
      images: [
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=1000',
      ],
      originalPrice: 10000,
      dealPrice: 7500,
      discountPercent: 25,
      status: DealStatus.ACTIVE,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      totalQuantity: 50,
      quantityAvailable: 50,
      maxPerUser: 2,
      requiresBooking: false,
      bookingLeadTime: 0,
      cancellationHours: 0,
    },
  });

  console.log('  ✅ Created 2 hotel deals');

  // ==================== 7. CRÉER LES ASSOCIATIONS ====================
  console.log('🤝 Creating associations...');

  const nourrirUser = await prisma.user.upsert({
    where: { email: 'nourrir@yapasgachis.com' },
    update: {},
    create: {
      email: 'nourrir@yapasgachis.com',
      phoneNumber: '+2250709000001',
      firstName: 'Koné',
      lastName: 'Ibrahim',
      role: UserRole.ASSOCIATION,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Abobo',
      language: 'fr',
    },
  });

  await prisma.associationProfile.create({
    data: {
      userId: nourrirUser.id,
      name: 'Nourrir Ensemble',
      description: 'Association de lutte contre la faim',
      logo: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=1000',
      registrationNumber: 'ASSO-2024-001',
      address: 'Abobo',
      latitude: 5.42,
      longitude: -4.01,
      serviceArea: ['Abobo', 'Adjamé', 'Yopougon'],
      acceptedFoodTypes: ['prepared', 'fresh', 'dry'],
      collectionSchedule: {
        monday: '08:00-17:00',
        tuesday: '08:00-17:00',
        wednesday: '08:00-17:00',
        thursday: '08:00-17:00',
        friday: '08:00-17:00',
      },
      verified: true,
      totalDonationsReceived: 150,
      totalValueReceived: 150000,
    },
  });

  const aideUser = await prisma.user.upsert({
    where: { email: 'aide@yapasgachis.com' },
    update: {},
    create: {
      email: 'aide@yapasgachis.com',
      phoneNumber: '+2250709000002',
      firstName: 'Aya',
      lastName: 'Kouassi',
      role: UserRole.ASSOCIATION,
      status: UserStatus.ACTIVE,
      passwordHash: password,
      emailVerified: true,
      phoneVerified: true,
      city: 'Abidjan',
      commune: 'Plateau',
      language: 'fr',
    },
  });

  await prisma.associationProfile.create({
    data: {
      userId: aideUser.id,
      name: 'Aide Scolaire',
      description: "Association pour l'éducation des enfants",
      logo: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1000',
      registrationNumber: 'ASSO-2024-002',
      address: 'Plateau',
      latitude: 5.32,
      longitude: -4.02,
      serviceArea: ['Plateau', 'Cocody', 'Marcory'],
      acceptedFoodTypes: ['dry'],
      collectionSchedule: {
        monday: '09:00-16:00',
        wednesday: '09:00-16:00',
        friday: '09:00-16:00',
      },
      verified: true,
      totalDonationsReceived: 80,
      totalValueReceived: 80000,
    },
  });

  console.log('  ✅ Created 2 associations');

  // ==================== SUMMARY ====================
  console.log('\n========================================');
  console.log('🎉 Frontend data seeding completed!\n');
  console.log('📊 Summary:');
  console.log('  - 4 Client users');
  console.log('  - 6 Supplier users with stores');
  console.log('  - 4 Products (with same images as frontend)');
  console.log('  - 2 Reviews');
  console.log('  - 5 Orders (matching frontend orders)');
  console.log('  - 2 Hotel deals (matching frontend)');
  console.log('  - 2 Associations (matching frontend)');
  console.log('\n📝 Credentials:');
  console.log('  Client: client@yapasgachis.com / Demo@2024!');
  console.log('  Supplier: otakkos@yapasgachis.com / Demo@2024!');
  console.log('\n✨ All images match frontend Unsplash URLs');
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
