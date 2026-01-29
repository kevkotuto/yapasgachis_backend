/**
 * Seed Purchase Deals - Add test deals with requiresBooking: false
 * This script adds deals for testing the /purchase endpoint WITHOUT resetting the database
 */

import { PrismaClient, DealCategory, DealStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(
    '🌱 Starting seed for purchase deals (requiresBooking: false)...\n'
  );

  // Find an existing supplier to attach deals to
  let supplier = await prisma.supplierProfile.findFirst({});

  // If no supplier exists, exit with instructions
  if (!supplier) {
    console.error('❌ No supplier found in database.');
    console.error('Please run one of these commands first:');
    console.error('  - npm run prisma:seed');
    console.error('  - npm run prisma:seed:complete');
    console.error('  - npm run prisma:seed:frontend\n');
    process.exit(1);
  }

  console.log(`✅ Using supplier: ${supplier.businessName} (${supplier.id})\n`);

  // Find or create a store for this supplier
  let store = await prisma.supplierStore.findFirst({
    where: { supplierId: supplier.id },
  });

  if (!store) {
    console.log('📍 Creating store for supplier...');
    store = await prisma.supplierStore.create({
      data: {
        supplierId: supplier.id,
        name: `${supplier.businessName} - Store`,
        address: supplier.address || 'Abidjan',
        city: 'Abidjan',
        commune: 'Plateau',
        latitude: 5.316667,
        longitude: -4.033333,
        isActive: true,
        operatingHours: {},
      },
    });
    console.log(`✅ Store created: ${store.name}\n`);
  } else {
    console.log(`✅ Using existing store: ${store.name}\n`);
  }

  // Create deals with requiresBooking: false
  const dealsToCreate = [
    {
      title: "Bon d'achat 50 000 FCFA - Restaurant",
      description:
        "Bon d'achat valable dans tous nos restaurants partenaires. Utilisable en une ou plusieurs fois. Valable 6 mois.",
      category: DealCategory.RESTAURANT_SPECIAL,
      images: [
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      ],
      originalPrice: 50000,
      dealPrice: 40000,
      discountPercent: 20,
      includes: [
        'Valable 6 mois',
        'Utilisable en plusieurs fois',
        'Tous restaurants partenaires',
      ],
      excludes: ['Boissons alcoolisées', 'Menu du jour'],
      terms: 'Présenter le code de validation avant de commander',
      totalQuantity: 100,
      quantityAvailable: 100,
      maxPerUser: 3,
      requiresBooking: false,
    },
    {
      title: 'Ticket Événement - Concert Live',
      description:
        "Accès VIP au concert live du mois. Entrée garantie sans file d'attente.",
      category: DealCategory.EVENT_TICKET,
      images: [
        'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
      ],
      originalPrice: 25000,
      dealPrice: 18000,
      discountPercent: 28,
      includes: ['Accès VIP', 'Pass backstage', 'Boisson offerte'],
      excludes: ['Parking'],
      terms: "Présenter le QR code à l'entrée",
      totalQuantity: 50,
      quantityAvailable: 50,
      maxPerUser: 5,
      requiresBooking: false,
    },
    {
      title: 'Carte Cadeau Beauté 30 000 FCFA',
      description:
        'Carte cadeau valable dans tous nos salons de beauté. Produits et services au choix.',
      category: DealCategory.BEAUTY_SERVICE,
      images: [
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
      ],
      originalPrice: 30000,
      dealPrice: 25000,
      discountPercent: 17,
      includes: ['Valable 1 an', 'Tous services', 'Tous produits'],
      excludes: ['Non remboursable'],
      terms: 'Présenter la carte cadeau lors du paiement',
      totalQuantity: 200,
      quantityAvailable: 200,
      maxPerUser: 10,
      requiresBooking: false,
    },
    {
      title: 'Pass Transport Mensuel',
      description:
        'Forfait transport illimité pour le mois. Tous les trajets en ville inclus.',
      category: DealCategory.TRANSPORT,
      images: [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
      ],
      originalPrice: 40000,
      dealPrice: 32000,
      discountPercent: 20,
      includes: ['Trajet illimité', 'Valable 30 jours', 'Tous véhicules'],
      excludes: ['Trajet inter-ville'],
      terms: "Activer le pass dans les 7 jours suivant l'achat",
      totalQuantity: 150,
      quantityAvailable: 150,
      maxPerUser: 2,
      requiresBooking: false,
    },
    {
      title: "Bon d'achat Vêtements 100 000 FCFA",
      description: "Bon d'achat pour tous nos articles mode et accessoires.",
      category: DealCategory.CLOTHING_ACCESSORIES,
      images: [
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
      ],
      originalPrice: 100000,
      dealPrice: 85000,
      discountPercent: 15,
      includes: ['Valable 1 an', 'Toute la collection', 'Soldes inclus'],
      excludes: ['Non cumulable avec autres promos'],
      terms: 'Bon utilisable en une ou plusieurs fois',
      totalQuantity: 75,
      quantityAvailable: 75,
      maxPerUser: 2,
      requiresBooking: false,
    },
    {
      title: 'Ticket Cinéma - Pack 5 Séances',
      description:
        'Pack de 5 tickets de cinéma valables pour tous les films. Utilisable à tout moment.',
      category: DealCategory.LEISURE_ACTIVITY,
      images: [
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
      ],
      originalPrice: 20000,
      dealPrice: 15000,
      discountPercent: 25,
      includes: ['5 séances', 'Tous films', 'Valable 6 mois'],
      excludes: ['Séances 3D', 'Popcorn/boissons'],
      terms: 'Réserver votre séance en ligne avec le code',
      totalQuantity: 100,
      quantityAvailable: 100,
      maxPerUser: 4,
      requiresBooking: false,
    },
  ];

  // Calculate availability dates (valid for next 3 months)
  const now = new Date();
  const availableFrom = now;
  const availableUntil = new Date(now);
  availableUntil.setMonth(availableUntil.getMonth() + 3);

  console.log('📦 Creating purchase deals...\n');

  const createdDeals = [];

  for (const dealData of dealsToCreate) {
    const deal = await prisma.deal.create({
      data: {
        ...dealData,
        supplierId: supplier.id,
        storeId: store.id,
        status: DealStatus.ACTIVE,
        availableFrom,
        availableUntil,
        currency: 'XOF',
        bookingLeadTime: 0,
        cancellationHours: 24,
        isOffPeakOnly: false,
      },
    });

    createdDeals.push(deal);
    console.log(`✅ Created: ${deal.title}`);
    console.log(
      `   - Price: ${deal.dealPrice} FCFA (${deal.discountPercent}% off)`
    );
    console.log(`   - Stock: ${deal.quantityAvailable} available`);
    console.log(
      `   - Requires Booking: ${deal.requiresBooking ? 'Yes' : 'No'}\n`
    );
  }

  console.log('\n✅ Purchase deals seed completed!\n');
  console.log('📊 Summary:');
  console.log(`   - Deals created: ${createdDeals.length}`);
  console.log(`   - Supplier: ${supplier.businessName}`);
  console.log(`   - Store: ${store.name}`);
  console.log(`   - All deals have requiresBooking: false\n`);

  console.log('🧪 Test these deals with:');
  console.log('   POST /api/v1/deals/:dealId/purchase');
  console.log('   Body: { "quantity": 1, "paymentMethod": "WAVE" }\n');

  console.log('📋 Deal IDs for testing:');
  createdDeals.forEach((deal, index) => {
    console.log(`   ${index + 1}. ${deal.title}`);
    console.log(`      ID: ${deal.id}`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding purchase deals:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
